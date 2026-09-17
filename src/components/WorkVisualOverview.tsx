import React, { useMemo } from 'react';
import {
  PieChart as PieIcon,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Target,
  Sparkles,
} from 'lucide-react';
import { WorkflowItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface WorkVisualOverviewProps {
  items: WorkflowItem[];
  worksheets: string[];
  activeSheet: string;
  onSelectSheet?: (sheet: string) => void;
  onOpenStatsModal?: () => void;
}

const DONUT_COLORS = [
  '#4f46e5', // Indigo
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#ef4444', // Red
];

export const WorkVisualOverview: React.FC<WorkVisualOverviewProps> = ({
  items,
  worksheets,
  activeSheet,
  onSelectSheet,
  onOpenStatsModal,
}) => {
  const { language, t } = useLanguage();
  const { accentConfig } = useTheme();

  // 1. Today's Date calculation
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // 2. Metrics calculation
  const {
    todayHours,
    todayTargetPercent,
    totalLoggedHours,
    totalDueHours,
    completionRate,
    sheetDistribution,
  } = useMemo(() => {
    let todayH = 0;
    let totalLoggedH = 0;
    let totalDueH = 0;

    const sheetCountMap: Record<string, number> = {};
    worksheets.forEach(s => {
      sheetCountMap[s] = 0;
    });

    items.forEach(item => {
      const h = parseFloat(item.workHours || '0') || 0;
      const due = parseFloat(item.workDueHours || '0') || 0;
      totalLoggedH += h;
      totalDueH += due;

      if (item.date === todayStr) {
        todayH += h;
      }

      const sName = item.sheetName || worksheets[0] || 'Untitled Worksheet';
      sheetCountMap[sName] = (sheetCountMap[sName] || 0) + 1;
    });

    const targetH = 8.0;
    const targetPercent = Math.min(100, Math.round((todayH / targetH) * 100));

    const totalHoursCombined = totalLoggedH + totalDueH;
    const compRate =
      totalHoursCombined > 0
        ? Math.round((totalLoggedH / totalHoursCombined) * 100)
        : 100;

    const totalItems = Math.max(1, items.length);
    const dist = worksheets.map((name, index) => {
      const count = sheetCountMap[name] || 0;
      const percent = Math.round((count / totalItems) * 100);
      return {
        name,
        count,
        percent,
        color: index === 0 ? accentConfig.hex : DONUT_COLORS[index % DONUT_COLORS.length],
      };
    });

    return {
      todayHours: Math.round(todayH * 10) / 10,
      todayTargetPercent: targetPercent,
      totalLoggedHours: Math.round(totalLoggedH * 10) / 10,
      totalDueHours: Math.round(totalDueH * 10) / 10,
      completionRate: compRate,
      sheetDistribution: dist,
    };
  }, [items, worksheets, todayStr, accentConfig.hex]);

  // SVG Circular Gauge Calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * todayTargetPercent) / 100;

  // SVG Donut Chart Slices Calculations
  const donutRadius = 38;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedPercent = 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-lg transition-all duration-300 relative overflow-hidden">
      {/* Ambient background glow matching current accent */}
      <div
        className="absolute -right-20 -top-20 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-15 transition-all duration-500"
        style={{ backgroundColor: accentConfig.hex }}
      />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentConfig.bgLight} ${accentConfig.textClass} border ${accentConfig.borderLight} shadow-2xs`}
          >
            <PieIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight flex items-center gap-2">
              <span>{t.visualOverview.sectionTitle}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Live Charts
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'bn'
                ? `আজকের কাজ, শিট পাই চার্ট ও আওয়ার্স প্রোগ্রেস বার`
                : `Interactive progress ring, worksheet donut chart & logged hours breakdown`}
            </p>
          </div>
        </div>

        {onOpenStatsModal && (
          <button
            type="button"
            onClick={onOpenStatsModal}
            className={`self-start sm:self-auto px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer hover:scale-102 ${accentConfig.bgLight} ${accentConfig.textClass} ${accentConfig.borderLight}`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t.hero.statsBtn}</span>
          </button>
        )}
      </div>

      {/* Visual Graphs Grid: 3 Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-5">
        {/* CARD 1: Today's Work Target Circular Progress Ring */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {t.visualOverview.todayProgressTitle}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {t.visualOverview.todayProgressSub}
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                todayTargetPercent >= 100
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : todayHours > 0
                  ? `${accentConfig.bgLight} ${accentConfig.textClass} border ${accentConfig.borderLight}`
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Target className="w-3 h-3" />
              <span>
                {todayTargetPercent >= 100
                  ? t.visualOverview.goalReached
                  : todayHours > 0
                  ? t.visualOverview.onTrack
                  : t.visualOverview.noWorkYet}
              </span>
            </span>
          </div>

          {/* Radial Progress Gauge Visual */}
          <div className="flex items-center justify-center my-3">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring Track */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-slate-200 dark:stroke-slate-700"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Dynamic Accent Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={accentConfig.hex}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Inner Stats Badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {todayHours}h
                </span>
                <span
                  className="text-[11px] font-bold"
                  style={{ color: accentConfig.hex }}
                >
                  {todayTargetPercent}%
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                  Today
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Target indicator */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>{t.visualOverview.dailyTarget}:</span>
            <strong className="text-slate-900 dark:text-white font-bold">
              {todayHours} / 8.0 {t.common.hoursShort}
            </strong>
          </div>
        </div>

        {/* CARD 2: Worksheets Distribution Donut / Pie Chart */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {t.visualOverview.worksheetsDistTitle}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {t.visualOverview.worksheetsDistSub}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {worksheets.length} {language === 'bn' ? 'টি শিট' : 'Sheets'}
            </span>
          </div>

          {/* SVG Donut / Pie Chart Visual */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-2">
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Slices of the Donut */}
                {sheetDistribution.map(slice => {
                  const strokeLength = (donutCircumference * slice.percent) / 100;
                  const currentOffset =
                    donutCircumference - (donutCircumference * accumulatedPercent) / 100;
                  accumulatedPercent += slice.percent;

                  return (
                    <circle
                      key={slice.name}
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      stroke={slice.color}
                      strokeWidth="12"
                      strokeDasharray={`${strokeLength} ${donutCircumference}`}
                      strokeDashoffset={currentOffset}
                      fill="transparent"
                      className="transition-all duration-700 hover:opacity-80"
                    />
                  );
                })}
              </svg>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {items.length}
                </span>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Entries
                </span>
              </div>
            </div>

            {/* Compact Worksheet Legend */}
            <div className="w-full space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {sheetDistribution.map(slice => (
                <button
                  key={slice.name}
                  type="button"
                  onClick={() => onSelectSheet?.(slice.name)}
                  className={`w-full flex items-center justify-between text-[11px] px-2 py-1 rounded-lg transition-colors cursor-pointer text-left ${
                    activeSheet === slice.name
                      ? 'bg-slate-200/80 dark:bg-slate-700/80 font-bold text-slate-900 dark:text-white'
                      : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate">{slice.name}</span>
                  </div>
                  <span className="font-semibold shrink-0 pl-2">
                    {slice.count} ({slice.percent}%)
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Active sheet badge at bottom */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>{language === 'bn' ? 'সক্রিয় ওয়ার্কশিট:' : 'Active Tab:'}</span>
            <strong className={`font-bold ${accentConfig.textClass} truncate max-w-[150px]`}>
              {activeSheet}
            </strong>
          </div>
        </div>

        {/* CARD 3: Work Hours Ratio & Completion Progress Bar */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {t.visualOverview.hoursRatioTitle}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {t.visualOverview.completionRate}: {completionRate}%
              </span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {totalLoggedHours + totalDueHours}h Total
            </span>
          </div>

          {/* Segmented Linear Progress Bar Visual */}
          <div className="space-y-3 my-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: accentConfig.hex }}
                  />
                  {t.visualOverview.completedHours}
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {totalLoggedHours}h ({completionRate}%)
                </span>
              </div>
              {/* Main Progress Track */}
              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex shadow-inner">
                <div
                  className="h-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${completionRate}%`,
                    backgroundColor: accentConfig.hex,
                  }}
                  title={`Logged: ${totalLoggedHours}h (${completionRate}%)`}
                />
                {totalDueHours > 0 && (
                  <div
                    className="h-full bg-amber-500 transition-all duration-1000 ease-out"
                    style={{ width: `${100 - completionRate}%` }}
                    title={`Due: ${totalDueHours}h (${100 - completionRate}%)`}
                  />
                )}
              </div>
            </div>

            {/* Quick Stat Indicators */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/50">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  {t.visualOverview.completedHours}
                </span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  {totalLoggedHours}h
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/50">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  {t.visualOverview.dueHours}
                </span>
                <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {totalDueHours}h
                </span>
              </div>
            </div>
          </div>

          {/* Efficiency status at bottom */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>{language === 'bn' ? 'দক্ষতার স্কোর:' : 'Efficiency Rate:'}</span>
            <strong className="font-bold text-emerald-600 dark:text-emerald-400">
              {completionRate}% {language === 'bn' ? 'সম্পন্ন' : 'Completed'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
