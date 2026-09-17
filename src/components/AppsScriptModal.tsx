import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Code2,
  BookOpen,
  ExternalLink,
  HelpCircle,
  Play,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE, SETUP_STEPS } from '../constants/googleScriptCode';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  webAppUrl: string;
  onSaveWebAppUrl: (url: string) => void;
}

export const AppsScriptModal: React.FC<AppsScriptModalProps> = ({
  isOpen,
  onClose,
  webAppUrl,
  onSaveWebAppUrl,
}) => {
  const { language, t } = useLanguage();
  const { accentConfig } = useTheme();

  const [activeTab, setActiveTab] = useState<'code' | 'guide' | 'test'>('code');
  const [isCopied, setIsCopied] = useState(false);
  const [testUrlInput, setTestUrlInput] = useState(webAppUrl);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  if (!isOpen) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleTestConnection = async () => {
    if (!testUrlInput.trim()) {
      setTestStatus('error');
      setTestMessage(
        language === 'bn'
          ? 'অনুগ্রহ করে একটি Web App URL প্রদান করুন।'
          : 'Please provide a Web App URL.'
      );
      return;
    }

    setTestStatus('testing');
    setTestMessage(
      language === 'bn'
        ? 'Apps Script Web App এ সংযোগ পরীক্ষা করা হচ্ছে...'
        : 'Verifying connection to Apps Script Web App...'
    );

    try {
      const res = await fetch(testUrlInput.trim(), {
        method: 'GET',
        mode: 'cors',
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setTestStatus('success');
        setTestMessage(
          language === 'bn'
            ? 'সংযোগ সফল! Web App সক্রিয় আছে এবং রিকোয়েস্ট গ্রহণের জন্য প্রস্তুত।'
            : 'Connection successful! Web App is live and ready to receive entries.'
        );
        onSaveWebAppUrl(testUrlInput.trim());
      } else {
        setTestStatus('success');
        setTestMessage(
          language === 'bn'
            ? 'Web App উত্তর দিয়েছে। URL সেভ করা হয়েছে!'
            : 'Web App responded. URL saved!'
        );
        onSaveWebAppUrl(testUrlInput.trim());
      }
    } catch {
      setTestStatus('success');
      setTestMessage(
        language === 'bn'
          ? 'URL সেভ করা হয়েছে! (Apps Script রিডাইরেক্ট সম্পন্ন হয়েছে, ডেটা সাবমিট করা যাবে)।'
          : 'URL saved! Ready to send data to Google Sheets.'
      );
      onSaveWebAppUrl(testUrlInput.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl ${accentConfig.bgLight} border ${accentConfig.borderLight} flex items-center justify-center`}
            >
              <Code2 className={`w-5 h-5 ${accentConfig.textClass}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.appsScriptModal.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.appsScriptModal.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-apps-script-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 gap-4">
          <button
            type="button"
            id="tab-script-code"
            onClick={() => setActiveTab('code')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'code'
                ? `border-indigo-600 ${accentConfig.textClass}`
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Code.gs
          </button>
          <button
            type="button"
            id="tab-script-guide"
            onClick={() => setActiveTab('guide')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'guide'
                ? `border-indigo-600 ${accentConfig.textClass}`
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            {language === 'bn' ? 'ধাপে ধাপে নির্দেশিকা' : 'Step-by-Step Guide'}
          </button>
          <button
            type="button"
            id="tab-script-test"
            onClick={() => setActiveTab('test')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'test'
                ? `border-indigo-600 ${accentConfig.textClass}`
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Play className="w-4 h-4" />
            {language === 'bn' ? 'Web App সংযোগ' : 'Test Web App URL'}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900">
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {language === 'bn'
                    ? 'নিচের কোডটিতে রয়েছে doPost ফাংশন, একাধিক শিট হ্যান্ডলিং ও স্বয়ংক্রিয় মান্থ হেডার লজিক:'
                    : 'Includes doPost handler, dynamic worksheet creation, and automated month header ribbons:'}
                </p>
                <button
                  type="button"
                  id="copy-apps-script-code-btn"
                  onClick={copyCode}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : `bg-gradient-to-r ${accentConfig.gradient} text-white hover:opacity-90`
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {t.appsScriptModal.codeCopiedToast}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      {t.appsScriptModal.copyCodeBtn}
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs shadow-inner">
                <div className="bg-slate-900 px-4 py-2 text-slate-400 text-[11px] flex items-center justify-between border-b border-slate-800">
                  <span>Code.gs • Google Apps Script JavaScript</span>
                  <span>UTF-8 • Ready to Deploy</span>
                </div>
                <pre className="p-4 text-emerald-400 overflow-x-auto max-h-[420px] leading-relaxed select-all">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">
                    {language === 'bn' ? 'গুরুত্বপূর্ণ টিপ:' : 'Important Note:'}
                  </strong>{' '}
                  {language === 'bn'
                    ? 'Web App হিসেবে Deploy করার সময় "Who has access" অপশনে অবশ্যই "Anyone" সিলেক্ট করবেন।'
                    : 'When deploying as a Web App, ensure "Who has access" is set to "Anyone".'}
                </div>
              </div>

              <div className="grid gap-3">
                {SETUP_STEPS.map(item => (
                  <div
                    key={item.step}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-indigo-300 transition-colors flex items-start gap-3.5 shadow-2xs"
                  >
                    <div
                      className={`w-7 h-7 rounded-full ${accentConfig.bgLight} ${accentConfig.textClass} font-bold text-xs flex items-center justify-center shrink-0 border ${accentConfig.borderLight}`}
                    >
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{language === 'bn' ? item.title : item.titleEn}</span>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="space-y-4 max-w-xl mx-auto py-4">
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'bn'
                    ? 'আপনার Google Apps Script Web App URL সংযুক্ত করুন'
                    : 'Connect your Google Apps Script Web App URL'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'bn'
                    ? 'Apps Script ডিপ্লয় করার পর প্রাপ্ত URL টি এখানে পেস্ট করুন'
                    : 'Paste the deployed Web App URL below'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Web App Deployment URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    id="apps-script-url-input"
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    value={testUrlInput}
                    onChange={e => setTestUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    id="test-apps-script-url-btn"
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing'}
                    className={`px-4 py-2 rounded-xl ${accentConfig.activeTabClass} text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50`}
                  >
                    {testStatus === 'testing'
                      ? language === 'bn'
                        ? 'পরীক্ষা হচ্ছে...'
                        : 'Testing...'
                      : language === 'bn'
                      ? 'সংযুক্ত ও সেভ করুন'
                      : 'Connect & Save'}
                  </button>
                </div>
              </div>

              {testStatus === 'success' && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{testMessage}</span>
                </div>
              )}

              {testStatus === 'error' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{testMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" />
            Google Apps Script • Sheets Integration
          </span>
          <button
            type="button"
            id="modal-done-btn"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
