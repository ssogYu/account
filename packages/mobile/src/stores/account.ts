import { create } from 'zustand';
import { accountService } from '@/services/account';
import type { Account, CreateAccountParams, UpdateAccountParams } from '@/services/account/types';
import { AppError } from '@/services/api';

interface AccountState {
  accounts: Account[];
  isLoading: boolean;
  error: string | null;

  fetchAccounts: () => Promise<void>;
  createAccount: (params: CreateAccountParams) => Promise<Account>;
  updateAccount: (id: string, params: UpdateAccountParams) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  isLoading: false,
  error: null,

  async fetchAccounts() {
    set({ isLoading: true, error: null });
    try {
      const accounts = await accountService.findMany();
      set({ accounts, isLoading: false });
    } catch (err) {
      const message = err instanceof AppError ? err.message : '获取账户失败';
      set({ error: message, isLoading: false });
    }
  },

  async createAccount(params: CreateAccountParams) {
    set({ isLoading: true, error: null });
    try {
      const account = await accountService.create(params);
      await get().fetchAccounts();
      set({ isLoading: false });
      return account;
    } catch (err) {
      const message = err instanceof AppError ? err.message : '创建账户失败';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  async updateAccount(id: string, params: UpdateAccountParams) {
    set({ isLoading: true, error: null });
    try {
      const account = await accountService.update(id, params);
      await get().fetchAccounts();
      set({ isLoading: false });
      return account;
    } catch (err) {
      const message = err instanceof AppError ? err.message : '更新账户失败';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  async deleteAccount(id: string) {
    set({ isLoading: true, error: null });
    try {
      await accountService.remove(id);
      await get().fetchAccounts();
      set({ isLoading: false });
    } catch (err) {
      const message = err instanceof AppError ? err.message : '删除账户失败';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  clearError() {
    set({ error: null });
  },
}));
