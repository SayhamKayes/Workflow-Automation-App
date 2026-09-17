import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  fieldName: string;
  className?: string;
}

// Support Web Speech API types
interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal?: boolean;
    };
    length: number;
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  fieldName,
  className = '',
}) => {
  const { language } = useLanguage();
  const { accentConfig } = useTheme();

  const [isListening, setIsListening] = useState(false);
  const [lang, setLang] = useState<'bn-BD' | 'en-US'>(() =>
    language === 'bn' ? 'bn-BD' : 'en-US'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Sync with global language change
  useEffect(() => {
    setLang(language === 'bn' ? 'bn-BD' : 'en-US');
  }, [language]);

  useEffect(() => {
    const SpeechConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechConstructor) {
      return;
    }

    try {
      const recognition = new SpeechConstructor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0]) {
            finalTranscript += result[0].transcript;
          }
        }
        if (finalTranscript) {
          onTranscript(finalTranscript);
        }
      };

      recognition.onerror = (event: { error: string }) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg(
            language === 'bn'
              ? 'মাইক্রোফোন পারমিশন প্রয়োজন'
              : 'Microphone permission required'
          );
        } else if (event.error === 'no-speech') {
          setErrorMsg(language === 'bn' ? 'কোনো কথা শোনা যায়নি' : 'No speech detected');
        } else {
          setErrorMsg((language === 'bn' ? 'ভয়েস ত্রুটি: ' : 'Voice error: ') + event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.error('Failed to initialize speech recognition', e);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [lang, language, onTranscript]);

  const toggleListening = () => {
    const SpeechConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechConstructor) {
      alert(
        language === 'bn'
          ? 'আপনার ব্রাউজারে Web Speech API সমর্থিত নয়। Google Chrome বা Edge ব্যবহার করুন।'
          : 'Web Speech API is not supported in this browser. Please use Chrome or Edge.'
      );
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setErrorMsg(null);
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = lang;
          recognitionRef.current.start();
        }
      } catch (err) {
        console.error(err);
        setIsListening(false);
      }
    }
  };

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      {/* Language Switcher Small Badge */}
      <button
        type="button"
        id={`voice-lang-btn-${fieldName}`}
        onClick={() => setLang(l => (l === 'bn-BD' ? 'en-US' : 'bn-BD'))}
        title={language === 'bn' ? 'ভাষা পরিবর্তন করুন (বাংলা / EN)' : 'Toggle speech language (EN / বাংলা)'}
        className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
      >
        {lang === 'bn-BD' ? 'বাংলা' : 'EN'}
      </button>

      {/* Voice Record Button */}
      <button
        type="button"
        id={`voice-btn-${fieldName}`}
        onClick={toggleListening}
        title={
          isListening
            ? language === 'bn'
              ? 'রেকর্ডিং বন্ধ করতে ক্লিক করুন'
              : 'Click to stop voice recording'
            : language === 'bn'
            ? `ভয়েস দিয়ে টাইপ করুন (${lang === 'bn-BD' ? 'বাংলা' : 'English'})`
            : `Type with voice (${lang === 'bn-BD' ? 'বাংলা' : 'English'})`
        }
        className={`relative p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
          isListening
            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105 ring-4 ring-rose-200 dark:ring-rose-900/50 animate-pulse'
            : `${accentConfig.bgLight} ${accentConfig.textClass} hover:opacity-80`
        }`}
      >
        {isListening ? (
          <MicOff className="w-4 h-4 text-white" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Active Recording Wave Indicator */}
      {isListening && (
        <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-full border border-rose-200 dark:border-rose-800/60">
          <Volume2 className="w-3.5 h-3.5 animate-bounce" />
          <span>{language === 'bn' ? 'শুনছি...' : 'Listening...'}</span>
        </span>
      )}

      {/* Error Tooltip */}
      {errorMsg && (
        <span className="absolute -top-7 right-0 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 flex items-center gap-1 shadow-sm whitespace-nowrap z-20">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          {errorMsg}
        </span>
      )}
    </div>
  );
};
