import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import { en } from '../locales/en';
import { hi } from '../locales/hi';
import { bn } from '../locales/bn';
import { gu } from '../locales/gu';
import { kn } from '../locales/kn';
import { mr } from '../locales/mr';
import { ta } from '../locales/ta';
import { te } from '../locales/te';

// Configure i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      bn: { translation: bn },
      gu: { translation: gu },
      kn: { translation: kn },
      mr: { translation: mr },
      ta: { translation: ta },
      te: { translation: te },
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

export default i18n;