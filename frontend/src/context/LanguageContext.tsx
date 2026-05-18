import React, { createContext, useContext, useState } from 'react';

export type LangCode = 'en' | 'hi' | 'bho';

export interface LanguageOption {
  code: LangCode;
  label: string;
  flag: string;
  native: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇬🇧', native: 'English' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳', native: 'हिंदी' },
  { code: 'bho', label: 'Bhojpuri', flag: '🪷', native: 'भोजपुरी' },
];

interface LanguageContextType {
  language: LangCode;
  setLanguage: (lang: LangCode) => void;
  getLabel: () => LanguageOption;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  getLabel: () => LANGUAGES[0],
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LangCode>(() => {
    const stored = localStorage.getItem('dugout_lang');
    return (stored as LangCode) || 'en';
  });

  const handleSetLanguage = (lang: LangCode) => {
    setLanguage(lang);
    localStorage.setItem('dugout_lang', lang);
  };

  const getLabel = () => LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, getLabel }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
