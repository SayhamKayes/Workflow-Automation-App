import React from 'react';
import {
  TrendingUp,
  ClipboardPen,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export type MobileTab = 'progress' | 'form' | 'worksheets' | 'preview';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  worksheetsCount?: number;
  recordsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  worksheetsCount,
  recordsCount,
}) => {
  const { t } = useLanguage();
  const { accentConfig } = useTheme();

  const tabs: {
    id: MobileTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: 'progress',
      label: t.mobileNav.progress,
      icon: TrendingUp,
    },
    {
      id: 'form',
      label: t.mobileNav.form,
      icon: ClipboardPen,
    },
    {
      id: 'worksheets',
      label: t.mobileNav.worksheets,
      icon: Layers,
      badge: worksheetsCount,
    },
    {
      id: 'preview',
      label: t.mobileNav.preview,
      icon: FileSpreadsheet,
      badge: recordsCount,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.35)] safe-area-pb"
    >
      <div className="grid grid-cols-4 h-16 max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              id={`mobile-tab-${tab.id}`}
              onClick={() => {
                onTabChange(tab.id);
                // Smooth scroll to top when changing tab on mobile
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`relative flex flex-col items-center justify-center gap-1 w-full h-full py-1.5 transition-all duration-200 active:scale-95 group select-none ${
                isActive
                  ? accentConfig.textClass
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {/* Icon Container with subtle background highlight when active */}
              <div
                className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${
                  isActive
                    ? `${accentConfig.bgLight} scale-105`
                    : 'group-hover:bg-slate-100 dark:group-hover:bg-slate-800/60'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />

                {/* Optional Badge for Worksheets count or Records count */}
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white ${
                      isActive ? accentConfig.badgeBg + ' ' + accentConfig.badgeText : 'bg-slate-500 dark:bg-slate-600'
                    }`}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10.5px] leading-none transition-all duration-200 tracking-tight ${
                  isActive ? 'font-bold' : 'font-medium opacity-80 group-hover:opacity-100'
                }`}
              >
                {tab.label}
              </span>

              {/* Active Indicator Dot */}
              {isActive && (
                <span
                  className={`absolute top-0.5 w-7 h-0.5 rounded-full bg-current transition-all`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
