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

    if (!extractedBill) {
      return { status: 'error', error: '提取数据为空，无法创建账单' };
    }

    if (typeof extractedBill.amount !== 'number' || extractedBill.amount <= 0) {
      return { status: 'error', error: '金额无效，无法创建账单' };
    }

    const [categoryId, paymentAccountId] = await Promise.all([
      resolveCategoryId(db, userId, extractedBill.category),
      resolvePaymentAccountId(db, userId, extractedBill.paymentAccount),
    ]);

    const bill = await createBillRecord(db, {
      userId,
      categoryId,
      paymentAccountId,
      type: extractedBill.type,
      amount: extractedBill.amount,
      billDate: extractedBill.billDate,
      note: extractedBill.note,
    });

    logger.info({ billId: bill.id, amount: bill.amount }, '账单自动创建完成');

    return {
      status: 'auto_created',
      createdBill: bill as unknown as Record<string, unknown>,
      reply: `已记录：${extractedBill.type === 'expense' ? '支出' : '收入'} ¥${extractedBill.amount}（${extractedBill.category}）`,
    };
  };
}
