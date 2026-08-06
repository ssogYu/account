import type { DbService } from '../../../../infra/db/db.service';

interface CreateBillParams {
  userId: string;
  categoryId: string;
  paymentAccountId: string | null;
  type: 'expense' | 'income';
  amount: number;
  billDate?: string | null;
  note?: string | null;
}

/**
 * 创建账单记录，统一 billDate 解析和 include 关系。
 * billDate 期望为 YYYY-MM-DD 格式；解析失败时回退为今天，保证入库日期永远合法。
 */
export async function createBillRecord(
  db: DbService,
  params: CreateBillParams,
) {
  const parsed = params.billDate ? Date.parse(params.billDate) : NaN;
  const billDate = Number.isNaN(parsed)
    ? new Date()
    : new Date(params.billDate!);

  return db.bill.create({
    data: {
      userId: params.userId,
      categoryId: params.categoryId,
      paymentAccountId: params.paymentAccountId,
      type: params.type,
      amount: params.amount,
      billDate,
      note: params.note ?? null,
    },
    include: {
      category: { select: { id: true, name: true, icon: true } },
      paymentAccount: { select: { id: true, name: true, icon: true } },
    },
  });
}
