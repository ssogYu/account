import { Injectable, OnModuleInit } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';

import { DbService } from '../db/db.service';

const SEED_DATA = {
  categories: [
    // 支出
    { name: '餐饮', icon: '🍜', type: CategoryType.expense, sortOrder: 1 },
    { name: '交通', icon: '🚗', type: CategoryType.expense, sortOrder: 2 },
    { name: '购物', icon: '🛒', type: CategoryType.expense, sortOrder: 3 },
    { name: '住房', icon: '🏠', type: CategoryType.expense, sortOrder: 4 },
    { name: '通讯', icon: '📱', type: CategoryType.expense, sortOrder: 5 },
    { name: '娱乐', icon: '🎮', type: CategoryType.expense, sortOrder: 6 },
    { name: '医疗', icon: '💊', type: CategoryType.expense, sortOrder: 7 },
    { name: '教育', icon: '📚', type: CategoryType.expense, sortOrder: 8 },
    { name: '日用', icon: '🧴', type: CategoryType.expense, sortOrder: 9 },
    { name: '服饰', icon: '👔', type: CategoryType.expense, sortOrder: 10 },
    // { name: '其他支出', icon: '💸', type: CategoryType.expense, sortOrder: 99 },
    // 收入
    { name: '工资', icon: '💰', type: CategoryType.income, sortOrder: 1 },
    { name: '奖金', icon: '🧧', type: CategoryType.income, sortOrder: 2 },
    { name: '投资', icon: '📈', type: CategoryType.income, sortOrder: 3 },
    { name: '兼职', icon: '💼', type: CategoryType.income, sortOrder: 4 },
    { name: '其他收入', icon: '💵', type: CategoryType.income, sortOrder: 99 },
  ],
  paymentAccounts: [
    { name: '微信', icon: '💚', sortOrder: 1 },
    { name: '支付宝', icon: '💙', sortOrder: 2 },
    { name: '现金', icon: '💴', sortOrder: 3 },
    { name: '银行卡', icon: '💳', sortOrder: 4 },
  ],
} as const;

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    private readonly db: DbService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('SeedService');
  }

  async onModuleInit() {
    await this.seedCategories();
    await this.seedPaymentAccounts();
  }

  private async seedCategories() {
    const count = await this.db.category.count({ where: { isSystem: true } });
    if (count > 0) return;

    let inserted = 0;
    for (const cat of SEED_DATA.categories) {
      await this.db.category.create({
        data: { ...cat, userId: null, isSystem: true },
      });
      inserted++;
    }

    this.logger.info({ count: inserted }, '系统默认分类注入完成');
  }

  private async seedPaymentAccounts() {
    const count = await this.db.paymentAccount.count({
      where: { isSystem: true },
    });
    if (count > 0) return;

    let inserted = 0;
    for (const acc of SEED_DATA.paymentAccounts) {
      await this.db.paymentAccount.create({
        data: {
          name: acc.name,
          icon: acc.icon,
          sortOrder: acc.sortOrder,
          userId: null,
          balance: null,
          isSystem: true,
        },
      });
      inserted++;
    }

    this.logger.info({ count: inserted }, '系统默认支付账户注入完成');
  }
}
