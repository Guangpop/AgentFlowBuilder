export type ThemeId = 'techDark' | 'glassmorphism' | 'minimal' | 'bentoGrid';

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
  layout: 'default' | 'bento';

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
}

export const themes: Record<ThemeId, ThemeTokens> = {
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
    borderRadius: 'rounded-xl',
    borderRadiusLg: 'rounded-2xl',
    borderRadiusXl: 'rounded-3xl',

    textPrimary: 'text-white',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-500',
    textInverse: 'text-slate-900',

    shadow: 'shadow-lg',
    shadowLg: 'shadow-xl',
    shadowXl: 'shadow-2xl',
    blur: '',

    layout: 'default',

    nodeBorderWidth: 'border-2',
    nodeHeaderBg: 'bg-white/5',

    sidebarBg: 'bg-slate-900',
    sidebarBorder: 'border-slate-800',

    headerBg: 'bg-slate-900/50 backdrop-blur-md',
    footerBg: 'bg-slate-900',

    canvasBg: 'bg-slate-900',
    canvasGrid: 'rgba(51, 65, 85, 0.5)',
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
    borderRadius: 'rounded-2xl',
    borderRadiusLg: 'rounded-3xl',
    borderRadiusXl: 'rounded-[32px]',

    textPrimary: 'text-white',
    textSecondary: 'text-white/70',
    textMuted: 'text-white/40',
    textInverse: 'text-slate-900',

    shadow: 'shadow-lg shadow-black/20',
    shadowLg: 'shadow-xl shadow-black/30',
    shadowXl: 'shadow-2xl shadow-black/40',
    blur: 'backdrop-blur-xl',

    gradientBg: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900',
    layout: 'default',

    nodeBorderWidth: 'border',
    nodeHeaderBg: 'bg-white/5 backdrop-blur',

    sidebarBg: 'bg-white/5 backdrop-blur-2xl',
    sidebarBorder: 'border-white/10',

    headerBg: 'bg-white/5 backdrop-blur-xl',
    footerBg: 'bg-white/5 backdrop-blur-xl',

    canvasBg: 'bg-black/20 backdrop-blur-xl',
    canvasGrid: 'rgba(255, 255, 255, 0.03)',
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

    layout: 'default',

    nodeBorderWidth: 'border',
    nodeHeaderBg: 'bg-slate-50',

    sidebarBg: 'bg-white',
    sidebarBorder: 'border-slate-200',

    headerBg: 'bg-white',
    footerBg: 'bg-slate-50',

    canvasBg: 'bg-slate-50',
    canvasGrid: 'rgba(148, 163, 184, 0.3)',
  },

  bentoGrid: {
    id: 'bentoGrid',
    name: '便當盒',
    description: 'Apple 風格模組化佈局',

    bgPrimary: 'bg-slate-950',
    bgSecondary: 'bg-slate-900',
    bgTertiary: 'bg-slate-800/50',
    bgCard: 'bg-slate-800/30',
    bgCardHover: 'hover:bg-slate-800/50',
    bgInput: 'bg-slate-900/50',

    borderColor: 'border-slate-700/50',
    borderColorLight: 'border-slate-800/50',
    borderRadius: 'rounded-2xl',
    borderRadiusLg: 'rounded-3xl',
    borderRadiusXl: 'rounded-[32px]',

    textPrimary: 'text-white',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-500',
    textInverse: 'text-slate-900',

    shadow: 'shadow-lg',
    shadowLg: 'shadow-xl',
    shadowXl: 'shadow-2xl',
    blur: '',

    layout: 'bento',

    nodeBorderWidth: 'border',
    nodeHeaderBg: 'bg-slate-900/50',

    sidebarBg: 'bg-slate-900/50',
    sidebarBorder: 'border-slate-800/50',

    headerBg: 'bg-slate-900/80 backdrop-blur-md',
    footerBg: 'bg-slate-900/80',

    canvasBg: 'bg-slate-950',
    canvasGrid: 'rgba(51, 65, 85, 0.3)',
  },
};

export const themeOrder: ThemeId[] = ['techDark', 'glassmorphism', 'minimal', 'bentoGrid'];

export const getTheme = (id: ThemeId): ThemeTokens => themes[id];
