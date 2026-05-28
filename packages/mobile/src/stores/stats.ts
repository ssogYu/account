import { create } from 'zustand';
import { billService } from '@/services/bill';
import type { Bill, BillListResult, BillSummary, QueryBillParams } from '@/services/bill/types';
import type { CategoryStats, DailyStats, MonthlyComparison } from '@/services/bill/stats.types';

// ── 筛选状态 ──
export interface FlowFilter {
  keyword?: string;
  type?: 'expense' | 'income';
  categoryId?: string;
  month?: string;
}

// ── 按日分组的账单 ──
export interface DayGroup {
  date: string; // YYYY-MM-DD
  label: string; // 5月25日 周日
  dayExpense: number;
  dayIncome: number;
  bills: Bill[];
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** 将日期字符串/Date 转为本地日期 YYYY-MM-DD（避免 toISOString 的 UTC 偏移） */
function toLocalDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateLabel(dateStr: string): string {
  // dateStr 是 YYYY-MM-DD 格式，直接解析避免 new Date() 的 UTC 偏移
  const [yStr, mStr, dStr] = dateStr.split('-');
  const year = parseInt(yStr!);
  const month = parseInt(mStr!);
  const day = parseInt(dStr!);
  // 用本地中午时间构造 Date 来获取星期几
  const d = new Date(year, month - 1, day, 12, 0, 0);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${month}月${day}日 ${weekdays[d.getDay()]}`;
}

function groupBillsByDay(bills: Bill[]): DayGroup[] {
  const map = new Map<string, Bill[]>();
  for (const bill of bills) {
    const dateKey = toLocalDateKey(bill.date);
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey)!.push(bill);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // 日期降序
    .map(([date, items]) => {
      const dayExpense = items
        .filter((b) => b.type === 'expense')
        .reduce((s, b) => s + Number(b.amount), 0);
      const dayIncome = items
        .filter((b) => b.type === 'income')
        .reduce((s, b) => s + Number(b.amount), 0);
      return {
        date,
        label: formatDateLabel(date),
        dayExpense,
        dayIncome,
        bills: items,
      };
    });
}

interface StatsState {
  // ── 公共状态 ──
  selectedMonth: string;
  selectedType: 'expense' | 'income';
  isLoading: boolean;

  // ── 流水视图 ──
  flowFilter: FlowFilter;
  flowGroups: DayGroup[];
  flowTotal: number;
  flowPage: number;
  flowHasMore: boolean;
  monthSummary: BillSummary | null;

  // ── 图表视图 ──
  categoryStats: CategoryStats | null;
  dailyStats: DailyStats | null;
  monthlyComparison: MonthlyComparison | null;

  // ── 下钻联动 ──
  drillCategoryId: string | null;
  drillCategoryName: string | null;
  activeTab: 'flow' | 'chart';

  // ── Actions ──
  setSelectedMonth: (month: string) => void;
  setSelectedType: (type: 'expense' | 'income') => void;
  setActiveTab: (tab: 'flow' | 'chart') => void;
  setFlowFilter: (filter: Partial<FlowFilter>) => void;
  resetFlowFilter: () => void;
  fetchFlowList: (append?: boolean) => Promise<void>;
  fetchMonthSummary: (month?: string) => Promise<void>;
  fetchCategoryStats: (month?: string, type?: string) => Promise<void>;
  fetchDailyStats: (month?: string) => Promise<void>;
  fetchMonthlyComparison: (month?: string) => Promise<void>;
  fetchAll: (month?: string) => Promise<void>;
  drillToFlow: (categoryId: string, categoryName: string) => void;
  deleteBill: (billId: string) => Promise<void>;
}

const PAGE_SIZE = 20;

export const useStatsStore = create<StatsState>((set, get) => ({
  selectedMonth: getCurrentMonth(),
  selectedType: 'expense',
  isLoading: false,

  flowFilter: {},
  flowGroups: [],
  flowTotal: 0,
  flowPage: 1,
  flowHasMore: true,
  monthSummary: null,

  categoryStats: null,
  dailyStats: null,
  monthlyComparison: null,

  drillCategoryId: null,
  drillCategoryName: null,
  activeTab: 'flow',

  setSelectedMonth(month: string) {
    set({ selectedMonth: month, flowPage: 1, flowGroups: [], flowHasMore: true });
    get().fetchAll(month);
  },

  setSelectedType(type: 'expense' | 'income') {
    set({ selectedType: type });
    const { selectedMonth } = get();
    get().fetchCategoryStats(selectedMonth, type);
  },

  setActiveTab(tab: 'flow' | 'chart') {
    set({ activeTab: tab });
  },

  setFlowFilter(filter: Partial<FlowFilter>) {
    const newFilter = { ...get().flowFilter, ...filter };
    // 移除 undefined 值
    for (const key of Object.keys(newFilter)) {
      if (newFilter[key as keyof FlowFilter] === undefined) {
        delete newFilter[key as keyof FlowFilter];
      }
    }
    set({ flowFilter: newFilter, flowPage: 1, flowGroups: [], flowHasMore: true });
    get().fetchFlowList();
  },

  resetFlowFilter() {
    set({
      flowFilter: {},
      flowPage: 1,
      flowGroups: [],
      flowHasMore: true,
      drillCategoryId: null,
      drillCategoryName: null,
    });
    get().fetchFlowList();
  },

  async fetchFlowList(append = false) {
    const { selectedMonth, flowFilter, flowPage, flowGroups, drillCategoryId } = get();
    const params: QueryBillParams = {
      page: flowPage,
      pageSize: PAGE_SIZE,
      month: selectedMonth,
    };
    if (flowFilter.type) params.type = flowFilter.type;
    if (flowFilter.categoryId || drillCategoryId) {
      params.categoryId = flowFilter.categoryId ?? drillCategoryId ?? undefined;
    }

    try {
      const result: BillListResult = await billService.findMany(params);
      const newGroups = groupBillsByDay(result.items);

      if (append && flowGroups.length > 0) {
        // 合并同一天的分组
        const merged = new Map<string, Bill[]>();
        for (const g of flowGroups) {
          merged.set(g.date, [...g.bills]);
        }
        for (const g of newGroups) {
          const existing = merged.get(g.date);
          if (existing) {
            merged.set(g.date, [...existing, ...g.bills]);
          } else {
            merged.set(g.date, g.bills);
          }
        }
        const allBills = Array.from(merged.values()).flat();
        set({
          flowGroups: groupBillsByDay(allBills),
          flowTotal: result.total,
          flowHasMore: flowPage < result.totalPages,
        });
      } else {
        set({
          flowGroups: newGroups,
          flowTotal: result.total,
          flowHasMore: flowPage < result.totalPages,
        });
      }
    } catch {
      // 静默
    }
  },

  async fetchMonthSummary(month?: string) {
    try {
      const monthSummary = await billService.getSummary(month);
      set({ monthSummary });
    } catch {
      // 静默
    }
  },

  async fetchCategoryStats(month?: string, type?: string) {
    try {
      const categoryStats = await billService.getCategoryStats(month, type);
      set({ categoryStats });
    } catch {
      // 静默
    }
  },

  async fetchDailyStats(month?: string) {
    try {
      const dailyStats = await billService.getDailyStats(month);
      set({ dailyStats });
    } catch {
      // 静默
    }
  },

  async fetchMonthlyComparison(month?: string) {
    try {
      const monthlyComparison = await billService.getMonthlyComparison(month);
      set({ monthlyComparison });
    } catch {
      // 静默
    }
  },

  async fetchAll(month?: string) {
    const m = month ?? get().selectedMonth;
    const type = get().selectedType;
    set({ isLoading: true });
    try {
      const [monthSummary, categoryStats, dailyStats] = await Promise.all([
        billService.getSummary(m),
        billService.getCategoryStats(m, type),
        billService.getDailyStats(m),
      ]);
      set({ monthSummary, categoryStats, dailyStats, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
    // 流水列表单独请求
    get().fetchFlowList();
    get().fetchMonthlyComparison(m);
  },

  /** 图表下钻：点击饼图分类 → 切换流水视图 + 自动筛选该分类 */
  drillToFlow(categoryId: string, categoryName: string) {
    set({
      activeTab: 'flow',
      drillCategoryId: categoryId,
      drillCategoryName: categoryName,
      flowFilter: { ...get().flowFilter, categoryId },
      flowPage: 1,
      flowGroups: [],
      flowHasMore: true,
    });
    get().fetchFlowList();
  },

  async deleteBill(billId: string) {
    try {
      await billService.remove(billId);
      // 重新加载所有数据
      set({ flowPage: 1, flowGroups: [], flowHasMore: true });
      get().fetchFlowList();
      const { selectedMonth, selectedType } = get();
      get().fetchMonthSummary(selectedMonth);
      get().fetchCategoryStats(selectedMonth, selectedType);
      get().fetchDailyStats(selectedMonth);
      get().fetchMonthlyComparison(selectedMonth);
    } catch {
      // 静默
    }
  },
}));
