import { promptsZhTW, PromptStrings } from './zh-TW.js';
import { promptsEn } from './en.js';
import { promptsJa } from './ja.js';

export type Language = 'zh-TW' | 'en' | 'ja';

const prompts: Record<Language, PromptStrings> = {
  'zh-TW': promptsZhTW,
  'en': promptsEn,
  'ja': promptsJa,
};

/**
 * Get AI prompts for the given language. Falls back to zh-TW for any
 * unknown ID so legacy callers don't break.
 */
export const getPrompts = (lang: Language): PromptStrings => {
  return prompts[lang] || prompts['zh-TW'];
};

export { promptsZhTW, promptsEn, promptsJa };
export type { PromptStrings };
