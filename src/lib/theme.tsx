import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'tata_usaha_theme';

function readInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore storage errors
  }
  return 'light';
}

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme);

  const applyTheme = useCallback((next: ThemeMode) => {
    const root = document.documentElement;
    root.classList.toggle('dark', next === 'dark');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', next === 'dark' ? '#082E1E' : '#0D4F35');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function ThemeToggleButton({
  variant = 'header',
}: {
  variant?: 'header' | 'login' | 'settings';
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const label = isDark ? 'Mode Terang' : 'Mode Gelap';

  const baseClass =
    variant === 'settings'
      ? 'inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer bg-white dark:bg-[#15261E] text-slate-800 dark:text-slate-100 border-slate-300 dark:border-[#2D473B] hover:bg-slate-50 dark:hover:bg-[#1B3127]'
      : 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap bg-[#FAFBF9] dark:bg-[#15261E] text-slate-700 dark:text-slate-100 border-[#DCE4DF] dark:border-[#2D473B] hover:bg-[#EFF6F2] dark:hover:bg-[#1C3228]';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      data-testid="theme-toggle"
      aria-label={isDark ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
      title={isDark ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
      className={baseClass}
    >
      {isDark ? (
        <Sun className="w-3.5 h-3.5 text-[#E5C158] shrink-0" aria-hidden="true" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-[#0D4F35] shrink-0" aria-hidden="true" />
      )}
      <span>{label}</span>
    </button>
  );
}
