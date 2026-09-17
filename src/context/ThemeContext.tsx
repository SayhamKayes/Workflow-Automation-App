import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';

export type AccentKey =
  | 'indigo'
  | 'emerald'
  | 'purple'
  | 'rose'
  | 'amber'
  | 'cyan'
  | 'red';

export interface AccentOption {
  key: AccentKey;
  labelEn: string;
  labelBn: string;
  hex: string;
  hoverHex: string;
  gradient: string;
  shadow: string;
  bgLight: string;
  borderLight: string;
  textClass: string;
  badgeBg: string;
  badgeText: string;
  activeTabClass: string;
}

export const ACCENT_PALETTE: Record<AccentKey, AccentOption> = {
  indigo: {
    key: 'indigo',
    labelEn: 'Indigo Blue',
    labelBn: 'ইন্ডিগো ব্লু',
    hex: '#4f46e5',
    hoverHex: '#4338ca',
    gradient: 'from-indigo-600 to-blue-700',
    shadow: 'shadow-indigo-500/25',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/40',
    borderLight: 'border-indigo-200 dark:border-indigo-800/60',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-900/50',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    activeTabClass: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30',
  },
  emerald: {
    key: 'emerald',
    labelEn: 'Emerald Green',
    labelBn: 'এমেরাল্ড গ্রিন',
    hex: '#059669',
    hoverHex: '#047857',
    gradient: 'from-emerald-600 to-teal-700',
    shadow: 'shadow-emerald-500/25',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderLight: 'border-emerald-200 dark:border-emerald-800/60',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    activeTabClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30',
  },
  purple: {
    key: 'purple',
    labelEn: 'Electric Purple',
    labelBn: 'ইলেকট্রিক পার্পল',
    hex: '#9333ea',
    hoverHex: '#7e22ce',
    gradient: 'from-purple-600 to-indigo-700',
    shadow: 'shadow-purple-500/25',
    bgLight: 'bg-purple-50 dark:bg-purple-950/40',
    borderLight: 'border-purple-200 dark:border-purple-800/60',
    textClass: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/50',
    badgeText: 'text-purple-700 dark:text-purple-300',
    activeTabClass: 'bg-purple-600 text-white shadow-md shadow-purple-500/30',
  },
  rose: {
    key: 'rose',
    labelEn: 'Vibrant Rose',
    labelBn: 'ভাইব্রেন্ট রোজ',
    hex: '#e11d48',
    hoverHex: '#be123c',
    gradient: 'from-rose-600 to-pink-700',
    shadow: 'shadow-rose-500/25',
    bgLight: 'bg-rose-50 dark:bg-rose-950/40',
    borderLight: 'border-rose-200 dark:border-rose-800/60',
    textClass: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/50',
    badgeText: 'text-rose-700 dark:text-rose-300',
    activeTabClass: 'bg-rose-600 text-white shadow-md shadow-rose-500/30',
  },
  amber: {
    key: 'amber',
    labelEn: 'Golden Amber',
    labelBn: 'গোল্ডেন অ্যাম্বার',
    hex: '#d97706',
    hoverHex: '#b45309',
    gradient: 'from-amber-600 to-orange-700',
    shadow: 'shadow-amber-500/25',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    borderLight: 'border-amber-200 dark:border-amber-800/60',
    textClass: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/50',
    badgeText: 'text-amber-700 dark:text-amber-300',
    activeTabClass: 'bg-amber-600 text-white shadow-md shadow-amber-500/30',
  },
  cyan: {
    key: 'cyan',
    labelEn: 'Aqua Cyan',
    labelBn: 'অ্যাকোয়া সায়ান',
    hex: '#0891b2',
    hoverHex: '#0e7490',
    gradient: 'from-cyan-600 to-blue-700',
    shadow: 'shadow-cyan-500/25',
    bgLight: 'bg-cyan-50 dark:bg-cyan-950/40',
    borderLight: 'border-cyan-200 dark:border-cyan-800/60',
    textClass: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/50',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    activeTabClass: 'bg-cyan-600 text-white shadow-md shadow-cyan-500/30',
  },
  red: {
    key: 'red',
    labelEn: 'Crimson Red',
    labelBn: 'ক্রিমসন রেড',
    hex: '#dc2626',
    hoverHex: '#b91c1c',
    gradient: 'from-red-600 to-rose-700',
    shadow: 'shadow-red-500/25',
    bgLight: 'bg-red-50 dark:bg-red-950/40',
    borderLight: 'border-red-200 dark:border-red-800/60',
    textClass: 'text-red-600 dark:text-red-400',
    badgeBg: 'bg-red-100 dark:bg-red-900/50',
    badgeText: 'text-red-700 dark:text-red-300',
    activeTabClass: 'bg-red-600 text-white shadow-md shadow-red-500/30',
  },
};

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  accent: AccentKey;
  setAccent: (accent: AccentKey) => void;
  accentConfig: AccentOption;
  palette: AccentOption[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'workflow_app_theme';
const ACCENT_STORAGE_KEY = 'workflow_app_accent';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [accent, setAccent] = useState<AccentKey>(() => {
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentKey | null;
      if (saved && ACCENT_PALETTE[saved]) return saved;
    } catch {
      // ignore
    }
    return 'indigo';
  });

  // Apply dark mode class to root HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Apply accent color CSS variables to root
  useEffect(() => {
    const current = ACCENT_PALETTE[accent];
    const root = document.documentElement;
    root.style.setProperty('--color-accent-primary', current.hex);
    root.style.setProperty('--color-accent-hover', current.hoverHex);
    localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  }, [accent]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const accentConfig = ACCENT_PALETTE[accent] || ACCENT_PALETTE.indigo;
  const palette = Object.values(ACCENT_PALETTE);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        accent,
        setAccent,
        accentConfig,
        palette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
