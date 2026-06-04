import { create } from "zustand";
import { billService } from "@/services/bill";
import type {
  Bill,
  BillListResult,
  BillSummary,
  QueryBillParams,
} from "@/services/bill/types";
import type {
  CategoryStats,
  DailyStats,
  MonthlyComparison,
} from "@/services/bill/stats.types";
import { familyService } from "@/services/family";
import type { FamilyInfo } from "@/services/family/types";

// ── 筛选状态 ──
export interface FlowFilter {
  keyword?: string;
  type?: "expense" | "income";
  categoryId?: string;
  month?: string;
  userId?: string;
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
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** 将日期字符串/Date 转为本地日期 YYYY-MM-DD（避免 toISOString 的 UTC 偏移） */
function toLocalDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(dateStr: string): string {
  // dateStr 是 YYYY-MM-DD 格式，直接解析避免 new Date() 的 UTC 偏移
  const [yStr, mStr, dStr] = dateStr.split("-");
  const year = parseInt(yStr!);
  const month = parseInt(mStr!);
  const day = parseInt(dStr!);
  // 用本地中午时间构造 Date 来获取星期几
  const d = new Date(year, month - 1, day, 12, 0, 0);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
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
        .filter((b) => b.type === "expense")
        .reduce((s, b) => s + Number(b.amount), 0);
      const dayIncome = items
        .filter((b) => b.type === "income")
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
  selectedDate: string | null; // YYYY-MM-DD, null = 月模式
  selectedType: "expense" | "income";
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
  activeTab: "flow" | "chart";

  // ── 家庭成员 ──
  familyInfo: FamilyInfo | null;
  selectedMemberId: string | null;

  // ── Actions ──
  setSelectedMonth: (month: string) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedType: (type: "expense" | "income") => void;
  setActiveTab: (tab: "flow" | "chart") => void;
  setFlowFilter: (filter: Partial<FlowFilter>) => void;
  resetFlowFilter: () => void;
  setSelectedMemberId: (userId: string | null) => void;
  fetchFlowList: (append?: boolean) => Promise<void>;
  fetchMonthSummary: (month?: string) => Promise<void>;
  fetchCategoryStats: (month?: string, type?: string) => Promise<void>;
  fetchDailyStats: (month?: string) => Promise<void>;
  fetchMonthlyComparison: (month?: string) => Promise<void>;
  fetchFamilyInfo: () => Promise<void>;
  fetchAll: (month?: string) => Promise<void>;
  drillToFlow: (categoryId: string, categoryName: string) => void;
  deleteBill: (billId: string) => Promise<void>;
}

const PAGE_SIZE = 20;

export const useStatsStore = create<StatsState>((set, get) => ({
  selectedMonth: getCurrentMonth(),
  selectedDate: null,
  selectedType: "expense",
  isLoading: false,

  flowFilter: { type: "expense" },
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
  activeTab: "flow",

  familyInfo: null,
  selectedMemberId: null,

  setSelectedMonth(month: string) {
    const { selectedType } = get();
    set({
      selectedMonth: month,
      selectedDate: null,
      flowFilter: { type: selectedType },
      flowPage: 1,
      flowGroups: [],
      flowHasMore: true,
      drillCategoryId: null,
      drillCategoryName: null,
    });
    get().fetchAll(month);
  },

  setSelectedDate(date: string | null) {
    const { selectedType } = get();
    // 如果选了日期，同步 selectedMonth
    const month = date ? date.slice(0, 7) : get().selectedMonth;
    set({
      selectedDate: date,
      selectedMonth: month,
      flowFilter: { type: selectedType },
      flowPage: 1,
      flowGroups: [],
      flowHasMore: true,
      drillCategoryId: null,
      drillCategoryName: null,
    });
    get().fetchAll(month);
  },

  setSelectedType(type: "expense" | "income") {
    set({
      selectedType: type,
      flowFilter: { ...get().flowFilter, type },
      flowPage: 1,
      flowGroups: [],
      flowHasMore: true,
      drillCategoryId: null,
      drillCategoryName: null,
    });
    const { selectedMonth } = get();
    get().fetchCategoryStats(selectedMonth, type);
    get().fetchFlowList();
  },

  setActiveTab(tab: "flow" | "chart") {
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
    set({
      flowFilter: newFilter,
      flowPage: 1,
      flowGroups: [],
      flowHasMore: true,
    });
    get().fetchFlowList();
  },

  resetFlowFilter() {
    const { selectedType } = get();
    set({
      flowFilter: { type: selectedType },
      flowPage: 1,
      flowGroups: [],
      flowHasMore: true,
      drillCategoryId: null,
      drillCategoryName: null,
    });
    get().fetchFlowList();
  },

  setSelectedMemberId(userId: string | null) {
    set({
      selectedMemberId: userId,
      flowFilter: { ...get().flowFilter, userId: userId ?? undefined },
      flowPage: 1,
      flowGroups: [],
      flowHasMore: true,
    });
    const { selectedMonth, selectedType } = get();
    get().fetchFlowList();
    get().fetchMonthSummary(selectedMonth);
    get().fetchCategoryStats(selectedMonth, selectedType);
    get().fetchDailyStats(selectedMonth);
    get().fetchMonthlyComparison(selectedMonth);
  },

  async fetchFlowList(append = false) {
    const {
      selectedMonth,
      selectedDate,
      flowFilter,
      flowPage,
      flowGroups,
      drillCategoryId,
      selectedMemberId,
    } = get();
    const params: QueryBillParams = {
      page: flowPage,
      pageSize: PAGE_SIZE,
    };
    // 日期筛选：优先使用 selectedDate，否则使用 selectedMonth
    if (selectedDate) {
      params.startDate = selectedDate;
      // endDate 是 lt 上界，需要设为下一天才能包含当天
      const [y, m, d] = selectedDate.split("-").map(Number);
      const next = new Date(y, m - 1, d + 1);
      params.endDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    } else {
      params.month = selectedMonth;
    }
    if (flowFilter.type) params.type = flowFilter.type;
    if (flowFilter.categoryId || drillCategoryId) {
      params.categoryId = flowFilter.categoryId ?? drillCategoryId ?? undefined;
    }
    if (selectedMemberId) params.userId = selectedMemberId;

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
    const { selectedMemberId, selectedDate } = get();
    try {
      const monthSummary = await billService.getSummary(
        month,
        selectedDate ?? undefined,
        selectedMemberId ?? undefined,
      );
      set({ monthSummary });
    } catch {
      // 静默
    }
  },

  async fetchCategoryStats(month?: string, type?: string) {
    const { selectedMemberId, selectedDate } = get();
    try {
      const categoryStats = await billService.getCategoryStats(
        month,
        selectedDate ?? undefined,
        type,
        selectedMemberId ?? undefined,
      );
      set({ categoryStats });
    } catch {
      // 静默
    }
  },

  async fetchDailyStats(month?: string) {
    const { selectedMemberId } = get();
    try {
      const dailyStats = await billService.getDailyStats(
        month,
        selectedMemberId ?? undefined,
      );
      set({ dailyStats });
    } catch {
      // 静默
    }
  },

  async fetchMonthlyComparison(month?: string) {
    const { selectedMemberId } = get();
    try {
      const monthlyComparison = await billService.getMonthlyComparison(
        month,
        selectedMemberId ?? undefined,
      );
      set({ monthlyComparison });
    } catch {
      // 静默
    }
  },

  async fetchFamilyInfo() {
    try {
      const { data: res } = await familyService.getMyFamily();
      set({ familyInfo: res.data });
    } catch {
      // 静默
    }
  },

  async fetchAll(month?: string) {
    const m = month ?? get().selectedMonth;
    const type = get().selectedType;
    const memberFilter = get().selectedMemberId ?? undefined;
    const dateFilter = get().selectedDate ?? undefined;
    set({ isLoading: true });
    try {
      const [monthSummary, categoryStats, dailyStats, monthlyComparison] =
        await Promise.all([
          billService.getSummary(m, dateFilter, memberFilter),
          billService.getCategoryStats(m, dateFilter, type, memberFilter),
          billService.getDailyStats(m, memberFilter),
          billService.getMonthlyComparison(m, memberFilter),
        ]);
      set({
        monthSummary,
        categoryStats,
        dailyStats,
        monthlyComparison,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
    get().fetchFlowList();
    get().fetchFamilyInfo();
  },

  /** 图表下钻：点击饼图分类 → 切换流水视图 + 自动筛选该分类 */
  drillToFlow(categoryId: string, categoryName: string) {
    set({
      activeTab: "flow",
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
