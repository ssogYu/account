import api from '../api';
import type { ApiResponse } from '@ai-account/shared';
import type { Category, CreateCategoryParams, UpdateCategoryParams, QueryCategoryParams } from './types';

export const categoryService = {
  async findMany(params?: QueryCategoryParams): Promise<Category[]> {
    const { data } = await api.get<ApiResponse<Category[]>>('/category', { params });
    return data.data;
  },

  async create(params: CreateCategoryParams): Promise<Category> {
    const { data } = await api.post<ApiResponse<Category>>('/category', params);
    return data.data;
  },

  async update(id: string, params: UpdateCategoryParams): Promise<Category> {
    const { data } = await api.put<ApiResponse<Category>>(`/category/${id}`, params);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/category/${id}`);
  },
};
