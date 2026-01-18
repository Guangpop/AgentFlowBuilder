import { zhTW, LocaleStrings } from './zh-TW';
import { en } from './en';

export type Language = 'zh-TW' | 'en';

export const languages: Record<Language, { name: string; nativeName: string }> = {
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  'en': { name: 'English', nativeName: 'English' },
};

const locales: Record<Language, LocaleStrings> = {
  'zh-TW': zhTW,
  'en': en,
};

/**
 * 偵測瀏覽器語言
 * 優先順序：zh-* → zh-TW, en-* → en, 其他 → zh-TW
 */
export const detectBrowserLanguage = (): Language => {
  if (typeof window === 'undefined') return 'zh-TW';

  const browserLang = navigator.language || (navigator as any).userLanguage || '';

  // 中文系列都視為繁體中文
  if (browserLang.startsWith('zh')) return 'zh-TW';
  // 英文
  if (browserLang.startsWith('en')) return 'en';

  // 回退預設
  return 'zh-TW';
};

/**
 * 驗證語言 ID 是否有效
 */
export const isValidLanguage = (lang: string): lang is Language => {
  return lang in locales;
};

/**
 * 取得指定語言的翻譯
 */
export const getLocale = (lang: Language): LocaleStrings => {
  return locales[lang] || locales['zh-TW'];
};

export { zhTW, en };
export type { LocaleStrings };
