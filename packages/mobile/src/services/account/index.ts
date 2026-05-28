import api from '../api';
import type { ApiResponse } from '@ai-account/shared';
import type { Account, CreateAccountParams, UpdateAccountParams } from './types';

export const accountService = {
  async findMany(): Promise<Account[]> {
    const { data } = await api.get<ApiResponse<Account[]>>('/account');
    return data.data;
  },

  async create(params: CreateAccountParams): Promise<Account> {
    const { data } = await api.post<ApiResponse<Account>>('/account', params);
    return data.data;
  },

  async update(id: string, params: UpdateAccountParams): Promise<Account> {
    const { data } = await api.put<ApiResponse<Account>>(`/account/${id}`, params);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/account/${id}`);
  },
};
