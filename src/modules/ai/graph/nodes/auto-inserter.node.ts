import type { PinoLogger } from 'nestjs-pino';
import type { DbService } from '../../../../infra/db/db.service';
import type { GraphState, NodeUpdate } from '../state';
import { createBillRecord } from '../helpers/create-bill';
import { resolveCategoryId } from '../helpers/resolve-category';
import { resolvePaymentAccountId } from '../helpers/resolve-payment-account';
import { buildBillReply } from '../helpers/format-bill-reply';

/** 自动入库节点：将提取到的账单批量创建 */
export function createAutoInserter(db: DbService, logger: PinoLogger) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    const { userId, extractedBills = [] } = state;

    if (extractedBills.length === 0) {
      return {
        status: 'error' as const,
        reply: '未识别到有效的账单信息，请重新输入',
        error: 'EMPTY_BILLS',
      };
    }

    try {
      const createdBills: Record<string, unknown>[] = [];

      for (const bill of extractedBills) {
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

      if (createdBills.length === 0) {
        return {
          status: 'error' as const,
          reply: '账单金额无效，请重新输入',
          error: 'INVALID_AMOUNT',
        };
      }

      logger.info({ count: createdBills.length }, '账单自动创建完成');

      const single = createdBills.length === 1;
      const reply = buildBillReply(createdBills);

      return {
        status: 'auto_created' as const,
        createdBill: single ? createdBills[0] : undefined,
        createdBills,
        reply,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      const name = error instanceof Error ? error.name : 'UnknownError';
      logger.error({ error: message, errorType: name }, '账单自动入库失败');
      return {
        status: 'error' as const,
        reply: '账单创建失败，请稍后重试',
        error: message,
      };
    }
  };
}
