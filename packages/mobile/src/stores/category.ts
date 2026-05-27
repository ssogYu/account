import { create } from 'zustand';
import { categoryService } from '@/services/category';
import type { Category, CreateCategoryParams, UpdateCategoryParams, QueryCategoryParams } from '@/services/category/types';
import { AppError } from '@/services/api';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;

  fetchCategories: (params?: QueryCategoryParams) => Promise<void>;
  createCategory: (params: CreateCategoryParams) => Promise<Category>;
  updateCategory: (id: string, params: UpdateCategoryParams) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,

  async fetchCategories(params?: QueryCategoryParams) {
    set({ isLoading: true, error: null });
    try {
      const categories = await categoryService.findMany(params);
      set({ categories, isLoading: false });
    } catch (err) {
      const message = err instanceof AppError ? err.message : '获取分类失败';
      set({ error: message, isLoading: false });
    }
  },

  async createCategory(params: CreateCategoryParams) {
    set({ isLoading: true, error: null });
    try {
      const category = await categoryService.create(params);
      await get().fetchCategories();
      set({ isLoading: false });
      return category;
    } catch (err) {
      const message = err instanceof AppError ? err.message : '创建分类失败';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  async updateCategory(id: string, params: UpdateCategoryParams) {
    set({ isLoading: true, error: null });
    try {
      const category = await categoryService.update(id, params);
      await get().fetchCategories();
      set({ isLoading: false });
      return category;
    } catch (err) {
      const message = err instanceof AppError ? err.message : '更新分类失败';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  async deleteCategory(id: string) {
    set({ isLoading: true, error: null });
    try {
      await categoryService.remove(id);
      await get().fetchCategories();
      set({ isLoading: false });
    } catch (err) {
      const message = err instanceof AppError ? err.message : '删除分类失败';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  clearError() {
    set({ error: null });
  },
}));
