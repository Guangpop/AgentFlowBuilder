export type ThemeId = 'warm' | 'techDark' | 'glassmorphism' | 'minimal';

export interface ThemeTokens {
  id: ThemeId;
  name: string;
  description: string;

  // 背景
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgCard: string;
  bgCardHover: string;
  bgInput: string;

  // 邊框
  borderColor: string;
  borderColorLight: string;
  borderRadius: string;
  borderRadiusLg: string;
  borderRadiusXl: string;

  // 文字
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // 效果
  shadow: string;
  shadowLg: string;
  shadowXl: string;
  blur: string;

  // 特殊
  gradientBg?: string;

  // 節點相關
  nodeBorderWidth: string;
  nodeHeaderBg: string;

  // 側邊欄
  sidebarBg: string;
  sidebarBorder: string;

  // Header/Footer
  headerBg: string;
  footerBg: string;

  // Canvas
  canvasBg: string;
  canvasGrid: string;

  // Accent（強調色系統）
  accentColor: string;
  accentBg: string;
  accentBgHover: string;
  accentBgLight: string;
  accentBorder: string;
  accentRing: string;
}

export const themes: Record<ThemeId, ThemeTokens> = {
  warm: {
    id: 'warm',
    name: '溫暖柔和',
    description: '溫暖舒適，友善直覺',

    bgPrimary: 'bg-amber-50/80',
    bgSecondary: 'bg-stone-50',
    bgTertiary: 'bg-stone-100',
    bgCard: 'bg-white',
    bgCardHover: 'hover:bg-stone-50',
    bgInput: 'bg-white',

    borderColor: 'border-stone-200',
    borderColorLight: 'border-stone-100',
    borderRadius: 'rounded-xl',
    borderRadiusLg: 'rounded-2xl',
    borderRadiusXl: 'rounded-3xl',

    textPrimary: 'text-stone-800',
    textSecondary: 'text-stone-600',
    textMuted: 'text-stone-400',
    textInverse: 'text-white',

    shadow: 'shadow-sm shadow-stone-200/60',
    shadowLg: 'shadow-md shadow-stone-200/60',
    shadowXl: 'shadow-lg shadow-stone-300/40',
    blur: '',

    nodeBorderWidth: 'border',
    nodeHeaderBg: 'bg-stone-50',

    sidebarBg: 'bg-white/90',
    sidebarBorder: 'border-stone-200',

    headerBg: 'bg-white/80 backdrop-blur-sm',
    footerBg: 'bg-stone-50',

    canvasBg: 'bg-stone-100/80',
    canvasGrid: 'rgba(168, 162, 158, 0.12)',

    accentColor: 'text-teal-600',
    accentBg: 'bg-teal-600',
    accentBgHover: 'hover:bg-teal-500',
    accentBgLight: 'bg-teal-50',
    accentBorder: 'border-teal-300',
    accentRing: 'ring-teal-400/30',
  },

  techDark: {
    id: 'techDark',
    name: '科技深色',
    description: '專業科技風格，銳利邊角',

    bgPrimary: 'bg-slate-950',
    bgSecondary: 'bg-slate-900',
    bgTertiary: 'bg-slate-800',
    bgCard: 'bg-slate-800/50',
    bgCardHover: 'hover:bg-slate-700/50',
    bgInput: 'bg-slate-800',

    borderColor: 'border-slate-700',
    borderColorLight: 'border-slate-800',
    borderRadius: 'rounded-lg',
    borderRadiusLg: 'rounded-xl',
    borderRadiusXl: 'rounded-2xl',

    textPrimary: 'text-white',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-500',
    textInverse: 'text-slate-900',

    shadow: 'shadow-lg',
    shadowLg: 'shadow-xl',
    shadowXl: 'shadow-2xl',
    blur: '',

    nodeBorderWidth: 'border-2',
    nodeHeaderBg: 'bg-white/5',

    sidebarBg: 'bg-slate-900',
    sidebarBorder: 'border-slate-800',

    headerBg: 'bg-slate-900/50 backdrop-blur-md',
    footerBg: 'bg-slate-900',

    canvasBg: 'bg-slate-900',
    canvasGrid: 'rgba(51, 65, 85, 0.5)',

    accentColor: 'text-blue-500',
    accentBg: 'bg-blue-600',
    accentBgHover: 'hover:bg-blue-500',
    accentBgLight: 'bg-blue-500/10',
    accentBorder: 'border-blue-500',
    accentRing: 'ring-blue-400/30',
  },

  glassmorphism: {
    id: 'glassmorphism',
    name: '玻璃擬態',
    description: '毛玻璃效果，柔和漸層',

    bgPrimary: 'bg-slate-950',
    bgSecondary: 'bg-white/5',
    bgTertiary: 'bg-white/10',
    bgCard: 'bg-white/5 backdrop-blur-xl',
    bgCardHover: 'hover:bg-white/10',
    bgInput: 'bg-white/10 backdrop-blur',

    borderColor: 'border-white/20',
    borderColorLight: 'border-white/10',
    borderRadius: 'rounded-xl',
    borderRadiusLg: 'rounded-2xl',
    borderRadiusXl: 'rounded-3xl',

    textPrimary: 'text-white',
    textSecondary: 'text-white/70',
    textMuted: 'text-white/40',
    textInverse: 'text-slate-900',

    shadow: 'shadow-lg shadow-black/20',
    shadowLg: 'shadow-xl shadow-black/30',
    shadowXl: 'shadow-2xl shadow-black/40',
    blur: 'backdrop-blur-xl',

    gradientBg: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900',

    nodeBorderWidth: 'border',
    nodeHeaderBg: 'bg-white/5 backdrop-blur',

    sidebarBg: 'bg-white/5 backdrop-blur-2xl',
    sidebarBorder: 'border-white/10',

    headerBg: 'bg-white/5 backdrop-blur-xl',
    footerBg: 'bg-white/5 backdrop-blur-xl',

    canvasBg: 'bg-black/20 backdrop-blur-xl',
    canvasGrid: 'rgba(255, 255, 255, 0.03)',

    accentColor: 'text-violet-400',
    accentBg: 'bg-violet-600',
    accentBgHover: 'hover:bg-violet-500',
    accentBgLight: 'bg-violet-500/10',
    accentBorder: 'border-violet-400/30',
    accentRing: 'ring-violet-400/30',
  },

  minimal: {
    id: 'minimal',
    name: '極簡白',
    description: '清爽簡潔，專注內容',

    bgPrimary: 'bg-white',
    bgSecondary: 'bg-slate-50',
    bgTertiary: 'bg-slate-100',
    bgCard: 'bg-white',
    bgCardHover: 'hover:bg-slate-50',
    bgInput: 'bg-white',

    borderColor: 'border-slate-200',
    borderColorLight: 'border-slate-100',
    borderRadius: 'rounded-lg',
    borderRadiusLg: 'rounded-xl',
    borderRadiusXl: 'rounded-2xl',

    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-400',
    textInverse: 'text-white',

    shadow: 'shadow-sm',
    shadowLg: 'shadow-md',
    shadowXl: 'shadow-lg',
    blur: '',

    nodeBorderWidth: 'border',
    nodeHeaderBg: 'bg-slate-50',

    sidebarBg: 'bg-white',
    sidebarBorder: 'border-slate-200',

    headerBg: 'bg-white',
    footerBg: 'bg-slate-50',

    canvasBg: 'bg-slate-50',
    canvasGrid: 'rgba(148, 163, 184, 0.3)',

    accentColor: 'text-slate-700',
    accentBg: 'bg-slate-800',
    accentBgHover: 'hover:bg-slate-700',
    accentBgLight: 'bg-slate-100',
    accentBorder: 'border-slate-300',
    accentRing: 'ring-slate-400/30',
  },
};

export const themeOrder: ThemeId[] = ['warm', 'techDark', 'glassmorphism', 'minimal'];

export const getTheme = (id: ThemeId): ThemeTokens => themes[id];
