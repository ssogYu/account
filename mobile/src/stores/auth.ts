import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authService } from '@/services/auth';
import type { AuthResponse, UpdateProfileRequest } from '@/services/auth/types';
import { registerTokenGetter, registerUnauthorizedHandler } from '@/services/api';
import { router } from 'expo-router';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface AuthState {
  token: string | null;
  user: AuthResponse['user'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;

  login: (data: { phone?: string; email?: string; password: string }) => Promise<void>;
  register: (data: {
    phone?: string;
    email?: string;
    password: string;
    nickname?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  registerTokenGetter(() => get().token);
  registerUnauthorizedHandler(() => {
    get().logout();
    router.replace('/auth/login');
  });

  let hydrating = false;

  async function persistSession(token: string, user: AuthResponse['user']) {
    await SecureStore?.setItemAsync(TOKEN_KEY, token);
    await SecureStore?.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  }

  return {
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isHydrated: false,

    async login(data) {
      set({ isLoading: true });
      try {
        const { data: res } = await authService.login(data);
        const { token, user } = res.data;
        await persistSession(token, user);
        router.replace('/(tabs)');
      } finally {
        set({ isLoading: false });
      }
    },

    async register(data) {
      set({ isLoading: true });
      try {
        const { data: res } = await authService.register(data);
        const { token, user } = res.data;
        await persistSession(token, user);
        router.replace('/(tabs)');
      } finally {
        set({ isLoading: false });
      }
    },

    async logout() {
      await SecureStore?.deleteItemAsync(TOKEN_KEY);
      await SecureStore?.deleteItemAsync(USER_KEY);
      set({ token: null, user: null, isAuthenticated: false });
    },
    // 从本地存储恢复会话
    async hydrate() {
      if (hydrating || get().isHydrated) return;
      hydrating = true;
      try {
        const token = await SecureStore?.getItemAsync(TOKEN_KEY);
        const userRaw = await SecureStore?.getItemAsync(USER_KEY);
        if (token && userRaw) {
          set({ token, user: JSON.parse(userRaw), isAuthenticated: true });
        }
      } catch {
        await SecureStore?.deleteItemAsync(TOKEN_KEY);
        await SecureStore?.deleteItemAsync(USER_KEY);
      } finally {
        hydrating = false;
        set({ isHydrated: true });
      }
    },

    async updateProfile(data: UpdateProfileRequest) {
      const { data: res } = await authService.updateProfile(data);
      const updatedUser = res.data;
      set({ user: updatedUser });
      await SecureStore?.setItemAsync(USER_KEY, JSON.stringify(updatedUser));
    },
  };
});
