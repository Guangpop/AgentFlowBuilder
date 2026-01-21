// 繁體中文 UI 翻譯
export const zhTW = {
  // App - Header
  workflowNamePlaceholder: '工作流名稱',
  descriptionPlaceholder: '點擊輸入描述...',
  defaultWorkflowName: '未命名工作流',
  defaultWorkflowDescription: '點擊此處修改工作流描述...',

  // Navigation tabs
  tabCanvas: '畫布',
  tabInstructions: '指令集',
  tabMermaid: 'Mermaid',
  tabMarkdown: 'MD',
  tabJson: 'JSON',
  tabHistory: '歷程',

  // Buttons
  settings: '設定',
  import: 'Import',
  export: 'Export',

  // ChatSidebar
  sidebarTitle: 'AI 工作流引擎',
  sidebarSubtitle: 'Workflow Builder',
  promptInstruction: '請輸入 AI Agent 工作流需求。',
  promptPlaceholder: '描述您的工作流需求...',
  generatingMessage: '正在規劃節點邏輯...',
  poweredBy: 'Powered by Gemini 3 Flash',
  pricingTitle: '使用計費說明',
  pricingWorkflow: '• 生成工作流：NT$15/次',
  pricingSop: '• 生成 SOP 指令集：NT$15/節點',

  // Quick tags
  tagCustomerSupport: '客戶支持',
  tagNewsSummary: '新聞摘要',
  tagCodeReview: '代碼審查',
  tagSalesAssistant: '銷售管家',
  tagTemplate: (tag: string) => `建立一個帶有反饋回圈的${tag}工作流`,

  // Settings Panel
  settingsTitle: '設定',
  themeLabel: '外觀主題',
  languageLabel: '界面語言',
  aiProviderLabel: 'AI 提供者',
  moreSettings: '更多設定（即將推出）',
  canvasGrid: '畫布網格',
  shortcutHints: '快捷鍵提示',
  show: '顯示',
  enabled: '開啟',
  resetToDefault: '重置為預設值',
  resetConfirm: '確定要重置所有設定為預設值嗎？',
  comingSoon: '即將推出',

  // Node Properties
  propertiesPanel: '屬性面板',
  functionDescription: '功能描述',
  descriptionHint: '說明此元件的職責...',
  inputPorts: '輸入端口',
  outputPorts: '輸出端口',
  noInputPorts: '無輸入端口',
  noOutputPorts: '無輸出端口',
  add: '新增',
  removeNode: '移除節點',
  nodeIdPlaceholder: '節點 ID',
  newInput: '新輸入',
  newOutput: '新輸出',

  // Node default values
  defaultDescription: '請在此修改此節點的職責描述...',
  inputData: '輸入數據',
  outputData: '輸出數據',
  trueOutput: '真 (True)',
  falseOutput: '假 (False)',
  variableContext: '變數 Context',
  executionResult: '執行結果 (Stdout)',
  toolParams: '工具參數',
  toolReturn: '工具回傳',
  skillDependency: '前置依賴',
  skillOutput: '技能產出',

  // Script Execution
  scriptSettings: '腳本設定',
  scriptTypePython: 'Python (.py)',
  scriptTypeShell: 'Shell (.sh)',
  scriptTypeJs: 'Node.js (.js)',
  scriptPlaceholder: '# 輸入腳本代碼...',
  scriptHint: 'Agent 將編譯此內容為可執行檔。',

  // MCP Tool
  mcpTool: 'MCP 工具',
  toolNamePlaceholder: 'google_search, file_system...',
  mcpHint: 'Agent 將自動推斷調用參數。',

  // Agent Skill
  agentSkill: 'Agent Skill',
  providerPlaceholder: 'superpower',
  skillPlaceholder: 'brain_storm',
  preview: 'PREVIEW',
  skillHint: '確保 Provider 與 Skill 名稱正確。',

  // Instructions Tab
  instructionsTitle: 'Agent SOP 生成器',
  instructionsDescription: '基於「階層式揭露」原則，深度分析您的工作流，轉化為能夠防止 AI 注意力渙散的執行手冊。',
  generateInstructions: '開始產生 Agent SOP',
  regenerateInstructions: '重新產生指令集',
  generatingInstructions: '正在構建 Agent SOP...',
  generatingSubtext: '正在深度拆解工作流拓撲結構並處理狀態機邏輯',
  readyToEncode: 'Ready to encode your workflow into agent intelligence',
  usageSuggestion: '使用建議',
  generatedPrompt: 'GENERATED MASTER SYSTEM PROMPT',
  copyPrompt: 'Copy Prompt',
  copied: 'Copied',

  // IDE & Output Type Selectors
  ideLabel: 'IDE',
  outputTypeLabel: '類型',
  ideClaudeCode: 'Claude Code',
  ideAntigravity: 'Antigravity',
  ideCursor: 'Cursor',
  outputTypeSkills: 'Skills',
  outputTypeCommands: 'Commands',
  outputTypeWorkflows: 'Workflows',
  fileLocationLabel: '檔案位置',
  copyFullPrompt: '複製完整 Prompt（含下方 SOP）',
  copiedFull: '已複製完整 Prompt',

  // Prefix Templates
  prefixClaudeSkills: `請根據以下工作流程，產生一個 Claude Code Skill。

格式要求：
- 建立資料夾結構：.claude/skills/<skill-name>/SKILL.md
- 使用 YAML frontmatter 包含 name 和 description 欄位
- name 使用 kebab-case 命名（小寫字母、數字、連字號）
- description 要清楚說明此 skill 的用途以及何時應該被觸發
- 內容使用 Markdown 格式撰寫詳細指令

---

`,
  prefixClaudeCommands: `請根據以下工作流程，產生一個 Claude Code Slash Command。

格式要求：
- 建立檔案：.claude/commands/<command-name>.md
- 可選使用 YAML frontmatter 包含 description、argument-hint、allowed-tools 等欄位
- 檔案名稱即為指令名稱（不含 .md 副檔名）
- 使用 $ARGUMENTS 接收使用者輸入的參數
- 內容使用 Markdown 格式撰寫指令步驟

---

`,
  prefixAntigravitySkills: `請根據以下工作流程，產生一個 Antigravity Skill。

格式要求：
- 建立資料夾結構：.agent/skills/<skill-name>/SKILL.md
- 使用 YAML frontmatter 包含 name 和 description 欄位
- name 使用 kebab-case 命名（小寫字母、數字、連字號）
- description 要清楚說明此 skill 的用途以及何時應該被觸發
- 內容使用 Markdown 格式撰寫詳細指令

---

`,
  prefixAntigravityWorkflows: `請根據以下工作流程，產生一個 Antigravity Workflow。

格式要求：
- 建立檔案：.agent/workflows/<workflow-name>.md
- 使用 Markdown 條列式格式撰寫步驟
- 每個步驟以 * 或 - 開頭
- 步驟要清楚、可執行
- 可使用 // turbo-all 註解讓 agent 自動執行所有步驟

---

`,
  prefixCursorSkills: `請根據以下工作流程，產生一個 Cursor Skill。

格式要求：
- 建立資料夾結構：.cursor/skills/<skill-name>/SKILL.md
- 使用 YAML frontmatter 包含 name 和 description 欄位
- name 使用 kebab-case 命名（小寫字母、數字、連字號）
- description 要清楚說明此 skill 的用途以及何時應該被觸發
- 內容使用 Markdown 格式撰寫詳細指令

---

`,
  prefixCursorCommands: `請根據以下工作流程，產生一個 Cursor Slash Command。

格式要求：
- 建立檔案：.cursor/commands/<command-name>.md
- 可選使用 YAML frontmatter 包含 description、argument-hint 等欄位
- 檔案名稱即為指令名稱（不含 .md 副檔名）
- 使用 $ARGUMENTS 接收使用者輸入的參數
- 內容使用 Markdown 格式撰寫指令步驟

---

`,

  // Feature cards
  featureHierarchical: '階層式揭露',
  featureHierarchicalDesc: '指令集將工作拆解為微型任務，避免單一 Prompt 過長導致的 Context 腐爛。',
  featureAntiPollution: '防汙染機制',
  featureAntiPollutionDesc: '明確定義 Skill 原子邊界，確保每個階段的狀態不會干擾後續邏輯。',
  featureFeedbackLoop: '反饋回圈優化',
  featureFeedbackLoopDesc: '專門針對 Loop 節點優化執行路徑，確保 AI 能理解「返回上一步」的確切觸發點。',

  // Markdown tab
  systemDesignDoc: '系統設計文檔',
  copyMarkdown: 'Copy Markdown',
  workflow: '工作流',
  nodeList: '節點清單',
  flowTopology: '流程拓撲結構',
  functionDescLabel: '功能描述',
  inputEndpoints: '輸入端點',
  outputEndpoints: '輸出端點',
  none: '無',

  // Mermaid tab
  mermaidDslDef: 'MERMAID DSL DEFINITION',
  cannotGenerateChart: '無法生成圖表，請檢查 DSL 定義',

  // Footer
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  nodes: 'NODES',
  edges: 'EDGES',

  // Alerts
  alertGenerateFailed: '生成工作流失敗，請檢查控制台。',
  alertInstructionsFailed: '生成指令集失敗。',
  alertInvalidJson: '無效的工作流 JSON 檔案結構。',
  alertImportFailed: '導入失敗，請確保選擇的是正確的 JSON 檔案。',
  alertApiKeyMissing: '請設定 GEMINI_API_KEY 環境變數',
  alertInsufficientBalance: (required: number, balance: number) => `餘額不足。需要 NT$${Math.floor(required)}，目前餘額 NT$${Math.floor(balance)}`,
  alertNotAuthenticated: '請先登入以繼續',

  // Validation
  nodeIdDuplicate: '此 Node ID 已存在，請使用其他名稱。',

  // AI generated text
  aiGeneratedDescription: '由 AI 生成的工作流',

  // Node type display names
  nodeTypeUserInput: '用戶輸入',
  nodeTypeAgentReasoning: 'AI 邏輯推理',
  nodeTypeCondition: '條件分支判斷',
  nodeTypeAgentQuestion: 'AI 澄清提問',
  nodeTypeUserResponse: '用戶補充回答',
  nodeTypeAgentAction: '執行任務動作',
  nodeTypeScriptExecution: '執行腳本代碼',
  nodeTypeMCPTool: '調用 MCP 工具',
  nodeTypeAgentSkill: '調用 Agent 技能',

  // Node type short names (for toolbar)
  nodeShortUserInput: '輸入',
  nodeShortAgentReasoning: '邏輯推理',
  nodeShortCondition: '條件分支判斷',
  nodeShortAgentQuestion: '釐清提問',
  nodeShortUserResponse: '補充回答',
  nodeShortAgentAction: '執行任務動作',
  nodeShortScriptExecution: '執行腳本代碼',
  nodeShortMCPTool: '調用 MCP 工具',
  nodeShortAgentSkill: '調用 AGENT 技能',

  // Toolbar tooltips
  addNodeTooltip: (nodeName: string) => `新增 ${nodeName}`,

  // Empty canvas
  workspaceReady: 'WORKSPACE READY',
  workspaceHint: '在左側輸入工作流構想，引擎將即時生成畫布',

  // Theme names and descriptions
  themeTechDarkName: '科技深色',
  themeTechDarkDesc: '專業科技風格，銳利邊角',
  themeGlassmorphismName: '玻璃擬態',
  themeGlassmorphismDesc: '毛玻璃效果，柔和漸層',
  themeMinimalName: '極簡白',
  themeMinimalDesc: '清爽簡潔，專注內容',

  // Account Modal
  accountTitle: '帳戶',
  accountCurrentBalance: '目前餘額',
  accountTopup: '儲值',
  accountTopupHint: '選擇金額透過 TapPay 儲值',
  accountTotalSpent: '總消費',
  accountTransactions: '交易次數',
  accountRecentTransactions: '最近交易',
  accountNoTransactions: '尚無交易記錄',
  accountLogout: '登出',
  accountMemberSince: '加入於',
  accountLoginRequired: '請先登入以繼續',
  accountTopupError: '儲值處理失敗，請重試。',

  // Payment Modal
  paymentConfirmTitle: '確認付款',
  paymentInsufficientTitle: '餘額不足',
  paymentCost: '費用',
  paymentCurrentBalance: '目前餘額',
  paymentShortfall: '差額',
  paymentConfirmButton: '確認付款',
  paymentProcessing: '處理中...',
  paymentSelectTopup: '選擇儲值金額',
  paymentShortfallHint: '還差',
  paymentShortfallHintMore: '，請選擇儲值金額',
  paymentSinglePayment: '單次付費',
  paymentDescription: '服務項目',
  paymentWorkflowDesc: '生成 Flow',
  paymentSopDesc: (nodeCount: number) => `生成 SOP (${nodeCount} 節點)`,
  paymentError: '付款處理失敗，請稍後再試',
  alertPaymentFailed: '付款失敗，請重試',

  // TapPay Card Form
  accountSecurePayment: '安全加密付款 by TapPay',
  accountProcessing: '處理中...',
  accountCardError: '請檢查信用卡資訊',
  accountEnterCard: '請輸入信用卡資訊',
  accountCardNumber: '卡號',
  accountCardExpiry: '到期日',

  // History Tab
  historyTitle: '歷程瀏覽',
  historyEmpty: '尚無歷程記錄',
  historyEmptyHint: '開始建立您的第一個 workflow 吧！',
  historyGeneratedPrompt: 'Generated Prompt',
  historyNoPrompt: '(無 prompt 記錄)',
  historyNodeCount: '節點數',
  historyCost: '花費',
  historyDownload: '下載 JSON',
  historyDelete: '刪除',
  historyDeleteConfirm: '確定要刪除此歷程記錄嗎？',
};

export type LocaleStrings = typeof zhTW;
