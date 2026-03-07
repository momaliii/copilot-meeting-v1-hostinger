import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import ar from '../locales/ar.json';

const STORAGE_KEY = 'meeting-copilot-lang';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: (() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'ar' || stored === 'en') return stored;
    } catch {}
    return 'en';
  })(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {}
  const html = document.documentElement;
  html.lang = lng === 'ar' ? 'ar' : 'en';
  html.dir = lng === 'ar' ? 'rtl' : 'ltr';
});

// Set initial dir/lang
const lng = i18n.language;
document.documentElement.lang = lng === 'ar' ? 'ar' : 'en';
document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';

export default i18n;
