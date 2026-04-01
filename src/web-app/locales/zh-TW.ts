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
  poweredBy: '由 AI 驅動',

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
  copyPrompt: '複製 SOP Prompt',
  copied: '已複製',
  copyPromptHint: '將 Prompt 貼入 Claude Code、Cursor 或 Codex，即可產生對應的 Skill / Command 檔案',
  promptCopiedTitle: 'Prompt 已複製到剪貼簿',
  promptCopiedHint: '貼入 AI 工具後，它會自動產生檔案',

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
  alertApiKeyMissing: '請設定必要的 API Key 環境變數',

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
  workspaceReady: '開始建立你的 Workflow',
  workspaceHint: '從上方工具列拖入節點，或從左側匯入 JSON 檔案',
  emptyStepAddNode: '加入節點',
  emptyStepConnect: '連接流程',
  emptyStepGenerate: '產生指令集',

  // Sidebar empty state
  noWorkflows: '還沒有 Workflow',
  noWorkflowsHint: '使用上方 New 建立新流程，或 Import JSON 匯入',

  // Tab bar
  exportTabs: '匯出',

  // Node categories (toolbar)
  categoryUser: '使用者互動',
  categoryAgent: 'AI 代理',
  categorySystem: '系統工具',

  // Empty state + onboarding
  welcomeTitle: '歡迎使用 AgentFlow Builder',
  welcomeSubtitle: '輕鬆設計 AI Agent 工作流程',
  welcomeStep1: '加入節點',
  welcomeStep1Desc: '從工具列拖入各種節點元件',
  welcomeStep2: '連接流程',
  welcomeStep2Desc: '將節點的輸出連接到下一個輸入',
  welcomeStep3: '產生指令集',
  welcomeStep3Desc: '一鍵轉換為 AI 可執行的 Skill',
  quickStart: '快速開始',
  goToCanvas: '前往畫布',
  editDescription: '點擊編輯描述...',
  getStarted: '開始使用',
  loadExample: '載入範例',
  skip: '跳過',

  // Toast
  savedToast: '工作流已儲存',
  copiedToast: '已複製到剪貼簿',
  nodeAddedToast: '已加入節點',
  deletedToast: '已刪除',
  connectedToast: '已建立連接',

  // Instructions wizard steps
  stepPlatform: '選擇平台',
  stepType: '選擇類型',
  stepGenerate: '產生指令',
  noWorkflowForInstructions: '先建立工作流程，再產生指令集',

  // Properties panel
  dangerZone: '危險操作',
  descriptionSection: '功能描述',
  settingsSection: '設定',
  portsSection: '端口',

  // Node descriptions for tooltips
  nodeDescUserInput: '接收使用者的初始輸入',
  nodeDescAgentReasoning: 'AI 分析推理與決策',
  nodeDescCondition: '根據條件走不同路徑',
  nodeDescAgentQuestion: 'AI 向使用者提問釐清',
  nodeDescUserResponse: '使用者回覆補充資訊',
  nodeDescAgentAction: 'AI 執行具體任務動作',
  nodeDescScriptExecution: '執行自訂腳本程式碼',
  nodeDescMCPTool: '調用外部 MCP 工具服務',
  nodeDescAgentSkill: '調用已定義的 Agent 技能',

  // Theme names and descriptions
  themeWarmName: '溫暖柔和',
  themeWarmDesc: '溫暖舒適，友善直覺',
  themeTechDarkName: '科技深色',
  themeTechDarkDesc: '專業科技風格，銳利邊角',
  themeGlassmorphismName: '玻璃擬態',
  themeGlassmorphismDesc: '毛玻璃效果，柔和漸層',
  themeMinimalName: '極簡白',
  themeMinimalDesc: '清爽簡潔，專注內容',

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
