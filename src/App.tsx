import React, { useState, useEffect, useMemo } from 'react';
import { WorkflowItem } from './types';
import { Header } from './components/Header';
import { WorkflowForm } from './components/WorkflowForm';
import { SheetPreview } from './components/SheetPreview';
import { AppsScriptModal } from './components/AppsScriptModal';
import { SettingsModal } from './components/SettingsModal';
import { StatsModal } from './components/StatsModal';
import { EditEntryModal } from './components/EditEntryModal';
import { INITIAL_WORKFLOW_ITEMS } from './data/initialData';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import {
  FileSpreadsheet,
  Code2,
  Sparkles,
  ArrowRight,
  Database,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

const ITEMS_STORAGE_KEY = 'workflow_items_history';
const URL_STORAGE_KEY = 'workflow_apps_script_url';
const SHEETS_STORAGE_KEY = 'workflow_worksheets_list';
const ACTIVE_SHEET_KEY = 'workflow_active_sheet';

function AppContent() {
  const { accentConfig } = useTheme();
  const { language, t } = useLanguage();

  const [items, setItems] = useState<WorkflowItem[]>(() => {
    try {
      const saved = localStorage.getItem(ITEMS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved workflow items', e);
    }
    return INITIAL_WORKFLOW_ITEMS;
  });

  // Multiple worksheets list (defaults to ['Home Works'])
  const [worksheets, setWorksheets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SHEETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved worksheets', e);
    }
    return ['Home Works'];
  });

  // Currently active worksheet
  const [activeSheet, setActiveSheet] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_SHEET_KEY) || 'Home Works';
  });

  const [webAppUrl, setWebAppUrl] = useState<string>(() => {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
    return (
      localStorage.getItem(URL_STORAGE_KEY) ||
      metaEnv?.VITE_APPS_SCRIPT_URL ||
      ''
    );
  });

  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkflowItem | null>(null);

  // Sync worksheets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SHEETS_STORAGE_KEY, JSON.stringify(worksheets));
    } catch (e) {
      console.error('Failed to save worksheets list', e);
    }
  }, [worksheets]);

  // Sync activeSheet to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_SHEET_KEY, activeSheet);
    } catch (e) {
      console.error('Failed to save active sheet', e);
    }
  }, [activeSheet]);

  // Sync items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save workflow items to localStorage', e);
    }
  }, [items]);

  // Sync webAppUrl to localStorage
  const handleSaveWebAppUrl = (url: string) => {
    setWebAppUrl(url);
    localStorage.setItem(URL_STORAGE_KEY, url);
  };

  const handleAddWorksheet = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!worksheets.includes(trimmed)) {
      setWorksheets(prev => [...prev, trimmed]);
    }
    setActiveSheet(trimmed);
  };

  const handleDeleteWorksheet = (sheetToDelete: string) => {
    if (worksheets.length <= 1) {
      alert(t.preview.minSheetAlert);
      return;
    }

    const nextSheets = worksheets.filter(s => s !== sheetToDelete);
    setWorksheets(nextSheets);

    if (activeSheet === sheetToDelete) {
      setActiveSheet(nextSheets[0]);
    }

    setItems(prev => prev.filter(i => (i.sheetName || 'Home Works') !== sheetToDelete));
  };

  const handleUpdateEntry = (updatedItem: WorkflowItem) => {
    setItems(prev => prev.map(item => (item.id === updatedItem.id ? updatedItem : item)));
  };

  const handleDeleteEntry = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Today's Date String
  const todayDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Compute Today's Stats & All-time Stats for Header and Hero glances
  const summaryStats = useMemo(() => {
    let todayHours = 0;
    let totalHours = 0;

    items.forEach(i => {
      const h = parseFloat(i.workHours || '0') || 0;
      totalHours += h;

      if (i.date === todayDateStr) {
        todayHours += h;
      }
    });

    return {
      todayHours,
      totalHours,
    };
  }, [items, todayDateStr]);

  // Handle Adding New Workflow Item
  const handleAddEntry = async (entry: WorkflowItem) => {
    // 1. If Web App URL is connected, post to Google Apps Script
    if (webAppUrl && webAppUrl.startsWith('http')) {
      try {
        await fetch(webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entry),
        });
      } catch (err) {
        console.warn('Could not post directly to Google Apps Script (offline or CORS)', err);
      }
    }

    // 2. Add to local state
    setItems(prev => [entry, ...prev]);
  };

  const handleClearDemoData = () => {
    const msg = t.preview.clearDataConfirm.replace('{sheet}', activeSheet);
    if (window.confirm(msg)) {
      setItems(prev => prev.filter(i => (i.sheetName || 'Home Works') !== activeSheet));
    }
  };

  const handleResetDemoData = () => {
    setItems(INITIAL_WORKFLOW_ITEMS);
    setWorksheets(['Home Works']);
    setActiveSheet('Home Works');
    localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(INITIAL_WORKFLOW_ITEMS));
    localStorage.setItem(SHEETS_STORAGE_KEY, JSON.stringify(['Home Works']));
    localStorage.setItem(ACTIVE_SHEET_KEY, 'Home Works');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navigation Header */}
      <Header
        webAppUrl={webAppUrl}
        onOpenAppsScriptModal={() => setIsAppsScriptModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenStatsModal={() => setIsStatsModalOpen(true)}
        todayWorkHours={summaryStats.todayHours}
        activeSheet={activeSheet}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Hero Banner with Status & Quick Actions */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
          {/* Subtle background glow */}
          <div
            className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
            style={{ backgroundColor: accentConfig.hex }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-semibold backdrop-blur-xs border border-white/10">
                <Sparkles className="w-3.5 h-3.5" style={{ color: accentConfig.hex }} />
                <span>{t.hero.badge}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {t.hero.title}
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                {t.hero.subtitle}
              </p>
            </div>

            {/* Quick Actions & Stats Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Header / Hero Stats Button */}
              <button
                type="button"
                id="hero-open-stats-btn"
                onClick={() => setIsStatsModalOpen(true)}
                className={`px-4 py-2.5 rounded-xl bg-gradient-to-r ${accentConfig.gradient} text-white font-bold text-xs transition-all flex items-center gap-2 shadow-lg ${accentConfig.shadow} active:scale-95`}
              >
                <TrendingUp className="w-4 h-4 text-white" />
                <span>{t.hero.statsBtn}</span>
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              </button>

              <button
                type="button"
                id="hero-apps-script-guide-btn"
                onClick={() => setIsAppsScriptModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-all flex items-center gap-2 shadow-sm"
              >
                <Code2 className="w-4 h-4 text-indigo-600" />
                <span>{t.hero.scriptBtn}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                id="hero-settings-btn"
                onClick={() => setIsSettingsModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-2 backdrop-blur-xs"
              >
                <Database className="w-4 h-4 text-slate-300" />
                <span>
                  {webAppUrl
                    ? language === 'bn'
                      ? 'Web App URL পরিবর্তন'
                      : 'Change Web App URL'
                    : language === 'bn'
                    ? 'Google Sheet সংযোগ করুন'
                    : 'Connect Google Sheet'}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">
                {language === 'bn' ? 'মোট রেকর্ড' : 'Total Entries'}
              </span>
              <strong className="text-base font-bold text-white">
                {items.length} {language === 'bn' ? 'দিন' : 'records'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">
                {language === 'bn' ? 'ওয়ার্কশিট সংখ্যা' : 'Worksheets'}
              </span>
              <strong className="text-base font-bold text-emerald-400">
                {worksheets.length} {language === 'bn' ? 'টি' : 'sheets'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">
                {language === 'bn' ? 'আজকের কাজের সময়' : "Today's Work"}
              </span>
              <strong className="text-base font-bold text-blue-400">
                {summaryStats.todayHours}
                {t.common.hoursShort}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">
                {language === 'bn' ? 'মোট কাজের সময়' : 'Total Work Hours'}
              </span>
              <strong className="text-base font-bold text-emerald-400">
                {summaryStats.totalHours} {t.common.hoursShort}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">
                {language === 'bn' ? 'গুগল শিট স্ট্যাটাস' : 'Sheets Status'}
              </span>
              <strong className="text-base font-bold text-white">
                {webAppUrl
                  ? language === 'bn'
                    ? 'সংযুক্ত (Live)'
                    : 'Connected (Live)'
                  : language === 'bn'
                  ? 'সিমুলেশন মোড'
                  : 'Local Simulator'}
              </strong>
            </div>
          </div>
        </div>

        {/* Workspace Layout: Form (Left) + Sheet Preview (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form */}
          <div className="lg:col-span-5 space-y-6">
            <WorkflowForm
              onAddEntry={handleAddEntry}
              webAppUrl={webAppUrl}
              worksheets={worksheets}
              activeSheet={activeSheet}
              onSelectSheet={setActiveSheet}
              onAddWorksheet={handleAddWorksheet}
            />

            {/* Feature Highlights Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs text-xs space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-sm">
                <ShieldCheck className={`w-4 h-4 ${accentConfig.textClass}`} />
                <span>{t.form.tipsTitle}</span>
              </h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: accentConfig.hex }}
                  />
                  <span>
                    <strong>{t.form.tip1Title}:</strong> {t.form.tip1Desc}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: accentConfig.hex }}
                  />
                  <span>
                    <strong>{t.form.tip2Title}:</strong> {t.form.tip2Desc}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: accentConfig.hex }}
                  />
                  <span>
                    <strong>{t.form.tip3Title}:</strong> {t.form.tip3Desc}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Interactive Sheet Preview */}
          <div className="lg:col-span-7 space-y-6">
            <SheetPreview
              items={items}
              onClearDemoData={handleClearDemoData}
              worksheets={worksheets}
              activeSheet={activeSheet}
              onSelectSheet={setActiveSheet}
              onAddWorksheet={handleAddWorksheet}
              onDeleteWorksheet={handleDeleteWorksheet}
              onEditEntry={item => setEditingItem(item)}
              onDeleteEntry={handleDeleteEntry}
            />

            {/* How Google Apps Script Handles Multi-Worksheet Infographic */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t.preview.infographicTitle}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <div className={`font-bold ${accentConfig.textClass} flex items-center gap-1.5`}>
                    <span
                      className={`w-5 h-5 rounded-full ${accentConfig.bgLight} ${accentConfig.textClass} flex items-center justify-center text-[10px]`}
                    >
                      1
                    </span>
                    {t.preview.infographicStep1Title}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    {t.preview.infographicStep1Desc}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <div className={`font-bold ${accentConfig.textClass} flex items-center gap-1.5`}>
                    <span
                      className={`w-5 h-5 rounded-full ${accentConfig.bgLight} ${accentConfig.textClass} flex items-center justify-center text-[10px]`}
                    >
                      2
                    </span>
                    {t.preview.infographicStep2Title}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    {t.preview.infographicStep2Desc}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <div className={`font-bold ${accentConfig.textClass} flex items-center gap-1.5`}>
                    <span
                      className={`w-5 h-5 rounded-full ${accentConfig.bgLight} ${accentConfig.textClass} flex items-center justify-center text-[10px]`}
                    >
                      3
                    </span>
                    {t.preview.infographicStep3Title}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    {t.preview.infographicStep3Desc}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300">{t.footer.appName}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{t.footer.techStack}</p>
        </div>
      </footer>

      {/* Modals */}
      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        items={items}
        worksheets={worksheets}
        activeSheet={activeSheet}
      />

      <AppsScriptModal
        isOpen={isAppsScriptModalOpen}
        onClose={() => setIsAppsScriptModalOpen(false)}
        webAppUrl={webAppUrl}
        onSaveWebAppUrl={handleSaveWebAppUrl}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        webAppUrl={webAppUrl}
        onSaveWebAppUrl={handleSaveWebAppUrl}
        onResetDemoData={handleResetDemoData}
        totalRecords={items.length}
      />

      <EditEntryModal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        worksheets={worksheets}
        onSave={handleUpdateEntry}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}
