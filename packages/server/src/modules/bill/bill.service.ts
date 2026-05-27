import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { BusinessException } from '../../common/exceptions';
import { ErrorCode } from '@ai-account/shared';
import { CreateBillDto, UpdateBillDto, QueryBillDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillService {
  constructor(private readonly prisma: PrismaService) {}

  /** 创建账单 */
  async create(userId: string, dto: CreateBillDto) {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      select: { familyId: true },
    });

    return this.prisma.bill.create({
      data: {
        userId,
        familyId: membership?.familyId ?? null,
        categoryId: dto.categoryId,
        type: dto.type,
        amount: dto.amount,
        note: dto.note ?? null,
        account: dto.account ?? null,
        date: dto.date ? new Date(dto.date) : new Date(),
        source: dto.source ?? 'manual',
      },
      include: { category: true },
    });
  }

  /** 查询账单列表（分页 + 筛选） */
  async findMany(userId: string, query: QueryBillDto) {
    const {
      page = 1,
      pageSize = 20,
      type,
      categoryId,
      startDate,
      endDate,
      month,
    } = query;

    const where = this.buildListWhere(userId, {
      type,
      categoryId,
      startDate,
      endDate,
      month,
    });

    const [total, items] = await Promise.all([
      this.prisma.bill.count({ where }),
      this.prisma.bill.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 获取账单详情 */
  async findOne(userId: string, id: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, userId },
      include: { category: true },
    });
    if (!bill) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '账单不存在');
    }
    return bill;
  }

  /** 更新账单 */
  async update(userId: string, id: string, dto: UpdateBillDto) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, userId },
    });
    if (!bill) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '账单不存在');
    }

    return this.prisma.bill.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.account !== undefined && { account: dto.account }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
      },
      include: { category: true },
    });
  }

  /** 删除账单 */
  async remove(userId: string, id: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, userId },
    });
    if (!bill) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '账单不存在');
    }

    await this.prisma.bill.delete({ where: { id } });
    return { success: true };
  }

  /** 获取月度收支汇总 */
  async getSummary(userId: string, month?: string) {
    const targetMonth = month ?? this.getCurrentMonth();
    const [year, m] = targetMonth.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 1);

    const { totalExpense, totalIncome, balance } = await this.aggregateSummary(
      userId,
      start,
      end,
    );

    return { month: targetMonth, totalExpense, totalIncome, balance };
  }

  /** 获取今日收支汇总 */
  async getTodaySummary(userId: string) {
    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.aggregateSummary(userId, start, end);
  }

  // ── 私有方法 ──

  private buildListWhere(
    userId: string,
    filters: {
      type?: string;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
      month?: string;
    },
  ): Prisma.BillWhereInput {
    const where: Prisma.BillWhereInput = { userId };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.month) {
      const [year, m] = filters.month.split('-').map(Number);
      where.date = { gte: new Date(year, m - 1, 1), lt: new Date(year, m, 1) };
    } else if (filters.startDate || filters.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
      if (filters.endDate) dateFilter.lt = new Date(filters.endDate);
      where.date = dateFilter;
    }

    return where;
  }

  private async aggregateSummary(userId: string, start: Date, end: Date) {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      select: { familyId: true },
    });

    const dateFilter = { gte: start, lt: end };
    const baseWhere: Prisma.BillWhereInput = membership
      ? { familyId: membership.familyId, date: dateFilter }
      : { userId, date: dateFilter };

    const [expenseResult, incomeResult] = await Promise.all([
      this.prisma.bill.aggregate({
        where: { ...baseWhere, type: 'expense' },
        _sum: { amount: true },
      }),
      this.prisma.bill.aggregate({
        where: { ...baseWhere, type: 'income' },
        _sum: { amount: true },
      }),
    ]);

    const totalExpense = Number(expenseResult._sum.amount ?? 0);
    const totalIncome = Number(incomeResult._sum.amount ?? 0);

    return {
      totalExpense,
      totalIncome,
      balance: totalIncome - totalExpense,
    };
  }

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
