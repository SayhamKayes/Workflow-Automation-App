import React, { useState } from 'react';
import {
  X,
  Settings,
  Link,
  Save,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  webAppUrl: string;
  onSaveWebAppUrl: (url: string) => void;
  onResetDemoData: () => void;
  totalRecords: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  webAppUrl,
  onSaveWebAppUrl,
  onResetDemoData,
  totalRecords,
}) => {
  const { language, t } = useLanguage();
  const { accentConfig } = useTheme();

  const [inputUrl, setInputUrl] = useState(webAppUrl);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveWebAppUrl(inputUrl.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl ${accentConfig.bgLight} border ${accentConfig.borderLight} flex items-center justify-center`}
            >
              <Settings className={`w-4 h-4 ${accentConfig.textClass}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t.settingsModal.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.settingsModal.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-settings-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="settings-web-app-url"
              className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
            >
              <Link className={`w-4 h-4 ${accentConfig.textClass}`} />
              <span>{t.settingsModal.webAppUrlLabel}</span>
            </label>
            <input
              type="url"
              id="settings-web-app-url"
              placeholder={t.settingsModal.webAppUrlPlaceholder}
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {language === 'bn'
                ? 'আপনার Google Sheet-এর Apps Script এডিটর থেকে Web App হিসেবে Deploy করার পর পাওয়া URL দিন। খালি রাখলে ইন-অ্যাপ প্রিভিউ মোডে কাজ করবে।'
                : 'Paste the Web App deployment URL from your Google Apps Script editor. Leave blank to run in local preview mode.'}
            </p>
          </div>

          <div
            className={`p-3.5 ${accentConfig.bgLight} rounded-2xl border ${accentConfig.borderLight} text-xs space-y-1.5`}
          >
            <div className="font-semibold flex items-center gap-1.5 text-slate-900 dark:text-white">
              <HelpCircle className={`w-4 h-4 ${accentConfig.textClass}`} />
              <span>{t.settingsModal.instructionsTitle}</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.settingsModal.instructionsDesc}
            </p>
          </div>

          {/* Seed Data Management */}
          <div className="pt-2 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {language === 'bn' ? `লোকাল ডেমো রেকর্ড (${totalRecords} টি)` : `Local Records (${totalRecords})`}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'bn'
                  ? 'প্রাথমিক ডেমো ডেটায় রিসেট করতে পারেন'
                  : 'Reset data back to initial sample state'}
              </p>
            </div>
            <button
              type="button"
              id="reset-demo-data-btn"
              onClick={() => {
                if (window.confirm(t.settingsModal.resetDemoConfirm)) {
                  onResetDemoData();
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.settingsModal.resetDemoBtn}</span>
            </button>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
            <button
              type="button"
              id="cancel-settings-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              id="save-settings-btn"
              className={`px-5 py-2 rounded-xl bg-gradient-to-r ${accentConfig.gradient} text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${accentConfig.shadow}`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {t.settingsModal.urlSavedToast}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t.settingsModal.saveUrlBtn}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
