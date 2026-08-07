import { Injectable, BadRequestException, Scope } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

import { DbService } from '../../infra/db/db.service';
import { FamilyService } from '../family/family.service';
import type {
  QueryStatisticsDto,
  QueryCategoryStatsDto,
  QueryTrendDto,
  QueryRankingDto,
} from './dto/query-statistics.dto';
import { StatisticsPeriod } from './dto/query-statistics.dto';

dayjs.extend(isoWeek);

// ==========================================================
// 类型定义
// ==========================================================

export interface Summary {
  totalIncome: string;
  totalExpense: string;
  balance: string;
  billCount: number;
  periodLabel: string;
}

export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  amount: string;
  percentage: number;
}

export interface CategoryStats {
  total: string;
  list: CategoryStat[];
}

export interface TrendPoint {
  date: string;
  income: string;
  expense: string;
}

export interface TrendData {
  points: TrendPoint[];
}

export interface RankingItem {
  rank: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  amount: string;
  percentage: number;
}

export interface RankingData {
  total: string;
  list: RankingItem[];
}

// ==========================================================
// Service
// ==========================================================

@Injectable({ scope: Scope.REQUEST })
export class StatisticsService {
  /** 请求级 familyId 缓存，避免同一请求中多次查询 */
  private familyIdCache: string | null | undefined;

  constructor(
    private readonly db: DbService,
    private readonly familyService: FamilyService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('StatisticsService');
  }

  // ==========================================================
  // 1. 汇总概览
  // ==========================================================

  /** 获取指定时间维度的收支汇总 */
  async getSummary(
    userId: string,
    query: QueryStatisticsDto,
  ): Promise<Summary> {
    const { start, end, label } = this.resolvePeriod(
      query.period,
      query.anchor,
    );
    const where = await this.buildWhere(userId, query.memberId, start, end);

    // 一次 groupBy 同时拿收入/支出汇总和总笔数
    const groups = await this.db.bill.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    let incomeDec = new Prisma.Decimal(0);
    let expenseDec = new Prisma.Decimal(0);
    let billCount = 0;

    for (const g of groups) {
      const amt = g._sum.amount ?? new Prisma.Decimal(0);
      billCount += g._count.id;
      if (g.type === 'income') {
        incomeDec = amt;
      } else {
        expenseDec = amt;
      }
    }

    const totalIncome = incomeDec.toFixed(2);
    const totalExpense = expenseDec.toFixed(2);
    const balance = incomeDec.minus(expenseDec).toFixed(2);

    return {
      totalIncome,
      totalExpense,
      balance,
      billCount,
      periodLabel: label,
    };
  }

  // ==========================================================
  // 2. 分类饼图 / 占比
  // ==========================================================

  /** 获取各分类的支出/收入金额与占比 */
  async getCategoryStats(
    userId: string,
    query: QueryCategoryStatsDto,
  ): Promise<CategoryStats> {
    const type = query.type ?? 'expense';
    const { start, end } = this.resolvePeriod(query.period, query.anchor);
    const where = await this.buildWhere(
      userId,
      query.memberId,
      start,
      end,
      type,
    );

    // 聚合每个分类的总金额
    const groups = await this.db.bill.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    if (groups.length === 0) {
      return { total: '0.00', list: [] };
    }

    // 查分类名称和图标
    const categoryIds = groups.map((g) => g.categoryId);
    const categories = await this.db.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const grandTotal = groups.reduce(
      (sum, g) => sum + Number(g._sum.amount ?? 0),
      0,
    );

    const list: CategoryStat[] = groups.map((g) => {
      const amt = Number(g._sum.amount ?? 0);
      const cat = catMap.get(g.categoryId);
      return {
        categoryId: g.categoryId,
        categoryName: cat?.name ?? '未知分类',
        categoryIcon: cat?.icon ?? null,
        amount: amt.toFixed(2),
        percentage:
          grandTotal > 0 ? Math.round((amt / grandTotal) * 10000) / 100 : 0,
      };
    });

    return { total: grandTotal.toFixed(2), list };
  }

