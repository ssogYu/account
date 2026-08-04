import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { DbService } from '../../infra/db/db.service';
import { FamilyService } from '../family/family.service';
import type { CreatePaymentAccountDto } from './dto/create-payment-account.dto';
import type { UpdatePaymentAccountDto } from './dto/update-payment-account.dto';

@Injectable()
export class PaymentAccountService {
  constructor(
    private readonly db: DbService,
    private readonly familyService: FamilyService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('PaymentAccountService');
  }

  // ==========================================================
  // 查询
  // ==========================================================

  /** 获取支付账户列表：系统默认 + 家庭组共享 + 用户自定义 */
  async findAll(userId: string) {
    const familyId = await this.familyService.getFamilyId(userId);

    const or: Record<string, unknown>[] = [{ isSystem: true }, { userId }];

    if (familyId) {
      or.push({ familyId });
    }

    return this.db.paymentAccount.findMany({
      where: { OR: or },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // ==========================================================
  // 创建
  // ==========================================================

  /** 创建支付账户：用户加入了家庭组则创建为家庭共享账户，否则为个人账户 */
  async create(userId: string, dto: CreatePaymentAccountDto) {
    const familyId = await this.familyService.getFamilyId(userId);

    const existing = familyId
      ? await this.db.paymentAccount.findFirst({
          where: { familyId, userId: null, name: dto.name },
        })
      : await this.db.paymentAccount.findFirst({
          where: { userId, familyId: null, name: dto.name },
        });

    if (existing) {
      throw new ConflictException(`支付账户 "${dto.name}" 已存在`);
    }

    const account = await this.db.paymentAccount.create({
      data: {
        userId: familyId ? null : userId,
        familyId: familyId ?? null,
        name: dto.name,
        icon: dto.icon ?? null,
        balance: dto.balance ?? null,
        isSystem: false,
      },
    });

    this.logger.info(
      {
        accountId: account.id,
        name: account.name,
        familyId: familyId ?? undefined,
      },
      '支付账户创建成功',
    );
    return account;
  }

  // ==========================================================
  // 更新
  // ==========================================================

  /** 更新支付账户：系统账户不可改，家庭组内任何成员可改家庭账户 */
  async update(userId: string, id: string, dto: UpdatePaymentAccountDto) {
    const account = await this.findByIdAndValidate(id, userId, false);
    const familyId = account.familyId;

    if (dto.name) {
      const duplicate = familyId
        ? await this.db.paymentAccount.findFirst({
            where: { familyId, userId: null, name: dto.name },
          })
        : await this.db.paymentAccount.findFirst({
            where: { userId, familyId: null, name: dto.name },
          });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(`支付账户 "${dto.name}" 已存在`);
      }
    }

    return this.db.paymentAccount.update({
      where: { id: account.id },
      data: {
        name: dto.name,
        icon: dto.icon,
        balance: dto.balance,
      },
    });
  }

  // ==========================================================
  // 删除
  // ==========================================================

  /** 删除支付账户：系统账户不可删，家庭组内任何成员可删家庭账户 */
  async remove(userId: string, id: string) {
    await this.findByIdAndValidate(id, userId, false);

    const billCount = await this.db.bill.count({
      where: { paymentAccountId: id },
    });

    if (billCount > 0) {
      throw new ConflictException(
        `该支付账户下存在 ${billCount} 条账单，无法删除`,
      );
    }

    await this.db.paymentAccount.delete({ where: { id } });

    return { deleted: true };
  }

  // ==========================================================
  // 私有方法
  // ==========================================================

  /**
   * 查询并校验支付账户操作权限
   *
   * 规则：系统账户不可改/删 | 个人账户仅所有者可操作 |
   * 家庭组账户组内任何成员可操作
   */
  private async findByIdAndValidate(
    id: string,
    userId: string,
    allowSystem: boolean,
  ) {
    const account = await this.db.paymentAccount.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('支付账户不存在');
    }

    if (account.isSystem) {
      if (!allowSystem) {
        throw new ForbiddenException('系统默认支付账户不可修改或删除');
      }
      return account;
    }

    // 个人账户：仅所有者可操作
    if (account.userId) {
      if (account.userId !== userId) {
        throw new ForbiddenException('无权操作该支付账户');
      }
      return account;
    }

    // 家庭组账户：需要确认用户属于同一家庭组
    if (account.familyId) {
      const userFamilyId = await this.familyService.getFamilyId(userId);
      if (userFamilyId !== account.familyId) {
        throw new ForbiddenException('无权操作该支付账户');
      }
      return account;
    }

    throw new ForbiddenException('无权操作该支付账户');
  }
}
