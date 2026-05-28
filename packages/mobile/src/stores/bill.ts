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
    set({ isLoading: true, error: null });
    try {
      const bill = await billService.create(params);
      const { fetchBills, fetchTodaySummary, fetchMonthSummary } = get();
      await Promise.all([
        fetchBills({ page: 1, pageSize: 20 }),
        fetchTodaySummary(),
        fetchMonthSummary(),
      ]);
      set({ isLoading: false });
      return bill;
    } catch (err) {
      const message = err instanceof AppError ? err.message : '创建账单失败';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  async updateBill(id: string, params: UpdateBillParams) {
    set({ isLoading: true, error: null });
    try {
      const bill = await billService.update(id, params);
      const { fetchBills, fetchTodaySummary, fetchMonthSummary } = get();
      await Promise.all([
        fetchBills({ page: get().page, pageSize: 20 }),
        fetchTodaySummary(),
        fetchMonthSummary(),
      ]);
      set({ isLoading: false });
      return bill;
    } catch (err) {
      const message = err instanceof AppError ? err.message : '更新账单失败';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  async deleteBill(id: string) {
    set({ isLoading: true, error: null });
    try {
      await billService.remove(id);
      const { fetchBills, fetchTodaySummary, fetchMonthSummary } = get();
      await Promise.all([
        fetchBills({ page: get().page, pageSize: 20 }),
        fetchTodaySummary(),
        fetchMonthSummary(),
      ]);
      set({ isLoading: false });
    } catch (err) {
      const message = err instanceof AppError ? err.message : '删除账单失败';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  clearError() {
    set({ error: null });
  },
}));
