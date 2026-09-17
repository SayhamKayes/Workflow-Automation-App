import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface VoiceInputButtonProps {
  fieldName: string;
  className?: string;
  value?: string;
  onChange?: (text: string) => void;
  onTranscript?: (text: string) => void;
}

// Support Web Speech API types
interface SpeechRecognitionEventLike {
  resultIndex: number;
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
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
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

// 10 seconds of silence before auto-stop (in milliseconds)
const SILENCE_TIMEOUT_MS = 10000;

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  fieldName,
  className = '',
  value = '',
  onChange,
  onTranscript,
}) => {
  const { language } = useLanguage();
  const { accentConfig } = useTheme();

  const [isListening, setIsListening] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [lang, setLang] = useState<'bn-BD' | 'en-US'>(() =>
    language === 'bn' ? 'bn-BD' : 'en-US'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);
  const isManualStopRef = useRef(false);
  const initialTextRef = useRef('');
  const accumulatedFinalTextRef = useRef('');
  const latestSpokenSessionRef = useRef('');

  // Sync language with global app language when changed
  useEffect(() => {
    setLang(language === 'bn' ? 'bn-BD' : 'en-US');
  }, [language]);

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Stop listening cleanly
  const stopListening = useCallback(() => {
    isManualStopRef.current = true;
    isListeningRef.current = false;
    clearSilenceTimer();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('SpeechRecognition stop error:', e);
      }
    }

    setIsListening(false);
    setLiveText('');

    // If onTranscript was provided, notify with final spoken sentence
    if (onTranscript && latestSpokenSessionRef.current) {
      onTranscript(latestSpokenSessionRef.current);
    }
  }, [clearSilenceTimer, onTranscript]);

  // Reset 10-second silence timer
  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      // 10 seconds of silence elapsed -> auto-stop
      stopListening();
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimer, stopListening]);

  // Initialize SpeechRecognition instance
  const initRecognition = useCallback(() => {
    const SpeechConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechConstructor) return null;

    try {
      const recognition = new SpeechConstructor();
      recognition.continuous = true; // Stay active to capture full multi-word sentences
      recognition.interimResults = true; // Capture real-time speech hypotheses
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setErrorMsg(null);
        resetSilenceTimer();
      };

      recognition.onspeechstart = () => {
        resetSilenceTimer();
      };

      recognition.onspeechend = () => {
        // User paused speaking; start 10s countdown from this moment
        resetSilenceTimer();
      };

      recognition.onaudiostart = () => {
        resetSilenceTimer();
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        // Any speech event resets the 10-second silence timer
        resetSilenceTimer();

        let currentRunFinal = '';
        let currentRunInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0]) {
            if (result.isFinal) {
              currentRunFinal += result[0].transcript + ' ';
            } else {
              currentRunInterim += result[0].transcript;
            }
          }
        }

        // Combine previously accumulated final text + current run final + interim
        const fullSpoken = (
          accumulatedFinalTextRef.current +
          ' ' +
          currentRunFinal +
          ' ' +
          currentRunInterim
        ).trim();

        if (fullSpoken) {
          latestSpokenSessionRef.current = fullSpoken;
          setLiveText(fullSpoken);

          // Calculate complete updated text including pre-existing text in input field
          const combined = initialTextRef.current
            ? `${initialTextRef.current} ${fullSpoken}`
            : fullSpoken;

          if (onChange) {
            onChange(combined);
          }
        }
      };

      recognition.onerror = (event: { error: string }) => {
        // 'no-speech' is a normal browser event during quiet periods.
        // Don't kill the session immediately; our 10-second timer will handle silence.
        if (event.error === 'no-speech') {
          return;
        }

        if (event.error === 'not-allowed') {
          setErrorMsg(
            language === 'bn'
              ? 'মাইক্রোফোন পারমিশন প্রয়োজন'
              : 'Microphone permission required'
          );
        } else if (event.error !== 'aborted') {
          setErrorMsg((language === 'bn' ? 'ভয়েস ত্রুটি: ' : 'Voice error: ') + event.error);
        }

        stopListening();
      };

      recognition.onend = () => {
        // If recognition closed unexpectedly (e.g. Chrome's audio timeout)
        // and user didn't stop it and 10s silence didn't elapse, restart it!
        if (isListeningRef.current && !isManualStopRef.current) {
          try {
            // Save latest spoken text into accumulatedFinalText so restarting doesn't lose progress
            accumulatedFinalTextRef.current = latestSpokenSessionRef.current;
            recognition.start();
            return;
          } catch (e) {
            console.warn('SpeechRecognition auto-restart error:', e);
          }
        }

        setIsListening(false);
        isListeningRef.current = false;
        clearSilenceTimer();
        setLiveText('');
      };

      return recognition;
    } catch (e) {
      console.error('Failed to initialize speech recognition:', e);
      return null;
    }
  }, [lang, language, onChange, resetSilenceTimer, clearSilenceTimer, stopListening]);

  // Clean up on unmount or language change
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        isManualStopRef.current = true;
        isListeningRef.current = false;
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [clearSilenceTimer]);

  const toggleListening = () => {
    const SpeechConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechConstructor) {
      alert(
        language === 'bn'
          ? 'আপনার ব্রাউজারে Web Speech API সমর্থিত নয়। অনুগ্রহ করে Google Chrome বা Microsoft Edge ব্যবহার করুন।'
          : 'Web Speech API is not supported in this browser. Please use Chrome or Edge.'
      );
      return;
    }

    if (isListening) {
      // User clicked stop manually
      stopListening();
    } else {
      // Start new listening session
      setErrorMsg(null);
      isManualStopRef.current = false;
      isListeningRef.current = true;
      initialTextRef.current = (value || '').trim();
      accumulatedFinalTextRef.current = '';
      latestSpokenSessionRef.current = '';
      setLiveText('');

      const recognition = initRecognition();
      if (!recognition) return;

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        setIsListening(false);
        isListeningRef.current = false;
      }
    }
  };

  const handleToggleLang = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLang = lang === 'bn-BD' ? 'en-US' : 'bn-BD';
    setLang(nextLang);

    // If currently listening, restart with new language
    if (isListening) {
      stopListening();
      setTimeout(() => {
        setLang(nextLang);
      }, 100);
    }
  };

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      {/* Language Switcher Badge: Bengali (বাংলা) / English (EN) */}
      <button
        type="button"
        id={`voice-lang-btn-${fieldName}`}
        onClick={handleToggleLang}
        title={
          language === 'bn'
            ? 'ভয়েস ভাষা পরিবর্তন করুন (বাংলা / EN)'
            : 'Toggle voice language (EN / বাংলা)'
        }
        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs select-none"
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
              ? 'রেকর্ডিং বন্ধ করতে ক্লিক করুন (১০ সেকেন্ড নীরব থাকলে অটো বন্ধ হবে)'
              : 'Click to stop recording (auto-stops after 10s of silence)'
            : language === 'bn'
            ? `ভয়েস দিয়ে পুরো সেন্টেন্স টাইপ করুন (${lang === 'bn-BD' ? 'বাংলা' : 'English'})`
            : `Type full sentences with voice (${lang === 'bn-BD' ? 'বাংলা' : 'English'})`
        }
        className={`relative p-2 rounded-xl transition-all duration-200 flex items-center justify-center select-none ${
          isListening
            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 scale-105 ring-4 ring-rose-300 dark:ring-rose-900/60 animate-pulse'
            : `${accentConfig.bgLight} ${accentConfig.textClass} hover:scale-105 active:scale-95`
        }`}
      >
        {isListening ? (
          <MicOff className="w-4 h-4 text-white" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Active Recording Wave Indicator & 10s Silence Notice */}
      {isListening && (
        <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 rounded-full border border-rose-200 dark:border-rose-800/60 shadow-xs animate-in fade-in">
          <Volume2 className="w-3.5 h-3.5 animate-bounce text-rose-500" />
          <span className="text-[10px] sm:text-[11px] font-semibold">
            {language === 'bn' ? 'শুনছি... (১০ সে. নীরবতায় অফ)' : 'Listening... (auto-off in 10s)'}
          </span>
        </span>
      )}

      {/* Live Voice Speech Bubble */}
      {isListening && liveText && (
        <div className="absolute top-full left-0 mt-1 z-30 max-w-xs sm:max-w-sm px-2.5 py-1.5 rounded-xl bg-slate-900/95 text-white text-[11px] shadow-xl backdrop-blur-md border border-slate-700 pointer-events-none animate-in fade-in slide-in-from-top-1">
          <span className="text-[9px] uppercase tracking-wider block font-bold text-rose-400 mb-0.5">
            🎙️ {language === 'bn' ? 'লাইভ ভয়েস সেন্টেন্স' : 'Live Speech Sentence'}
          </span>
          <p className="italic text-slate-100 line-clamp-2">"{liveText}"</p>
        </div>
      )}

      {/* Error Tooltip */}
      {errorMsg && (
        <span className="absolute -top-7 right-0 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/90 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 flex items-center gap-1 shadow-sm whitespace-nowrap z-20">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          {errorMsg}
        </span>
      )}
    </div>
  );
};
