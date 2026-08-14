import type { PinoLogger } from 'nestjs-pino';
import type { DbService } from '../../../../infra/db/db.service';
import type { FamilyService } from '../../../family/family.service';
import type { BillExtractionResult } from '../../schemas/extraction.schema';
import type { GraphState, NodeUpdate } from '../state';
import { createBillRecord } from '../helpers/create-bill';
import { resolveCategoryId } from '../helpers/resolve-category';
import { resolvePaymentAccountId } from '../helpers/resolve-payment-account';
import { buildBillReply } from '../helpers/format-bill-reply';
import {
  buildConfirmationCards,
  type DuplicateMark,
} from '../helpers/build-confirmation-cards';
import { findDuplicateBill } from '../helpers/find-duplicate-bill';
import { formatDateTime } from '../../../../common/utils/date';

/** 自动入库阈值：置信度 >= 0.7 直接入库，否则走确认卡片 */
const AUTO_THRESHOLD = 0.7;

/**
 * 混合处理节点：逐笔判断置信度。
 * - 信息完整（置信度 >= 0.7）的账单直接自动入库
 * - 信息不完整的账单生成确认卡片，用户二次确认
 * - 支持纯自动、纯确认、混合三种终态
 */
export function createMixedHandler(
  db: DbService,
  familyService: FamilyService,
  logger: PinoLogger,
) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    const { userId, extractedBills = [], billEvaluations = [] } = state;

    if (extractedBills.length === 0) {
      return {
        status: 'error' as const,
        reply: '未识别到有效的账单信息，请重新输入',
        error: 'EMPTY_BILLS',
      };
    }

    // 按置信度拆分为自动入库 / 待确认两批
    const autoBills: BillExtractionResult[] = [];
    const confirmBills: BillExtractionResult[] = [];
    const confirmEvaluations: { missingFields: string[] }[] = [];

    extractedBills.forEach((bill, index) => {
      const confidence = billEvaluations[index]?.confidence ?? 0;
      if (confidence >= AUTO_THRESHOLD) {
        autoBills.push(bill);
      } else {
        confirmBills.push(bill);
        confirmEvaluations.push(
          billEvaluations[index] ?? { missingFields: [] },
        );
      }
    });

    try {
      // 1) 自动入库部分：入库前查重，命中重复的转入确认卡片让用户抉择
      const createdBills: Record<string, unknown>[] = [];
      // duplicateMap 以确认卡片数组下标为键，记录命中的重复账单 ID
      const duplicateMap = new Map<number, DuplicateMark>();
      let duplicateCount = 0;

      for (const bill of autoBills) {
        if (!bill.amount || bill.amount <= 0) continue;
        const [categoryId, paymentAccountId] = await Promise.all([
          resolveCategoryId(
            db,
            userId,
            bill.category ?? undefined,
            familyService,
          ),
          resolvePaymentAccountId(
            db,
            userId,
            bill.paymentAccount ?? undefined,
            familyService,
          ),
        ]);

        const type = bill.type ?? 'expense';
        const duplicate = bill.billDate
          ? await findDuplicateBill(db, userId, familyService, {
              amount: bill.amount,
              type,
              categoryId,
              billDate: bill.billDate,
            })
          : null;

        if (duplicate) {
          // 疑似重复：不自动入库，转入确认卡片，让用户决定「仍记录 / 跳过」
          const dupIndex = confirmBills.length;
          confirmBills.push(bill);
          confirmEvaluations.push({ missingFields: [] });
          duplicateMap.set(dupIndex, {
            bill: {
              id: duplicate.id,
              amount: Number(duplicate.amount),
              type: duplicate.type,
              categoryName: duplicate.category?.name ?? '',
              billDate: formatDateTime(duplicate.billDate),
              note: duplicate.note ?? '',
            },
          });
          duplicateCount++;
          continue;
        }

        const created = await createBillRecord(
          db,
          {
            userId,
            categoryId,
            paymentAccountId,
            type,
            amount: bill.amount,
            billDate: bill.billDate,
            note: bill.note,
          },
          familyService,
        );
        createdBills.push(created as Record<string, unknown>);
      }

      // 2) 确认卡片部分
      let sessionId: string | undefined;
      let confirmationCards: GraphState['confirmationCards'];
      if (confirmBills.length > 0) {
        const built = buildConfirmationCards(
          confirmBills,
          confirmEvaluations,
          duplicateMap.size > 0 ? duplicateMap : undefined,
        );
        sessionId = built.sessionId;
        confirmationCards = built.cards;
      }

      // 3) 合并 reply 与 status
      const autoReply = buildBillReply(createdBills);
      const replies: string[] = [`共识别到${extractedBills.length}笔账单`];
      if (createdBills.length > 0) replies.push(autoReply);
      // 疑似重复与普通待确认分别独立提示，两者可能同时存在
      if (duplicateCount > 0)
        replies.push(
          `⚠️检测到${duplicateCount}笔疑似重复账单，请确认是否仍要记录`,
        );
      const normalConfirmCount = confirmBills.length - duplicateCount;
      if (normalConfirmCount > 0)
        replies.push(`⚠️有${normalConfirmCount}笔账单需要确认`);
      const reply = replies.join('\n\n');

      const hasAuto = createdBills.length > 0;
      const hasConfirm = confirmBills.length > 0;
      const status =
        hasAuto && hasConfirm
          ? 'mixed'
          : hasAuto
            ? 'auto_created'
            : 'pending_confirm';

      logger.info(
        {
          autoCount: createdBills.length,
          confirmCount: confirmBills.length,
          duplicateCount,
          status,
        },
        '账单混合处理完成',
      );

      return {
        status,
        reply,
        sessionId,
        confirmationCards,
        createdBill: createdBills.length === 1 ? createdBills[0] : undefined,
        createdBills: createdBills.length > 0 ? createdBills : undefined,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      const name = error instanceof Error ? error.name : 'UnknownError';
      logger.error(
        { error: message, errorType: name, data: billEvaluations },
        '账单处理失败',
      );
      return {
        status: 'error' as const,
        reply: '账单处理失败，请稍后重试',
        error: message,
      };
    }
  };
}
