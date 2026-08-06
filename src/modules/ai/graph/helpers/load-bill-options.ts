import type { DbService } from '../../../../infra/db/db.service';

export interface BillOptions {
  categories: string[];
  paymentAccounts: string[];
}

/**
 * 加载用户可见的分类与支付账户名称列表（用户自建 + 系统默认）。
 * 用于注入 extractor 提示词，约束 AI 只能在限定名称内匹配。
 */
export async function loadBillOptions(
  db: DbService,
  userId: string,
): Promise<BillOptions> {
  const [categories, paymentAccounts] = await Promise.all([
    db.category.findMany({
      where: { OR: [{ userId }, { isSystem: true }] },
      select: { name: true },
      orderBy: { sortOrder: 'asc' },
    }),
    db.paymentAccount.findMany({
      where: { OR: [{ userId }, { isSystem: true }] },
      select: { name: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  return {
    categories: [...new Set(categories.map((c) => c.name))],
    paymentAccounts: [...new Set(paymentAccounts.map((p) => p.name))],
  };
}
