import { createContext, useContext, useMemo, useEffect } from "react";
import { useColorScheme } from "react-native";
import { useThemeStore } from "@/stores/theme";
import { lightColors, darkColors } from "./tokens";
import type { ColorPalette } from "./tokens";
import type { ThemeMode } from "@/stores/theme";

interface ThemeContextValue {
  colors: ColorPalette;
  mode: ThemeMode;
  resolvedScheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  mode: "system",
  resolvedScheme: "dark",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const hydrate = useThemeStore((s) => s.hydrate);
  const systemScheme = useColorScheme();

  useEffect(() => {
    hydrate();
  }, []);

  const resolvedScheme = useMemo((): "light" | "dark" => {
    if (mode === "system") {
      const s = systemScheme;
      return s === "light" || s === "dark" ? s : "dark";
    }
    return mode;
  }, [mode, systemScheme]);

  const colors = resolvedScheme === "light" ? lightColors : darkColors;

  const value = useMemo(
    () => ({ colors, mode, resolvedScheme }),
    [colors, mode, resolvedScheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
