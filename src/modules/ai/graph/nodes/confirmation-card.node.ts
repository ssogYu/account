import { randomUUID } from 'crypto';
import type { PinoLogger } from 'nestjs-pino';
import type { GraphState, NodeUpdate, ConfirmationCardItem } from '../state';

/** 字段中文名映射 */
const FIELD_LABELS: Record<string, string> = {
  type: '类型',
  amount: '金额',
  category: '分类',
  paymentAccount: '支付账户',
  billDate: '日期',
};

/** 确认卡片节点：为每笔账单生成一张卡片（带唯一 id），构造确认信息供用户逐笔确认 */
export function createConfirmationCard(logger: PinoLogger) {
  return (state: GraphState): NodeUpdate => {
    const { extractedBills = [], billEvaluations = [] } = state;
    const sessionId = randomUUID();

    const cards: ConfirmationCardItem[] = extractedBills.map((bill, index) => ({
      id: randomUUID(),
      type: bill.type ?? '',
      amount: bill.amount ?? 0,
      category: bill.category ?? '',
      paymentAccount: bill.paymentAccount ?? '',
      billDate: bill.billDate ?? '',
      note: bill.note ?? '',
      missingFields: billEvaluations[index]?.missingFields ?? [],
      bill,
    }));

    // 构建可读的确认文本
    const lines: string[] = [
      cards.length > 1
        ? `共识别到 ${cards.length} 笔账单，请逐笔确认：`
        : '确认以下账单？',
    ];

    cards.forEach((card, index) => {
      const typeText =
        card.type === 'income'
          ? '收入'
          : card.type === 'expense'
            ? '支出'
            : '？';
      const amountText =
        card?.amount && card.amount > 0 ? `¥${card.amount}` : '¥?';
      const catText = card.category ? `（${card.category}）` : '';
      const prefix = cards.length > 1 ? `${index + 1}. ` : '';
      lines.push(`${prefix}${typeText} ${amountText}${catText}`);

      if (card.billDate) lines.push(`  日期：${card.billDate}`);
      if (card.paymentAccount) lines.push(`  账户：${card.paymentAccount}`);
      if (card.note) lines.push(`  备注：${card.note}`);

      if (card.missingFields.length > 0) {
        const fieldNames = card.missingFields
          .map((f) => FIELD_LABELS[f] ?? f)
          .join('、');
        lines.push(`  ⚠️ 待补充：${fieldNames}`);
      }
    });

    const reply = lines.join('\n');

    logger.info({ sessionId, count: cards.length }, '生成确认卡片');

    return {
      sessionId,
      confirmationCards: cards,
      reply,
      status: 'pending_confirm' as const,
    };
  };
}
