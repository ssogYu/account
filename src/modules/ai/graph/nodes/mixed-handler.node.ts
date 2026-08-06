import type { PinoLogger } from 'nestjs-pino';
import type { DbService } from '../../../../infra/db/db.service';
import type { BillExtractionResult } from '../../schemas/extraction.schema';
import type { GraphState, NodeUpdate } from '../state';
import { createBillRecord } from '../helpers/create-bill';
import { resolveCategoryId } from '../helpers/resolve-category';
import { resolvePaymentAccountId } from '../helpers/resolve-payment-account';
import { buildBillReply } from '../helpers/format-bill-reply';
import { buildConfirmationCards } from '../helpers/build-confirmation-cards';

/** 自动入库阈值：置信度 >= 0.7 直接入库，否则走确认卡片 */
const AUTO_THRESHOLD = 0.7;

/**
 * 混合处理节点：逐笔判断置信度。
 * - 信息完整（置信度 >= 0.7）的账单直接自动入库
 * - 信息不完整的账单生成确认卡片，用户二次确认
 * - 支持纯自动、纯确认、混合三种终态
 */
export function createMixedHandler(db: DbService, logger: PinoLogger) {
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
      // 1) 自动入库部分
      const createdBills: Record<string, unknown>[] = [];
      for (const bill of autoBills) {
        if (!bill.amount || bill.amount <= 0) continue;
        const [categoryId, paymentAccountId] = await Promise.all([
          resolveCategoryId(db, userId, bill.category),
          resolvePaymentAccountId(db, userId, bill.paymentAccount),
        ]);
        const created = await createBillRecord(db, {
          userId,
          categoryId,
          paymentAccountId,
          type: bill.type ?? 'expense',
          amount: bill.amount,
          billDate: bill.billDate,
          note: bill.note,
        });
        createdBills.push(created as Record<string, unknown>);
      }

      // 2) 确认卡片部分
      let sessionId: string | undefined;
      let confirmationCards: GraphState['confirmationCards'];
      let confirmReply = '';
      if (confirmBills.length > 0) {
        const built = buildConfirmationCards(confirmBills, confirmEvaluations);
        sessionId = built.sessionId;
        confirmationCards = built.cards;
        confirmReply = built.reply;
      }

      // 3) 合并 reply 与 status
      const autoReply = buildBillReply(createdBills);
      const replies: string[] = [];
      if (createdBills.length > 0) replies.push(autoReply);
      //   if (confirmBills.length > 0) replies.push(confirmReply);
      if (confirmBills.length > 0)
        replies.push(`⚠️有${confirmBills.length}笔账单需要确认`);
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
      logger.error({ error: message, errorType: name }, '账单处理失败');
      return {
        status: 'error' as const,
        reply: '账单处理失败，请稍后重试',
        error: message,
      };
    }
  };
}
