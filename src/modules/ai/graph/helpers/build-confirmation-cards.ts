import { randomUUID } from 'crypto';
import type { BillExtractionResult } from '../../schemas/extraction.schema';
import type { ConfirmationCardItem } from '../state';

/** 字段中文名映射 */
const FIELD_LABELS: Record<string, string> = {
  type: '类型',
  amount: '金额',
  category: '分类',
  paymentAccount: '支付账户',
  billDate: '时间',
};

export interface ConfirmationCardsResult {
  sessionId: string;
  cards: ConfirmationCardItem[];
  reply: string;
}

/**
 * 为指定账单生成确认卡片（带唯一 id）与可读确认文本。
 * 供 confirmationCard 节点与 mixedHandler 复用。
 */
export function buildConfirmationCards(
  bills: BillExtractionResult[],
  evaluations: { missingFields: string[] }[],
): ConfirmationCardsResult {
  const sessionId = randomUUID();

  const cards: ConfirmationCardItem[] = bills.map((bill, index) => ({
    id: randomUUID(),
    type: bill.type ?? '',
    amount: bill.amount ?? 0,
    category: bill.category ?? '',
    paymentAccount: bill.paymentAccount ?? '',
    billDate: bill.billDate ?? '',
    note: bill.note ?? '',
    missingFields: evaluations[index]?.missingFields ?? [],
    bill,
  }));

  const lines: string[] = [
    cards.length > 1
      ? `识别到 ${cards.length} 笔账单，请需逐笔确认：`
      : '确认以下账单？',
  ];

  cards.forEach((card, index) => {
    const typeText =
      card.type === 'income' ? '收入' : card.type === 'expense' ? '支出' : '？';
    const amountText =
      card.amount && card.amount > 0 ? `¥${card.amount}` : '¥?';
    const catText = card.category ? `（${card.category}）` : '';
    const prefix = cards.length > 1 ? `${index + 1}. ` : '';
    lines.push(`${prefix}${typeText} ${amountText}${catText}`);

    if (card.billDate) lines.push(`时间：${card.billDate}`);
    if (card.paymentAccount) lines.push(`账户：${card.paymentAccount}`);
    if (card.note) lines.push(`备注：${card.note}`);

    if (card.missingFields.length > 0) {
      const fieldNames = card.missingFields
        .map((f) => FIELD_LABELS[f] ?? f)
        .join('、');
      lines.push(`待补充⚠️：${fieldNames}`);
    }
  });

  return { sessionId, cards, reply: lines.join('\n') };
}
