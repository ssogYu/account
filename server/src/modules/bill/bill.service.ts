import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { BusinessException } from '../../common/exceptions';
import { ErrorCode } from '../../common/shared';
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
        date: dto.date ? this.parseLocalDate(dto.date) : new Date(),
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
      userId: filterUserId,
    } = query;

    const where = await this.buildListWhere(userId, {
      type,
      categoryId,
      startDate,
      endDate,
      month,
      filterUserId,
    });

    const [total, items] = await Promise.all([
      this.prisma.bill.count({ where }),
      this.prisma.bill.findMany({
        where,
        include: {
          category: true,
          user: { select: { id: true, nickname: true, avatar: true } },
        },
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
        ...(dto.date !== undefined && { date: this.parseLocalDate(dto.date) }),
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
  async getSummary(userId: string, month?: string, filterUserId?: string) {
    const targetMonth = month ?? this.getCurrentMonth();
    const [year, m] = targetMonth.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 1);

    const { totalExpense, totalIncome, balance } = await this.aggregateSummary(
      userId,
      start,
      end,
      filterUserId,
    );

    return { month: targetMonth, totalExpense, totalIncome, balance };
  }

  /** 获取今日收支汇总 */
  async getTodaySummary(userId: string) {
    const todayStr = this.toLocalDateKey(new Date());
    const start = this.parseLocalDate(todayStr);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.aggregateSummary(userId, start, end);
  }

  /** 获取分类汇总统计 */
  async getCategoryStats(
    userId: string,
    month?: string,
    type?: string,
    filterUserId?: string,
  ) {
    const targetMonth = month ?? this.getCurrentMonth();
    const [year, m] = targetMonth.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 1);

    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      select: { familyId: true },
    });

    const dateFilter = { gte: start, lt: end };
    const baseWhere: Prisma.BillWhereInput = membership
      ? { familyId: membership.familyId, date: dateFilter }
      : { userId, date: dateFilter };

    const where: Prisma.BillWhereInput = {
      ...baseWhere,
      ...(type ? { type } : {}),
      ...(filterUserId ? { userId: filterUserId } : {}),
    };

    const bills = await this.prisma.bill.findMany({
      where,
      include: { category: true },
    });

    // 按分类汇总
    const categoryMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        categoryIcon: string;
        amount: number;
        count: number;
      }
    >();

    for (const bill of bills) {
      const key = bill.categoryId;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryId: bill.categoryId,
          categoryName: bill.category?.name ?? '未知',
          categoryIcon: bill.category?.icon ?? 'other_exp',
          amount: 0,
          count: 0,
        });
      }
      const entry = categoryMap.get(key)!;
      entry.amount += Number(bill.amount);
      entry.count += 1;
    }

    const items = Array.from(categoryMap.values()).sort(
      (a, b) => b.amount - a.amount,
    );
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    return {
      month: targetMonth,
      type: type ?? 'all',
      totalAmount,
      items: items.map((item) => ({
        ...item,
        percentage:
          totalAmount > 0
            ? Math.round((item.amount / totalAmount) * 10000) / 100
            : 0,
      })),
    };
  }

  /** 获取每日趋势统计 */
  async getDailyStats(userId: string, month?: string, filterUserId?: string) {
    const targetMonth = month ?? this.getCurrentMonth();
    const [year, m] = targetMonth.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 1);

    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      select: { familyId: true },
    });

    const dateFilter = { gte: start, lt: end };
    const baseWhere: Prisma.BillWhereInput = membership
      ? { familyId: membership.familyId, date: dateFilter }
      : { userId, date: dateFilter };

    const memberFilter = filterUserId ? { userId: filterUserId } : {};

    const [expenseBills, incomeBills] = await Promise.all([
      this.prisma.bill.findMany({
        where: { ...baseWhere, ...memberFilter, type: 'expense' },
        select: { date: true, amount: true },
      }),
      this.prisma.bill.findMany({
        where: { ...baseWhere, ...memberFilter, type: 'income' },
        select: { date: true, amount: true },
      }),
    ]);

    // 按日汇总
    const dailyMap = new Map<string, { expense: number; income: number }>();
    const daysInMonth = new Date(year, m, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyMap.set(key, { expense: 0, income: 0 });
    }

    for (const bill of expenseBills) {
      const key = this.toLocalDateKey(bill.date);
      if (dailyMap.has(key)) {
        dailyMap.get(key)!.expense += Number(bill.amount);
      }
    }

    for (const bill of incomeBills) {
      const key = this.toLocalDateKey(bill.date);
      if (dailyMap.has(key)) {
        dailyMap.get(key)!.income += Number(bill.amount);
      }
    }

    const items = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      expense: Math.round(data.expense * 100) / 100,
      income: Math.round(data.income * 100) / 100,
    }));

    return { month: targetMonth, items };
  }

  /** 获取月度对比统计 */
  async getMonthlyComparison(
    userId: string,
    month?: string,
    filterUserId?: string,
  ) {
    const currentMonth = month ?? this.getCurrentMonth();
    const [year, m] = currentMonth.split('-').map(Number);
    const prevMonthDate = new Date(year, m - 2, 1);
    const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const [current, previous] = await Promise.all([
      this.getSummary(userId, currentMonth, filterUserId),
      this.getSummary(userId, prevMonth, filterUserId),
    ]);

    const expenseChange = previous.totalExpense
      ? Math.round(
          ((current.totalExpense - previous.totalExpense) /
            previous.totalExpense) *
            10000,
        ) / 100
      : current.totalExpense > 0
        ? 100
        : 0;

    const incomeChange = previous.totalIncome
      ? Math.round(
          ((current.totalIncome - previous.totalIncome) /
            previous.totalIncome) *
            10000,
        ) / 100
      : current.totalIncome > 0
        ? 100
        : 0;

    return {
      current: { ...current, month: currentMonth },
      previous: { ...previous, month: prevMonth },
      expenseChange,
      incomeChange,
    };
  }

  // ── 私有方法 ──

  private async buildListWhere(
    userId: string,
    filters: {
      type?: string;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
      month?: string;
      filterUserId?: string;
    },
  ): Promise<Prisma.BillWhereInput> {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      select: { familyId: true },
    });

    const where: Prisma.BillWhereInput = membership
      ? { familyId: membership.familyId }
      : { userId };

    if (filters.filterUserId) {
      where.userId = filters.filterUserId;
    }
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
      if (filters.startDate)
        dateFilter.gte = this.parseLocalDate(filters.startDate);
      if (filters.endDate) dateFilter.lt = this.parseLocalDate(filters.endDate);
      where.date = dateFilter;
    }

    return where;
  }

  private async aggregateSummary(
    userId: string,
    start: Date,
    end: Date,
    filterUserId?: string,
  ) {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId },
      select: { familyId: true },
    });

    const dateFilter = { gte: start, lt: end };
    const baseWhere: Prisma.BillWhereInput = membership
      ? { familyId: membership.familyId, date: dateFilter }
      : { userId, date: dateFilter };

    const memberFilter = filterUserId ? { userId: filterUserId } : {};

    const [expenseResult, incomeResult] = await Promise.all([
      this.prisma.bill.aggregate({
        where: { ...baseWhere, ...memberFilter, type: 'expense' },
        _sum: { amount: true },
      }),
      this.prisma.bill.aggregate({
        where: { ...baseWhere, ...memberFilter, type: 'income' },
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

  /** 将 Date 对象转为本地日期字符串 YYYY-MM-DD（避免 toISOString 的 UTC 偏移） */
  private toLocalDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** 将 YYYY-MM-DD 字符串解析为本地时区零点的 Date（避免 new Date("2026-05-29") 产生 UTC 零点） */
  private parseLocalDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
