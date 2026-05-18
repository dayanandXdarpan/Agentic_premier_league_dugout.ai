import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, ChevronDown, Check } from 'lucide-react';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, getLabel } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const current = getLabel();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-dark-800 border border-dark-700 px-2.5 py-1.5 rounded-full hover:border-primary-500/50 transition-all group"
        type="button"
      >
        <Languages className="w-3.5 h-3.5 text-primary-400" />
        <span className="text-xs font-bold text-slate-300 hidden sm:inline">{current.flag}</span>
        <span className="text-xs font-bold text-slate-300 hidden sm:inline">{current.label}</span>
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1.5 w-48 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    language === lang.code
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-slate-300 hover:bg-dark-700'
                  }`}
                  type="button"
                >
                  <span className="text-lg">{lang.flag}</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold">{lang.label}</p>
                    <p className="text-[10px] text-slate-500">{lang.native}</p>
                  </div>
                  {language === lang.code && (
                    <Check className="w-4 h-4 text-primary-400" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
