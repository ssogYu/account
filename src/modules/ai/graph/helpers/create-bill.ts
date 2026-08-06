import type { DbService } from '../../../../infra/db/db.service';
import { toDateTime, nowDate } from '../../../../common/utils/date';

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
 * 创建账单记录。
 * billDate 期望为 YYYY-MM-DD HH:mm:ss 格式；解析失败时回退为当前时间。
 */
export async function createBillRecord(
  db: DbService,
  params: CreateBillParams,
) {
  const validDate =
    params.billDate &&
    /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(params.billDate);
  const billDate = validDate ? toDateTime(params.billDate!) : nowDate();

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
