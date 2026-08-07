import type { DbService } from '../../../../infra/db/db.service';
import type { FamilyService } from '../../../family/family.service';

export interface BillOptions {
  categories: string[];
  paymentAccounts: string[];
}

/**
 * 加载用户可见的分类与支付账户名称列表。
 * 范围：系统默认 + 用户个人 + 家庭组共享（如已加入）。
 * 用于注入 extractor 提示词，约束 AI 只能在限定名称内匹配。
 */
export async function loadBillOptions(
  db: DbService,
  userId: string,
  familyService?: FamilyService,
): Promise<BillOptions> {
  const familyId = familyService
    ? await familyService.getFamilyId(userId)
    : null;

  const where = familyId
    ? { OR: [{ isSystem: true }, { userId }, { familyId }] }
    : { OR: [{ userId }, { isSystem: true }] };

  const [categories, paymentAccounts] = await Promise.all([
    db.category.findMany({
      where,
      select: { name: true },
      orderBy: { sortOrder: 'asc' },
    }),
    db.paymentAccount.findMany({
      where,
      select: { name: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  return {
    categories: [...new Set(categories.map((c) => c.name))],
    paymentAccounts: [...new Set(paymentAccounts.map((p) => p.name))],
  };
}
