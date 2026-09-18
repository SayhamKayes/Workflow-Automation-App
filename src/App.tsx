import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WorkflowItem } from './types';
import { Header } from './components/Header';
import { WorkflowForm } from './components/WorkflowForm';
import { SheetPreview } from './components/SheetPreview';
import { WorksheetManager } from './components/WorksheetManager';
import { WorkVisualOverview } from './components/WorkVisualOverview';
import { AppsScriptModal } from './components/AppsScriptModal';
import { SettingsModal } from './components/SettingsModal';
import { StatsModal } from './components/StatsModal';
import { DownloadReportModal } from './components/DownloadReportModal';
import { EditEntryModal } from './components/EditEntryModal';
import { LoginScreen } from './components/LoginScreen';
import { MobileBottomNav, MobileTab } from './components/MobileBottomNav';
import { INITIAL_WORKFLOW_ITEMS } from './data/initialData';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  DEFAULT_WORKSHEET_NAME,
  appendWorkflowRowToSheet,
  batchAppendWorkflowRowsToSheet,
  updateWorkflowRowInSheet,
  deleteWorkflowRowFromSheet,
  clearWorksheetRowsInSheet,
  fetchSpreadsheetData,
  createWorksheetTab,
  renameWorksheetTab,
  deleteWorksheetTab,
} from './services/googleSheetsService';
import {
  FileSpreadsheet,
  Code2,
  Sparkles,
  ArrowRight,
  Database,
  ShieldCheck,
  TrendingUp,
  Download,
  ExternalLink,
} from 'lucide-react';

const ITEMS_STORAGE_KEY = 'workflow_items_history';
const URL_STORAGE_KEY = 'workflow_apps_script_url';

// Helper to safely parse and normalize workflow items
function parseAndNormalizeItems(raw: string | null): WorkflowItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: WorkflowItem) => ({
        ...item,
        sheetName: item.sheetName === 'Home Works' ? DEFAULT_WORKSHEET_NAME : (item.sheetName || DEFAULT_WORKSHEET_NAME),
      }));
    }
  } catch (e) {
    console.error('Failed to parse items', e);
  }
  return null;
}

// Helper to get fallback items so user NEVER sees a blank screen
function getFallbackWorkflowItems(userId: string): WorkflowItem[] {
  // 1. Check user-specific key
  const userSaved = parseAndNormalizeItems(localStorage.getItem(`workflow_items_${userId}`));
  if (userSaved && userSaved.length > 0) return userSaved;

  // 2. Check legacy history key (prior to multi-user partitioning)
  const legacySaved = parseAndNormalizeItems(localStorage.getItem(ITEMS_STORAGE_KEY));
  if (legacySaved && legacySaved.length > 0) return legacySaved;

  // 3. Check admin key if available
  const adminSaved = parseAndNormalizeItems(localStorage.getItem('workflow_items_user_sayham_admin'));
  if (adminSaved && adminSaved.length > 0) return adminSaved;

  // 4. Fallback to initial workflow items so the table is never bare
  return INITIAL_WORKFLOW_ITEMS;
}

// Helper to safely get worksheets
function getFallbackWorksheets(userId: string): string[] {
  const fallbackSheets = new Set<string>();
  fallbackSheets.add(DEFAULT_WORKSHEET_NAME);

  // 1. Check user sheets storage
  try {
    const userSheets = localStorage.getItem(`workflow_sheets_${userId}`);
    if (userSheets) {
      const parsed = JSON.parse(userSheets);
      if (Array.isArray(parsed)) {
        parsed.forEach((s: string) => {
          if (s) fallbackSheets.add(s === 'Home Works' ? DEFAULT_WORKSHEET_NAME : s);
        });
      }
    }
  } catch {}

  // 2. Check legacy sheets storage
  try {
    const legacySheets =
      localStorage.getItem('workflow_sheets_user_sayham_admin') ||
      localStorage.getItem('workflow_worksheets');
    if (legacySheets) {
      const parsed = JSON.parse(legacySheets);
      if (Array.isArray(parsed)) {
        parsed.forEach((s: string) => {
          if (s) fallbackSheets.add(s === 'Home Works' ? DEFAULT_WORKSHEET_NAME : s);
        });
      }
    }
  } catch {}

  // 3. Extract any sheets attached to existing items!
  const items = getFallbackWorkflowItems(userId);
  items.forEach(i => {
    if (i.sheetName) {
      fallbackSheets.add(i.sheetName === 'Home Works' ? DEFAULT_WORKSHEET_NAME : i.sheetName);
    }
  });

  return Array.from(fallbackSheets);
}

