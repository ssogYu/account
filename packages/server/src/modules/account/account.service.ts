import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { BusinessException } from '../../common/exceptions';
import { ErrorCode } from '@ai-account/shared';
import { CreateAccountDto, UpdateAccountDto } from './dto';

const SYSTEM_ACCOUNTS = [
  { name: '微信', icon: 'wechat' },
  { name: '支付宝', icon: 'alipay' },
  { name: '现金', icon: 'cash' },
  { name: '银行卡', icon: 'bank_card' },
];

@Injectable()
export class AccountService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const count = await this.prisma.account.count({
      where: { isSystem: true },
    });
    if (count > 0) return;

    const systemAccounts = SYSTEM_ACCOUNTS.map((a) => ({
      ...a,
      isSystem: true,
      userId: null,
    }));

    await this.prisma.account.createMany({
      data: systemAccounts,
      skipDuplicates: true,
    });
  }

  async findMany(userId: string) {
    return this.prisma.account.findMany({
      where: {
        OR: [{ isSystem: true }, { userId }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateAccountDto) {
    const existing = await this.prisma.account.findFirst({
      where: { userId, name: dto.name },
    });
    if (existing) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, '该账户名称已存在');
    }

    return this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        icon: dto.icon,
        isSystem: false,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    const account = await this.prisma.account.findFirst({ where: { id } });
    if (!account) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '账户不存在');
    }
    if (account.isSystem) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '系统默认账户不可修改');
    }
    if (account.userId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '无权修改此账户');
    }

    if (dto.name !== undefined) {
      const duplicate = await this.prisma.account.findFirst({
        where: { userId, name: dto.name, id: { not: id } },
      });
      if (duplicate) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, '该账户名称已存在');
      }
    }

    return this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({ where: { id } });
    if (!account) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '账户不存在');
    }
    if (account.isSystem) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '系统默认账户不可删除');
    }
    if (account.userId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '无权删除此账户');
    }

    await this.prisma.account.delete({ where: { id } });
    return { success: true };
  }

  async findByName(userId: string, name: string) {
    return this.prisma.account.findFirst({
      where: {
        OR: [{ AND: [{ isSystem: true }] }, { AND: [{ userId }] }],
        name,
      },
    });
  }
}
