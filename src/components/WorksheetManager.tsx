import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  FileSpreadsheet,
  Plus,
  Pencil,
  Check,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { WorkflowItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface WorksheetManagerProps {
  worksheets: string[];
  activeSheet: string;
  items: WorkflowItem[];
  onSelectSheet: (sheet: string) => void;
  onAddWorksheet: (name: string) => void;
  onRenameWorksheet: (oldName: string, newName: string) => Promise<void> | void;
  onDeleteWorksheet: (sheet: string) => void;
  isSyncing?: boolean;
}

export const WorksheetManager: React.FC<WorksheetManagerProps> = ({
  worksheets,
  activeSheet,
  items,
  onSelectSheet,
  onAddWorksheet,
  onRenameWorksheet,
  onDeleteWorksheet,
  isSyncing = false,
}) => {
  const { language, t } = useLanguage();
  const { accentConfig } = useTheme();

  const [newSheetInput, setNewSheetInput] = useState('');
  const [editingSheet, setEditingSheet] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRenamingLoading, setIsRenamingLoading] = useState(false);

  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus input when starting to edit
  useEffect(() => {
    if (editingSheet && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSheet]);

  const handleStartRename = (sheet: string) => {
    setErrorMsg(null);
    setEditingSheet(sheet);
    setRenameInputValue(sheet);
  };

  const handleCancelRename = () => {
    setEditingSheet(null);
    setRenameInputValue('');
    setErrorMsg(null);
  };

  const handleSaveRename = async (oldName: string) => {
    const trimmed = renameInputValue.trim();
    if (!trimmed) {
      setErrorMsg(t.worksheetsManager.emptyNameAlert);
      return;
    }

    if (trimmed === oldName) {
      handleCancelRename();
      return;
    }

    if (worksheets.includes(trimmed)) {
      setErrorMsg(t.worksheetsManager.nameExistsAlert);
      return;
    }

    try {
      setIsRenamingLoading(true);
      await onRenameWorksheet(oldName, trimmed);
      setEditingSheet(null);
      setRenameInputValue('');
      setErrorMsg(null);
    } catch (err) {
      console.error('Error in handleSaveRename:', err);
      setErrorMsg('Failed to rename. Please try again.');
    } finally {
      setIsRenamingLoading(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSheetInput.trim();
    if (!trimmed) return;

    if (worksheets.includes(trimmed)) {
      alert(t.worksheetsManager.nameExistsAlert);
      return;
    }

    onAddWorksheet(trimmed);
    setNewSheetInput('');
  };

  const toDisplayIndex = (idx: number) => {
    const num = idx + 1;
    if (language === 'bn') {
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return String(num)
        .split('')
        .map(d => bnDigits[parseInt(d, 10)] || d)
        .join('');
    }
    return String(num);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
      {/* Top Header with title and quick-add input */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentConfig.bgLight} ${accentConfig.textClass} border ${accentConfig.borderLight}`}
            >
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {t.worksheetsManager.title}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${accentConfig.bgLight} ${accentConfig.textClass} border ${accentConfig.borderLight}`}
            >
              {worksheets.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 pl-10">
            {t.worksheetsManager.subtitle}
          </p>
        </div>

        {/* Quick Add Worksheet Input */}
        <form onSubmit={handleAddSubmit} className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={newSheetInput}
              onChange={e => setNewSheetInput(e.target.value)}
              placeholder={t.worksheetsManager.addSheetPlaceholder}
              className="w-full sm:w-48 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all"
              style={{
                outlineColor: accentConfig.hex,
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!newSheetInput.trim()}
            className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.worksheetsManager.addSheetBtn}</span>
          </button>
        </form>
      </div>

      {/* Global Error Notice if renaming failed */}
      {errorMsg && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="ml-auto text-rose-500 hover:text-rose-700 dark:hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Serial-wise Worksheets List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {worksheets.map((sheet, index) => {
          const isCurrentActive = activeSheet === sheet;
          const isEditing = editingSheet === sheet;
          const count = items.filter(i => (i.sheetName || 'Untitled Worksheet') === sheet).length;

          return (
            <div
              key={sheet}
              className={`py-3 px-2 sm:px-3 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                isCurrentActive
                  ? 'bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60'
                  : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
              }`}
            >
              {/* Left Side: Serial #, Name, and Status */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Serial Badge */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    isCurrentActive
                      ? `${accentConfig.bgLight} ${accentConfig.textClass} border ${accentConfig.borderLight}`
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  #{toDisplayIndex(index)}
                </div>

                {/* Sheet Title or Inline Edit Input */}
                {isEditing ? (
                  <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={renameInputValue}
                      onChange={e => {
                        setRenameInputValue(e.target.value);
                        setErrorMsg(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveRename(sheet);
                        } else if (e.key === 'Escape') {
                          handleCancelRename();
                        }
                      }}
                      disabled={isRenamingLoading}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border-2 text-slate-900 dark:text-white focus:outline-hidden shadow-inner"
                      style={{
                        borderColor: accentConfig.hex,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(sheet)}
                      disabled={isRenamingLoading || !renameInputValue.trim()}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-colors shrink-0 shadow-xs cursor-pointer"
                      title={t.worksheetsManager.saveBtn}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelRename}
                      disabled={isRenamingLoading}
                      className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors shrink-0 cursor-pointer"
                      title={t.worksheetsManager.cancelBtn}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onSelectSheet(sheet)}
                      className="font-bold text-sm text-slate-800 dark:text-slate-200 hover:underline flex items-center gap-1.5 truncate text-left cursor-pointer transition-colors"
                      title={t.worksheetsManager.switchSheetTooltip}
                    >
                      <FileSpreadsheet
                        className={`w-4 h-4 shrink-0 ${
                          isCurrentActive ? accentConfig.textClass : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{sheet}</span>
                    </button>

                    {/* Active Sheet Badge */}
                    {isCurrentActive && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${accentConfig.bgLight} ${accentConfig.textClass} border ${accentConfig.borderLight}`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t.worksheetsManager.activeBadge}</span>
                      </span>
                    )}

                    {/* Records Count Badge */}
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                      • {count} {t.worksheetsManager.recordsCount}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Side: Actions (Rename & Delete) */}
              {!isEditing && (
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {/* Switch button if not active */}
                  {!isCurrentActive && (
                    <button
                      type="button"
                      onClick={() => onSelectSheet(sheet)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                    >
                      {language === 'bn' ? 'সুইচ' : 'Select'}
                    </button>
                  )}

                  {/* Rename Button */}
                  <button
                    type="button"
                    onClick={() => handleStartRename(sheet)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs hover:scale-102 ${accentConfig.bgLight} ${accentConfig.textClass} ${accentConfig.borderLight} hover:bg-white dark:hover:bg-slate-800`}
                  >
                    <Pencil className="w-3 h-3" />
                    <span>{t.worksheetsManager.renameBtn}</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (worksheets.length <= 1) {
                        alert(t.worksheetsManager.minSheetAlert);
                        return;
                      }
                      const msg = t.worksheetsManager.deleteConfirm.replace('{sheet}', sheet);
                      if (window.confirm(msg)) {
                        onDeleteWorksheet(sheet);
                      }
                    }}
                    disabled={worksheets.length <= 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    title={t.worksheetsManager.deleteTooltip}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
