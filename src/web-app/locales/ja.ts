// 日本語 UI 翻訳
import { LocaleStrings } from './zh-TW';

export const ja: LocaleStrings = {
  // App - Header
  workflowNamePlaceholder: 'ワークフロー名',
  descriptionPlaceholder: 'クリックして説明を入力...',
  defaultWorkflowName: '無題のワークフロー',
  defaultWorkflowDescription: 'クリックしてワークフローの説明を編集...',

  // Navigation tabs
  tabCanvas: 'キャンバス',
  tabInstructions: '指示書',
  tabMermaid: 'Mermaid',
  tabMarkdown: 'MD',
  tabJson: 'Format',
  tabHistory: '履歴',

  // Buttons
  settings: '設定',
  import: 'Import',
  export: 'Export',

  // ChatSidebar
  sidebarTitle: 'AI ワークフローエンジン',
  sidebarSubtitle: 'Workflow Builder',
  promptInstruction: 'AI Agent ワークフローの要件を入力してください。',
  promptPlaceholder: 'ワークフローの要件を記述...',
  generatingMessage: 'ノードロジックを計画中...',
  poweredBy: 'Powered by AI',

  // Quick tags
  tagCustomerSupport: 'カスタマーサポート',
  tagNewsSummary: 'ニュース要約',
  tagCodeReview: 'コードレビュー',
  tagSalesAssistant: 'セールスアシスタント',
  tagTemplate: (tag: string) => `フィードバックループ付きの${tag}ワークフローを作成`,

  // Settings Panel
  settingsTitle: '設定',
  themeLabel: 'テーマ',
  languageLabel: '言語',
  aiProviderLabel: 'AI プロバイダー',
  moreSettings: 'その他の設定（近日公開）',
  canvasGrid: 'キャンバスグリッド',
  shortcutHints: 'ショートカット表示',
  show: '表示',
  enabled: '有効',
  resetToDefault: 'デフォルトに戻す',
  resetConfirm: 'すべての設定をデフォルトに戻しますか？',
  comingSoon: '近日公開',

  // Node Properties
  propertiesPanel: 'プロパティ',
  titleLabel: 'タイトル',
  titlePlaceholder: '短いラベル',
  functionDescription: '詳細説明 / プロンプト',
  descriptionHint: 'agent に渡す詳細な指示やプロンプト。複数段落に対応。',
  charCountSuffix: '文字',
  inputPorts: '入力ポート',
  outputPorts: '出力ポート',
  noInputPorts: '入力ポートなし',
  noOutputPorts: '出力ポートなし',
  add: '追加',
  removeNode: 'ノードを削除',
  nodeIdPlaceholder: 'ノード ID',
  newInput: '新しい入力',
  newOutput: '新しい出力',

  // Node default values
  defaultDescription: 'ここでこのノードの役割を記述してください...',
  inputData: '入力データ',
  outputData: '出力データ',
  trueOutput: '真 (True)',
  falseOutput: '偽 (False)',
  variableContext: '変数コンテキスト',
  executionResult: '実行結果 (Stdout)',
  toolParams: 'ツールパラメータ',
  toolReturn: 'ツール戻り値',
  skillDependency: '依存関係',
  skillOutput: 'スキル出力',

  // Script Execution
  scriptSettings: 'スクリプト設定',
  scriptTypePython: 'Python (.py)',
  scriptTypeShell: 'Shell (.sh)',
  scriptTypeJs: 'Node.js (.js)',
  scriptPlaceholder: '# スクリプトコードを入力...',
  scriptHint: 'Agent がこの内容を実行ファイルにコンパイルします。',

  // MCP Tool
  mcpTool: 'MCP ツール',
  toolNamePlaceholder: 'google_search, file_system...',
  mcpHint: 'Agent が呼び出しパラメータを自動推論します。',

  // Agent Skill
  agentSkill: 'Agent Skill',
  providerPlaceholder: 'superpower',
  skillPlaceholder: 'brain_storm',
  preview: 'PREVIEW',
  skillHint: 'Provider と Skill 名が正しいことを確認してください。',

  // Instructions Tab
  instructionsTitle: 'Agent SOP ジェネレーター',
  instructionsDescription: '「階層的開示」の原則に基づきワークフローを深く分析し、AI の注意散漫を防ぐ実行マニュアルへと変換します。',
  generateInstructions: 'Agent SOP を生成',
  regenerateInstructions: '指示書を再生成',
  generatingInstructions: 'Agent SOP を構築中...',
  generatingSubtext: 'ワークフローのトポロジを分解し、ステートマシンのロジックを処理中',
  readyToEncode: 'Ready to encode your workflow into agent intelligence',
  usageSuggestion: '使い方のヒント',
  generatedPrompt: 'GENERATED MASTER SYSTEM PROMPT',
  copyPrompt: 'SOP プロンプトをコピー',
  copied: 'コピー済み',
  copyPromptHint: 'プロンプトを Claude Code、Cursor、Codex に貼り付けると、Skill / Command ファイルが自動生成されます',
  promptCopiedTitle: 'プロンプトをクリップボードにコピーしました',
  promptCopiedHint: 'AI ツールに貼り付けると、自動的にファイルが生成されます',

  // IDE & Output Type Selectors
  ideLabel: 'IDE',
  outputTypeLabel: 'タイプ',
  ideClaudeCode: 'Claude Code',
  ideAntigravity: 'Antigravity',
  ideCursor: 'Cursor',
  outputTypeSkills: 'Skills',
  outputTypeCommands: 'Commands',
  outputTypeWorkflows: 'Workflows',
  fileLocationLabel: 'ファイル位置',
  copyFullPrompt: '完全プロンプトをコピー（下方の SOP 含む）',
  copiedFull: '完全プロンプトをコピー済み',

  // Platform groups (IDE vs Chat)
  platformGroupIde: 'IDE',
  platformGroupIdeHint: 'IDE + MCP 環境が必要',
  platformGroupChat: 'Chat',
  platformGroupChatHint: 'チャット欄に貼り付けるだけ',

  // Chat platform card
  ideChat: 'Chat',
  chatPlatformDesc: 'ChatGPT · Gemini · Grok · Claude.ai · DeepSeek',

  // Chat mode segmented control
  modeLabel: '実行モード',
  chatModeStep: 'ステップ実行',
  chatModeStepDesc: '各段階で確認のため停止',
  chatModePlan: '計画してから実行',
  chatModePlanDesc: '全体を提示し GO を待つ',

  // Chat generate region
  chatHint: 'このプロンプトを任意の LLM チャット（ChatGPT / Gemini / Grok…）に貼り付けてください',
  copyChatPrompt: 'Chat プロンプトをコピー',

  // Import flow (sidebar)
  importFromFile: 'ファイルからインポート',
  importFromFileHint: '.md / .json / .pdf / .docx / .pptx / 画像 …',
  importFromUrl: 'URL からインポート',
  importFromUrlHint: '記事 URL または YouTube リンク',
  urlInputLabel: 'URL',
  urlPlaceholder: 'https://… または YouTube リンク',
  importButton: 'インポート',
  importedToast: 'インポート完了',
  importedAsDraftToast: '下書きとして読み込みました — キャンバスで調整してください',

  // Prefix Templates
  prefixClaudeSkills: `以下のワークフローに基づき、Claude Code Skill を生成してください。

要件:
- フォルダ構造を作成: .claude/skills/<skill-name>/SKILL.md
- YAML frontmatter に name と description を含める
- name は kebab-case（小文字・数字・ハイフン）
- description はこの skill の用途と発動タイミングを明確に記述
- 詳細は Markdown 形式で記述

---

`,
  prefixClaudeCommands: `以下のワークフローに基づき、Claude Code Slash Command を生成してください。

要件:
- ファイルを作成: .claude/commands/<command-name>.md
- YAML frontmatter は任意で description、argument-hint、allowed-tools を含む
- ファイル名がコマンド名（.md 拡張子を除く）
- $ARGUMENTS でユーザー入力パラメータを受け取る
- コマンド手順を Markdown で記述

---

`,
  prefixAntigravitySkills: `以下のワークフローに基づき、Antigravity Skill を生成してください。

要件:
- フォルダ構造を作成: .agent/skills/<skill-name>/SKILL.md
- YAML frontmatter に name と description を含める
- name は kebab-case
- description はこの skill の用途と発動タイミングを明確に記述
- 詳細は Markdown 形式で記述

---

`,
  prefixAntigravityWorkflows: `以下のワークフローに基づき、Antigravity Workflow を生成してください。

要件:
- ファイルを作成: .agent/workflows/<workflow-name>.md
- Markdown の箇条書きで手順を記述
- 各手順は * または - で開始
- 手順は明確かつ実行可能であること
- // turbo-all コメントを使うと agent が全手順を自動実行

---

`,
  prefixCursorSkills: `以下のワークフローに基づき、Cursor Skill を生成してください。

要件:
- フォルダ構造を作成: .cursor/skills/<skill-name>/SKILL.md
- YAML frontmatter に name と description を含める
- name は kebab-case
- description はこの skill の用途と発動タイミングを明確に記述
- 詳細は Markdown 形式で記述

---

`,
  prefixCursorCommands: `以下のワークフローに基づき、Cursor Slash Command を生成してください。

要件:
- ファイルを作成: .cursor/commands/<command-name>.md
- YAML frontmatter は任意で description、argument-hint を含む
- ファイル名がコマンド名（.md 拡張子を除く）
- $ARGUMENTS でユーザー入力パラメータを受け取る
- コマンド手順を Markdown で記述

---

`,

  // Feature cards
  featureHierarchical: '階層的開示',
  featureHierarchicalDesc: '指示書を細かなタスクに分解し、長すぎるプロンプトによる context 腐敗を防ぎます。',
  featureAntiPollution: '汚染防止メカニズム',
  featureAntiPollutionDesc: 'Skill のアトミックな境界を明確に定義し、各段階の状態が後続ロジックを妨げないようにします。',
  featureFeedbackLoop: 'フィードバックループ最適化',
  featureFeedbackLoopDesc: 'Loop ノードの実行経路を最適化し、AI が「前のステップへ戻る」トリガを正確に理解できるようにします。',

  // Markdown tab
  systemDesignDoc: 'システム設計ドキュメント',
  copyMarkdown: 'Copy Markdown',
  workflow: 'ワークフロー',
  nodeList: 'ノード一覧',
  flowTopology: 'フロートポロジ',
  functionDescLabel: '機能説明',
  inputEndpoints: '入力エンドポイント',
  outputEndpoints: '出力エンドポイント',
  none: 'なし',

  // Mermaid tab
  mermaidDslDef: 'MERMAID DSL DEFINITION',
  cannotGenerateChart: 'チャートを生成できません。DSL 定義を確認してください',

  // Footer
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  nodes: 'NODES',
  edges: 'EDGES',

  // Alerts
  alertGenerateFailed: 'ワークフロー生成に失敗しました。コンソールを確認してください。',
  alertInstructionsFailed: '指示書生成に失敗しました。',
  alertInvalidJson: 'ワークフロー JSON ファイルの構造が無効です。',
  alertImportFailed: 'インポートに失敗しました。正しい JSON ファイルが選択されているか確認してください。',
  alertApiKeyMissing: '必要な API キー環境変数を設定してください',

  // Validation
  nodeIdDuplicate: 'この Node ID は既に存在します。別の名前を使用してください。',

  // AI generated text
  aiGeneratedDescription: 'AI 生成のワークフロー',

  // Node type display names
  nodeTypeUserInput: 'ユーザー入力',
  nodeTypeAgentReasoning: 'AI 推論',
  nodeTypeCondition: '条件分岐',
  nodeTypeAgentQuestion: 'AI 確認質問',
  nodeTypeUserResponse: 'ユーザー応答',
  nodeTypeAgentAction: 'タスク実行',
  nodeTypeScriptExecution: 'スクリプト実行',
  nodeTypeMCPTool: 'MCP ツール呼び出し',
  nodeTypeAgentSkill: 'Agent スキル呼び出し',

  // Node type short names (for toolbar)
  nodeShortUserInput: '入力',
  nodeShortAgentReasoning: '推論',
  nodeShortCondition: '条件分岐',
  nodeShortAgentQuestion: '確認質問',
  nodeShortUserResponse: 'ユーザー応答',
  nodeShortAgentAction: 'タスク実行',
  nodeShortScriptExecution: 'スクリプト',
  nodeShortMCPTool: 'MCP ツール',
  nodeShortAgentSkill: 'AGENT スキル',

  // Toolbar tooltips
  addNodeTooltip: (nodeName: string) => `${nodeName}を追加`,

  // Empty canvas
  workspaceReady: 'ワークフローを作成しましょう',
  workspaceHint: '上部のツールバーからノードをドラッグ、または左から JSON ファイルをインポート',
  emptyStepAddNode: 'ノードを追加',
  emptyStepConnect: 'フローを接続',
  emptyStepGenerate: '指示書を生成',

  // Sidebar empty state
  noWorkflows: 'ワークフローはまだありません',
  noWorkflowsHint: '上の New で新規作成、または Import から読み込んでください',

  // Tab bar
  exportTabs: 'エクスポート',

  // Node categories (toolbar)
  categoryUser: 'ユーザー',
  categoryAgent: 'AI エージェント',
  categorySystem: 'システム',

  // Empty state + onboarding
  welcomeTitle: 'AgentFlow Builder へようこそ',
  welcomeSubtitle: 'AI Agent ワークフローを直感的に設計',
  welcomeStep1: 'ノードを追加',
  welcomeStep1Desc: 'ツールバーから各種ノードをドラッグ',
  welcomeStep2: 'フローを接続',
  welcomeStep2Desc: 'ノードの出力を次の入力へ接続',
  welcomeStep3: '指示書を生成',
  welcomeStep3Desc: 'AI 実行可能な Skill にワンクリックで変換',
  quickStart: 'クイックスタート',
  goToCanvas: 'キャンバスへ',
  editDescription: 'クリックして説明を編集...',
  getStarted: 'はじめる',
  loadExample: 'サンプルを読み込む',
  skip: 'スキップ',

  // Toast
  savedToast: 'ワークフローを保存しました',
  copiedToast: 'クリップボードにコピーしました',
  nodeAddedToast: 'ノードを追加しました',
  deletedToast: '削除しました',
  connectedToast: '接続を作成しました',

  // Instructions wizard steps
  stepPlatform: 'プラットフォーム選択',
  stepType: 'タイプ選択',
  stepMode: 'モード選択',
  stepGenerate: '生成',
  noWorkflowForInstructions: '先にワークフローを作成してから指示書を生成してください',

  // Properties panel
  dangerZone: '危険な操作',
  descriptionSection: '機能説明',
  settingsSection: '設定',
  portsSection: 'ポート',

  // Node descriptions for tooltips
  nodeDescUserInput: 'ユーザーからの初期入力を受け取る',
  nodeDescAgentReasoning: 'AI による分析と判断',
  nodeDescCondition: '条件に応じて分岐する',
  nodeDescAgentQuestion: 'AI がユーザーに確認質問',
  nodeDescUserResponse: 'ユーザーが補足情報を提供',
  nodeDescAgentAction: 'AI が具体的なタスクを実行',
  nodeDescScriptExecution: 'カスタムスクリプトを実行',
  nodeDescMCPTool: '外部 MCP ツールサービスを呼び出す',
  nodeDescAgentSkill: '定義済みの Agent スキルを呼び出す',

  // Theme names and descriptions
  themeWarmName: 'ウォーム',
  themeWarmDesc: '温かみがあり、親しみやすい',
  themeTechDarkName: 'テックダーク',
  themeTechDarkDesc: 'プロフェッショナルなテックスタイル、シャープな角',
  themeGlassmorphismName: 'グラスモーフィズム',
  themeGlassmorphismDesc: 'すりガラス効果と柔らかなグラデーション',
  themeMinimalName: 'ミニマル',
  themeMinimalDesc: 'クリーンでシンプル、コンテンツに集中',

  // History Tab
  historyTitle: '履歴',
  historyEmpty: '履歴はまだありません',
  historyEmptyHint: '最初のワークフローを作成しましょう！',
  historyGeneratedPrompt: 'Generated Prompt',
  historyNoPrompt: '(プロンプト記録なし)',
  historyNodeCount: 'ノード数',
  historyCost: 'コスト',
  historyDownload: 'JSON をダウンロード',
  historyDelete: '削除',
  historyDeleteConfirm: 'この履歴を削除しますか？',
};
