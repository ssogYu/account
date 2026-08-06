/**
 * 账单回复文本格式化公共 helper。
 * 供 auto-inserter（自动入库）与 ai.service（手动确认）复用，
 * 保证两个入口产出的回复格式一致。
 */

import dayjs from 'dayjs';

/** 从账单对象中安全提取字段（避免 Record<string, unknown> 类型窄化问题） */
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

/** 获取账单日期并规范为 YYYY-MM-DD（无效/缺失返回 null） */
function getBillDate(bill: Record<string, unknown>): string | null {
  const date = getField(bill, 'billDate');
  return dayjs(date as any).format('YYYY-MM-DD');
}

/**
 * 格式化单笔账单明细，保证关键信息完整。
 * 首行为「类型 · 金额 · 分类 · 账户」，日期、备注分行展示。
 */
export function formatBillText(bill: Record<string, unknown>): string {
  const parts: string[] = [
    `${getTypeText(bill)} ¥${String(getField(bill, 'amount'))}（${getCategoryName(bill)}）`,
  ];
  const account = getPaymentAccountName(bill);
  if (account) parts.push(` · ${account}`);
  const date = getBillDate(bill);
  if (date) parts.push(`\n日期：${date}`);
  const note = getNote(bill);
  if (note) parts.push(`\n备注：${note}`);
  return parts.join('');
}

/** 构建已记录账单的回复文本（单笔或多笔） */
export function buildBillReply(bills: Record<string, unknown>[]): string {
  if (bills.length === 1) {
    return `已记录：${formatBillText(bills[0])}`;
  }
  const lines = bills.map((b, i) => `${i + 1}. ${formatBillText(b)}`);
  return `已记录 ${bills.length} 笔账单：\n${lines.join('\n')}`;
}
