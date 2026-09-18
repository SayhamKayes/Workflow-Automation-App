import React, { useState, useMemo } from 'react';
import { WorkflowItem, TimeFilterRange } from '../types';
import {
  X,
  Calendar,
  Clock,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
  CalendarDays,
  Sparkles,
  FileSpreadsheet,
  Filter,
  Award,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WorkflowItem[];
  worksheets: string[];
  activeSheet: string;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  items,
  worksheets,
}) => {
  const { language, t } = useLanguage();
  const { accentConfig } = useTheme();

  const [timeRange, setTimeRange] = useState<TimeFilterRange>('all');
  const [selectedSheetFilter, setSelectedSheetFilter] = useState<string>('all');

  // Derive complete list of worksheets from both prop and items
  const allWorksheets = useMemo(() => {
    const itemSheets = items.map(i => i.sheetName || 'Untitled Worksheet').filter(Boolean);
    return Array.from(new Set([...worksheets, ...itemSheets]));
  }, [worksheets, items]);

  // Custom range dates
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Calculate filtered items
  const filteredItems = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;

    return items.filter(item => {
      if (!item.date) return false;

      // 1. Worksheet Filter
      if (selectedSheetFilter !== 'all') {
        const itemSheet = item.sheetName || 'Untitled Worksheet';
        if (itemSheet !== selectedSheetFilter) return false;
      }

      // 2. Time Range Filter
      if (timeRange === 'all') {
        return true;
      }

      if (timeRange === 'today') {
        return item.date === todayStr;
      }

      const itemDate = new Date(item.date + 'T00:00:00');
      const diffTime = now.getTime() - itemDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (timeRange === 'week') {
        return diffDays >= 0 && diffDays <= 7;
      }

      if (timeRange === 'month') {
        const isSameMonth =
          itemDate.getFullYear() === now.getFullYear() &&
          itemDate.getMonth() === now.getMonth();
        return isSameMonth || (diffDays >= 0 && diffDays <= 30);
      }

      if (timeRange === '6months') {
        return diffDays >= 0 && diffDays <= 183;
      }

      if (timeRange === '1year') {
        return diffDays >= 0 && diffDays <= 366;
      }

      if (timeRange === 'custom') {
        if (!customStartDate || !customEndDate) return true;
        return item.date >= customStartDate && item.date <= customEndDate;
      }

      return true;
    });
  }, [items, selectedSheetFilter, timeRange, customStartDate, customEndDate]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    let totalWorkHours = 0;
    let totalDueHours = 0;
    let totalWorksCount = 0;
    const uniqueDates = new Set<string>();

    filteredItems.forEach(item => {
      if (item.date) uniqueDates.add(item.date);

      const wh = parseFloat(item.workHours || '0');
      if (!isNaN(wh) && wh > 0) totalWorkHours += wh;

      const dh = parseFloat(item.workDueHours || '0');
      if (!isNaN(dh) && dh > 0) totalDueHours += dh;

      const tasks = [item.work1, item.work2, item.work3, item.work4].filter(
        itemText => itemText && itemText.trim().length > 0
      );
      totalWorksCount += Math.max(tasks.length, 1);
    });

    const activeDays = uniqueDates.size;
    const avgHoursPerDay = activeDays > 0 ? (totalWorkHours / activeDays).toFixed(1) : '0';
    const avgTasksPerDay = activeDays > 0 ? (totalWorksCount / activeDays).toFixed(1) : '0';

    return {
      totalWorkHours,
      totalDueHours,
      totalWorksCount,
      activeDays,
      avgHoursPerDay,
      avgTasksPerDay,
      entriesCount: filteredItems.length,
    };
  }, [filteredItems]);

  if (!isOpen) return null;

  const exportFilteredReport = () => {
    const headers = [
      'Worksheet',
      'Date',
      'Work Hours',
      'Work 1',
      'Work 2',
      'Work 3',
      'Work 4',
      'Work Due Hours',
    ];

    const rows = filteredItems.map(item => [
      `"${item.sheetName || 'Untitled Worksheet'}"`,
      `"${item.date}"`,
      `"${item.workHours || '0'}"`,
      `"${(item.work1 || '').replace(/"/g, '""')}"`,
      `"${(item.work2 || '').replace(/"/g, '""')}"`,
      `"${(item.work3 || '').replace(/"/g, '""')}"`,
      `"${(item.work4 || '').replace(/"/g, '""')}"`,
      `"${item.workDueHours || '0'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `workflow_stats_${selectedSheetFilter}_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFilterTitle = () => {
    switch (timeRange) {
      case 'today':
        return t.statsModal.rangeToday;
      case 'week':
        return t.statsModal.rangeWeek;
      case 'month':
        return t.statsModal.rangeMonth;
      case '6months':
        return t.statsModal.range6Months;
      case '1year':
        return t.statsModal.range1Year;
      case 'custom':
        return `${t.statsModal.rangeCustom} (${customStartDate || '...'} - ${customEndDate || '...'})`;
      default:
        return 'Overview';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl ${accentConfig.bgLight} border ${accentConfig.borderLight} flex items-center justify-center`}
            >
              <TrendingUp className={`w-5 h-5 ${accentConfig.textClass}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  {t.statsModal.title}
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Analytics
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{t.statsModal.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportFilteredReport}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              id="close-stats-modal-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters Bar: Worksheets Selector & Time Range Selector */}
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 space-y-2.5">
          {/* 1. Worksheet Selector Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto sm:flex-wrap pb-0.5 max-w-full">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 mr-1 shrink-0">
              <FileSpreadsheet className={`w-3.5 h-3.5 ${accentConfig.textClass}`} />
              <span>{t.statsModal.filterSheetLabel}</span>
            </span>

            <button
              type="button"
              id="stats-sheet-filter-all"
              onClick={() => setSelectedSheetFilter('all')}
              style={selectedSheetFilter === 'all' ? { backgroundColor: accentConfig.hex } : undefined}
              className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedSheetFilter === 'all'
                  ? `${accentConfig.activeTabClass}`
                  : 'bg-white text-black hover:bg-slate-100 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <span className={selectedSheetFilter === 'all' ? 'text-white' : 'text-black'}>
                {t.common.allSheets}
              </span>
            </button>

            {allWorksheets.map(sheet => (
              <button
                key={sheet}
                type="button"
                id={`stats-sheet-filter-${sheet.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => setSelectedSheetFilter(sheet)}
                className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  selectedSheetFilter === sheet
                    ? `${accentConfig.activeTabClass}`
                    : 'bg-white text-black hover:bg-slate-100 border border-slate-300 dark:border-slate-700'
                }`}
              >
                <span>📑</span>
                <span className={selectedSheetFilter === sheet ? 'text-white' : 'text-black'}>
                  {sheet}
                </span>
              </button>
            ))}
          </div>

          {/* 2. Time Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto sm:flex-wrap pb-0.5 max-w-full">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 mr-1 shrink-0">
                <Filter className={`w-3.5 h-3.5 ${accentConfig.textClass}`} />
                <span>{language === 'bn' ? 'সময়কাল:' : 'Range:'}</span>
              </span>

              {[
                { id: 'all', label: t.statsModal.rangeAll, icon: '🌐' },
                { id: 'today', label: t.statsModal.rangeToday, icon: '⚡' },
                { id: 'week', label: t.statsModal.rangeWeek, icon: '📅' },
                { id: 'month', label: t.statsModal.rangeMonth, icon: '🗓️' },
                { id: '6months', label: t.statsModal.range6Months, icon: '📈' },
                { id: '1year', label: t.statsModal.range1Year, icon: '🏛️' },
                { id: 'custom', label: t.statsModal.rangeCustom, icon: '⚙️' },
              ].map(tab => (
                <button
                  key={tab.id}
                  id={`filter-btn-${tab.id}`}
                  type="button"
                  onClick={() => setTimeRange(tab.id as TimeFilterRange)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs shrink-0 ${
                    timeRange === tab.id
                      ? `${accentConfig.activeTabClass}`
                      : 'bg-white text-black hover:bg-slate-100 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className={timeRange === tab.id ? 'text-white' : 'text-black'}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Active Records Count */}
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                {stats.entriesCount} {t.preview.totalRecords}
              </span>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {timeRange === 'custom' && (
            <div className="mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold">{language === 'bn' ? 'শুরুর তারিখ:' : 'Start:'}</span>
                <input
                  type="date"
                  id="custom-start-date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold">{language === 'bn' ? 'শেষের তারিখ:' : 'End:'}</span>
                <input
                  type="date"
                  id="custom-end-date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 outline-hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50/50 dark:bg-slate-950">
          {/* Active Range & Sheet Banner */}
          <div
            className={`flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl ${accentConfig.bgLight} border ${accentConfig.borderLight}`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className={`w-4 h-4 ${accentConfig.textClass} shrink-0`} />
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {getFilterTitle()} • {t.common.sheet}:{' '}
                <span className={`${accentConfig.textClass} underline`}>
                  {selectedSheetFilter === 'all' ? t.common.allSheets : selectedSheetFilter}
                </span>
              </span>
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {t.statsModal.metricDaysWorked}:{' '}
              <strong className="text-slate-900 dark:text-white">{stats.activeDays} days</strong>
            </span>
          </div>

          {/* Key Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Work Hours */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {t.statsModal.metricTotalHours}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60">
                  Hours
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {stats.totalWorkHours}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t.common.hoursShort}
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{t.statsModal.metricAvgHours}:</span>
                <strong className="text-slate-800 dark:text-white font-semibold">
                  {stats.avgHoursPerDay} {t.common.hoursShort}/day
                </strong>
              </div>
            </div>

            {/* 2. Total Works */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className={`w-4 h-4 ${accentConfig.textClass}`} />
                  {language === 'bn' ? 'নির্ধারিত কাজ' : 'Logged Tasks'}
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${accentConfig.bgLight} ${accentConfig.textClass} border ${accentConfig.borderLight}`}
                >
                  Tasks
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {stats.totalWorksCount}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  tasks
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{language === 'bn' ? 'দৈনিক গড় টাস্ক:' : 'Avg tasks/day:'}</span>
                <strong className="text-slate-800 dark:text-white font-semibold">
                  {stats.avgTasksPerDay}
                </strong>
              </div>
            </div>

            {/* 3. Total Logged Entries */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {t.statsModal.metricCompletedTasks}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/60">
                  Logs
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {stats.entriesCount}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  records
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{language === 'bn' ? 'সক্রিয় দিন:' : 'Active days:'}</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {stats.activeDays} {language === 'bn' ? 'দিন' : 'days'}
                </strong>
              </div>
            </div>

            {/* 4. Due Hours */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  {language === 'bn' ? 'বাকি থাকা সময়' : 'Pending Hours'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-900/60">
                  Due
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                  {stats.totalDueHours}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t.common.hoursShort}
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Status:</span>
                <strong className={stats.totalDueHours > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                  {stats.totalDueHours > 0 ? 'Tasks Pending' : 'All Clear'}
                </strong>
              </div>
            </div>

            {/* 5. Active Days */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  {t.statsModal.metricDaysWorked}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/60">
                  Active
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
                  {stats.activeDays}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  days
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Total records:</span>
                <strong className="text-slate-800 dark:text-white font-semibold">
                  {stats.entriesCount}
                </strong>
              </div>
            </div>

            {/* 6. Overall Performance */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  {language === 'bn' ? 'কাজের দক্ষতা ও স্কোর' : 'Output & Status'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-900/60">
                  Score
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">
                  {stats.totalWorkHours > 0 ? 'Active' : 'Idle'}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  ({stats.totalWorksCount} tasks)
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{language === 'bn' ? 'দৈনিক গড় সময়:' : 'Daily avg work:'}</span>
                <strong className="text-slate-800 dark:text-white font-semibold">
                  {stats.avgHoursPerDay} {t.common.hoursShort}/day
                </strong>
              </div>
            </div>
          </div>

          {/* Activity Breakdown List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  {t.statsModal.recentTableTitle}
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {filteredItems.length} records
              </span>
            </div>

            <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto space-y-2">
              {filteredItems.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">
                  {t.statsModal.noDataInRange}
                </p>
              ) : (
                filteredItems.map(item => (
                  <div key={item.id} className="pt-2.5 pb-1 text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${accentConfig.textClass} flex items-center gap-1`}>
                          <Calendar className="w-3 h-3" />
                          {item.date}
                        </span>
                        <span className="px-2 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[10px]">
                          📑 {item.sheetName || 'Untitled Worksheet'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.workHours && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium text-[10px]">
                            {item.workHours}h logged
                          </span>
                        )}
                        {item.workDueHours && parseFloat(item.workDueHours) > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-medium text-[10px]">
                            {item.workDueHours}h due
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {item.work1}
                    </p>
                    {item.work2 && (
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                        • {item.work2}
                      </p>
                    )}
                    {item.work3 && (
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                        • {item.work3}
                      </p>
                    )}
                    {item.work4 && (
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                        • {item.work4}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Filter: <strong className="text-slate-700 dark:text-slate-200">{getFilterTitle()}</strong> (
            {selectedSheetFilter === 'all' ? t.common.allSheets : selectedSheetFilter})
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportFilteredReport}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Download className={`w-4 h-4 ${accentConfig.textClass}`} />
              <span>CSV Export</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2 rounded-xl bg-gradient-to-r ${accentConfig.gradient} text-white text-xs font-bold transition-all shadow-md ${accentConfig.shadow}`}
            >
              {t.common.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
