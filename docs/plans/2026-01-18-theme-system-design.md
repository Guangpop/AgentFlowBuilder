# Theme System Design - AgentFlowBuilder

## Overview

實作可切換的主題系統，支援四種視覺風格，並透過獨立的 Settings 面板進行管理。

## 四種主題

| 主題 | 特色 | 色系 |
|------|------|------|
| **Tech Dark (科技深色)** | 現有風格優化版，銳利邊角，飽和強調色 | 深色 |
| **Glassmorphism (玻璃擬態)** | 毛玻璃效果，漸層背景，半透明層疊 | 深色 |
| **Minimal (極簡白)** | 大量留白，輕量邊框，高可讀性 | 淺色 |
| **Bento Grid (便當盒)** | 模組化卡片網格，Apple 設計美學 | 深色 |

## 架構設計

### 面板系統

```
┌─────────────────────────────────────────────────────────────┐
│  Header                                    [⚙️] [Import] [Export] │
├─────────┬───────────────────────────────────┬───────────────┤
│         │                                   │               │
│  Chat   │         Canvas                    │  Properties   │
│ Sidebar │                                   │  / Settings   │ ← 共用右側面板
│         │                                   │               │
├─────────┴───────────────────────────────────┴───────────────┤
│  Footer                                                      │
└─────────────────────────────────────────────────────────────┘
```

- 右側面板可在 Properties / Settings 之間切換
- Header 新增齒輪圖標控制 Settings 面板
- 選中節點時自動切回 Properties

### 檔案結構

```
src/
├── contexts/
│   └── ThemeContext.tsx      # 主題狀態管理
├── styles/
│   └── themes.ts             # 主題 Token 定義
├── components/
│   ├── SettingsPanel.tsx     # 設定面板
│   ├── ThemePreviewCard.tsx  # 主題預覽卡片
│   └── layouts/
│       └── BentoLayout.tsx   # Bento Grid 專用佈局
└── ...existing files
```

## 主題 Token 結構

```typescript
interface ThemeTokens {
  // 背景
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgCard: string;

  // 邊框
  borderColor: string;
  borderRadius: string;

  // 文字
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // 效果
  shadow: string;
  blur: string;

  // 特殊
  gradientBg?: string;
  layout?: 'default' | 'bento';
}
```

## Settings 面板 UI

- 2x2 卡片網格顯示四種主題
- 每張卡片包含縮略預覽
- 點擊即時切換，平滑過渡
- 當前主題顯示 checkmark
- 底部「重置為預設值」按鈕
- 預留未來擴充區域（語言、快捷鍵等）

## 實作順序

1. 建立主題系統基礎 (ThemeContext + themes.ts)
2. 建立 SettingsPanel 組件
3. 整合到 App.tsx (齒輪按鈕 + 面板切換)
4. 改造現有組件套用主題
5. 實作 Bento Grid 特殊佈局
6. 加入過渡動畫 + localStorage 持久化

## 特殊處理

### Minimal (淺色系)
- 需要反轉大部分顏色邏輯
- 文字從白色變深色
- 背景從深色變淺色

### Bento Grid
- 需要條件渲染不同的佈局組件
- 使用 CSS Grid 實現模組化卡片
- 保持功能一致，僅改變視覺呈現

## localStorage 結構

```typescript
interface StoredSettings {
  theme: 'techDark' | 'glassmorphism' | 'minimal' | 'bentoGrid';
  // 未來擴充
  language?: string;
  showCanvasGrid?: boolean;
}
```
