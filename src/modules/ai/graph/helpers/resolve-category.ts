import type { DbService } from '../../../../infra/db/db.service';

const FALLBACK_CATEGORY = [
  '其他支出' as const,
  '其他收入' as const,
  '其他' as const,
];

/**
 * 按分类名称查找用户或系统分类 ID。
 * 找不到或 name 为空时，返回系统的兜底分类 ID。
 * 兜底存在性由 seed 保证，若仍为空则抛错。
 */
export async function resolveCategoryId(
  db: DbService,
  userId: string,
  name?: string,
): Promise<string> {
  if (!name) {
    return resolveFallback(db);
  }

  const userCategory = await db.category.findFirst({
    where: { userId, name },
    select: { id: true },
  });
  if (userCategory) return userCategory.id;

  const systemCategory = await db.category.findFirst({
    where: { isSystem: true, name },
    select: { id: true },
  });
  if (systemCategory) return systemCategory.id;

  return resolveFallback(db);
}

async function resolveFallback(db: DbService): Promise<string> {
  const fallback = await db.category.findFirst({
    where: { isSystem: true, name: { in: [...FALLBACK_CATEGORY] } },
    select: { id: true },
    orderBy: { sortOrder: 'asc' },
  });

  if (!fallback?.id) {
    throw new Error('system fallback category not found — ensure seed has run');
  }

  return fallback.id;
}
