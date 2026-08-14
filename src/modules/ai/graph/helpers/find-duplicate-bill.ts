import type { DbService } from '../../../../infra/db/db.service';
import type { FamilyService } from '../../../family/family.service';
import { toDateTime } from '../../../../common/utils/date';

export interface DuplicateQuery {
  amount: number;
  type: 'expense' | 'income';
  categoryId: string;
  /** YYYY-MM-DD HH:mm:ss，重复判定精确到时分（秒归一化为 0） */
  billDate: string;
}

/**
 * 按「金额 + 类型 + 分类 + 时间（精确到时分）」查找重复账单。
 *
 * 时间维度忽略秒：将秒归零后做等值匹配，同一分钟内视为重复
 * （如 14:30:05 与 14:30:45 均归一为 14:30:00）。
 *
 * 范围：家庭组按 familyId 全局去重（同一笔被不同成员重复记录），
 *      未加入家庭组按 userId 去重。
 *
 * @returns 命中重复时返回该账单记录，否则返回 null
 */
export async function findDuplicateBill(
  db: DbService,
  userId: string,
  familyService: FamilyService,
  query: DuplicateQuery,
) {
  // billDate 非法时跳过查重（避免仅凭金额+类型+分类误判为重复）
  const validDate =
    query.billDate &&
    /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(query.billDate);
  if (!validDate) {
    return null;
  }

  // 秒归零，构造分钟区间 [X分00秒, X分59.999秒)，重复判定精确到分钟
  const minuteStart = toDateTime(query.billDate);
  minuteStart.setSeconds(0, 0);
  const minuteEnd = new Date(minuteStart.getTime() + 60 * 1000);

  const familyId = await familyService.getFamilyId(userId);

  return db.bill.findFirst({
    where: {
      ...(familyId ? { familyId } : { userId, familyId: null }),
      amount: query.amount,
      type: query.type,
      categoryId: query.categoryId,
      billDate: { gte: minuteStart, lt: minuteEnd },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      category: { select: { name: true } },
    },
  });
}
