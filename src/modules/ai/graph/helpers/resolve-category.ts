import type { DbService } from '../../../../infra/db/db.service';
import type { FamilyService } from '../../../family/family.service';

const FALLBACK_CATEGORY = [
  '其他支出' as const,
  '其他收入' as const,
  '其他' as const,
];

/**
 * 按分类名称查找分类 ID。
 * 优先级：用户个人 > 家庭组共享 > 系统默认 > 兜底。
 */
export async function resolveCategoryId(
  db: DbService,
  userId: string,
  name?: string,
  familyService?: FamilyService,
): Promise<string> {
  if (!name) {
    return resolveFallback(db);
  }

  // 1. 用户个人分类
  const personal = await db.category.findFirst({
    where: { userId, familyId: null, name },
    select: { id: true },
  });
  if (personal) return personal.id;

  // 2. 家庭组共享分类
  const familyId = familyService
    ? await familyService.getFamilyId(userId)
    : null;
  if (familyId) {
    const shared = await db.category.findFirst({
      where: { familyId, name },
      select: { id: true },
    });
    if (shared) return shared.id;
  }

  // 3. 系统默认分类
  const system = await db.category.findFirst({
    where: { isSystem: true, name },
    select: { id: true },
  });
  if (system) return system.id;

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
