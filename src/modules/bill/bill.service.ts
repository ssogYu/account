import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';

import { DbService } from '../../infra/db/db.service';
import { FamilyService } from '../family/family.service';
import { toDateTime, nowDate } from '../../common/utils/date';
import type { CreateBillDto } from './dto/create-bill.dto';
import type { QueryBillDto } from './dto/query-bill.dto';
import type { UpdateBillDto } from './dto/update-bill.dto';

/** 关联查询要 include 的关系 */
const billIncludes = {
  category: { select: { id: true, name: true, icon: true } },
  paymentAccount: { select: { id: true, name: true, icon: true } },
  user: { select: { id: true, username: true } },
} satisfies Prisma.BillInclude;

@Injectable()
export class BillService {
  constructor(
    private readonly db: DbService,
    private readonly familyService: FamilyService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('BillService');
  }

  // ==========================================================
  // 查询
  // ==========================================================

  /** 分页查询账单列表 */
  async findAll(userId: string, query: QueryBillDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.BillWhereInput = {
      ...this.buildFilters(query),
    };

    const familyId = await this.familyService.getFamilyId(userId);
    if (familyId) {
      where.familyId = familyId;
    } else {
      where.userId = userId;
      where.familyId = null;
    }

    const [list, total] = await Promise.all([
      this.db.bill.findMany({
        where,
        include: billIncludes,
        orderBy: { billDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.bill.count({ where }),
    ]);

    return {
      list,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /** 查询单条账单详情 */
  async findById(userId: string, id: string) {
    const bill = await this.db.bill.findUnique({
      where: { id },
      include: billIncludes,
    });

    if (!bill) {
      throw new NotFoundException('账单不存在');
    }

    await this.validateBillAccess(userId, bill);

    return bill;
  }

  // ==========================================================
  // 增删改
  // ==========================================================

  /** 创建账单 */
  async create(userId: string, dto: CreateBillDto) {
    await this.validateCategory(userId, dto.categoryId);
    if (dto.paymentAccountId) {
      await this.validatePaymentAccount(userId, dto.paymentAccountId);
    }

    const familyId = await this.familyService.getFamilyId(userId);

    const bill = await this.db.bill.create({
      data: {
        userId,
        familyId,
        amount: dto.amount,
        type: dto.type,
        categoryId: dto.categoryId,
        paymentAccountId: dto.paymentAccountId ?? null,
        note: dto.note ?? null,
        billDate: dto.billDate ? toDateTime(dto.billDate) : nowDate(),
      },
      include: billIncludes,
    });

    this.logger.info({ billId: bill.id, amount: bill.amount }, '账单创建成功');
    return bill;
  }

  /** 更新账单 */
  async update(userId: string, id: string, dto: UpdateBillDto) {
    const bill = await this.findById(userId, id);

    if (dto.categoryId) {
      await this.validateCategory(userId, dto.categoryId);
    }
    if (dto.paymentAccountId) {
      await this.validatePaymentAccount(userId, dto.paymentAccountId);
    }

    const updated = await this.db.bill.update({
      where: { id: bill.id },
      data: {
        amount: dto.amount,
        type: dto.type,
        categoryId: dto.categoryId,
        paymentAccountId: dto.paymentAccountId,
        note: dto.note,
        billDate: dto.billDate ? toDateTime(dto.billDate) : undefined,
      },
      include: billIncludes,
    });

    return updated;
  }

  /** 删除账单 */
  async remove(userId: string, id: string) {
    await this.findById(userId, id);

    await this.db.bill.delete({ where: { id } });

    return { deleted: true };
  }

  // ==========================================================
  // 私有校验方法
  // ==========================================================

  private async validateCategory(userId: string, categoryId: string) {
    const category = await this.db.category.findUnique({
      where: { id: categoryId },
      select: { userId: true, familyId: true, isSystem: true },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    if (category.isSystem) return;

    if (category.isSystem) return;

    // 家庭分类：用户必须在同一家庭中
    if (category.familyId) {
      const userFamilyId = await this.familyService.getFamilyId(userId);
      if (userFamilyId !== category.familyId) {
        throw new ForbiddenException('无权使用该分类');
      }
      return;
    }

    // 个人分类：必须是分类所有者
    if (category.userId !== userId) {
      throw new ForbiddenException('无权使用该分类');
    }
  }

  private async validatePaymentAccount(userId: string, accountId: string) {
    const account = await this.db.paymentAccount.findUnique({
      where: { id: accountId },
      select: { userId: true, familyId: true, isSystem: true },
    });

    if (!account) {
      throw new NotFoundException('支付账户不存在');
    }

    if (account.isSystem) return;

    // 家庭账户：用户必须在同一家庭中
    if (account.familyId) {
      const userFamilyId = await this.familyService.getFamilyId(userId);
      if (userFamilyId !== account.familyId) {
        throw new ForbiddenException('无权使用该支付账户');
      }
      return;
    }

    // 个人账户：必须是账户所有者
    if (account.userId !== userId) {
      throw new ForbiddenException('无权使用该支付账户');
    }
  }

  private async validateBillAccess(
    userId: string,
    bill: { userId: string; familyId: string | null },
  ) {
    if (bill.familyId) {
      const userFamilyId = await this.familyService.getFamilyId(userId);
      if (userFamilyId !== bill.familyId) {
        throw new ForbiddenException('无权访问该账单');
      }
    } else if (bill.userId !== userId) {
      throw new ForbiddenException('无权访问该账单');
    }
  }

  /** 构建筛选条件 */
  private buildFilters(query: QueryBillDto): Prisma.BillWhereInput {
    const where: Prisma.BillWhereInput = {};

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.paymentAccountId) where.paymentAccountId = query.paymentAccountId;
    if (query.type) where.type = query.type;
    if (query.keyword) {
      where.OR = [
        { note: { contains: query.keyword, mode: 'insensitive' } },
        {
          category: { name: { contains: query.keyword, mode: 'insensitive' } },
        },
      ];
    }
    if (query.startDate || query.endDate) {
      where.billDate = {};
      if (query.startDate) where.billDate.gte = toDateTime(query.startDate);
      if (query.endDate) where.billDate.lte = toDateTime(query.endDate);
    }

    return where;
  }
}
