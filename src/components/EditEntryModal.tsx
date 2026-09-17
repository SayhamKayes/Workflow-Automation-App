import React, { useState, useEffect } from 'react';
import { WorkflowItem } from '../types';
import { DynamicDatePicker } from './DynamicDatePicker';
import { VoiceInputButton } from './VoiceInputButton';
import { SignaturePad } from './SignaturePad';
import {
  X,
  Briefcase,
  CheckSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Save,
  Pencil,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WorkflowItem | null;
  worksheets: string[];
  onSave: (updatedItem: WorkflowItem) => void;
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({
  isOpen,
  onClose,
  item,
  worksheets,
  onSave,
}) => {
  const { language, t } = useLanguage();
  const { accentConfig } = useTheme();

  const [sheetName, setSheetName] = useState('Untitled Worksheet');
  const [date, setDate] = useState('');
  const [work1, setWork1] = useState('');
  const [work2, setWork2] = useState('');
  const [work3, setWork3] = useState('');
  const [work4, setWork4] = useState('');
  const [workHours, setWorkHours] = useState('8');
  const [workDueHours, setWorkDueHours] = useState('');
  const [signature, setSignature] = useState<string | null>(null);

  const [showOptionalWorks, setShowOptionalWorks] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Populate state whenever item changes
  useEffect(() => {
    if (item) {
      setSheetName(item.sheetName || 'Untitled Worksheet');
      setDate(item.date || '');
      setWork1(item.work1 || '');
      setWork2(item.work2 || '');
      setWork3(item.work3 || '');
      setWork4(item.work4 || '');
      setWorkHours(item.workHours || '8');
      setWorkDueHours(item.workDueHours || '');
      setSignature(item.signature || null);
      if (item.work2 || item.work3 || item.work4) {
        setShowOptionalWorks(true);
      }
      setErrors({});
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!date) {
      errs.date = language === 'bn' ? 'তারিখ নির্বাচন করা আবশ্যক' : 'Date is required';
    }
    if (!work1.trim()) {
      errs.work1 = language === 'bn' ? 'Work 1 পূরণ করা বাধ্যতামূলক' : 'Work 1 is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const updatedItem: WorkflowItem = {
      ...item,
      sheetName,
      date,
      work1: work1.trim(),
      work2: work2.trim() || undefined,
      work3: work3.trim() || undefined,
      work4: work4.trim() || undefined,
      workHours: workHours.trim() || '0',
      workDueHours: workDueHours.trim() || undefined,
      signature: signature || undefined,
    };

    onSave(updatedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl ${accentConfig.bgLight} border ${accentConfig.borderLight} flex items-center justify-center`}
            >
              <Pencil className={`w-4 h-4 ${accentConfig.textClass}`} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">{t.editModal.title}</h2>
              <p className="text-xs text-slate-400">
                {t.common.sheet}: {item.sheetName || 'Untitled Worksheet'} • {item.date}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-edit-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Target Worksheet Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileSpreadsheet className={`w-4 h-4 ${accentConfig.textClass}`} />
              <span>{t.form.targetSheetLabel}:</span>
            </label>
            <select
              value={sheetName}
              onChange={e => setSheetName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white focus:border-indigo-600 outline-hidden"
            >
              {worksheets.map(s => (
                <option key={s} value={s}>
                  📑 {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <DynamicDatePicker
            value={date}
            onChange={newDate => {
              setDate(newDate);
              if (errors.date) setErrors(prev => ({ ...prev, date: '' }));
            }}
            error={errors.date}
          />

          {/* Work Hours & Due Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{t.form.workHoursLabel}</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={workHours}
                onChange={e => setWorkHours(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{t.form.dueHoursLabel}</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={workDueHours}
                onChange={e => setWorkDueHours(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white outline-hidden"
              />
            </div>
          </div>

          {/* Work 1 (Mandatory) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Briefcase className={`w-3.5 h-3.5 ${accentConfig.textClass}`} />
                <span>{t.form.work1Label} *</span>
              </label>
              <VoiceInputButton
                fieldName="Edit Work 1"
                value={work1}
                onChange={val => {
                  setWork1(val);
                  if (errors.work1) setErrors(p => ({ ...p, work1: '' }));
                }}
              />
            </div>
            <input
              type="text"
              required
              value={work1}
              onChange={e => {
                setWork1(e.target.value);
                if (errors.work1) setErrors(p => ({ ...p, work1: '' }));
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white outline-hidden"
            />
            {errors.work1 && <p className="text-[11px] text-rose-600">{errors.work1}</p>}
          </div>

          {/* Optional Works 2, 3, 4 Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptionalWorks(!showOptionalWorks)}
              className={`text-xs font-semibold ${accentConfig.textClass} flex items-center gap-1`}
            >
              {showOptionalWorks ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              <span>
                {showOptionalWorks
                  ? language === 'bn'
                    ? 'অতিরিক্ত কাজ লুকান'
                    : 'Hide Extra Tasks'
                  : language === 'bn'
                  ? '+ অতিরিক্ত কাজ (Work 2, 3, 4) এডিট করুন'
                  : '+ Edit Extra Tasks (Work 2, 3, 4)'}
              </span>
            </button>

            {showOptionalWorks && (
              <div className="mt-2 space-y-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 animate-fadeIn">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {t.form.work2Label}
                    </label>
                    <VoiceInputButton
                      fieldName="Edit Work 2"
                      value={work2}
                      onChange={val => setWork2(val)}
                    />
                  </div>
                  <input
                    type="text"
                    value={work2}
                    onChange={e => setWork2(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-hidden"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {t.form.work3Label}
                    </label>
                    <VoiceInputButton
                      fieldName="Edit Work 3"
                      value={work3}
                      onChange={val => setWork3(val)}
                    />
                  </div>
                  <input
                    type="text"
                    value={work3}
                    onChange={e => setWork3(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-hidden"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {t.form.work4Label}
                    </label>
                    <VoiceInputButton
                      fieldName="Edit Work 4"
                      value={work4}
                      onChange={val => setWork4(val)}
                    />
                  </div>
                  <input
                    type="text"
                    value={work4}
                    onChange={e => setWork4(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Signature Pad */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <SignaturePad signature={signature} onSignatureChange={sig => setSignature(sig)} />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              id="confirm-edit-entry-btn"
              className={`px-5 py-2 rounded-xl bg-gradient-to-r ${accentConfig.gradient} text-white text-xs font-bold flex items-center gap-1.5 shadow-md ${accentConfig.shadow} transition-all`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t.editModal.saveChanges}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
