import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  Calendar,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  FileSpreadsheet,
  Award,
  Sparkles,
} from 'lucide-react';
import { WorkflowItem, TimeFilterRange } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export interface DownloadReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WorkflowItem[];
  worksheets: string[];
  activeSheet: string;
  user: {
    name: string;
    email?: string;
    avatar?: string;
    provider?: string;
  };
}

export type SortOption = 'date_desc' | 'date_asc' | 'hours_desc' | 'hours_low';

export const DownloadReportModal: React.FC<DownloadReportModalProps> = ({
  isOpen,
  onClose,
  items,
  worksheets,
  activeSheet,
  user,
}) => {
  const { language, t } = useLanguage();
  const { accentConfig } = useTheme();

  // Filters state
  const [scopeFilter, setScopeFilter] = useState<string>(activeSheet || 'all');
  const [timeRange, setTimeRange] = useState<TimeFilterRange>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  // Custom range
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Consolidated worksheets
  const allWorksheets = useMemo(() => {
    const itemSheets = items.map(i => i.sheetName || 'Untitled Worksheet').filter(Boolean);
    return Array.from(new Set([...worksheets, ...itemSheets]));
  }, [worksheets, items]);

  // Current timestamp formatted
  const reportGeneratedAt = useMemo(() => {
    const now = new Date();
    return now.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', {
      dateStyle: 'full',
      timeStyle: 'medium',
    });
  }, [language]);

  // Filtered and sorted workflow items
  const processedItems = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;

    // 1. Filter by sheet and range
    const filtered = items.filter(item => {
      if (!item.date) return false;

      // Sheet Scope
      if (scopeFilter !== 'all') {
        const itemSheet = item.sheetName || 'Untitled Worksheet';
        if (itemSheet !== scopeFilter) return false;
      }

      // Time Range
      if (timeRange === 'all') return true;
      if (timeRange === 'today') return item.date === todayStr;

      const itemDate = new Date(item.date + 'T00:00:00');
      const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);

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

    // 2. Sort items
    return [...filtered].sort((a, b) => {
      if (sortBy === 'date_desc') {
        return (b.date || '').localeCompare(a.date || '');
      }
      if (sortBy === 'date_asc') {
        return (a.date || '').localeCompare(b.date || '');
      }
      const aHours = parseFloat(a.workHours || '0') || 0;
      const bHours = parseFloat(b.workHours || '0') || 0;
      if (sortBy === 'hours_desc') {
        return bHours - aHours;
      }
      if (sortBy === 'hours_low') {
        return aHours - bHours;
      }
      return 0;
    });
  }, [items, scopeFilter, timeRange, sortBy, customStartDate, customEndDate]);

  // Performance summary statistics
  const summaryStats = useMemo(() => {
    let totalWorkHours = 0;
    let totalDueHours = 0;
    let totalTasksCount = 0;
    const uniqueDates = new Set<string>();

    processedItems.forEach(item => {
      if (item.date) uniqueDates.add(item.date);
      const wh = parseFloat(item.workHours || '0');
      if (!isNaN(wh) && wh > 0) totalWorkHours += wh;

      const dh = parseFloat(item.workDueHours || '0');
      if (!isNaN(dh) && dh > 0) totalDueHours += dh;

      const tasks = [item.work1, item.work2, item.work3, item.work4].filter(
        t => t && t.trim().length > 0
      );
      totalTasksCount += Math.max(tasks.length, 1);
    });

    const activeDays = uniqueDates.size;
    const avgHoursPerDay =
      activeDays > 0 ? (totalWorkHours / activeDays).toFixed(1) : '0.0';
    const totalHoursCombined = totalWorkHours + totalDueHours;
    const completionRate =
      totalHoursCombined > 0
        ? Math.round((totalWorkHours / totalHoursCombined) * 100)
        : 100;

    return {
      totalWorkHours: Math.round(totalWorkHours * 10) / 10,
      totalDueHours: Math.round(totalDueHours * 10) / 10,
      totalTasksCount,
      activeDays,
      avgHoursPerDay,
      completionRate,
      entriesCount: processedItems.length,
    };
  }, [processedItems]);

  // Handle native browser Print to PDF
  const handlePrint = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Worksheet',
      'Date',
      'Work Hours',
      'Work 1',
      'Work 2',
      'Work 3',
      'Work 4',
      'Work Due Hours',
      'Signature Status',
      'Timestamp',
    ];

    const rows = processedItems.map(item => [
      `"${item.sheetName || 'Untitled Worksheet'}"`,
      `"${item.date}"`,
      `"${item.workHours || '0'}"`,
      `"${(item.work1 || '').replace(/"/g, '""')}"`,
      `"${(item.work2 || '').replace(/"/g, '""')}"`,
      `"${(item.work3 || '').replace(/"/g, '""')}"`,
      `"${(item.work4 || '').replace(/"/g, '""')}"`,
      `"${item.workDueHours || '0'}"`,
      `"${item.signature ? 'Verified Signature' : 'Standard'}"`,
      `"${item.timestamp || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `LogCrafter_Workflow_Report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 print:p-0 print:bg-white print:static">
      {/* Print Specific CSS isolation */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-workflow-report, #printable-workflow-report * {
            visibility: visible !important;
          }
          #printable-workflow-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>

      {/* Main Modal Container */}
      <div className="bg-slate-900 text-slate-100 w-full max-w-5xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Header Bar - Hidden during print */}
        <div className="no-print p-4 sm:p-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${accentConfig.bgLight} ${accentConfig.textClass} border ${accentConfig.borderLight} shadow-md`}
            >
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>{t.downloadReportModal.modalTitle}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  PDF & Print Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {t.downloadReportModal.modalSub}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePrint}
              className={`px-4 py-2 rounded-xl bg-gradient-to-r ${accentConfig.gradient} text-white font-bold text-xs flex items-center gap-2 shadow-lg ${accentConfig.shadow} hover:scale-102 active:scale-98 transition-all cursor-pointer`}
            >
              <Printer className="w-4 h-4" />
              <span>{t.downloadReportModal.printPdfBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Export as CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">{t.downloadReportModal.downloadCsvBtn}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Toolbar - Hidden during print */}
        <div className="no-print bg-slate-950/60 p-4 border-b border-slate-800/80 flex flex-wrap items-center gap-3 text-xs">
          {/* Worksheet Scope */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 font-medium">{t.downloadReportModal.scopeLabel}:</span>
            <select
              value={scopeFilter}
              onChange={e => setScopeFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">
                {language === 'bn' ? 'সকল ওয়ার্কশিট (সম্মিলিত)' : 'All Worksheets (Consolidated)'}
              </option>
              {allWorksheets.map(sheet => (
                <option key={sheet} value={sheet}>
                  {sheet} {sheet === activeSheet ? `(${t.common.activeSheet})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 font-medium">{t.downloadReportModal.rangeLabel}:</span>
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value as TimeFilterRange)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">{t.statsModal.rangeAll}</option>
              <option value="today">{t.statsModal.rangeToday}</option>
              <option value="week">{t.statsModal.rangeWeek}</option>
              <option value="month">{t.statsModal.rangeMonth}</option>
              <option value="6months">{t.statsModal.range6Months}</option>
              <option value="1year">{t.statsModal.range1Year}</option>
              <option value="custom">{t.statsModal.rangeCustom}</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {timeRange === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-transparent text-white text-xs focus:outline-none"
              />
              <span className="text-slate-500">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-transparent text-white text-xs focus:outline-none"
              />
            </div>
          )}

          {/* Sort By */}
          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 font-medium">{t.downloadReportModal.sortLabel}:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="date_desc">{t.downloadReportModal.sortNewest}</option>
              <option value="date_asc">{t.downloadReportModal.sortOldest}</option>
              <option value="hours_desc">{t.downloadReportModal.sortHoursHigh}</option>
              <option value="hours_low">{t.downloadReportModal.sortHoursLow}</option>
            </select>
          </div>
        </div>

        {/* Scrollable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {/* Printable Report Document Card */}
          <div
            id="printable-workflow-report"
            className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-xl p-6 sm:p-10 border border-slate-200 print:border-none print:shadow-none print:p-4 print:max-w-none"
          >
            {/* 1. Official Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pb-6 border-b-2 border-slate-800 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                    LC
                  </span>
                  <span className="text-xl font-black tracking-tight text-slate-950">
                    LogCrafter
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 border border-slate-300">
                    Official Report
                  </span>
                </div>
                <h1 className="text-lg font-bold text-slate-800">
                  {t.downloadReportModal.reportHeaderTitle}
                </h1>
                <p className="text-xs text-slate-500">
                  {t.downloadReportModal.generatedOn}: {reportGeneratedAt}
                </p>
              </div>

              {/* User Profile & Worksheet Scope Meta */}
              <div className="text-left sm:text-right text-xs space-y-1 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
                <div className="font-bold text-slate-900 text-sm">
                  {user.name || 'LogCrafter User'}
                </div>
                {user.email && (
                  <div className="text-slate-500 font-medium">{user.email}</div>
                )}
                <div className="text-indigo-600 font-bold">
                  {scopeFilter === 'all'
                    ? language === 'bn'
                      ? 'সকল ওয়ার্কশিট (সম্মিলিত)'
                      : 'Scope: All Worksheets'
                    : `${language === 'bn' ? 'ওয়ার্কশিট' : 'Worksheet'}: ${scopeFilter}`}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {processedItems.length} {language === 'bn' ? 'টি এন্ট্রি অন্তর্ভুক্ত' : 'entries included'}
                </div>
              </div>
            </div>

            {/* 2. Executive Performance Summary */}
            <div className="py-6 border-b border-slate-200">
              <h2 className="text-xs uppercase font-extrabold tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t.downloadReportModal.executiveSummary}</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {/* Total Work Hours */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    {t.downloadReportModal.totalHoursLabel}
                  </span>
                  <strong className="text-2xl font-black text-indigo-600 block mt-0.5">
                    {summaryStats.totalWorkHours}h
                  </strong>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {summaryStats.completionRate}% completion
                  </span>
                </div>

                {/* Avg Hours / Day */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    {t.downloadReportModal.avgHoursLabel}
                  </span>
                  <strong className="text-2xl font-black text-emerald-600 block mt-0.5">
                    {summaryStats.avgHoursPerDay}h
                  </strong>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Daily velocity
                  </span>
                </div>

                {/* Active Work Days */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    {t.downloadReportModal.activeDaysLabel}
                  </span>
                  <strong className="text-2xl font-black text-slate-900 block mt-0.5">
                    {summaryStats.activeDays}
                  </strong>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {summaryStats.totalTasksCount} tasks logged
                  </span>
                </div>

                {/* Pending Due Hours */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    {t.downloadReportModal.dueHoursLabel}
                  </span>
                  <strong className="text-2xl font-black text-amber-600 block mt-0.5">
                    {summaryStats.totalDueHours}h
                  </strong>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Pending due
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Detailed Workflow Table */}
            <div className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                  {t.downloadReportModal.detailedTableTitle} ({processedItems.length})
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  {sortBy === 'date_desc'
                    ? t.downloadReportModal.sortNewest
                    : sortBy === 'date_asc'
                    ? t.downloadReportModal.sortOldest
                    : sortBy === 'hours_desc'
                    ? t.downloadReportModal.sortHoursHigh
                    : t.downloadReportModal.sortHoursLow}
                </span>
              </div>

              {processedItems.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">
                    {t.visualOverview.noTimelineData}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-300">
                        <th className="py-2.5 px-2 text-center w-8">#</th>
                        {scopeFilter === 'all' && (
                          <th className="py-2.5 px-3">
                            {language === 'bn' ? 'ওয়ার্কশিট' : 'Worksheet'}
                          </th>
                        )}
                        <th className="py-2.5 px-3">{t.preview.thDate}</th>
                        <th className="py-2.5 px-3 text-right">{t.preview.thWorkHours}</th>
                        <th className="py-2.5 px-3">{t.preview.thWork1}</th>
                        <th className="py-2.5 px-3">{t.preview.thWork2}</th>
                        <th className="py-2.5 px-3">{t.preview.thWork3}</th>
                        <th className="py-2.5 px-3">{t.preview.thWork4}</th>
                        <th className="py-2.5 px-3 text-right">{t.preview.thDueHours}</th>
                        <th className="py-2.5 px-3 text-center">{t.preview.thSignature}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {processedItems.map((item, idx) => (
                        <tr
                          key={item.id || idx}
                          className={`hover:bg-slate-50/80 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                        >
                          <td className="py-2 px-2 text-center font-medium text-slate-400 text-[11px]">
                            {idx + 1}
                          </td>
                          {scopeFilter === 'all' && (
                            <td className="py-2 px-3 font-semibold text-indigo-700 text-[11px] truncate max-w-[120px]">
                              {item.sheetName || 'Default'}
                            </td>
                          )}
                          <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                            {item.date}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-slate-950">
                            {item.workHours || '0'}h
                          </td>
                          <td className="py-2 px-3 text-slate-700 max-w-[140px] truncate" title={item.work1}>
                            {item.work1 || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-700 max-w-[140px] truncate" title={item.work2}>
                            {item.work2 || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-700 max-w-[140px] truncate" title={item.work3}>
                            {item.work3 || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-700 max-w-[140px] truncate" title={item.work4}>
                            {item.work4 || '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-amber-700">
                            {item.workDueHours && parseFloat(item.workDueHours) > 0
                              ? `${item.workDueHours}h`
                              : '-'}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {item.signature ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{t.downloadReportModal.verifiedSignature}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">
                                {t.downloadReportModal.noSignature}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 4. Document Footer */}
            <div className="mt-8 pt-4 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
              <div className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t.downloadReportModal.officialFooter}</span>
              </div>
              <div className="font-semibold text-slate-400">
                LogCrafter © {new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
