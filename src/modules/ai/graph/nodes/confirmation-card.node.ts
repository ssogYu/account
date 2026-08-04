import { randomUUID } from 'crypto';
import type { PinoLogger } from 'nestjs-pino';
import type { GraphState, NodeUpdate } from '../state';

/** 确认卡片节点：生成 sessionId、构造确认信息供用户二次确认 */
export function createConfirmationCard(logger: PinoLogger) {
  return (state: GraphState): NodeUpdate => {
    const { extractedBill, missingFields } = state;
    const sessionId = randomUUID();

    const card = {
      type: extractedBill?.type,
      amount: extractedBill?.amount,
      category: extractedBill?.category,
      paymentAccount: extractedBill?.paymentAccount ?? '',
      billDate: extractedBill?.billDate ?? '今天',
      note: extractedBill?.note ?? '',
      missingFields: missingFields ?? [],
    };

    const typeText = card.type === 'expense' ? '支出' : '收入';
    const amountText =
      typeof card.amount === 'number' ? `¥${card.amount}` : '¥?';
    const reply = `确认以下账单？
${typeText} ${amountText}（${card.category}）
日期：${card.billDate}${card.paymentAccount ? `\n账户：${card.paymentAccount}` : ''}${card.note ? `\n备注：${card.note}` : ''}`;

    logger.info({ sessionId }, '生成确认卡片');

    return {
      sessionId,
      confirmationCard: card,
      reply,
      status: 'pending_confirm',
    };
  };
}
