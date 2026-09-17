import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  Code2,
  Settings,
  TrendingUp,
  Sun,
  Moon,
  Globe,
  Palette,
  Check,
  ChevronDown,
  User,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { useTheme, AccentKey } from '../context/ThemeContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  webAppUrl: string;
  onOpenAppsScriptModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenStatsModal: () => void;
  todayWorkHours?: number;
  activeSheet?: string;
}

export const Header: React.FC<HeaderProps> = ({
  webAppUrl,
  onOpenAppsScriptModal,
  onOpenSettingsModal,
  onOpenStatsModal,
  todayWorkHours = 7.5,
  activeSheet = 'Home Works',
}) => {
  const { theme, toggleTheme, accent, setAccent, palette, accentConfig } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user, spreadsheetInfo, logout } = useAuth();

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const isConnected = Boolean(
    (webAppUrl && webAppUrl.includes('script.google.com')) ||
    (user?.provider === 'google' && spreadsheetInfo)
  );

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setIsPaletteOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setIsUserOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accentConfig.gradient} text-white flex items-center justify-center shadow-md ${accentConfig.shadow} transition-all duration-300`}
          >
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {t.common.appName}
              </h1>
              <span
                className={`hidden lg:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${accentConfig.bgLight} ${accentConfig.textClass} border ${accentConfig.borderLight}`}
              >
                {t.common.sheetsDbBadge}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight hidden sm:block">
              {t.common.appSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls, Active Sheet, Quick Stats, & Top-Right Customizers */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Active Sheet Badge */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
            title={t.header.activeSheetTitle}
          >
            <span className={accentConfig.textClass}>📑</span>
            <span className="truncate max-w-[130px]">{activeSheet}</span>
          </div>

          {/* Header Statistics Button */}
          <button
            type="button"
            id="open-header-stats-btn"
            onClick={onOpenStatsModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r ${accentConfig.gradient} text-white text-xs font-bold shadow-md ${accentConfig.shadow} transition-all group active:scale-95`}
            title={t.header.statsTitle}
          >
            <TrendingUp className="w-4 h-4 text-white/80 group-hover:scale-110 transition-transform" />
            <span className="flex items-center gap-1.5">
              <span>{t.header.statsBtn}</span>
              <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </span>
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 text-[10px] font-semibold backdrop-blur-xs">
              <span>
                {todayWorkHours}
                {t.common.hoursShort}
              </span>
            </span>
          </button>

          {/* Connection Status Pill */}
          <button
            type="button"
            id="connection-status-pill-btn"
            onClick={onOpenSettingsModal}
            className={`hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
              isConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100'
            }`}
            title={isConnected ? t.header.scriptConnected : t.header.previewMode}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{t.header.scriptConnected}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>{t.header.previewMode}</span>
              </>
            )}
          </button>

          {/* Apps Script Code Button */}
          <button
            type="button"
            id="open-apps-script-code-btn"
            onClick={onOpenAppsScriptModal}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${accentConfig.bgLight} ${accentConfig.textClass} text-xs font-semibold border ${accentConfig.borderLight} transition-colors`}
          >
            <Code2 className="w-4 h-4" />
            <span>{t.header.appsScriptBtn}</span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            id="open-settings-modal-btn"
            onClick={onOpenSettingsModal}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            title={t.header.settingsBtn}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Divider */}
          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-0.5"></div>

          {/* TOP RIGHT 1: 7-Color Accent Palette Dropdown */}
          <div className="relative" ref={paletteRef}>
            <button
              type="button"
              id="accent-palette-toggle-btn"
              onClick={() => {
                setIsPaletteOpen(prev => !prev);
                setIsLangOpen(false);
              }}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1"
              title={t.header.accentPalette}
            >
              <Palette className="w-4 h-4" style={{ color: accentConfig.hex }} />
              <span
                className="w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900"
                style={{ backgroundColor: accentConfig.hex }}
              />
            </button>

            {isPaletteOpen && (
              <div className="absolute right-0 mt-2 w-56 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 animate-fadeIn">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 px-1 flex items-center justify-between">
                  <span>{t.header.accentPalette}</span>
                  <span className="text-[10px] font-semibold text-slate-400">7 Colors</span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {palette.map(option => {
                    const isSelected = option.key === accent;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setAccent(option.key);
                          setIsPaletteOpen(false);
                        }}
                        style={{ backgroundColor: option.hex }}
                        className={`w-6 h-6 rounded-full transition-all flex items-center justify-center relative hover:scale-115 ${
                          isSelected
                            ? 'ring-3 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-800 scale-110'
                            : 'opacity-85 hover:opacity-100'
                        }`}
                        title={language === 'bn' ? option.labelBn : option.labelEn}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-center">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'bn' ? accentConfig.labelBn : accentConfig.labelEn}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* TOP RIGHT 2: Dark / Light Mode Toggle */}
          <button
            type="button"
            id="theme-mode-toggle-btn"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            title={theme === 'dark' ? t.header.themeToggleLight : t.header.themeToggleDark}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* TOP RIGHT 3: Language Dropdown (English default & বাংলা) */}
          <div className="relative" ref={langRef}>
            <button
              type="button"
              id="language-selector-dropdown-btn"
              onClick={() => {
                setIsLangOpen(prev => !prev);
                setIsPaletteOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
              title={t.header.languageSelect}
            >
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>{language === 'en' ? 'EN' : 'বাং'}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-36 py-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('en');
                    setIsLangOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-xs text-left flex items-center justify-between transition-colors ${
                    language === 'en'
                      ? `${accentConfig.bgLight} ${accentConfig.textClass} font-bold`
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🇺🇸</span>
                    <span>English</span>
                  </span>
                  {language === 'en' && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLanguage('bn');
                    setIsLangOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-xs text-left flex items-center justify-between transition-colors ${
                    language === 'bn'
                      ? `${accentConfig.bgLight} ${accentConfig.textClass} font-bold`
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🇧🇩</span>
                    <span>বাংলা</span>
                  </span>
                  {language === 'bn' && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* User Profile Menu & Logout */}
          {user && (
            <div className="relative" ref={userRef}>
              <button
                type="button"
                id="user-profile-menu-btn"
                onClick={() => {
                  setIsUserOpen(prev => !prev);
                  setIsLangOpen(false);
                  setIsPaletteOpen(false);
                }}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                title={user.name}
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-300 dark:ring-slate-700"
                  />
                ) : (
                  <div
                    className={`w-7 h-7 rounded-lg ${accentConfig.bgLight} ${accentConfig.textClass} flex items-center justify-center font-bold text-xs`}
                  >
                    {user.name.charAt(0)}
                  </div>
                )}
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[90px] truncate hidden md:inline-block">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isUserOpen && (
                <div className="absolute right-0 mt-2 w-64 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 animate-fadeIn space-y-3">
                  {/* User info card */}
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-700">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name}
                        className="w-9 h-9 rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-xl ${accentConfig.bgLight} ${accentConfig.textClass} flex items-center justify-center font-bold text-sm`}
                      >
                        {user.name.charAt(0)}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                      <span
                        className={`inline-block mt-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm ${
                          user.provider === 'google'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {user.provider === 'google' ? 'Google Account' : 'Demo Account'}
                      </span>
                    </div>
                  </div>

                  {/* Personal Google Sheet status */}
                  {spreadsheetInfo && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Personal Sheet</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {spreadsheetInfo.name}
                      </p>
                      {spreadsheetInfo.url && (
                        <a
                          href={spreadsheetInfo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium mt-1"
                        >
                          <span>Open in Google Sheets</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Sign out action */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserOpen(false);
                      logout();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'লগআউট / অ্যাকাউন্ট পরিবর্তন' : 'Sign Out / Switch User'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
