import { promptsZhTW, PromptStrings } from './zh-TW';
import { promptsEn } from './en';
import { Language } from '../locales';

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
