import { zhTW, LocaleStrings } from './zh-TW';
import { en } from './en';
import { ja } from './ja';

export type Language = 'zh-TW' | 'en' | 'ja';

export const languages: Record<Language, { name: string; nativeName: string }> = {
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  'en':    { name: 'English',               nativeName: 'English' },
  'ja':    { name: 'Japanese',              nativeName: '日本語' },
};

const locales: Record<Language, LocaleStrings> = {
  'zh-TW': zhTW,
  'en': en,
  'ja': ja,
};

/**
 * Detect browser language.
 * Priority: zh-* → zh-TW, ja-* → ja, en-* → en, fallback → zh-TW
 */
export const detectBrowserLanguage = (): Language => {
  if (typeof window === 'undefined') return 'zh-TW';

  const browserLang = navigator.language || (navigator as any).userLanguage || '';

  if (browserLang.startsWith('zh')) return 'zh-TW';
  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang.startsWith('en')) return 'en';

  return 'zh-TW';
};

/**
 * Validate whether a language ID is supported.
 */
export const isValidLanguage = (lang: string): lang is Language => {
  return lang in locales;
};

/**
 * Get the locale strings for a given language.
 */
export const getLocale = (lang: Language): LocaleStrings => {
  return locales[lang] || locales['zh-TW'];
};

export { zhTW, en, ja };
export type { LocaleStrings };
