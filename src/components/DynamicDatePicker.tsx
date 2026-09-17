import React from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface DynamicDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  error?: string;
}

export const DynamicDatePicker: React.FC<DynamicDatePickerProps> = ({
  value,
  onChange,
  error,
}) => {
  const { language } = useLanguage();
  const { accentConfig } = useTheme();

  const getTodayStr = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Format date nicely in Bengali & English
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

      if (language === 'bn') {
        const banglaWeekDays = [
          'রবিবার',
          'সোমবার',
          'মঙ্গলবার',
          'বুধবার',
          'বৃহস্পতিবার',
          'শুক্রবার',
          'শনিবার',
        ];
        const weekday = banglaWeekDays[d.getDay()];
        const banglaMonths = [
          'জানুয়ারি',
          'ফেব্রুয়ারি',
          'মার্চ',
          'এপ্রিল',
          'মে',
          'জুন',
          'জুলাই',
          'আগস্ট',
          'সেপ্টেম্বর',
          'অক্টোবর',
          'নভেম্বর',
          'ডিসেম্বর',
        ];
        return `${d.getDate()} ${banglaMonths[d.getMonth()]} ${d.getFullYear()} • ${weekday}`;
      }

      const formatted = d.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return formatted;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor="workflow-date-input"
          className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
        >
          <CalendarIcon className={`w-4 h-4 ${accentConfig.textClass}`} />
          <span>{language === 'bn' ? 'ক্যালেন্ডার তারিখ (Date)' : 'Work Date'}</span>
          <span className="text-rose-500 font-bold">*</span>
        </label>

        {/* Quick shortcut pills */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="quick-date-today-btn"
            onClick={() => onChange(getTodayStr())}
            className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${
              value === getTodayStr()
                ? `${accentConfig.activeTabClass}`
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {language === 'bn' ? 'আজকে (Today)' : 'Today'}
          </button>
          <button
            type="button"
            id="quick-date-yesterday-btn"
            onClick={() => onChange(getYesterdayStr())}
            className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${
              value === getYesterdayStr()
                ? `${accentConfig.activeTabClass}`
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {language === 'bn' ? 'গতকাল' : 'Yesterday'}
          </button>
        </div>
      </div>

      <div className="relative">
        <input
          type="date"
          id="workflow-date-input"
          required
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium transition-all outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-sm ${
            error
              ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100 dark:ring-rose-950/50'
              : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-400'
          }`}
        />
      </div>

      {value && (
        <div
          className={`flex items-center gap-1.5 text-xs ${accentConfig.textClass} ${accentConfig.bgLight} px-2.5 py-1 rounded-lg border ${accentConfig.borderLight}`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>
            {language === 'bn' ? 'নির্বাচিত' : 'Selected'}: {formatDisplayDate(value)}
          </span>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
    </div>
  );
};
