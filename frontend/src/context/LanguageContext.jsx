import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('foodbridge_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('foodbridge_lang', language);
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'ml' : 'en'));
  };

  const t = (key) => {
    const dict = translations[language] || translations.en;
    return dict[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
