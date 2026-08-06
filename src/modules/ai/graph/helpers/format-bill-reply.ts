/**
 * 账单回复文本格式化公共 helper。
 * 供 auto-inserter（自动入库）与 ai.service（手动确认）复用。
 */

import { formatDateTime } from '../../../../common/utils/date';

function getField(bill: Record<string, unknown>, key: string): unknown {
  return bill[key];
}

function getTypeText(bill: Record<string, unknown>): string {
  return getField(bill, 'type') === 'income' ? '收入' : '支出';
}

function getCategoryName(bill: Record<string, unknown>): string {
  const category = getField(bill, 'category') as
    | { name?: string }
    | null
    | undefined;
  return category?.name ?? '未分类';
}

function getPaymentAccountName(bill: Record<string, unknown>): string | null {
  const account = getField(bill, 'paymentAccount') as
    | { name?: string }
    | null
    | undefined;
  return account?.name ?? null;
}

function getNote(bill: Record<string, unknown>): string | null {
  const note = getField(bill, 'note');
  return typeof note === 'string' && note.trim().length > 0
    ? note.trim()
    : null;
}

function getBillDate(bill: Record<string, unknown>): string | null {
  const date = getField(bill, 'billDate');
  if (!date) return null;
  return formatDateTime(date as Parameters<typeof formatDateTime>[0]);
}

export function formatBillText(bill: Record<string, unknown>): string {
  const parts: string[] = [
    `${getTypeText(bill)} ¥${String(getField(bill, 'amount'))}（${getCategoryName(bill)}）`,
  ];
  const account = getPaymentAccountName(bill);
  if (account) parts.push(` · ${account}`);
  const date = getBillDate(bill);
  if (date) parts.push(`\n时间：${date}`);
  const note = getNote(bill);
  if (note) parts.push(`\n备注：${note}`);
  return parts.join('');
}

export function buildBillReply(bills: Record<string, unknown>[]): string {
  if (bills.length === 1) {
    return `已记录：${formatBillText(bills[0])}`;
  }
  const lines = bills.map((b, i) => `${i + 1}. ${formatBillText(b)}`);
  return `已记录 ${bills.length} 笔账单：\n${lines.join('\n')}`;
}
