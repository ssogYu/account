import type { DbService } from '../../../../infra/db/db.service';

/**
 * 按支付账户名称查找用户或系统支付账户 ID。
 * 找不到或 name 为空时返回 null。
 */
export async function resolvePaymentAccountId(
  db: DbService,
  userId: string,
  name?: string,
): Promise<string | null> {
  if (!name) return null;

  const userAccount = await db.paymentAccount.findFirst({
    where: { userId, name },
    select: { id: true },
  });
  if (userAccount) return userAccount.id;

  const systemAccount = await db.paymentAccount.findFirst({
    where: { isSystem: true, name },
    select: { id: true },
  });
  if (systemAccount) return systemAccount.id;

  return null;
}
