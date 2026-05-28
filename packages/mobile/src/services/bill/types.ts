import type { Category } from '../category/types';

export interface BillUser {
  id: string;
  nickname: string | null;
  avatar: string | null;
}

export interface Bill {
  id: string;
  userId: string;
  familyId: string | null;
  categoryId: string;
  type: 'expense' | 'income';
  amount: string;
  note: string | null;
  account: string | null;
  date: string;
  source: 'manual' | 'ai';
  createdAt: string;
  updatedAt: string;
  category?: Category;
  user?: BillUser;
}

export interface BillListResult {
  items: Bill[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BillSummary {
  month?: string;
  totalExpense: number;
  totalIncome: number;
  balance: number;
}

export interface TodaySummary {
  totalExpense: number;
  totalIncome: number;
  balance: number;
}

export interface CreateBillParams {
  type: 'expense' | 'income';
  amount: number;
  categoryId: string;
  note?: string;
  account?: string;
  date?: string;
  source?: 'manual' | 'ai';
}

export interface UpdateBillParams {
  type?: 'expense' | 'income';
  amount?: number;
  categoryId?: string;
  note?: string;
  account?: string;
  date?: string;
}

export interface QueryBillParams {
  page?: number;
  pageSize?: number;
  type?: 'expense' | 'income';
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  userId?: string;
}
