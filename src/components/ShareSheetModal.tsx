import React, { useState } from 'react';
import {
  X,
  Share2,
  Globe,
  Lock,
  Copy,
  Check,
  ExternalLink,
  UserPlus,
  Mail,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface ShareSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'public' | 'private';
}

export const ShareSheetModal: React.FC<ShareSheetModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'public',
}) => {
  const { user, accessToken, spreadsheetInfo } = useAuth();
  const { language, t } = useLanguage();
  const { accentConfig } = useTheme();

  const [activeTab, setActiveTab] = useState<'public' | 'private'>(initialTab);
  const [isCopied, setIsCopied] = useState(false);
  const [isMakingPublic, setIsMakingPublic] = useState(false);
  const [isPublicGranted, setIsPublicGranted] = useState(false);

  // Private sharing form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'reader' | 'writer'>('reader');
  const [isGranting, setIsGranting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync tab when initialTab changes
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  // Determine actual Google Spreadsheet URL or fallback
  const sheetUrl = spreadsheetInfo?.url || 'https://docs.google.com/spreadsheets/d/your-google-sheet-id/edit';
  const publicShareUrl = spreadsheetInfo?.id
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetInfo.id}/edit?usp=sharing`
    : sheetUrl;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicShareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = publicShareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleMakePublic = async () => {
    if (!accessToken || !spreadsheetInfo?.id) {
      // Demo / Simulator fallback
      setIsMakingPublic(true);
      setTimeout(() => {
        setIsMakingPublic(false);
        setIsPublicGranted(true);
        setFeedbackMsg({
          type: 'success',
          text: language === 'bn' ? 'পাবলিক লিংক প্রস্তুত করা হয়েছে!' : 'Public link is ready!',
        });
      }, 700);
      return;
    }

    setIsMakingPublic(true);
    setFeedbackMsg(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetInfo.id}/permissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone',
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || response.statusText);
      }

      setIsPublicGranted(true);
      setFeedbackMsg({
        type: 'success',
        text:
          language === 'bn'
            ? 'গুগল শিটটি এখন পাবলিক করা হয়েছে! যে কেউ এই লিংকে দেখতে পারবে।'
            : 'Spreadsheet is now public! Anyone with the link can view.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error making sheet public:', message);
      setFeedbackMsg({
        type: 'error',
        text:
          language === 'bn'
            ? 'পাবলিক পারমিশন দিতে ত্রুটি: ' + message
            : 'Failed to set public permission: ' + message,
      });
    } finally {
      setIsMakingPublic(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();

    if (!email || !email.includes('@')) {
      setFeedbackMsg({
        type: 'error',
        text: t.preview.enterValidEmail,
      });
      return;
    }

    if (!accessToken || !spreadsheetInfo?.id) {
      // Demo / Simulator fallback
      setIsGranting(true);
      setTimeout(() => {
        setIsGranting(false);
        setInviteEmail('');
        setFeedbackMsg({
          type: 'success',
          text:
            language === 'bn'
              ? `${email} কে ${inviteRole === 'writer' ? 'এডিটর' : 'ভিউয়ার'} এক্সেস দেওয়া হয়েছে (সিমুলেশন)!`
              : `Granted ${inviteRole} access to ${email} (Simulation)!`,
        });
      }, 700);
      return;
    }

    setIsGranting(true);
    setFeedbackMsg(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetInfo.id}/permissions?sendNotificationEmail=true`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: inviteRole,
            type: 'user',
            emailAddress: email,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || response.statusText);
      }

      setFeedbackMsg({
        type: 'success',
        text:
          language === 'bn'
            ? `${email}-কে সফলভাবে ${inviteRole === 'writer' ? 'এডিটর' : 'ভিউয়ার'} এক্সেস দেওয়া হয়েছে!`
            : `Successfully granted ${inviteRole} access to ${email}!`,
      });
      setInviteEmail('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error granting permission:', message);
      setFeedbackMsg({
        type: 'error',
        text:
          language === 'bn'
            ? 'এক্সেস দিতে ত্রুটি: ' + message
            : 'Failed to grant access: ' + message,
      });
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${accentConfig.gradient} text-white flex items-center justify-center shadow-md ${accentConfig.shadow}`}
            >
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                {t.preview.shareModalTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.preview.shareModalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Public Link vs Private Access */}
        <div className="px-6 pt-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('public');
              setFeedbackMsg(null);
            }}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
              activeTab === 'public'
                ? `border-current ${accentConfig.textClass}`
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>{t.preview.publicLink}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('private');
              setFeedbackMsg(null);
            }}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
              activeTab === 'private'
                ? `border-current ${accentConfig.textClass}`
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>{t.preview.privateAccess}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Feedback Message Banner */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 animate-in fade-in ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed font-medium">{feedbackMsg.text}</span>
            </div>
          )}

          {/* TAB 1: Public Link */}
          {activeTab === 'public' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    <span>{t.preview.publicLink}</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPublicGranted
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                    }`}
                  >
                    {isPublicGranted ? 'Public (Active)' : 'Restricted / Private'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t.preview.sharingStatusPublic}
                </p>

                {/* Spreadsheet Link Display with Copy Button */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicShareUrl}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-hidden font-mono select-all truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : `bg-slate-800 text-white dark:bg-slate-700 hover:bg-slate-700 active:scale-95`
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? t.preview.linkCopied : t.preview.copyLink}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleMakePublic}
                  disabled={isMakingPublic}
                  className={`flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r ${accentConfig.gradient} text-white text-xs font-bold shadow-md ${accentConfig.shadow} flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50`}
                >
                  <Globe className="w-4 h-4" />
                  <span>{isMakingPublic ? t.preview.makingPublic : t.preview.makePublicBtn}</span>
                </button>

                <a
                  href={publicShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t.preview.openInSheets}</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: Private Access */}
          {activeTab === 'private' && (
            <div className="space-y-4">
              <form onSubmit={handleGrantAccess} className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t.preview.sharingStatusPrivate}
                </p>

                {/* Email Input & Role Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{language === 'bn' ? 'সহকর্মীর ইমেইল অ্যাড্রেস' : 'Collaborator Email'}</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      required
                      placeholder={t.preview.emailPlaceholder}
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    />

                    {/* Role selector */}
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as 'reader' | 'writer')}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-hidden font-medium"
                    >
                      <option value="reader">{t.preview.roleViewer}</option>
                      <option value="writer">{t.preview.roleEditor}</option>
                    </select>
                  </div>
                </div>

                {/* Grant Button */}
                <button
                  type="submit"
                  disabled={isGranting}
                  className={`w-full px-4 py-2.5 rounded-xl bg-gradient-to-r ${accentConfig.gradient} text-white text-xs font-bold shadow-md ${accentConfig.shadow} flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isGranting ? t.preview.grantingAccess : t.preview.grantAccess}</span>
                </button>
              </form>

              {/* Native Google Drive Share Link */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {language === 'bn' ? 'অথবা গুগল ড্রাইভ থেকে নিয়ন্ত্রণ করুন' : 'Or manage directly on Google Drive'}
                </span>
                <a
                  href={`https://drive.google.com/file/d/${spreadsheetInfo?.id || ''}/view?usp=sharing`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-semibold hover:underline flex items-center gap-1 ${accentConfig.textClass}`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{t.preview.shareNativeDrive}</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