  // ==========================================================
  // 3. 收支趋势（折线图/柱状图）
  // ==========================================================

  /** 获取收支趋势数据 */
  async getTrend(userId: string, query: QueryTrendDto): Promise<TrendData> {
    const { start, end } = this.resolvePeriod(query.period, query.anchor);
    const where = await this.buildWhere(userId, query.memberId, start, end);

    const groups = await this.db.bill.groupBy({
      by: ['billDate', 'type'],
      where,
      _sum: { amount: true },
      orderBy: { billDate: 'asc' },
    });

    // 按日期归并
    const dateKeyFn =
      query.period === StatisticsPeriod.year
        ? (d: Date) => dayjs(d).format('YYYY-MM')
        : query.period === StatisticsPeriod.all
          ? (d: Date) => dayjs(d).format('YYYY')
          : (d: Date) => dayjs(d).format('YYYY-MM-DD');

    const map = new Map<
      string,
      { income: Prisma.Decimal; expense: Prisma.Decimal }
    >();

    for (const row of groups) {
      const key = dateKeyFn(row.billDate);
      if (!map.has(key)) {
        map.set(key, {
          income: new Prisma.Decimal(0),
          expense: new Prisma.Decimal(0),
        });
      }
      const entry = map.get(key)!;
      const amt = row._sum.amount ?? new Prisma.Decimal(0);
      if (row.type === 'income') {
        entry.income = entry.income.plus(amt);
      } else {
        entry.expense = entry.expense.plus(amt);
      }
    }

    // 补全时间范围内所有日期/月份
    const allKeys = await this.generateDateKeys(
      query.period,
      start,
      end,
      where,
    );
    const points: TrendPoint[] = allKeys.map((key) => ({
      date: key,
      income: map.get(key)?.income.toFixed(2) ?? '0.00',
      expense: map.get(key)?.expense.toFixed(2) ?? '0.00',
    }));

    return { points };
  }

  // ==========================================================
  // 4. 排行榜
  // ==========================================================

  /** 获取分类金额排行榜 */
  async getRanking(
    userId: string,
    query: QueryRankingDto,
  ): Promise<RankingData> {
    const type = query.type === 'income' ? 'income' : 'expense';
    const { start, end } = this.resolvePeriod(query.period, query.anchor);
    const where = await this.buildWhere(
      userId,
      query.memberId,
      start,
      end,
      type,
    );

    const groups = await this.db.bill.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    if (groups.length === 0) {
      return { total: '0.00', list: [] };
    }

    const categoryIds = groups.map((g) => g.categoryId);
    const categories = await this.db.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const grandTotal = groups.reduce(
      (sum, g) => sum + Number(g._sum.amount ?? 0),
      0,
    );

    const list: RankingItem[] = groups.map((g, i) => {
      const amt = Number(g._sum.amount ?? 0);
      const cat = catMap.get(g.categoryId);
      return {
        rank: i + 1,
        categoryId: g.categoryId,
        categoryName: cat?.name ?? '未知分类',
        categoryIcon: cat?.icon ?? null,
        amount: amt.toFixed(2),
        percentage:
          grandTotal > 0 ? Math.round((amt / grandTotal) * 10000) / 100 : 0,
      };
    });

    return { total: grandTotal.toFixed(2), list };
  }

  // ==========================================================
  // 私有工具方法
  // ==========================================================

