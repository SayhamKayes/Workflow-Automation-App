import React, { useState } from 'react';
import { useAuth, UserProfile } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  FileSpreadsheet,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  X,
  ExternalLink,
  Users,
  LogIn,
  Sun,
  Moon,
  Globe,
  Palette,
  Check,
} from 'lucide-react';

const PRESET_DEMO_USERS: Partial<UserProfile>[] = [
  {
    id: 'user_sayham_admin',
    name: 'Sayham Kayes',
    email: 'sayham.kayes@workflow.app',
    picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user_sarah_pm',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.org',
    picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user_rahim_ops',
    name: 'Rahim Ahmed',
    email: 'rahim.ahmed@team.net',
    picture: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  },
];

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle, loginAsDemo, isGoogleConfigured } = useAuth();
  const { theme, toggleTheme, accent, setAccent, palette, accentConfig } = useTheme();
  const { language, setLanguage } = useLanguage();

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    loginAsDemo({
      id: `custom_${customName.toLowerCase().replace(/\s+/g, '_')}`,
      name: customName.trim(),
      email: customEmail.trim() || `${customName.toLowerCase().replace(/\s+/g, '.')}@myorg.com`,
      picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(customName)}`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none opacity-25"
        style={{ backgroundColor: accentConfig.hex }}
      />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Bar with Language, Theme & Palette */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accentConfig.gradient} text-white flex items-center justify-center shadow-lg ${accentConfig.shadow}`}
          >
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">Dynamic Workflow</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Accent Color Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPaletteOpen(prev => !prev)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
              title="Theme Accent"
            >
              <Palette className="w-4 h-4" style={{ color: accentConfig.hex }} />
            </button>
            {isPaletteOpen && (
              <div className="absolute right-0 mt-2 p-2.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl z-50 flex gap-2">
                {palette.map(option => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setAccent(option.key);
                      setIsPaletteOpen(false);
                    }}
                    style={{ backgroundColor: option.hex }}
                    className={`w-5 h-5 rounded-full transition-transform hover:scale-120 flex items-center justify-center ${
                      option.key === accent ? 'ring-2 ring-white scale-110' : 'opacity-80'
                    }`}
                  >
                    {option.key === accent && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language === 'en' ? 'বাংলা' : 'EN'}</span>
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Badge & Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5" style={{ color: accentConfig.hex }} />
              <span>{language === 'bn' ? 'মাল্টি-ইউজার ওয়ার্কফ্লো ও গুগল শিট' : 'Multi-Tenant Workflow & Sheets'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {language === 'bn' ? 'লগইন প্যানেলে স্বাগতম' : 'Welcome to Login Panel'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
              {language === 'bn'
                ? 'লগইন করুন আপনার নিজস্ব জিমেইল দিয়ে—প্রতিটি ইউজারের শিট ও ডেটা সম্পূর্ণ আলাদা থাকবে।'
                : 'Sign in to access your personal dashboard. Each user gets their own separate Google Sheet.'}
            </p>
          </div>

          {/* Google Sign-In Button */}
          <div className="space-y-3">
            <button
              type="button"
              id="google-signin-btn"
              onClick={loginWithGoogle}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-md active:scale-98 group cursor-pointer"
            >
              {/* Official Google 'G' SVG Logo */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                />
              </svg>
              <span>{language === 'bn' ? 'গুগল দিয়ে সাইন-ইন করুন' : 'Sign in with Google'}</span>
            </button>

            {/* Cloud Client ID status info */}
            <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
              <span className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isGoogleConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {isGoogleConfigured
                  ? language === 'bn'
                    ? 'গুগল ক্লাউড ক্লায়েন্ট রেডি'
                    : 'Google Client ID Connected'
                  : language === 'bn'
                  ? 'গুগল ক্লায়েন্ট আইডি কনফিগার করা হয়নি'
                  : 'Client ID Not Yet in .env'}
              </span>

              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="text-indigo-400 hover:text-indigo-300 underline font-medium flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'কীভাবে তৈরি করবেন?' : 'How to set up?'}</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold absolute">
              {language === 'bn' ? 'অথবা তাৎক্ষণিক ডেমো ইউজার' : 'Or Instant Multi-User Demo'}
            </span>
          </div>

          {/* Preset Demo Accounts */}
          <div className="space-y-3">
            <p className="text-xs text-slate-400 text-center">
              {language === 'bn'
                ? 'আইসোলেশন টেস্ট করতে যেকোনো একটি অ্যাকাউন্ট বেছে নিন:'
                : 'Select an account to test user-specific panel & sheets:'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PRESET_DEMO_USERS.map(demoUser => (
                <button
                  key={demoUser.id}
                  type="button"
                  onClick={() => loginAsDemo(demoUser)}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/50 transition-all text-left group flex flex-col items-center text-center space-y-1.5 cursor-pointer"
                >
                  <img
                    src={demoUser.picture}
                    alt={demoUser.name}
                    className="w-10 h-10 rounded-full border border-white/10 object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="w-full">
                    <span className="block font-bold text-xs text-white truncate">{demoUser.name}</span>
                    <span className="block text-[10px] text-slate-400 truncate">{demoUser.email?.split('@')[0]}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Name / Email Write-in Mode */}
            <div className="pt-2 text-center">
              {!isCustomMode ? (
                <button
                  type="button"
                  onClick={() => setIsCustomMode(true)}
                  className="text-xs text-slate-400 hover:text-white underline inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'অন্য কোনো নামে লগইন করবেন?' : 'Log in as a custom user?'}</span>
                </button>
              ) : (
                <form onSubmit={handleCustomLogin} className="space-y-2.5 text-left bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>{language === 'bn' ? 'কাস্টম ইউজার তথ্য দিন' : 'Enter Custom Persona'}</span>
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={language === 'bn' ? 'আপনার পুরো নাম' : 'Your Full Name'}
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <input
                    type="email"
                    placeholder={language === 'bn' ? 'ইমেইল এড্রেস (ঐচ্ছিক)' : 'Email Address (optional)'}
                    value={customEmail}
                    onChange={e => setCustomEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className={`w-full py-2 rounded-xl bg-gradient-to-r ${accentConfig.gradient} text-white font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'এই নামে লগইন করুন' : 'Enter with this account'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Privacy & Security Callout */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {language === 'bn'
                ? 'আপনার ডেটা সরাসরি আপনার নিজস্ব শিটে সুরক্ষিত থাকে।'
                : 'Data remains private and saves only to your personalized sheet.'}
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-600">
        Dynamic Workflow Automation • Open Source MIT License
      </footer>

      {/* Google Cloud Client ID Setup Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <span>
                  {language === 'bn'
                    ? 'Google Cloud Client ID তৈরি করার সহজ উপায়'
                    : 'How to create Google Cloud Client ID'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl">
                <p className="font-semibold text-indigo-300 mb-1">
                  {language === 'bn' ? '💡 এখনই কি প্রয়োজন?' : '💡 Is it needed right now?'}
                </p>
                <p>
                  {language === 'bn'
                    ? 'না! আপনি ডেমো ইউজার (Sayham Kayes, Sarah, Rahim) দিয়ে এখনই সব ফিচার টেস্ট করতে পারবেন। পরবর্তীতে আসল গুগল সাইন-ইন চালু করতে নিচের ৩টি ধাপ অনুসরণ করুন।'
                    : 'No! You can test all features right now with the Demo user personas. Follow the steps below whenever you wish to enable real Google Sign-In.'}
                </p>
              </div>

              <ol className="space-y-3 list-decimal list-inside text-slate-300">
                <li className="space-y-1">
                  <strong className="text-white">
                    {language === 'bn' ? 'Google Cloud Console-এ যান:' : 'Visit Google Cloud Console:'}
                  </strong>
                  <p className="pl-4 text-slate-400">
                    <a
                      href="https://console.cloud.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      console.cloud.google.com <ExternalLink className="w-3 h-3" />
                    </a>
                    -এ গিয়ে একটি নতুন প্রোজেক্ট তৈরি করুন।
                  </p>
                </li>

                <li className="space-y-1">
                  <strong className="text-white">
                    {language === 'bn' ? 'APIs সক্রিয় করুন:' : 'Enable APIs:'}
                  </strong>
                  <p className="pl-4 text-slate-400">
                    <strong>APIs & Services &gt; Library</strong>-তে গিয়ে <strong>Google Sheets API</strong> এবং{' '}
                    <strong>Google Drive API</strong> সার্চ করে Enable করুন।
                  </p>
                </li>

                <li className="space-y-1">
                  <strong className="text-white">
                    {language === 'bn' ? 'OAuth Consent Screen ও Credentials:' : 'OAuth Consent Screen & Credentials:'}
                  </strong>
                  <p className="pl-4 text-slate-400">
                    <strong>Credentials &gt; Create Credentials &gt; OAuth client ID</strong> সিলেক্ট করুন।
                    Application Type দিন <strong>Web application</strong>। Authorized Origins-এ{' '}
                    <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">http://localhost:3000</code>{' '}
                    যুক্ত করুন।
                  </p>
                </li>

                <li className="space-y-1">
                  <strong className="text-white">
                    {language === 'bn' ? '.env.local ফাইলে যুক্ত করুন:' : 'Paste in .env.local file:'}
                  </strong>
                  <p className="pl-4 text-slate-400">
                    আপনার তৈরি করা Client ID-টি কপি করে প্রজেক্টের <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">.env.local</code> ফাইলে এভাবে রাখুন:
                  </p>
                  <pre className="mt-1 p-2 bg-slate-950 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto">
                    VITE_GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
                  </pre>
                </li>
              </ol>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                {language === 'bn' ? 'বুঝেছি (Close)' : 'Got it (Close)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
