import { create } from 'zustand';
import { billService } from '@/services/bill';
import type {
  Bill,
  BillListResult,
  BillSummary,
  TodaySummary,
  CreateBillParams,
  UpdateBillParams,
  QueryBillParams,
} from '@/services/bill/types';
import { AppError } from '@/services/api';
import { showToast } from '@/components/ui/Toast';

interface BillState {
  bills: Bill[];
  total: number;
  page: number;
  totalPages: number;
  todaySummary: TodaySummary | null;
  monthSummary: BillSummary | null;
  isLoading: boolean;
  error: string | null;

  fetchBills: (params?: QueryBillParams) => Promise<void>;
  fetchTodaySummary: () => Promise<void>;
  fetchMonthSummary: (month?: string) => Promise<void>;
  createBill: (params: CreateBillParams) => Promise<Bill>;
  updateBill: (id: string, params: UpdateBillParams) => Promise<Bill>;
  deleteBill: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useBillStore = create<BillState>((set, get) => ({
  bills: [],
  total: 0,
  page: 1,
  totalPages: 0,
  todaySummary: null,
  monthSummary: null,
  isLoading: false,
  error: null,

  async fetchBills(params?: QueryBillParams) {
    set({ isLoading: true, error: null });
    try {
      const result = await billService.findMany(params);
      set({
        bills: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof AppError ? err.message : '获取账单列表失败';
      set({ error: message, isLoading: false });
      showToast(message);
    }
  },

  async fetchTodaySummary() {
    try {
      const summary = await billService.getTodaySummary();
      set({ todaySummary: summary });
    } catch (err) {
      console.error('[fetchTodaySummary] failed:', err);
    }
  },

  async fetchMonthSummary(month?: string) {
    try {
      const summary = await billService.getSummary(month);
      set({ monthSummary: summary });
    } catch {
      // 静默失败
    }
  },

  async createBill(params: CreateBillParams) {
    const tempId = `temp-${Date.now()}`;
    const optimisticBill: Bill = {
      id: tempId,
      userId: '',
      familyId: null,
      categoryId: params.categoryId,
      type: params.type,
      amount: String(params.amount),
      note: params.note ?? null,
      account: params.account ?? null,
      date: params.date ?? new Date().toISOString().split('T')[0],
      source: params.source ?? 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const prevBills = get().bills;
    set({
      bills: [optimisticBill, ...prevBills],
      total: get().total + 1,
      isLoading: false,
    });

    try {
      const bill = await billService.create(params);
      set((state) => ({
        bills: state.bills.map((b) => (b.id === tempId ? bill : b)),
      }));
      get().fetchTodaySummary();
      get().fetchMonthSummary();
      return bill;
    } catch (err) {
      set({ bills: prevBills, total: get().total - 1 });
      const message = err instanceof AppError ? err.message : '创建账单失败';
      set({ error: message });
      showToast(message);
      throw err;
    }
  },

  async updateBill(id: string, params: UpdateBillParams) {
    const prevBills = get().bills;
    set((state) => ({
      bills: state.bills.map((b) =>
        b.id === id
          ? {
              ...b,
              ...params,
              amount: params.amount != null ? String(params.amount) : b.amount,
              updatedAt: new Date().toISOString(),
            }
          : b,
      ),
    }));

    try {
      const bill = await billService.update(id, params);
      set((state) => ({
        bills: state.bills.map((b) => (b.id === id ? bill : b)),
      }));
      get().fetchTodaySummary();
      get().fetchMonthSummary();
      return bill;
    } catch (err) {
      set({ bills: prevBills });
      const message = err instanceof AppError ? err.message : '更新账单失败';
      set({ error: message });
      showToast(message);
      throw err;
    }
  },

  async deleteBill(id: string) {
    const prevBills = get().bills;
    set((state) => ({
      bills: state.bills.filter((b) => b.id !== id),
      total: state.total - 1,
    }));

    try {
      await billService.remove(id);
      get().fetchTodaySummary();
      get().fetchMonthSummary();
    } catch (err) {
      set({ bills: prevBills, total: prevBills.length });
      const message = err instanceof AppError ? err.message : '删除账单失败';
      set({ error: message });
      showToast(message);
      throw err;
    }
  },

  clearError() {
    set({ error: null });
  },
}));