  /**
   * 根据 period 和 anchor 解析出时间范围。
   * 返回 { start, end, label }，start/end 为 Date | undefined。
   * period === 'all' 时不限时间。
   */
  private resolvePeriod(
    period: StatisticsPeriod,
    anchor?: string,
  ): { start?: Date; end?: Date; label: string } {
    const now = dayjs();

    switch (period) {
      case StatisticsPeriod.all: {
        return { label: '全部时间' };
      }
      case StatisticsPeriod.day: {
        const d = anchor ? dayjs(anchor) : now;
        if (!d.isValid()) throw new BadRequestException('无效的日期格式');
        const start = d.startOf('day').toDate();
        const end = d.endOf('day').toDate();
        return { start, end, label: d.format('YYYY年M月D日') };
      }
      case StatisticsPeriod.week: {
        const d = anchor ? dayjs(anchor) : now;
        if (!d.isValid()) throw new BadRequestException('无效的日期格式');
        const start = d.startOf('isoWeek').toDate();
        const end = d.endOf('isoWeek').toDate();
        return {
          start,
          end,
          label: `${d.startOf('isoWeek').format('M/D')} - ${d.endOf('isoWeek').format('M/D')}`,
        };
      }
      case StatisticsPeriod.month: {
        const d = anchor ? dayjs(anchor) : now;
        if (!d.isValid()) throw new BadRequestException('无效的月份格式');
        const start = d.startOf('month').toDate();
        const end = d.endOf('month').toDate();
        return { start, end, label: d.format('YYYY年M月') };
      }
      case StatisticsPeriod.year: {
        const d = anchor ? dayjs(anchor) : now;
        if (!d.isValid()) throw new BadRequestException('无效的年份格式');
        const start = d.startOf('year').toDate();
        const end = d.endOf('year').toDate();
        return { start, end, label: d.format('YYYY年') };
      }
      default:
        throw new BadRequestException('无效的时间维度');
    }
  }

  /**
   * 构建 Prisma where 条件。
   * 根据用户是否在家庭组中，自动决定查询个人账单还是家庭组账单。
   * 如果传了 memberId 且用户在家庭组中，则只查该成员的账单。
   */
  /**
   * 获取 familyId，带请求级缓存。
   * 同一请求中多次调用只查一次数据库。
   */
  private async getCachedFamilyId(userId: string): Promise<string | null> {
    if (this.familyIdCache !== undefined) return this.familyIdCache;
    this.familyIdCache = await this.familyService.getFamilyId(userId);
    return this.familyIdCache;
  }

  private async buildWhere(
    userId: string,
    memberId?: string,
    start?: Date,
    end?: Date,
    type?: string,
  ): Promise<Prisma.BillWhereInput> {
    const familyId = await this.getCachedFamilyId(userId);

    const where: Prisma.BillWhereInput = {};

    if (familyId) {
      // 家庭组模式
      if (memberId) {
        where.userId = memberId;
        where.familyId = familyId;
      } else {
        where.familyId = familyId;
      }
    } else {
      // 个人模式
      where.userId = userId;
      where.familyId = null;
    }

    if (start || end) {
      where.billDate = {};
      if (start) where.billDate.gte = start;
      if (end) where.billDate.lte = end;
    }

    if (type) {
      where.type = type as Prisma.EnumBillTypeFilter['equals'];
    }

    return where;
  }

  /**
   * 生成时间范围内的所有日期/月份/年份键。
   * day/week/month → 按日；year → 按月；all → 查数据库取最早账单年份。
   */
  private async generateDateKeys(
    period: StatisticsPeriod,
    start?: Date,
    end?: Date,
    where?: Prisma.BillWhereInput,
  ): Promise<string[]> {
    const keys: string[] = [];

    // all 维度：查数据库获取最早账单年份
    if (period === StatisticsPeriod.all) {
      const currentYear = dayjs().year();
      const earliest = await this.db.bill.findFirst({
        where: { ...(where ?? {}), type: undefined },
        orderBy: { billDate: 'asc' },
        select: { billDate: true },
      });
      const startYear = earliest
        ? dayjs(earliest.billDate).year()
        : currentYear;
      for (let y = startYear; y <= currentYear; y++) {
        keys.push(String(y));
      }
      return keys;
    }

    const isByMonth = period === StatisticsPeriod.year;
    const fmt = isByMonth ? 'YYYY-MM' : 'YYYY-MM-DD';

    let cursor = dayjs(start);
    const endDay = dayjs(end);

    while (
      cursor.isBefore(endDay) ||
      cursor.isSame(endDay, isByMonth ? 'month' : 'day')
    ) {
      keys.push(cursor.format(fmt));
      cursor = isByMonth ? cursor.add(1, 'month') : cursor.add(1, 'day');
    }

    return keys;
  }
}
