import React, { useState, useMemo, useRef, useEffect, useCallback, useId } from 'react';
import {
  PieChart as PieIcon,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Target,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  Flame,
  Download,
  Filter,
} from 'lucide-react';
import { WorkflowItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export interface WorkVisualOverviewProps {
  items: WorkflowItem[];
  worksheets: string[];
  activeSheet: string;
  onSelectSheet?: (sheet: string) => void;
  onOpenStatsModal?: () => void;
  onOpenDownloadModal?: () => void;
}

export type TimelineFilter = 'month' | '6months' | '1year' | 'custom';
export type TimelineScope = 'active' | 'all';

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
  onOpenDownloadModal,
}) => {
  const { language, t } = useLanguage();
  const { accentConfig } = useTheme();

  // Generate unique IDs for SVG gradients so mobile & desktop instances never conflict
  const rawId = useId();
  const uniqueId = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const accentGradId = `barAccentGrad_${uniqueId}`;
  const amberGradId = `barAmberGrad_${uniqueId}`;

  // Timeline bar chart interactive states
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('month');
  const [timelineScope, setTimelineScope] = useState<TimelineScope>('active');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // 1. Today's Date calculation
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // 2. Metrics calculation for Top 3 Cards
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

  // 3. Timeline Bar Chart aggregation
  const { timelineData, maxHoursScale, peakBar, totalTimelineHours } = useMemo(() => {
    // Filter items based on chosen worksheet scope
    const scopedItems = items.filter(item => {
      if (!item.date) return false;
      if (timelineScope === 'active') {
        const itemSheet = item.sheetName || worksheets[0] || 'Untitled Worksheet';
        return itemSheet === activeSheet;
      }
      return true;
    });

    // Date metrics lookup map
    const dateMetricsMap: Record<
      string,
      { workHours: number; dueHours: number; taskCount: number }
    > = {};

    scopedItems.forEach(item => {
      if (!item.date) return;
      if (!dateMetricsMap[item.date]) {
        dateMetricsMap[item.date] = { workHours: 0, dueHours: 0, taskCount: 0 };
      }
      const wh = parseFloat(item.workHours || '0') || 0;
      const dh = parseFloat(item.workDueHours || '0') || 0;
      const tasks = [item.work1, item.work2, item.work3, item.work4].filter(
        t => t && t.trim().length > 0
      );
      dateMetricsMap[item.date].workHours += wh;
      dateMetricsMap[item.date].dueHours += dh;
      dateMetricsMap[item.date].taskCount += Math.max(tasks.length, 1);
    });

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    interface BarDataPoint {
      id: string;
      label: string;
      fullDateLabel: string;
      workHours: number;
      dueHours: number;
      totalHours: number;
      taskCount: number;
      isToday?: boolean;
    }

    const bars: BarDataPoint[] = [];

    if (timelineFilter === 'month') {
      // Days of current month (1 to daysInMonth)
      const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
      const monthNamesShort = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const monthShort = monthNamesShort[curMonth];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(
          day
        ).padStart(2, '0')}`;
        const dayDate = new Date(curYear, curMonth, day);
        const dayOfWeek = dayDate.toLocaleDateString(
          language === 'bn' ? 'bn-BD' : 'en-US',
          { weekday: 'short' }
        );
        const metrics = dateMetricsMap[dateStr] || {
          workHours: 0,
          dueHours: 0,
          taskCount: 0,
        };

        bars.push({
          id: dateStr,
          label: String(day),
          fullDateLabel: `${monthShort} ${day}, ${curYear} (${dayOfWeek})`,
          workHours: Math.round(metrics.workHours * 10) / 10,
          dueHours: Math.round(metrics.dueHours * 10) / 10,
          totalHours:
            Math.round((metrics.workHours + metrics.dueHours) * 10) / 10,
          taskCount: metrics.taskCount,
          isToday: dateStr === todayStr,
        });
      }
    } else if (timelineFilter === '6months' || timelineFilter === '1year') {
      const monthCount = timelineFilter === '6months' ? 6 : 12;
      const monthNamesShort = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];

      for (let i = monthCount - 1; i >= 0; i--) {
        const targetDate = new Date(curYear, curMonth - i, 1);
        const tYear = targetDate.getFullYear();
        const tMonth = targetDate.getMonth();
        const monthKey = `${tYear}-${String(tMonth + 1).padStart(2, '0')}`;
        const mLabel = monthNamesShort[tMonth];
        const displayLabel =
          tYear === curYear ? mLabel : `${mLabel} '${String(tYear).slice(-2)}`;

        let mWorkHours = 0;
        let mDueHours = 0;
        let mTaskCount = 0;

        Object.entries(dateMetricsMap).forEach(([dateStr, m]) => {
          if (dateStr.startsWith(monthKey)) {
            mWorkHours += m.workHours;
            mDueHours += m.dueHours;
            mTaskCount += m.taskCount;
          }
        });

        bars.push({
          id: monthKey,
          label: displayLabel,
          fullDateLabel: `${targetDate.toLocaleString('default', {
            month: 'long',
          })} ${tYear}`,
          workHours: Math.round(mWorkHours * 10) / 10,
          dueHours: Math.round(mDueHours * 10) / 10,
          totalHours: Math.round((mWorkHours + mDueHours) * 10) / 10,
          taskCount: mTaskCount,
          isToday: tYear === curYear && tMonth === curMonth,
        });
      }
    } else if (timelineFilter === 'custom') {
      if (customStart && customEnd && customStart <= customEnd) {
        const start = new Date(customStart + 'T00:00:00');
        const end = new Date(customEnd + 'T00:00:00');
        const diffDays =
          Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays <= 31) {
          const cur = new Date(start);
          while (cur <= end) {
            const y = cur.getFullYear();
            const m = cur.getMonth();
            const d = cur.getDate();
            const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(
              d
            ).padStart(2, '0')}`;
            const metrics = dateMetricsMap[dateStr] || {
              workHours: 0,
              dueHours: 0,
              taskCount: 0,
            };
            const mShort = cur.toLocaleString('default', { month: 'short' });
            const dayOfWeek = cur.toLocaleDateString(
              language === 'bn' ? 'bn-BD' : 'en-US',
              { weekday: 'short' }
            );

            bars.push({
              id: dateStr,
              label: `${d}`,
              fullDateLabel: `${mShort} ${d}, ${y} (${dayOfWeek})`,
              workHours: Math.round(metrics.workHours * 10) / 10,
              dueHours: Math.round(metrics.dueHours * 10) / 10,
              totalHours:
                Math.round((metrics.workHours + metrics.dueHours) * 10) / 10,
              taskCount: metrics.taskCount,
              isToday: dateStr === todayStr,
            });

            cur.setDate(cur.getDate() + 1);
          }
        } else {
          const cur = new Date(start.getFullYear(), start.getMonth(), 1);
          while (cur <= end) {
            const y = cur.getFullYear();
            const m = cur.getMonth();
            const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
            const mShort = cur.toLocaleString('default', { month: 'short' });

            let mWorkHours = 0;
            let mDueHours = 0;
            let mTaskCount = 0;

            Object.entries(dateMetricsMap).forEach(([dateStr, metrics]) => {
              if (
                dateStr >= customStart &&
                dateStr <= customEnd &&
                dateStr.startsWith(monthKey)
              ) {
                mWorkHours += metrics.workHours;
                mDueHours += metrics.dueHours;
                mTaskCount += metrics.taskCount;
              }
            });

            bars.push({
              id: monthKey,
              label: `${mShort} '${String(y).slice(-2)}`,
              fullDateLabel: `${cur.toLocaleString('default', {
                month: 'long',
              })} ${y}`,
              workHours: Math.round(mWorkHours * 10) / 10,
              dueHours: Math.round(mDueHours * 10) / 10,
              totalHours: Math.round((mWorkHours + mDueHours) * 10) / 10,
              taskCount: mTaskCount,
            });

            cur.setMonth(cur.getMonth() + 1);
          }
        }
      }
    }

    // Peak calculation
    let peak: BarDataPoint | null = null;
    let totalSumH = 0;
    bars.forEach(b => {
      totalSumH += b.workHours;
      if (!peak || b.workHours > peak.workHours) {
        if (b.workHours > 0) {
          peak = b;
        }
      }
    });

    const maxLogged = Math.max(...bars.map(b => b.workHours + b.dueHours), 8);
    const scale = Math.ceil(maxLogged / 2) * 2;

    return {
      timelineData: bars,
      maxHoursScale: Math.max(scale, 8),
      peakBar: peak,
      totalTimelineHours: Math.round(totalSumH * 10) / 10,
    };
  }, [
    items,
    worksheets,
    activeSheet,
    timelineFilter,
    timelineScope,
    customStart,
    customEnd,
    todayStr,
    language,
  ]);

  // SVG Circular Gauge Calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (circumference * todayTargetPercent) / 100;

  // SVG Donut Chart Slices Calculations
  const donutRadius = 38;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedPercent = 0;

  // SVG Bar Chart Dimensions
  const chartWidth = 840;
  const chartHeight = 170;
  const chartLeft = 45;
  const chartTop = 20;
  const chartBottom = chartTop + chartHeight;
  const barSlotWidth =
    timelineData.length > 0 ? chartWidth / timelineData.length : 1;
  const barWidth = Math.max(7, Math.min(barSlotWidth * 0.65, 34));

  // Y-axis tick values
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio =>
    Math.round(maxHoursScale * ratio)
  );

  const activeHoveredBar =
    hoveredBarIndex !== null ? timelineData[hoveredBarIndex] : null;

  // Ref for the horizontal scroll container
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Scroll smoothly to today's bar, or peak bar, or latest active bar with work
  const scrollToActiveBar = useCallback(() => {
    if (!timelineScrollRef.current) return;
    const container = timelineScrollRef.current;

    let targetIndex = timelineData.findIndex(b => b.isToday);
    if (targetIndex === -1 && peakBar) {
      targetIndex = timelineData.findIndex(b => b.id === peakBar.id);
    }
    if (targetIndex === -1) {
      for (let i = timelineData.length - 1; i >= 0; i--) {
        if (timelineData[i].workHours > 0 || timelineData[i].dueHours > 0) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex !== -1 && timelineData.length > 0) {
      const targetCenterX = chartLeft + (targetIndex + 0.5) * barSlotWidth;
      const svgWidth = chartWidth + chartLeft + 20;
      const containerWidth = container.clientWidth;
      const scrollWidth = container.scrollWidth;
      const ratio = scrollWidth / svgWidth;
      const scrollPos = targetCenterX * ratio - containerWidth / 2;

      container.scrollTo({
        left: Math.max(0, scrollPos),
        behavior: 'smooth',
      });
    }
  }, [timelineData, peakBar, barSlotWidth, chartLeft, chartWidth]);

  // Automatically scroll to active / today's bar on initial load or filter/scope switch
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToActiveBar();
    }, 150);
    return () => clearTimeout(timer);
  }, [scrollToActiveBar, timelineFilter, timelineScope]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-lg transition-all duration-300 relative overflow-hidden space-y-6">
      {/* Ambient background glow matching current accent */}
      <div
        className="absolute -right-20 -top-20 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-15 transition-all duration-500"
        style={{ backgroundColor: accentConfig.hex }}
      />

      {/* ============================================================ */}
      {/* SECTION HEADER BAR */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentConfig.bgLight} ${accentConfig.textClass} border ${accentConfig.borderLight} shadow-2xs`}
          >
            <PieIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight flex items-center gap-2">
              <span>{t.visualOverview.sectionTitle}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Live Sync
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'bn'
                ? 'রিয়েল-টাইম দৈনিক প্রোগ্রেস গেজ, শিট ডিস্ট্রিবিউশন ও ইন্টার‍্যাক্টিভ টাইমলাইন চার্ট'
                : 'Interactive productivity gauge, worksheet donut chart & workflow timeline'}
            </p>
          </div>
        </div>

        {/* Action buttons: Download Workflow (Left) and Analytics Dashboard (Right) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onOpenDownloadModal && (
            <button
              type="button"
              onClick={onOpenDownloadModal}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer hover:scale-102 active:scale-98"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t.visualOverview.downloadWorkflowBtn}</span>
            </button>
          )}

          {onOpenStatsModal && (
            <button
              type="button"
              onClick={onOpenStatsModal}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer hover:scale-102 active:scale-98 ${accentConfig.bgLight} ${accentConfig.textClass} ${accentConfig.borderLight}`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t.hero.statsBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3 TOP KPI CARDS: Gauge, Donut Chart, and Linear Ratio */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-slate-200 dark:stroke-slate-700"
                  strokeWidth="8"
                  fill="transparent"
                />
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
                {sheetDistribution.map(slice => {
                  const strokeLength = (donutCircumference * slice.percent) / 100;
                  const currentOffset =
                    donutCircumference -
                    (donutCircumference * accumulatedPercent) / 100;
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

          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>{language === 'bn' ? 'দক্ষতার স্কোর:' : 'Efficiency Rate:'}</span>
            <strong className="font-bold text-emerald-600 dark:text-emerald-400">
              {completionRate}% {language === 'bn' ? 'সম্পন্ন' : 'Completed'}
            </strong>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* INTERACTIVE WORKFLOW TIMELINE BAR CHART */}
      {/* ============================================================ */}
      <div className="bg-slate-50/70 dark:bg-slate-800/30 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
        {/* Timeline Header & Interactive Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-700/50">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {t.visualOverview.barChartTitle}
              </h4>
              {peakBar && peakBar.workHours > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>
                    {t.visualOverview.peakOutput}: {peakBar.workHours}h ({peakBar.label})
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.visualOverview.barChartSub} •{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {totalTimelineHours} {t.common.hoursShort}
              </strong>{' '}
              {language === 'bn' ? 'লগ করা হয়েছে' : 'logged in range'}
            </p>
          </div>

          {/* Filtering Controls: Scope toggle & Range selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Toggle: Active Sheet vs All Sheets */}
            <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-700/70 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTimelineScope('active')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  timelineScope === 'active'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={`Filter for ${activeSheet}`}
              >
                {t.visualOverview.scopeActive}
              </button>
              <button
                type="button"
                onClick={() => setTimelineScope('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  timelineScope === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.visualOverview.scopeAll}
              </button>
            </div>

            {/* Time Range Pills */}
            <div className="inline-flex flex-wrap rounded-xl bg-slate-200/80 dark:bg-slate-700/70 p-0.5 text-xs font-semibold max-w-full">
              <button
                type="button"
                onClick={() => setTimelineFilter('month')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  timelineFilter === 'month'
                    ? `${accentConfig.bgLight} ${accentConfig.textClass} shadow-xs font-bold`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.visualOverview.thisMonth}
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('6months')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  timelineFilter === '6months'
                    ? `${accentConfig.bgLight} ${accentConfig.textClass} shadow-xs font-bold`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.visualOverview.past6Months}
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('1year')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  timelineFilter === '1year'
                    ? `${accentConfig.bgLight} ${accentConfig.textClass} shadow-xs font-bold`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.visualOverview.past1Year}
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('custom')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  timelineFilter === 'custom'
                    ? `${accentConfig.bgLight} ${accentConfig.textClass} shadow-xs font-bold`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.visualOverview.customRange}
              </button>
            </div>

            {/* Custom Range Date Pickers */}
            {timelineFilter === 'custom' && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Hovered Bar Information Card Banner */}
        <div className="min-h-9 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-center justify-between text-xs transition-all">
          {activeHoveredBar ? (
            <div className="flex items-center gap-4 flex-wrap w-full justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">
                  {activeHoveredBar.fullDateLabel}
                </span>
                {activeHoveredBar.isToday && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    Today
                  </span>
                )}
                {/* Dismiss button for mobile touch */}
                <button
                  type="button"
                  onClick={() => setHoveredBarIndex(null)}
                  className="sm:hidden text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ml-1"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: accentConfig.hex }}
                  />
                  <span>
                    {t.visualOverview.loggedHours}:{' '}
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {activeHoveredBar.workHours}h
                    </strong>
                  </span>
                </span>

                {activeHoveredBar.dueHours > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                    <span>
                      {t.visualOverview.dueHours}:{' '}
                      <strong className="font-bold">
                        {activeHoveredBar.dueHours}h
                      </strong>
                    </span>
                  </span>
                )}

                <span className="text-slate-500 dark:text-slate-400">
                  {t.visualOverview.tasksCount}:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {activeHoveredBar.taskCount}
                  </strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full text-slate-500 dark:text-slate-400 text-[11px]">
              <span>
                {language === 'bn'
                  ? 'বার-এ ট্যাপ বা মাউস আনলে বিস্তারিত তথ্য প্রদর্শিত হবে'
                  : 'Tap or hover over any bar on the timeline to inspect daily hours'}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: accentConfig.hex }}
                  />
                  <span>{t.visualOverview.completedHours}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{t.visualOverview.dueHours}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Horizontal Swipe Instruction Hint & Jump to Today Button */}
        <div className="sm:hidden flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1 pt-1">
          <span className="flex items-center gap-1 font-medium">
            <span>↔</span>
            <span>
              {language === 'bn'
                ? 'ডানে-বামে সোয়াইপ করে পুরো মাসের ডেটা দেখুন'
                : 'Swipe horizontally to view full month'}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={scrollToActiveBar}
              className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/50 dark:border-indigo-800/50 text-[10px] active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              {language === 'bn' ? 'আজকের দিন 📍' : 'Today 📍'}
            </button>
            <span className="text-[10px] text-slate-400">
              {timelineData.length} {language === 'bn' ? 'দিন' : 'days'}
            </span>
          </div>
        </div>

        {/* Vector SVG Bar Chart */}
        <div
          ref={timelineScrollRef}
          className="w-full overflow-x-auto pt-1 pb-1 touch-pan-x scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className={timelineData.length > 12 ? 'min-w-[860px] sm:min-w-full' : 'w-full'}>
            <svg
              className="w-full h-56 select-none touch-pan-x"
              style={{ touchAction: 'pan-x' }}
              viewBox={`0 0 ${chartWidth + chartLeft + 20} 240`}
            >
              <defs>
                {/* Accent Gradient for Logged Work with Unique ID */}
                <linearGradient id={accentGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentConfig.hex} stopOpacity="1" />
                  <stop offset="100%" stopColor={accentConfig.hex} stopOpacity="0.75" />
                </linearGradient>

                {/* Amber Gradient for Due Hours with Unique ID */}
                <linearGradient id={amberGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.75" />
                </linearGradient>
              </defs>

              {/* Y-Axis Horizontal Grid Lines & Ticks */}
              {yTicks.map(tickVal => {
                const yPos = chartBottom - (tickVal / maxHoursScale) * chartHeight;
                return (
                  <g key={tickVal}>
                    <line
                      x1={chartLeft}
                      y1={yPos}
                      x2={chartLeft + chartWidth}
                      y2={yPos}
                      className="stroke-slate-200 dark:stroke-slate-700/60"
                      strokeWidth="1"
                      strokeDasharray={tickVal === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={chartLeft - 8}
                      y={yPos + 3}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 dark:fill-slate-500 font-semibold"
                    >
                      {tickVal}h
                    </text>
                  </g>
                );
              })}

              {/* 8h Daily Target Guide Line if within scale */}
              {maxHoursScale >= 8 && (
                <g>
                  <line
                    x1={chartLeft}
                    y1={chartBottom - (8.0 / maxHoursScale) * chartHeight}
                    x2={chartLeft + chartWidth}
                    y2={chartBottom - (8.0 / maxHoursScale) * chartHeight}
                    className="stroke-emerald-500/50 dark:stroke-emerald-400/40"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={chartLeft + chartWidth - 5}
                    y={chartBottom - (8.0 / maxHoursScale) * chartHeight - 4}
                    textAnchor="end"
                    className="text-[9px] fill-emerald-600 dark:fill-emerald-400 font-bold"
                  >
                    8h Goal
                  </text>
                </g>
              )}

              {/* Bars Rendering */}
              {timelineData.map((bar, index) => {
                const centerX = chartLeft + (index + 0.5) * barSlotWidth;
                const barX = centerX - barWidth / 2;

                const workBarHeight =
                  bar.workHours > 0
                    ? Math.max(3, (bar.workHours / maxHoursScale) * chartHeight)
                    : 0;
                const dueBarHeight =
                  bar.dueHours > 0
                    ? Math.max(3, (bar.dueHours / maxHoursScale) * chartHeight)
                    : 0;

                const workBarY = chartBottom - workBarHeight;
                const dueBarY = workBarY - dueBarHeight;

                const isHovered = hoveredBarIndex === index;
                const isPeak = peakBar?.id === bar.id && bar.workHours > 0;

                return (
                  <g
                    key={bar.id || index}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredBarIndex(index)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                    onClick={() => setHoveredBarIndex(prev => (prev === index ? null : index))}
                  >
                    {/* Hover / Tap column background highlight */}
                    {isHovered && (
                      <rect
                        x={centerX - barSlotWidth / 2 + 1}
                        y={chartTop}
                        width={barSlotWidth - 2}
                        height={chartHeight + 20}
                        rx="4"
                        className="fill-slate-400/15 dark:fill-slate-300/15"
                      />
                    )}

                    {/* Hover vertical guide line */}
                    {isHovered && (
                      <line
                        x1={centerX}
                        y1={chartTop}
                        x2={centerX}
                        y2={chartBottom}
                        className="stroke-slate-400 dark:stroke-slate-500"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Due Hours Bar (Stacked above work hours) */}
                    {dueBarHeight > 0 && (
                      <rect
                        x={barX}
                        y={dueBarY}
                        width={barWidth}
                        height={dueBarHeight}
                        rx="3"
                        fill={`url(#${amberGradId})`}
                        style={{ fill: `url(#${amberGradId}) #f59e0b` }}
                        className={`transition-all duration-300 ${
                          isHovered ? 'brightness-110' : ''
                        }`}
                      />
                    )}

                    {/* Logged Work Hours Bar */}
                    {workBarHeight > 0 ? (
                      <rect
                        x={barX}
                        y={workBarY}
                        width={barWidth}
                        height={workBarHeight}
                        rx="3"
                        fill={`url(#${accentGradId})`}
                        style={{ fill: `url(#${accentGradId}) ${accentConfig.hex}` }}
                        stroke={isHovered ? '#ffffff' : 'transparent'}
                        strokeWidth={isHovered ? 1.5 : 0}
                        className={`transition-all duration-300 ${
                          isHovered ? 'brightness-125 filter drop-shadow-md' : ''
                        }`}
                      />
                    ) : (
                      /* Zero hour subtle dot baseline indicator */
                      <circle
                        cx={centerX}
                        y={chartBottom - 3}
                        r={isHovered ? 3.5 : 1.5}
                        className={
                          isHovered
                            ? 'fill-indigo-500 dark:fill-indigo-400'
                            : 'fill-slate-300 dark:fill-slate-700'
                        }
                      />
                    )}

                    {/* Peak badge indicator */}
                    {isPeak && !isHovered && (
                      <circle
                        cx={centerX}
                        cy={workBarY - 6}
                        r="3"
                        fill="#f59e0b"
                        className="animate-pulse"
                      />
                    )}

                    {/* X-axis labels: show either all or spaced labels for density */}
                    {(timelineData.length <= 15 ||
                      index % Math.ceil(timelineData.length / 15) === 0 ||
                      index === timelineData.length - 1 ||
                      isHovered) && (
                      <text
                        x={centerX}
                        y={chartBottom + 16}
                        textAnchor="middle"
                        className={`text-[10px] font-medium transition-colors ${
                          isHovered
                            ? 'font-bold fill-slate-900 dark:fill-white text-[11px]'
                            : bar.isToday
                            ? 'font-bold fill-indigo-600 dark:fill-indigo-400'
                            : 'fill-slate-500 dark:fill-slate-400'
                        }`}
                      >
                        {bar.label}
                      </text>
                    )}

                    {/* Transparent overlay hitbox for easy mobile tapping and desktop hovering */}
                    <rect
                      x={centerX - barSlotWidth / 2}
                      y={chartTop}
                      width={barSlotWidth}
                      height={chartHeight + 35}
                      fill="rgba(0,0,0,0.001)"
                      pointerEvents="all"
                      style={{ pointerEvents: 'all', touchAction: 'pan-x' }}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHoveredBarIndex(prev => (prev === index ? null : index));
                      }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Bottom Legend & Active Scope Info */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {language === 'bn' ? 'বর্তমান ফিল্টার:' : 'Active Scope:'}
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {timelineScope === 'active' ? activeSheet : t.visualOverview.scopeAll}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: accentConfig.hex }}
              />
              <span>{t.visualOverview.completedHours}</span>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span>{t.visualOverview.dueHours}</span>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-500" />
              <span>8.0h Daily Goal</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
