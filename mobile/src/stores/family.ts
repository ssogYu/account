import { create } from 'zustand';
import { familyService } from '@/services/family';
import type { FamilyInfo } from '@/services/family/types';
import { AppError } from '@/services/api';

interface FamilyState {
  family: FamilyInfo | null;
  isLoading: boolean;
  error: string | null;

  fetchFamily: () => Promise<void>;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (inviteCode: string) => Promise<void>;
  leaveFamily: () => Promise<boolean>;
  removeMember: (memberId: string) => Promise<void>;
  clearError: () => void;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  family: null,
  isLoading: false,
  error: null,

  async fetchFamily() {
    set({ isLoading: true, error: null });
    try {
      const { data: res } = await familyService.getMyFamily();
      set({ family: res.data, isLoading: false });
    } catch (err) {
      const message = err instanceof AppError ? err.message : '获取家庭组信息失败';
      set({ error: message, isLoading: false });
    }
  },

  async createFamily(name: string) {
    set({ isLoading: true, error: null });
    try {
      const { data: res } = await familyService.create({ name });
      set({ family: res.data, isLoading: false });
    } catch (err) {
      const message = err instanceof AppError ? err.message : '创建家庭组失败';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  async joinFamily(inviteCode: string) {
    set({ isLoading: true, error: null });
    try {
      const { data: res } = await familyService.join({ inviteCode });
      set({ family: res.data, isLoading: false });
    } catch (err) {
      const message = err instanceof AppError ? err.message : '加入家庭组失败';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  async leaveFamily() {
    set({ isLoading: true, error: null });
    try {
      const { data: res } = await familyService.leave();
      set({ family: null, isLoading: false });
      return res.data?.dissolved ?? false;
    } catch (err) {
      const message = err instanceof AppError ? err.message : '退出家庭组失败';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  async removeMember(memberId: string) {
    set({ isLoading: true, error: null });
    try {
      await familyService.removeMember(memberId);
      // 刷新家庭组信息
      await get().fetchFamily();
    } catch (err) {
      const message = err instanceof AppError ? err.message : '移除成员失败';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  clearError() {
    set({ error: null });
  },
}));
