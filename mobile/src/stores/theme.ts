import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'theme_mode';

interface ThemeState {
  mode: ThemeMode;
  isHydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  isHydrated: false,

  setMode: async (mode: ThemeMode) => {
    set({ mode });
    await SecureStore.setItemAsync(THEME_KEY, mode);
  },

  hydrate: async () => {
    if (get().isHydrated) return;
    try {
      const stored = await SecureStore.getItemAsync(THEME_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({ mode: stored });
      }
    } catch {
    } finally {
      set({ isHydrated: true });
    }
  },
}));
