import React, { useState } from 'react';
import { WorkflowItem } from '../types';
import { DynamicDatePicker } from './DynamicDatePicker';
import { VoiceInputButton } from './VoiceInputButton';
import { SignaturePad } from './SignaturePad';
import {
  Send,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  CheckSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Plus,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface WorkflowFormProps {
  onAddEntry: (entry: WorkflowItem) => Promise<boolean | void>;
  webAppUrl: string;
  worksheets: string[];
  activeSheet: string;
  onSelectSheet: (sheet: string) => void;
  onAddWorksheet: (name: string) => void;
}

export const WorkflowForm: React.FC<WorkflowFormProps> = ({
  onAddEntry,
  webAppUrl,
  worksheets,
  activeSheet,
  onSelectSheet,
  onAddWorksheet,
}) => {
  const { language, t } = useLanguage();
  const { accentConfig } = useTheme();

  // Form State
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [work1, setWork1] = useState('');
  const [work2, setWork2] = useState('');
  const [work3, setWork3] = useState('');
  const [work4, setWork4] = useState('');
  const [workHours, setWorkHours] = useState('8');
  const [workDueHours, setWorkDueHours] = useState('');
  const [signature, setSignature] = useState<string | null>(null);

  // New worksheet inline input state
  const [isAddingSheet, setIsAddingSheet] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');

  // UI state
  const [showOptionalWorks, setShowOptionalWorks] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  // Validation
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!date) {
      newErrors.date = language === 'bn' ? 'তারিখ নির্বাচন করা আবশ্যক' : 'Date is required';
    }
    if (!work1.trim()) {
      newErrors.work1 = language === 'bn' ? 'Work 1 পূরণ করা বাধ্যতামূলক' : 'Work 1 is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccessMsg(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const newEntry: WorkflowItem = {
      id: 'wf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      sheetName: activeSheet || 'Home Works',
      date,
      work1: work1.trim(),
      work2: work2.trim() || undefined,
      work3: work3.trim() || undefined,
      work4: work4.trim() || undefined,
      workHours: workHours.trim() || '0',
      workDueHours: workDueHours.trim() || undefined,
      signature: signature || undefined,
      submittedAt: new Date().toISOString(),
    };

    try {
      await onAddEntry(newEntry);

      // Show success notification
      setSubmitSuccessMsg(
        webAppUrl
          ? language === 'bn'
            ? `ডেটা সফলভাবে Google Sheets ("${newEntry.sheetName}") ও লোকাল প্রিভিউতে সেভ হয়েছে!`
            : `Data successfully synced to Google Sheets ("${newEntry.sheetName}") and local state!`
          : language === 'bn'
          ? `ডেটা সফলভাবে "${newEntry.sheetName}" শিট প্রিভিউতে সেভ হয়েছে!`
          : `Data successfully saved to "${newEntry.sheetName}" sheet preview!`
      );

      // Reset form fields except signature and date
      setWork1('');
      setWork2('');
      setWork3('');
      setWork4('');
      setWorkHours('8');
      setWorkDueHours('');
      setErrors({});

      setTimeout(() => {
        setSubmitSuccessMsg(null);
      }, 5000);
    } catch (err) {
      console.error(err);
      setErrors({
        submit:
          language === 'bn'
            ? 'সাবমিট করার সময় সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
            : 'Error submitting entry. Please verify your connection.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-7 transition-colors">
      <div className="border-b border-slate-150 dark:border-slate-800 pb-4 mb-6">
        <div className={`flex items-center gap-2 ${accentConfig.textClass} mb-1`}>
          <Layers className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {language === 'bn' ? 'দৈনিক ওয়ার্কফ্লো এন্ট্রি' : 'Daily Workflow Entry'}
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.form.title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {language === 'bn'
            ? 'ভয়েস ইনপুট বা কিবোর্ড দিয়ে কাজের বিবরণ দিন এবং ডিজিটাল স্বাক্ষর যুক্ত করুন'
            : 'Log work tasks via voice or typing and digitally sign your entry'}
        </p>
      </div>

      {submitSuccessMsg && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
              {t.common.success}!
            </p>
            <p className="mt-0.5">{submitSuccessMsg}</p>
          </div>
        </div>
      )}

      {errors.submit && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errors.submit}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 0. Target Worksheet Selector */}
        <div
          className={`p-3.5 ${accentConfig.bgLight} border ${accentConfig.borderLight} rounded-2xl space-y-2`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className={`w-4 h-4 ${accentConfig.textClass}`} />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t.form.targetSheetLabel}:
              </span>
            </div>
            <button
              type="button"
              id="form-add-sheet-toggle-btn"
              onClick={() => setIsAddingSheet(!isAddingSheet)}
              className={`text-[11px] font-bold ${accentConfig.textClass} hover:opacity-80 flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs`}
            >
              <Plus className="w-3 h-3" />
              <span>{t.form.addSheetBtn}</span>
            </button>
          </div>

          {isAddingSheet ? (
            <div className="flex items-center gap-2 pt-1 animate-fadeIn">
              <input
                type="text"
                id="form-new-sheet-name-input"
                placeholder={t.form.addSheetPlaceholder}
                value={newSheetName}
                onChange={e => setNewSheetName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newSheetName.trim()) {
                      onAddWorksheet(newSheetName.trim());
                      onSelectSheet(newSheetName.trim());
                      setNewSheetName('');
                      setIsAddingSheet(false);
                    }
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                id="form-confirm-add-sheet-btn"
                onClick={() => {
                  if (newSheetName.trim()) {
                    onAddWorksheet(newSheetName.trim());
                    onSelectSheet(newSheetName.trim());
                    setNewSheetName('');
                    setIsAddingSheet(false);
                  }
                }}
                className={`px-3 py-1.5 ${accentConfig.activeTabClass} rounded-lg text-xs font-bold transition-colors`}
              >
                {t.common.save}
              </button>
              <button
                type="button"
                onClick={() => setIsAddingSheet(false)}
                className="px-2 py-1.5 text-slate-500 dark:text-slate-400 text-xs hover:text-slate-800 dark:hover:text-white"
              >
                {t.common.cancel}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {worksheets.map(sheet => (
                <button
                  key={sheet}
                  type="button"
                  onClick={() => onSelectSheet(sheet)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeSheet === sheet
                      ? `${accentConfig.activeTabClass}`
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>📑</span>
                  <span>{sheet}</span>
                  {activeSheet === sheet && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5 animate-pulse"></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 1. Dynamic Calendar Date Picker (Mandatory) */}
        <DynamicDatePicker
          value={date}
          onChange={newDate => {
            setDate(newDate);
            if (errors.date) {
              setErrors(prev => ({ ...prev, date: '' }));
            }
          }}
          error={errors.date}
        />

        {/* 2. Work 1 (Mandatory) with Voice Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="work1-input"
              className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
            >
              <Briefcase className={`w-4 h-4 ${accentConfig.textClass}`} />
              <span>{t.form.work1Label}</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <VoiceInputButton
              fieldName="Work 1"
              onTranscript={text => {
                setWork1(prev => (prev ? `${prev} ${text}` : text));
                if (errors.work1) {
                  setErrors(p => ({ ...p, work1: '' }));
                }
              }}
            />
          </div>
          <div className="relative">
            <input
              type="text"
              id="work1-input"
              required
              placeholder={t.form.work1Placeholder}
              value={work1}
              onChange={e => {
                setWork1(e.target.value);
                if (errors.work1) {
                  setErrors(prev => ({ ...prev, work1: '' }));
                }
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-all outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-sm ${
                errors.work1
                  ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100 dark:ring-rose-950/50'
                  : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-400'
              }`}
            />
          </div>
          {errors.work1 ? (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errors.work1}</p>
          ) : (
            <p className="text-[11px] text-slate-400">
              {language === 'bn'
                ? 'ভয়েস রেকর্ডার আইকনে ক্লিক করে সরাসরি বাংলায় কথা বলে লিখতে পারেন'
                : 'Click mic icon to dictate task details using speech'}
            </p>
          )}
        </div>

        {/* 3. Optional Work Items (Work 2, 3, 4) Toggle */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            id="toggle-optional-works-btn"
            onClick={() => setShowOptionalWorks(prev => !prev)}
            className="w-full px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>
                {language === 'bn'
                  ? 'অতিরিক্ত কাজ যোগ করুন (Work 2, 3, 4 - অপশনাল)'
                  : 'Add Additional Tasks (Work 2, 3, 4 - Optional)'}
              </span>
            </span>
            <div className={`flex items-center gap-1 ${accentConfig.textClass}`}>
              <span>
                {showOptionalWorks
                  ? language === 'bn'
                    ? 'লুকান'
                    : 'Hide'
                  : language === 'bn'
                  ? 'ফিল্ডগুলো দেখুন'
                  : 'Show Fields'}
              </span>
              {showOptionalWorks ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {showOptionalWorks && (
            <div className="p-4 space-y-3.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              {/* Work 2 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="work2-input"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    {t.form.work2Label}
                  </label>
                  <VoiceInputButton
                    fieldName="Work 2"
                    onTranscript={text => setWork2(prev => (prev ? `${prev} ${text}` : text))}
                  />
                </div>
                <input
                  type="text"
                  id="work2-input"
                  placeholder={t.form.work2Placeholder}
                  value={work2}
                  onChange={e => setWork2(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500/20 outline-hidden"
                />
              </div>

              {/* Work 3 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="work3-input"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    {t.form.work3Label}
                  </label>
                  <VoiceInputButton
                    fieldName="Work 3"
                    onTranscript={text => setWork3(prev => (prev ? `${prev} ${text}` : text))}
                  />
                </div>
                <input
                  type="text"
                  id="work3-input"
                  placeholder={t.form.work3Placeholder}
                  value={work3}
                  onChange={e => setWork3(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500/20 outline-hidden"
                />
              </div>

              {/* Work 4 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="work4-input"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    {t.form.work4Label}
                  </label>
                  <VoiceInputButton
                    fieldName="Work 4"
                    onTranscript={text => setWork4(prev => (prev ? `${prev} ${text}` : text))}
                  />
                </div>
                <input
                  type="text"
                  id="work4-input"
                  placeholder={t.form.work4Placeholder}
                  value={work4}
                  onChange={e => setWork4(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500/20 outline-hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Work Hours & Due Hours (Side by Side) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Work Hours (Logged Time) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="work-hours-input"
                className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{t.form.workHoursLabel}</span>
              </label>
              {/* Quick Hours Pill Buttons */}
              <div className="flex items-center gap-1">
                {['4', '6', '7.5', '8'].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setWorkHours(h)}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-colors ${
                      workHours === h
                        ? `${accentConfig.activeTabClass}`
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                id="work-hours-input"
                step="0.5"
                min="0"
                max="24"
                placeholder={t.form.workHoursPlaceholder}
                value={workHours}
                onChange={e => setWorkHours(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-hidden text-sm"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                {t.common.hoursShort}
              </span>
            </div>
          </div>

          {/* Work Due Hours (Optional) */}
          <div className="space-y-1.5">
            <label
              htmlFor="work-due-hours-input"
              className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{t.form.dueHoursLabel}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                id="work-due-hours-input"
                step="0.5"
                min="0"
                max="24"
                placeholder={t.form.dueHoursPlaceholder}
                value={workDueHours}
                onChange={e => setWorkDueHours(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500/20 outline-hidden text-sm"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                {language === 'bn' ? 'ঘণ্টা বাকি' : 'due'}
              </span>
            </div>
          </div>
        </div>

        {/* 6. Signature Auto-Fill Component */}
        <div className="pt-2 border-t border-slate-150 dark:border-slate-800">
          <SignaturePad
            signature={signature}
            onSignatureChange={newSig => setSignature(newSig)}
          />
        </div>

        {/* 7. Submit Action Button */}
        <div className="pt-3">
          <button
            type="submit"
            id="submit-workflow-btn"
            disabled={isSubmitting}
            className={`w-full py-3.5 px-6 rounded-xl bg-gradient-to-r ${accentConfig.gradient} text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md ${accentConfig.shadow} transition-all hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{t.form.submittingBtn}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{t.form.submitBtn}</span>
                <Sparkles className="w-4 h-4 text-white/80" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
