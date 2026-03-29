import { promptsZhTW, PromptStrings } from './zh-TW.js';
import { promptsEn } from './en.js';

export type Language = 'zh-TW' | 'en';

const prompts: Record<Language, PromptStrings> = {
  'zh-TW': promptsZhTW,
  'en': promptsEn,
};

/**
 * 根據語言取得對應的 AI Prompts
 */
export const getPrompts = (lang: Language): PromptStrings => {
  return prompts[lang] || prompts['zh-TW'];
};

export { promptsZhTW, promptsEn };
export type { PromptStrings };
