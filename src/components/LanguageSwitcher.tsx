import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import i18n from '../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
];

export default function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const { i18n: i18nHook } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === i18nHook.language) || LANGUAGES[0];

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  if (variant === 'compact') {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Language"
          aria-expanded={open}
        >
          <Languages className="w-4 h-4" />
          <span>{current.label}</span>
        </button>
        {open && (
          <div className="absolute top-full mt-1 end-0 min-w-[120px] bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full text-start px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${i18nHook.language === lang.code ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        aria-label="Language"
        aria-expanded={open}
      >
        <Languages className="w-5 h-5" />
        <span className="text-sm font-medium">{current.label}</span>
      </button>
      {open && (
        <div className="absolute top-full mt-1 end-0 min-w-[140px] bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full text-start px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${i18nHook.language === lang.code ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
