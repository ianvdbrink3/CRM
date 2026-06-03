"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "nucleus-theme";
const DEFAULT_THEME: Theme = "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialise from localStorage synchronously on first render to avoid flash.
  // We start with DEFAULT_THEME so SSR HTML matches and then correct on mount.
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const resolved: Theme =
      stored === "dark" || stored === "light" ? stored : DEFAULT_THEME;
    setThemeState(resolved);
    applyTheme(resolved);
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Suppress hydration mismatch by rendering children only after mount,
  // but keep SSR html/body intact (just hide via visibility to avoid CLS).
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {/* During SSR / before hydration the dark class is already on <html>,
          so we render children immediately to avoid blank screens. */}
      <span
        style={mounted ? undefined : { visibility: "hidden", display: "contents" }}
      >
        {children}
      </span>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
