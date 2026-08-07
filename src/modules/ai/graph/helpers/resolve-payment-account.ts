import type { DbService } from '../../../../infra/db/db.service';
import type { FamilyService } from '../../../family/family.service';

/**
 * 按支付账户名称查找支付账户 ID。
 * 优先级：用户个人 > 家庭组共享 > 系统默认 > null。
 */
export async function resolvePaymentAccountId(
  db: DbService,
  userId: string,
  name?: string,
  familyService?: FamilyService,
): Promise<string | null> {
  if (!name) return null;

  // 1. 用户个人支付账户
  const personal = await db.paymentAccount.findFirst({
    where: { userId, familyId: null, name },
    select: { id: true },
  });
  if (personal) return personal.id;

  // 2. 家庭组共享支付账户
  const familyId = familyService
    ? await familyService.getFamilyId(userId)
    : null;
  if (familyId) {
    const shared = await db.paymentAccount.findFirst({
      where: { familyId, name },
      select: { id: true },
    });
    if (shared) return shared.id;
  }

  // 3. 系统默认支付账户
  const system = await db.paymentAccount.findFirst({
    where: { isSystem: true, name },
    select: { id: true },
  });
  if (system) return system.id;

  return null;
}