function AppContent() {
  const { accentConfig } = useTheme();
  const { language, t } = useLanguage();
  const { user, accessToken, spreadsheetInfo } = useAuth();

  // If user is not authenticated, show modern Login Screen
  if (!user) {
    return <LoginScreen />;
  }

  // Partition storage keys per user
  const userItemsKey = `workflow_items_${user.id}`;
  const userSheetsKey = `workflow_sheets_${user.id}`;
  const userActiveSheetKey = `workflow_active_sheet_${user.id}`;

  const [items, setItems] = useState<WorkflowItem[]>(() => getFallbackWorkflowItems(user.id));

  // Multiple worksheets list (defaults to ['Untitled Worksheet'] or extracted from items)
  const [worksheets, setWorksheets] = useState<string[]>(() => getFallbackWorksheets(user.id));

  // Currently active worksheet
  const [activeSheet, setActiveSheet] = useState<string>(() => {
    const saved = localStorage.getItem(userActiveSheetKey);
    const sheets = getFallbackWorksheets(user.id);
    const initialItems = getFallbackWorkflowItems(user.id);

    if (saved && saved !== 'Home Works' && sheets.includes(saved)) {
      return saved;
    }

    // Automatically select the first worksheet that actually has items!
    const sheetWithItems = sheets.find(s =>
      initialItems.some(i => (i.sheetName || DEFAULT_WORKSHEET_NAME) === s)
    );
    return sheetWithItems || sheets[0] || DEFAULT_WORKSHEET_NAME;
  });

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const worksheetsRef = useRef(worksheets);
  useEffect(() => {
    worksheetsRef.current = worksheets;
  }, [worksheets]);

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
  const [isDownloadReportModalOpen, setIsDownloadReportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkflowItem | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('progress');

  // Switch partition dynamically if user changes
  useEffect(() => {
    try {
      const loadedItems = getFallbackWorkflowItems(user.id);
      setItems(loadedItems);

      const loadedSheets = getFallbackWorksheets(user.id);
      setWorksheets(loadedSheets);

      const savedActive = localStorage.getItem(userActiveSheetKey);
      const chosenActive = savedActive === 'Home Works' || !savedActive ? '' : savedActive;
      if (chosenActive && loadedSheets.includes(chosenActive)) {
        setActiveSheet(chosenActive);
      } else {
        const sheetWithItems = loadedSheets.find(s =>
          loadedItems.some(i => (i.sheetName || DEFAULT_WORKSHEET_NAME) === s)
        );
        setActiveSheet(sheetWithItems || loadedSheets[0] || DEFAULT_WORKSHEET_NAME);
      }
    } catch (e) {
      console.error('Error switching user storage partition', e);
    }
  }, [user.id, userItemsKey, userSheetsKey, userActiveSheetKey]);

  // Keep worksheets in sync whenever items contain any new worksheet name
  useEffect(() => {
    const itemSheets = items.map(i => i.sheetName || DEFAULT_WORKSHEET_NAME).filter(Boolean);
    const combined = Array.from(new Set([...worksheets, ...itemSheets]));
    if (combined.length > worksheets.length) {
      setWorksheets(combined);
    }
  }, [items, worksheets]);

  // When Google Account is connected with a personal spreadsheet, load real-time sheets & rows from Google Sheets
  useEffect(() => {
    let isMounted = true;
    if (user.provider === 'google' && accessToken && spreadsheetInfo?.id) {
      fetchSpreadsheetData(accessToken, spreadsheetInfo.id).then(async data => {
        if (!isMounted || !data) return;

        // 1. Combine worksheets from Google Sheet tabs + item sheetNames + local tabs
        const currentLocalItems = itemsRef.current;
        const allItemsCombined =
          data.items && data.items.length > 0
            ? [...data.items, ...currentLocalItems]
            : currentLocalItems;
        const itemSheets = allItemsCombined.map(i => i.sheetName || DEFAULT_WORKSHEET_NAME).filter(Boolean);
        const mergedSheets = Array.from(
          new Set([...(data.worksheets || []), ...itemSheets, ...worksheetsRef.current])
        );

        if (mergedSheets.length > 0) {
          setWorksheets(mergedSheets);
          try {
            localStorage.setItem(userSheetsKey, JSON.stringify(mergedSheets));
          } catch (e) {
            console.error('Failed to save merged worksheets', e);
          }

          setActiveSheet(current => {
            const hasItemsInCurrent = allItemsCombined.some(
              i => (i.sheetName || DEFAULT_WORKSHEET_NAME) === current
            );
            if (current && current !== DEFAULT_WORKSHEET_NAME && mergedSheets.includes(current) && hasItemsInCurrent) {
              return current;
            }
            if (hasItemsInCurrent) {
              return current;
            }
            const sheetWithItems = mergedSheets.find(s =>
              allItemsCombined.some(i => (i.sheetName || DEFAULT_WORKSHEET_NAME) === s)
            );
            return sheetWithItems || mergedSheets[0] || DEFAULT_WORKSHEET_NAME;
          });
        }

        // 2. Sync Workflow Items:
        if (data.items && data.items.length > 0) {
          // Google Sheets has data! Merge any local items not yet in Google Sheets, but Google Sheets takes priority
          const sheetItemIds = new Set(data.items.map(i => i.id));
          const localOnlyItems = itemsRef.current.filter(i => !sheetItemIds.has(i.id));

          if (localOnlyItems.length > 0) {
            // Upload any local items created while offline or prior to login
            await batchAppendWorkflowRowsToSheet(accessToken, spreadsheetInfo.id, localOnlyItems);
          }

          const combinedItems = [...localOnlyItems, ...data.items];
          setItems(combinedItems);
          try {
            localStorage.setItem(userItemsKey, JSON.stringify(combinedItems));
          } catch (e) {
            console.error('Failed to cache sheets data', e);
          }
        } else if (data.items && data.items.length === 0) {
          // Google Sheet is brand new or empty!
          // Auto-upload existing items so the user never loses their data in Google Sheets
          const localItems = itemsRef.current;
          if (localItems && localItems.length > 0) {
            console.log('Populating Google Sheet with local workflow items...');
            await batchAppendWorkflowRowsToSheet(accessToken, spreadsheetInfo.id, localItems);
          }
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [user.provider, accessToken, spreadsheetInfo?.id, userSheetsKey, userItemsKey]);

  // Sync worksheets to user's localStorage
  useEffect(() => {
    try {
      localStorage.setItem(userSheetsKey, JSON.stringify(worksheets));
    } catch (e) {
      console.error('Failed to save worksheets list', e);
    }
  }, [worksheets, userSheetsKey]);

  // Sync activeSheet to user's localStorage
  useEffect(() => {
    try {
      localStorage.setItem(userActiveSheetKey, activeSheet);
    } catch (e) {
      console.error('Failed to save active sheet', e);
    }
  }, [activeSheet, userActiveSheetKey]);

  // Sync items to user's localStorage
  useEffect(() => {
    try {
      localStorage.setItem(userItemsKey, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save workflow items to localStorage', e);
    }
  }, [items, userItemsKey]);

  // Sync webAppUrl to localStorage
  const handleSaveWebAppUrl = (url: string) => {
    setWebAppUrl(url);
    localStorage.setItem(URL_STORAGE_KEY, url);
  };

  const handleAddWorksheet = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!worksheets.includes(trimmed)) {
      setWorksheets(prev => [...prev, trimmed]);
      setActiveSheet(trimmed);

      // Sync new tab to user's Google Spreadsheet in Google Drive
      if (user.provider === 'google' && accessToken && spreadsheetInfo?.id) {
        try {
          await createWorksheetTab(accessToken, spreadsheetInfo.id, trimmed);
        } catch (err) {
          console.warn('Could not create worksheet tab in Google Sheets', err);
        }
      }
    } else {
      setActiveSheet(trimmed);
    }
  };

  const handleRenameWorksheet = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;

    // 1. Update worksheets array
    setWorksheets(prev => prev.map(s => (s === oldName ? trimmed : s)));

    // 2. Update activeSheet if active
    if (activeSheet === oldName) {
      setActiveSheet(trimmed);
    }

    // 3. Update all items under oldName to newName
    setItems(prev =>
      prev.map(item =>
        (item.sheetName || DEFAULT_WORKSHEET_NAME) === oldName
          ? { ...item, sheetName: trimmed }
          : item
      )
    );

    // 4. Sync rename to Google Drive Spreadsheet via Google Sheets REST API
    if (user.provider === 'google' && accessToken && spreadsheetInfo?.id) {
      try {
        await renameWorksheetTab(accessToken, spreadsheetInfo.id, oldName, trimmed);
      } catch (err) {
        console.error('Could not rename worksheet tab in Google Sheets', err);
      }
    }
  };

  const handleDeleteWorksheet = async (sheetToDelete: string) => {
    if (worksheets.length <= 1) {
      alert(t.preview.minSheetAlert);
      return;
    }

    const nextSheets = worksheets.filter(s => s !== sheetToDelete);
    setWorksheets(nextSheets);

    if (activeSheet === sheetToDelete) {
      setActiveSheet(nextSheets[0]);
    }

    setItems(prev => prev.filter(i => (i.sheetName || DEFAULT_WORKSHEET_NAME) !== sheetToDelete));

    // Sync deletion to Google Drive Spreadsheet if connected
    if (user.provider === 'google' && accessToken && spreadsheetInfo?.id) {
      try {
        await deleteWorksheetTab(accessToken, spreadsheetInfo.id, sheetToDelete);
      } catch (err) {
        console.warn('Could not delete worksheet tab in Google Sheets', err);
      }
    }
  };

  const handleUpdateEntry = async (updatedItem: WorkflowItem) => {
    // 1. Update local state immediately for instant responsive UI
    setItems(prev => prev.map(item => (item.id === updatedItem.id ? updatedItem : item)));

    // 2. If Google Sheets connected, sync update directly to Google Sheets!
    if (user.provider === 'google' && accessToken && spreadsheetInfo?.id) {
      try {
        await updateWorkflowRowInSheet(accessToken, spreadsheetInfo.id, updatedItem);
      } catch (err) {
        console.warn('Could not update row in Google Sheets', err);
      }
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const itemToDelete = items.find(i => i.id === id);
    const targetSheet = itemToDelete?.sheetName || activeSheet || DEFAULT_WORKSHEET_NAME;

    // 1. Update local state immediately
    setItems(prev => prev.filter(item => item.id !== id));

    // 2. If Google Sheets connected, delete row from Google Sheets!
    if (user.provider === 'google' && accessToken && spreadsheetInfo?.id) {
      try {
        await deleteWorkflowRowFromSheet(accessToken, spreadsheetInfo.id, targetSheet, id);
      } catch (err) {
        console.warn('Could not delete row from Google Sheets', err);
      }
    }
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
    // 1. If Google Account is connected with personal spreadsheet, write directly to Google Sheets!
    if (user.provider === 'google' && accessToken && spreadsheetInfo?.id) {
      try {
        await appendWorkflowRowToSheet(accessToken, spreadsheetInfo.id, entry);
      } catch (err) {
        console.warn('Could not post directly to user Google Sheet', err);
      }
    }

    // 2. If Web App URL is connected, post to Google Apps Script as well
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

    // 3. Add to local state (isolated for this user)
    setItems(prev => [entry, ...prev]);
  };

  const handleClearDemoData = async () => {
    const msg = t.preview.clearDataConfirm.replace('{sheet}', activeSheet);
    if (window.confirm(msg)) {
      // 1. Clear locally
      setItems(prev => prev.filter(i => (i.sheetName || DEFAULT_WORKSHEET_NAME) !== activeSheet));

      // 2. If Google Sheets connected, clear data in active worksheet!
      if (user.provider === 'google' && accessToken && spreadsheetInfo?.id) {
        try {
          await clearWorksheetRowsInSheet(accessToken, spreadsheetInfo.id, activeSheet);
        } catch (err) {
          console.warn('Could not clear sheet in Google Sheets', err);
        }
      }
    }
  };

  const handleResetDemoData = () => {
    setItems(INITIAL_WORKFLOW_ITEMS);
    setWorksheets([DEFAULT_WORKSHEET_NAME]);
    setActiveSheet(DEFAULT_WORKSHEET_NAME);
    localStorage.setItem(userItemsKey, JSON.stringify(INITIAL_WORKFLOW_ITEMS));
    localStorage.setItem(userSheetsKey, JSON.stringify([DEFAULT_WORKSHEET_NAME]));
    localStorage.setItem(userActiveSheetKey, DEFAULT_WORKSHEET_NAME);
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

      {/* Main Container with extra bottom padding on mobile for bottom nav */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-20 md:pb-8">
        {/* Hero Banner with Status & Quick Actions (Visible on md+ desktop, hidden on mobile in favor of visual graphs) */}
        <div className="hidden md:block bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
          {/* Subtle background glow */}
          <div
            className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
            style={{ backgroundColor: accentConfig.hex }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-semibold backdrop-blur-xs border border-white/10">
                <Sparkles className="w-3.5 h-3.5" style={{ color: accentConfig.hex }} />
                <span>
                  {user.provider === 'google'
                    ? `${user.name} • ${t.hero.badge}`
                    : user.name && !user.name.toLowerCase().includes('sayham') && !user.name.toLowerCase().includes('demo')
                      ? `${user.name} • ${t.hero.badge}`
                      : t.hero.badge}
                </span>
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
              {/* Download Workflow Report Button */}
              <button
                type="button"
                id="hero-download-workflow-btn"
                onClick={() => setIsDownloadReportModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-2 backdrop-blur-xs active:scale-95 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4 text-white" />
                <span>{t.visualOverview.downloadWorkflowBtn}</span>
              </button>

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

              {/* <button
                type="button"
                id="hero-apps-script-guide-btn"
                onClick={() => setIsAppsScriptModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-all flex items-center gap-2 shadow-sm"
              >
                <Code2 className="w-4 h-4 text-indigo-600" />
                <span>{t.hero.scriptBtn}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button> */}

              {/* <button
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
              </button> */}
            </div>
          </div>

          {/* Quick Metrics Bar with User & Sheet indicators */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">
                {language === 'bn' ? 'ব্যবহারকারী' : 'Active Account'}
              </span>
              <strong className="text-base font-bold text-white truncate block">
                {user.name.split(' ')[0]}
              </strong>
            </div>
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
              <strong className="text-base font-bold text-white flex items-center gap-1.5">
                {user.provider === 'google' && spreadsheetInfo ? (
                  <span className="text-emerald-400 flex items-center gap-1 truncate" title={spreadsheetInfo.name}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                    <span className="truncate">Live Sheets</span>
                  </span>
                ) : webAppUrl ? (
                  <span className="text-emerald-400">Apps Script Live</span>
                ) : (
                  <span className="text-amber-300">
                    {language === 'bn' ? 'সিমুলেটর' : 'Simulator'}
                  </span>
                )}
              </strong>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* DESKTOP VIEW (Visible on md+ screens: complete full dashboard) */}
        {/* ============================================================ */}
        <div className="hidden md:block space-y-6">
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
            </div>

            {/* Right Column: Worksheets Manager & Sheet Preview */}
            <div className="lg:col-span-7 space-y-6">
              <WorksheetManager
                worksheets={worksheets}
                activeSheet={activeSheet}
                items={items}
                onSelectSheet={setActiveSheet}
                onAddWorksheet={handleAddWorksheet}
                onRenameWorksheet={handleRenameWorksheet}
                onDeleteWorksheet={handleDeleteWorksheet}
              />

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
            </div>
          </div>

          {/* Visual Analytics & Charts Section placed below Form, Worksheets, and Preview */}
          <WorkVisualOverview
            items={items}
            worksheets={worksheets}
            activeSheet={activeSheet}
            onSelectSheet={setActiveSheet}
            onOpenStatsModal={() => setIsStatsModalOpen(true)}
            onOpenDownloadModal={() => setIsDownloadReportModalOpen(true)}
          />
        </div>

        {/* ============================================================ */}
        {/* MOBILE VIEW (Visible on < md screens: single tab panel view) */}
        {/* ============================================================ */}
        <div className="block md:hidden">
          {mobileTab === 'progress' && (
            <div className="animate-in fade-in duration-200">
              <WorkVisualOverview
                items={items}
                worksheets={worksheets}
                activeSheet={activeSheet}
                onSelectSheet={setActiveSheet}
                onOpenStatsModal={() => setIsStatsModalOpen(true)}
                onOpenDownloadModal={() => setIsDownloadReportModalOpen(true)}
              />
            </div>
          )}

          {mobileTab === 'form' && (
            <div className="animate-in fade-in duration-200">
              <WorkflowForm
                onAddEntry={handleAddEntry}
                webAppUrl={webAppUrl}
                worksheets={worksheets}
                activeSheet={activeSheet}
                onSelectSheet={setActiveSheet}
                onAddWorksheet={handleAddWorksheet}
              />
            </div>
          )}

          {mobileTab === 'worksheets' && (
            <div className="animate-in fade-in duration-200">
              <WorksheetManager
                worksheets={worksheets}
                activeSheet={activeSheet}
                items={items}
                onSelectSheet={setActiveSheet}
                onAddWorksheet={handleAddWorksheet}
                onRenameWorksheet={handleRenameWorksheet}
                onDeleteWorksheet={handleDeleteWorksheet}
              />
            </div>
          )}

          {mobileTab === 'preview' && (
            <div className="animate-in fade-in duration-200">
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
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={mobileTab}
        onTabChange={setMobileTab}
        worksheetsCount={worksheets.length}
        recordsCount={items.length}
      />

      {/* Footer with bottom margin on mobile to clear bottom nav */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 mt-12 mb-16 md:mb-0 transition-colors">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300">{t.footer.appName}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()}{t.footer.techStack}&nbsp;
            <a
              href="https://sayhamkayes.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className={`font-semibold hover:underline transition-colors ${accentConfig.textClass}`}
            >
              Sayham Kayes
            </a>
          </p>
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

      <DownloadReportModal
        isOpen={isDownloadReportModalOpen}
        onClose={() => setIsDownloadReportModalOpen(false)}
        items={items}
        worksheets={worksheets}
        activeSheet={activeSheet}
        user={user}
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
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
