import api from "../api";
import type { ApiResponse } from "../../shared";
import type {
  Bill,
  BillListResult,
  BillSummary,
  TodaySummary,
  CreateBillParams,
  UpdateBillParams,
  QueryBillParams,
} from "./types";
import type {
  CategoryStats,
  DailyStats,
  MonthlyComparison,
} from "./stats.types";

export const billService = {
  async create(params: CreateBillParams): Promise<Bill> {
    const { data } = await api.post<ApiResponse<Bill>>("/bill", params);
    return data.data;
  },

  async findMany(params?: QueryBillParams): Promise<BillListResult> {
    const { data } = await api.get<ApiResponse<BillListResult>>("/bill", {
      params,
    });
    return data.data;
  },

  async findOne(id: string): Promise<Bill> {
    const { data } = await api.get<ApiResponse<Bill>>(`/bill/${id}`);
    return data.data;
  },

  async update(id: string, params: UpdateBillParams): Promise<Bill> {
    const { data } = await api.put<ApiResponse<Bill>>(`/bill/${id}`, params);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/bill/${id}`);
  },

  async getSummary(
    month?: string,
    date?: string,
    userId?: string,
  ): Promise<BillSummary> {
    const { data } = await api.get<ApiResponse<BillSummary>>("/bill/summary", {
      params: {
        ...(month ? { month } : {}),
        ...(date ? { date } : {}),
        ...(userId ? { userId } : {}),
      },
    });
    return data.data;
  },

  async getTodaySummary(): Promise<TodaySummary> {
    const { data } = await api.get<ApiResponse<TodaySummary>>("/bill/today");
    return data.data;
  },

  async getCategoryStats(
    month?: string,
    date?: string,
    type?: string,
    userId?: string,
  ): Promise<CategoryStats> {
    const { data } = await api.get<ApiResponse<CategoryStats>>(
      "/bill/stats/category",
      {
        params: {
          ...(month ? { month } : {}),
          ...(date ? { date } : {}),
          ...(type ? { type } : {}),
          ...(userId ? { userId } : {}),
        },
      },
    );
    return data.data;
  },

  async getDailyStats(month?: string, userId?: string): Promise<DailyStats> {
    const { data } = await api.get<ApiResponse<DailyStats>>(
      "/bill/stats/daily",
      {
        params: { ...(month ? { month } : {}), ...(userId ? { userId } : {}) },
      },
    );
    return data.data;
  },

  async getMonthlyComparison(
    month?: string,
    userId?: string,
  ): Promise<MonthlyComparison> {
    const { data } = await api.get<ApiResponse<MonthlyComparison>>(
      "/bill/stats/comparison",
      {
        params: { ...(month ? { month } : {}), ...(userId ? { userId } : {}) },
      },
    );
    return data.data;
  },
};
