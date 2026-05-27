import api from '../api';
import type { ApiResponse } from '@ai-account/shared';
import type {
  Bill,
  BillListResult,
  BillSummary,
  TodaySummary,
  CreateBillParams,
  UpdateBillParams,
  QueryBillParams,
} from './types';

export const billService = {
  async create(params: CreateBillParams): Promise<Bill> {
    const { data } = await api.post<ApiResponse<Bill>>('/bill', params);
    return data.data;
  },

  async findMany(params?: QueryBillParams): Promise<BillListResult> {
    const { data } = await api.get<ApiResponse<BillListResult>>('/bill', { params });
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

  async getSummary(month?: string): Promise<BillSummary> {
    const { data } = await api.get<ApiResponse<BillSummary>>('/bill/summary', {
      params: month ? { month } : undefined,
    });
    return data.data;
  },

  async getTodaySummary(): Promise<TodaySummary> {
    const { data } = await api.get<ApiResponse<TodaySummary>>('/bill/today');
    return data.data;
  },
};
