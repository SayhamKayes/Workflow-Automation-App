import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { WorkflowItem } from '../types';
import { ShareSheetModal } from './ShareSheetModal';
import {
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
  Download,
  Trash2,
  Calendar,
  Plus,
  Pencil,
  X,
  Share2,
  Globe,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface SheetPreviewProps {
  items: WorkflowItem[];
  onClearDemoData?: () => void;
  worksheets: string[];
  activeSheet: string;
  onSelectSheet: (sheet: string) => void;
  onAddWorksheet: (sheetName: string) => void;
  onDeleteWorksheet: (sheetName: string) => void;
  onEditEntry: (item: WorkflowItem) => void;
  onDeleteEntry: (id: string) => void;
}

export const SheetPreview: React.FC<SheetPreviewProps> = ({
  items,
  onClearDemoData,
  worksheets,
  activeSheet,
  onSelectSheet,
  onAddWorksheet,
  onDeleteWorksheet,
  onEditEntry,
  onDeleteEntry,
}) => {
  const { language, t } = useLanguage();
  const { accentConfig } = useTheme();

  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [newSheetInput, setNewSheetInput] = useState('');
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalTab, setShareModalTab] = useState<'public' | 'private'>('public');
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setIsShareDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter items that belong to the currently selected worksheet
  const currentSheetItems = useMemo(() => {
    return items.filter(item => (item.sheetName || 'Untitled Worksheet') === activeSheet);
  }, [items, activeSheet]);

  // Group items by Month & Year based on item.date
  const groupedByMonth = useMemo(() => {
    const englishMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const banglaMonths = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];

    const groups: {
      monthKey: string;
      monthTitle: string;
      items: WorkflowItem[];
    }[] = [];

    currentSheetItems.forEach(item => {
      let monthKey = 'Unknown';
      let monthTitle = 'Unknown Month';

      if (item.date) {
        const parts = item.date.split('-');
        if (parts.length >= 2) {
          const year = parts[0];
          const monthIndex = parseInt(parts[1], 10) - 1;
          monthKey = `${year}-${parts[1]}`;
          if (monthIndex >= 0 && monthIndex < 12) {
            monthTitle =
              language === 'bn'
                ? `${banglaMonths[monthIndex]} ${year}`
                : `${englishMonths[monthIndex]} ${year}`;
          }
        }
      }

      const existingGroup = groups.find(g => g.monthKey === monthKey);
      if (existingGroup) {
        existingGroup.items.push(item);
      } else {
        groups.push({
          monthKey,
          monthTitle,
          items: [item],
        });
      }
    });

    return groups;
  }, [currentSheetItems, language]);

  const exportCSV = () => {
    if (currentSheetItems.length === 0) return;
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
      'Submitted At',
    ];

    const rows = currentSheetItems.map(item => [
      `"${item.sheetName || activeSheet}"`,
      `"${item.date}"`,
      `"${item.workHours || '0'}"`,
      `"${item.work1.replace(/"/g, '""')}"`,
      `"${(item.work2 || '').replace(/"/g, '""')}"`,
      `"${(item.work3 || '').replace(/"/g, '""')}"`,
      `"${(item.work4 || '').replace(/"/g, '""')}"`,
      `"${item.workDueHours || '0'}"`,
      `"${item.signature ? 'Signed' : 'No Signature'}"`,
      `"${item.submittedAt}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `workflow_${activeSheet.replace(/\s+/g, '_')}_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportXLSX = () => {
    if (currentSheetItems.length === 0) return;
    const rows = currentSheetItems.map(item => ({
      Worksheet: item.sheetName || activeSheet,
      Date: item.date,
      'Work Hours': item.workHours || '0',
      'Work 1': item.work1,
      'Work 2': item.work2 || '',
      'Work 3': item.work3 || '',
      'Work 4': item.work4 || '',
      'Work Due Hours': item.workDueHours || '0',
      'Signature Status': item.signature ? 'Signed' : 'No Signature',
      'Submitted At': item.submittedAt,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 30 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 14 },
      { wch: 16 },
      { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    const cleanTabName = (activeSheet || 'Worksheet').replace(/[\\/?*[\]]/g, '_').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, cleanTabName);

    const dateStr = new Date().toISOString().slice(0, 10);
    const safeFileName = (activeSheet || 'workflow').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `workflow_${safeFileName}_export_${dateStr}.xlsx`);
  };

  const handleCreateSheetSubmit = () => {
    if (newSheetInput.trim()) {
      const trimmed = newSheetInput.trim();
      onAddWorksheet(trimmed);
      onSelectSheet(trimmed);
      setNewSheetInput('');
      setIsCreatingSheet(false);
    }
  };

  const handleDeleteSheetClick = (sheet: string) => {
    if (worksheets.length <= 1) {
      alert(t.preview.minSheetAlert);
      return;
    }
    const count = items.filter(i => (i.sheetName || 'Untitled Worksheet') === sheet).length;
    const msg = t.preview.deleteSheetConfirm.replace('{sheet}', sheet);

    if (window.confirm(msg)) {
      onDeleteWorksheet(sheet);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accentConfig.gradient} text-white flex items-center justify-center shadow-xs`}
          >
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>{t.preview.title}</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${accentConfig.bgLight} ${accentConfig.textClass}`}
              >
                {currentSheetItems.length} {t.preview.totalRecords} ({activeSheet})
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.preview.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* 1. Export CSV Button */}
          {currentSheetItems.length > 0 && (
            <button
              type="button"
              id="export-csv-btn"
              onClick={exportCSV}
              className="text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>{t.preview.exportCsv}</span>
            </button>
          )}

          {/* 2. Export XLSX Button */}
          {currentSheetItems.length > 0 && (
            <button
              type="button"
              id="export-xlsx-btn"
              onClick={exportXLSX}
              className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t.preview.exportXlsx}</span>
            </button>
          )}

          {/* 3. Share Sheet Dropdown */}
          <div className="relative" ref={shareDropdownRef}>
            <button
              type="button"
              id="share-sheet-btn"
              onClick={() => setIsShareDropdownOpen(prev => !prev)}
              className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs"
              title={t.preview.shareSheet}
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>{t.preview.shareSheet}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isShareDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu: Public Link & Private Access */}
            {isShareDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  id="share-public-link-opt"
                  onClick={() => {
                    setIsShareDropdownOpen(false);
                    setShareModalTab('public');
                    setIsShareModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="truncate">{t.preview.publicLink}</span>
                </button>

                <button
                  type="button"
                  id="share-private-access-opt"
                  onClick={() => {
                    setIsShareDropdownOpen(false);
                    setShareModalTab('private');
                    setIsShareModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="truncate">{t.preview.privateAccess}</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Clear Sheet Data Button */}
          {onClearDemoData && items.length > 0 && (
            <button
              type="button"
              id="clear-sheet-preview-btn"
              onClick={onClearDemoData}
              className="text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs"
              title={t.preview.clearData}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.preview.clearData}</span>
            </button>
          )}

          {/* Delete Active Sheet Button (if multiple worksheets exist) */}
          {worksheets.length > 1 && (
            <button
              type="button"
              id="delete-active-sheet-btn"
              onClick={() => handleDeleteSheetClick(activeSheet)}
              className="text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1.5 shadow-2xs"
              title={t.preview.deleteSheetBtn}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>{t.preview.deleteSheetBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Google Sheets Style Worksheet Tabs Bar */}
      <div className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-3 pt-2 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {worksheets.map(sheet => {
            const count = items.filter(i => (i.sheetName || 'Untitled Worksheet') === sheet).length;
            const isActive = activeSheet === sheet;
            return (
              <div
                key={sheet}
                className={`group px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-t border-x cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 shadow-2xs relative -mb-[1px] z-10'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
                onClick={() => onSelectSheet(sheet)}
              >
                <FileSpreadsheet
                  className={`w-3.5 h-3.5 ${isActive ? accentConfig.textClass : 'text-slate-400'}`}
                />
                <span>{sheet}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive
                      ? `${accentConfig.bgLight} ${accentConfig.textClass}`
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>

                {/* Individual Tab Delete Icon */}
                {worksheets.length > 1 && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteSheetClick(sheet);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded transition-opacity"
                    title={t.preview.deleteSheetBtn}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {isCreatingSheet ? (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-t-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <input
                type="text"
                autoFocus
                placeholder={t.preview.newSheetInputPlaceholder}
                value={newSheetInput}
                onChange={e => setNewSheetInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateSheetSubmit();
                  if (e.key === 'Escape') setIsCreatingSheet(false);
                }}
                className="text-xs px-2 py-0.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded focus:border-indigo-600 outline-hidden w-28 sm:w-36"
              />
              <button
                type="button"
                onClick={handleCreateSheetSubmit}
                className={`px-2 py-0.5 ${accentConfig.activeTabClass} rounded text-[11px] font-bold`}
              >
                {t.common.save}
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingSheet(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="preview-add-sheet-tab-btn"
              onClick={() => setIsCreatingSheet(true)}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1 transition-colors"
              title={t.preview.addSheetBtn}
            >
              <Plus className={`w-3.5 h-3.5 ${accentConfig.textClass}`} />
              <span>{t.preview.addSheetBtn}</span>
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pb-1.5 pr-2 hidden sm:block">
          {t.common.activeSheet}:{' '}
          <strong className={`${accentConfig.textClass} font-bold`}>{activeSheet}</strong>
        </div>
      </div>

      {/* Dynamic Logic Callout */}
      <div
        className={`${accentConfig.bgLight} border-b ${accentConfig.borderLight} px-5 py-2 text-xs flex items-center gap-2`}
      >
        <Sparkles className={`w-4 h-4 ${accentConfig.textClass} shrink-0`} />
        <span className="text-slate-800 dark:text-slate-200">
          <strong>
            {language === 'bn'
              ? 'ডায়নামিক মান্থ হেডার ও এডিট সুবিধা:'
              : 'Dynamic Month Headers & Row Editing:'}
          </strong>{' '}
          {language === 'bn'
            ? 'কোনো রো-তে ভুল হলে ডানের ✏️ এডিট বাটনে ক্লিক করে তাৎক্ষণিক সংশোধন করতে পারেন।'
            : 'Click the ✏️ Edit button on any row to modify and update workflow records.'}
        </span>
      </div>

      {/* Spreadsheet Container */}
      <div className="overflow-x-auto max-h-[500px]">
        {currentSheetItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              {t.preview.emptySheet} (&quot;{activeSheet}&quot;)
            </p>
            <p className="text-xs text-slate-400 mt-1">{t.preview.emptySheetDesc}</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <tbody>
              {groupedByMonth.map(group => (
                <React.Fragment key={group.monthKey}>
                  {/* Dynamic Month Header Row */}
                  <tr className="bg-slate-900 dark:bg-slate-950 text-white font-bold tracking-wide">
                    <td
                      colSpan={10}
                      className="px-4 py-2.5 text-sm uppercase flex-wrap border-b border-slate-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Calendar className={`w-4 h-4 ${accentConfig.textClass}`} />
                          📅 {group.monthTitle} ({activeSheet})
                        </span>
                        <span className="text-[11px] font-normal text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                          {group.items.length} {t.preview.totalRecords}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Column Headers Row */}
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {t.preview.thDate}
                    </th>
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap text-center">
                      {t.preview.thWorkHours}
                    </th>
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {t.preview.thWork1}
                    </th>
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {t.preview.thWork2}
                    </th>
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {t.preview.thWork3}
                    </th>
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {t.preview.thWork4}
                    </th>
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap text-center">
                      {t.preview.thDueHours}
                    </th>
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap text-center">
                      {t.preview.thSignature}
                    </th>
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      Submitted
                    </th>
                    <th className="px-3 py-2 text-center whitespace-nowrap sticky right-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.08)]">
                      {t.preview.thActions}
                    </th>
                  </tr>

                  {/* Data Rows for this month */}
                  {group.items.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        index % 2 === 0
                          ? 'bg-white dark:bg-slate-900'
                          : 'bg-slate-50/50 dark:bg-slate-850/40'
                      }`}
                    >
                      <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200 border-r border-slate-200/50 dark:border-slate-800 whitespace-nowrap">
                        {row.date}
                      </td>
                      <td
                        className={`px-3 py-2.5 ${accentConfig.textClass} font-semibold border-r border-slate-200/50 dark:border-slate-800 text-center whitespace-nowrap`}
                      >
                        {row.workHours ? `${row.workHours}h` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 border-r border-slate-200/50 dark:border-slate-800 font-medium max-w-[150px] truncate">
                        {row.work1}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 border-r border-slate-200/50 dark:border-slate-800 max-w-[120px] truncate">
                        {row.work2 || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 border-r border-slate-200/50 dark:border-slate-800 max-w-[120px] truncate">
                        {row.work3 || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 border-r border-slate-200/50 dark:border-slate-800 max-w-[120px] truncate">
                        {row.work4 || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 border-r border-slate-200/50 dark:border-slate-800 text-center font-mono">
                        {row.workDueHours ? `${row.workDueHours}h` : '0h'}
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-slate-200/50 dark:border-slate-800 whitespace-nowrap">
                        {row.signature ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Signed
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 text-[11px] whitespace-nowrap font-mono border-r border-slate-200/50 dark:border-slate-800">
                        {new Date(row.submittedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      {/* Action buttons (Edit & Delete) sticky on right for mobile convenience */}
                      <td
                        className={`px-3 py-2 text-center whitespace-nowrap sticky right-0 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.08)] ${
                          index % 2 === 0
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-slate-50 dark:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            id={`edit-row-btn-${row.id}`}
                            onClick={() => onEditEntry(row)}
                            className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors shadow-2xs border border-indigo-100 dark:border-indigo-800/60"
                            title={t.preview.editEntryTooltip}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            id={`delete-row-btn-${row.id}`}
                            onClick={() => {
                              if (window.confirm(t.preview.deleteEntryConfirm)) {
                                onDeleteEntry(row.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shadow-2xs border border-rose-100 dark:border-rose-900/60"
                            title={t.preview.deleteEntryTooltip}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Share Sheet Modal */}
      <ShareSheetModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        initialTab={shareModalTab}
      />
    </div>
  );
};
