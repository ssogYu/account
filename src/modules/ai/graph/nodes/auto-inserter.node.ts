import type { PinoLogger } from 'nestjs-pino';
import type { DbService } from '../../../../infra/db/db.service';
import type { GraphState, NodeUpdate } from '../state';
import { createBillRecord } from '../helpers/create-bill';
import { resolveCategoryId } from '../helpers/resolve-category';
import { resolvePaymentAccountId } from '../helpers/resolve-payment-account';

/** 自动入库节点：置信度足够高时直接创建账单 */
export function createAutoInserter(db: DbService, logger: PinoLogger) {
  return async (state: GraphState): Promise<NodeUpdate> => {
    const { userId, extractedBill } = state;

    // 防御性校验：理论上 confidenceScorer 已拦截，但保留以防状态异常
    if (!extractedBill?.amount || extractedBill.amount <= 0) {
      return {
        status: 'error' as const,
        reply: '账单金额无效，请重新输入',
        error: 'INVALID_AMOUNT',
      };
    }

    try {
      const [categoryId, paymentAccountId] = await Promise.all([
        resolveCategoryId(db, userId, extractedBill.category),
        resolvePaymentAccountId(db, userId, extractedBill.paymentAccount),
      ]);

      const bill = await createBillRecord(db, {
        userId,
        categoryId,
        paymentAccountId,
        type: extractedBill.type ?? 'expense',
        amount: extractedBill.amount,
        billDate: extractedBill.billDate,
        note: extractedBill.note,
      });

      logger.info({ billId: bill.id, amount: bill.amount }, '账单自动创建完成');

      const typeLabel = extractedBill.type === 'income' ? '收入' : '支出';
      const catLabel = extractedBill.category ?? '未分类';

      return {
        status: 'auto_created' as const,
        createdBill: bill as Record<string, unknown>,
        reply: `已记录：${typeLabel} ¥${extractedBill.amount}（${catLabel}）`,
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
