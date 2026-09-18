import React, { useState, useEffect, useRef } from 'react';
import { PenTool, Upload, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface SignaturePadProps {
  signature: string | null;
  onSignatureChange: (dataUrl: string | null) => void;
}

const STORAGE_KEY = 'workflow_user_signature';

export const SignaturePad: React.FC<SignaturePadProps> = ({
  signature,
  onSignatureChange,
}) => {
  const { language } = useLanguage();
  const { theme, accentConfig } = useTheme();

  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const savedSignature = localStorage.getItem(STORAGE_KEY);
    if (savedSignature && !signature) {
      onSignatureChange(savedSignature);
    }
  }, [onSignatureChange, signature]);

  // Set up canvas context
  useEffect(() => {
    if (activeTab !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = theme === 'dark' ? '#f8fafc' : '#1e293b';
  }, [activeTab, theme]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    const clientX =
      'touches' in e && e.touches.length > 0
        ? e.touches[0].clientX
        : 'clientX' in e
        ? e.clientX
        : 0;
    const clientY =
      'touches' in e && e.touches.length > 0
        ? e.touches[0].clientY
        : 'clientY' in e
        ? e.clientY
        : 0;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    localStorage.setItem(STORAGE_KEY, dataUrl);
    onSignatureChange(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(
        language === 'bn'
          ? 'অনুগ্রহ করে শুধুমাত্র ইমেজ ফাইল (PNG/JPG) আপলোড করুন।'
          : 'Please upload an image file (PNG/JPG) only.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        localStorage.setItem(STORAGE_KEY, dataUrl);
        onSignatureChange(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearSignature = () => {
    localStorage.removeItem(STORAGE_KEY);
    onSignatureChange(null);
    setHasDrawn(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <PenTool className={`w-4 h-4 ${accentConfig.textClass}`} />
          <span>
            {language === 'bn'
              ? 'ডিজিটাল স্বাক্ষর (Signature Auto-Fill)'
              : 'Digital Signature (Auto-Preserved)'}
          </span>
        </label>
        {signature && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {language === 'bn' ? 'স্বয়ংক্রিয়ভাবে সংরক্ষিত' : 'Auto-Saved'}
          </span>
        )}
      </div>

      {signature ? (
        /* Saved Signature Preview Card */
        <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-28 h-12 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center overflow-hidden shadow-xs">
              <img
                src={signature}
                alt="Saved Signature"
                className="max-h-full max-w-full object-contain filter dark:invert"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {language === 'bn' ? 'স্বাক্ষর যুক্ত আছে (Auto-Attached)' : 'Signature Attached'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'bn'
                  ? 'প্রতিটি সাবমিটে স্বয়ংক্রিয়ভাবে এই স্বাক্ষর যোগ হবে'
                  : 'Automatically included with every workflow submission'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="clear-saved-signature-btn"
            onClick={clearSignature}
            className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {language === 'bn' ? 'মুছে নতুন দিন' : 'Clear & Redo'}
          </button>
        </div>
      ) : (
        /* Drawing or Uploading Interface */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-1 gap-1">
            <button
              type="button"
              id="tab-signature-draw"
              onClick={() => setActiveTab('draw')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'draw'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              {language === 'bn' ? 'স্বাক্ষর আঁকুন (Draw Pad)' : 'Draw Signature'}
            </button>
            <button
              type="button"
              id="tab-signature-upload"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              {language === 'bn' ? 'ইমেজ ফাইল আপলোড' : 'Upload Image'}
            </button>
          </div>

          <div className="p-3">
            {activeTab === 'draw' ? (
              <div className="space-y-2">
                <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 hover:border-indigo-300 transition-colors">
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-28 cursor-crosshair touch-none block"
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400">
                      {language === 'bn'
                        ? 'এখানে মাউস বা আঙুল দিয়ে স্বাক্ষর করুন'
                        : 'Draw your signature here with mouse or touch'}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>
                    {language === 'bn'
                      ? 'আঁকার সাথে সাথেই স্বয়ংক্রিয়ভাবে সেভ হবে'
                      : 'Signature is saved automatically upon release'}
                  </span>
                  {hasDrawn && (
                    <button
                      type="button"
                      id="reset-canvas-btn"
                      onClick={clearSignature}
                      className="text-slate-600 dark:text-slate-300 hover:text-slate-800 flex items-center gap-1 underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {language === 'bn' ? 'পরিষ্কার করুন' : 'Clear Canvas'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center hover:border-indigo-300 transition-colors bg-slate-50/50 dark:bg-slate-900/50">
                <input
                  type="file"
                  id="signature-file-input"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="signature-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                >
                  <div
                    className={`w-10 h-10 rounded-full ${accentConfig.bgLight} ${accentConfig.textClass} flex items-center justify-center`}
                  >
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-semibold ${accentConfig.textClass} hover:underline`}>
                    {language === 'bn' ? 'স্বাক্ষর ছবি আপলোড করুন' : 'Choose Signature Image'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    PNG, JPG or WEBP
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
