import { randomUUID } from 'crypto';
import type { PinoLogger } from 'nestjs-pino';
import type { GraphState, NodeUpdate } from '../state';

/** 字段中文名映射 */
const FIELD_LABELS: Record<string, string> = {
  type: '类型',
  amount: '金额',
  category: '分类',
  paymentAccount: '支付账户',
  billDate: '日期',
};

/** 确认卡片节点：生成 sessionId、构造确认信息供用户二次确认 */
export function createConfirmationCard(logger: PinoLogger) {
  return (state: GraphState): NodeUpdate => {
    const { extractedBill, missingFields = [] } = state;
    const sessionId = randomUUID();

    const type = extractedBill?.type;
    const amount = extractedBill?.amount;
    const category = extractedBill?.category;
    const paymentAccount = extractedBill?.paymentAccount;
    const billDate = extractedBill?.billDate;
    const note = extractedBill?.note;

    const card = {
      type: type ?? '',
      amount: amount ?? 0,
      category: category ?? '',
      paymentAccount: paymentAccount ?? '',
      billDate: billDate ?? '',
      note: note ?? '',
      missingFields,
    };

    // 构建可读的确认文本
    const typeText =
      type === 'income' ? '收入' : type === 'expense' ? '支出' : '？';
    const amountText = typeof amount === 'number' ? `¥${amount}` : '¥?';
    const catText = category ? `（${category}）` : '';
    const lines: string[] = [
      `确认以下账单？`,
      `${typeText} ${amountText}${catText}`,
    ];

    if (billDate) lines.push(`日期：${billDate}`);
    if (paymentAccount) lines.push(`账户：${paymentAccount}`);
    if (note) lines.push(`备注：${note}`);

    if (missingFields.length > 0) {
      const fieldNames = missingFields
        .map((f) => FIELD_LABELS[f] ?? f)
        .join('、');
      lines.push(`\n⚠️ 以下信息待补充：${fieldNames}`);
    }

    const reply = lines.join('\n');

    logger.info({ sessionId, missingFields }, '生成确认卡片');

    return {
      sessionId,
      confirmationCard: card,
      reply,
      status: 'pending_confirm' as const,
    };
  };
}
