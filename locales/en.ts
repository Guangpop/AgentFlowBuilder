// English UI translations
import { LocaleStrings } from './zh-TW';

export const en: LocaleStrings = {
  // App - Header
  workflowNamePlaceholder: 'Workflow Name',
  descriptionPlaceholder: 'Click to add description...',
  defaultWorkflowName: 'Untitled Workflow',
  defaultWorkflowDescription: 'Click here to edit workflow description...',

  // Navigation tabs
  tabCanvas: 'Canvas',
  tabInstructions: 'Instructions',
  tabMermaid: 'Mermaid',
  tabMarkdown: 'MD',
  tabJson: 'JSON',
  tabHistory: 'History',

  // Buttons
  settings: 'Settings',
  import: 'Import',
  export: 'Export',

  // ChatSidebar
  sidebarTitle: 'AI Workflow Engine',
  sidebarSubtitle: 'Workflow Builder',
  promptInstruction: 'Enter your AI Agent workflow requirements.',
  promptPlaceholder: 'Describe your workflow requirements...',
  generatingMessage: 'Planning node logic...',
  poweredBy: 'Powered by Gemini 3 Flash',

  // Quick tags
  tagCustomerSupport: 'Customer Support',
  tagNewsSummary: 'News Summary',
  tagCodeReview: 'Code Review',
  tagSalesAssistant: 'Sales Assistant',
  tagTemplate: (tag: string) => `Create a ${tag} workflow with feedback loop`,

  // Settings Panel
  settingsTitle: 'Settings',
  themeLabel: 'Theme',
  languageLabel: 'Language',
  aiProviderLabel: 'AI Provider',
  moreSettings: 'More Settings (Coming Soon)',
  canvasGrid: 'Canvas Grid',
  shortcutHints: 'Shortcut Hints',
  show: 'Show',
  enabled: 'Enabled',
  resetToDefault: 'Reset to Default',
  resetConfirm: 'Are you sure you want to reset all settings to default?',
  comingSoon: 'Coming Soon',

  // Node Properties
  propertiesPanel: 'Properties',
  functionDescription: 'Description',
  descriptionHint: 'Describe the component\'s responsibility...',
  inputPorts: 'Input Ports',
  outputPorts: 'Output Ports',
  noInputPorts: 'No input ports',
  noOutputPorts: 'No output ports',
  add: 'Add',
  removeNode: 'Remove Node',
  nodeIdPlaceholder: 'Node ID',
  newInput: 'New Input',
  newOutput: 'New Output',

  // Node default values
  defaultDescription: 'Edit this node\'s description here...',
  inputData: 'Input Data',
  outputData: 'Output Data',
  trueOutput: 'True',
  falseOutput: 'False',
  variableContext: 'Variable Context',
  executionResult: 'Execution Result (Stdout)',
  toolParams: 'Tool Parameters',
  toolReturn: 'Tool Return',
  skillDependency: 'Skill Dependencies',
  skillOutput: 'Skill Output',

  // Script Execution
  scriptSettings: 'Script Settings',
  scriptTypePython: 'Python (.py)',
  scriptTypeShell: 'Shell (.sh)',
  scriptTypeJs: 'Node.js (.js)',
  scriptPlaceholder: '# Enter script code...',
  scriptHint: 'Agent will compile this into an executable.',

  // MCP Tool
  mcpTool: 'MCP Tool',
  toolNamePlaceholder: 'google_search, file_system...',
  mcpHint: 'Agent will automatically infer call parameters.',

  // Agent Skill
  agentSkill: 'Agent Skill',
  providerPlaceholder: 'superpower',
  skillPlaceholder: 'brain_storm',
  preview: 'PREVIEW',
  skillHint: 'Ensure Provider and Skill names are correct.',

  // Instructions Tab
  instructionsTitle: 'Agent SOP Generator',
  instructionsDescription: 'Based on the "Hierarchical Disclosure" principle, deeply analyzes your workflow and transforms it into an execution manual that prevents AI attention drift.',
  generateInstructions: 'Generate Agent SOP',
  regenerateInstructions: 'Regenerate Instructions',
  generatingInstructions: 'Building Agent SOP...',
  generatingSubtext: 'Deeply analyzing workflow topology and processing state machine logic',
  readyToEncode: 'Ready to encode your workflow into agent intelligence',
  usageSuggestion: 'Usage Suggestion',
  generatedPrompt: 'GENERATED MASTER SYSTEM PROMPT',
  copyPrompt: 'Copy Prompt',
  copied: 'Copied',

  // IDE & Output Type Selectors
  ideLabel: 'IDE',
  outputTypeLabel: 'Type',
  ideClaudeCode: 'Claude Code',
  ideAntigravity: 'Antigravity',
  ideCursor: 'Cursor',
  outputTypeSkills: 'Skills',
  outputTypeCommands: 'Commands',
  outputTypeWorkflows: 'Workflows',
  fileLocationLabel: 'File Location',
  copyFullPrompt: 'Copy Full Prompt (incl. SOP below)',
  copiedFull: 'Full Prompt Copied',

  // Prefix Templates
  prefixClaudeSkills: `Based on the following workflow, generate a Claude Code Skill.

Format Requirements:
- Create folder structure: .claude/skills/<skill-name>/SKILL.md
- Use YAML frontmatter with name and description fields
- Use kebab-case naming (lowercase letters, numbers, hyphens)
- Description should clearly explain the skill's purpose and when it should be triggered
- Write detailed instructions in Markdown format

---

`,
  prefixClaudeCommands: `Based on the following workflow, generate a Claude Code Slash Command.

Format Requirements:
- Create file: .claude/commands/<command-name>.md
- Optionally use YAML frontmatter with description, argument-hint, allowed-tools fields
- Filename becomes the command name (without .md extension)
- Use $ARGUMENTS to receive user input parameters
- Write command steps in Markdown format

---

`,
  prefixAntigravitySkills: `Based on the following workflow, generate an Antigravity Skill.

Format Requirements:
- Create folder structure: .agent/skills/<skill-name>/SKILL.md
- Use YAML frontmatter with name and description fields
- Use kebab-case naming (lowercase letters, numbers, hyphens)
- Description should clearly explain the skill's purpose and when it should be triggered
- Write detailed instructions in Markdown format

---

`,
  prefixAntigravityWorkflows: `Based on the following workflow, generate an Antigravity Workflow.

Format Requirements:
- Create file: .agent/workflows/<workflow-name>.md
- Use Markdown bullet-point format for steps
- Start each step with * or -
- Steps should be clear and actionable
- Can use // turbo-all comment to let agent auto-execute all steps

---

`,
  prefixCursorSkills: `Based on the following workflow, generate a Cursor Skill.

Format Requirements:
- Create folder structure: .cursor/skills/<skill-name>/SKILL.md
- Use YAML frontmatter with name and description fields
- Use kebab-case naming (lowercase letters, numbers, hyphens)
- Description should clearly explain the skill's purpose and when it should be triggered
- Write detailed instructions in Markdown format

---

`,
  prefixCursorCommands: `Based on the following workflow, generate a Cursor Slash Command.

Format Requirements:
- Create file: .cursor/commands/<command-name>.md
- Optionally use YAML frontmatter with description, argument-hint fields
- Filename becomes the command name (without .md extension)
- Use $ARGUMENTS to receive user input parameters
- Write command steps in Markdown format

---

`,

  // Feature cards
  featureHierarchical: 'Hierarchical Disclosure',
  featureHierarchicalDesc: 'Instructions break down work into micro-tasks, preventing context decay from overly long prompts.',
  featureAntiPollution: 'Anti-Pollution Mechanism',
  featureAntiPollutionDesc: 'Clearly defines Skill atomic boundaries, ensuring each stage\'s state doesn\'t interfere with subsequent logic.',
  featureFeedbackLoop: 'Feedback Loop Optimization',
  featureFeedbackLoopDesc: 'Specifically optimizes execution paths for Loop nodes, ensuring AI understands the exact trigger points for "return to previous step".',

  // Markdown tab
  systemDesignDoc: 'System Design Document',
  copyMarkdown: 'Copy Markdown',
  workflow: 'Workflow',
  nodeList: 'Node List',
  flowTopology: 'Flow Topology',
  functionDescLabel: 'Function Description',
  inputEndpoints: 'Input Endpoints',
  outputEndpoints: 'Output Endpoints',
  none: 'None',

  // Mermaid tab
  mermaidDslDef: 'MERMAID DSL DEFINITION',
  cannotGenerateChart: 'Unable to generate chart, please check DSL definition',

  // Footer
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  nodes: 'NODES',
  edges: 'EDGES',

  // Alerts
  alertGenerateFailed: 'Failed to generate workflow, please check the console.',
  alertInstructionsFailed: 'Failed to generate instructions.',
  alertInvalidJson: 'Invalid workflow JSON file structure.',
  alertImportFailed: 'Import failed, please ensure you selected a valid JSON file.',
  alertApiKeyMissing: 'Please set the GEMINI_API_KEY environment variable',

  // Validation
  nodeIdDuplicate: 'This Node ID already exists, please use a different name.',

  // AI generated text
  aiGeneratedDescription: 'AI-generated workflow',

  // Node type display names
  nodeTypeUserInput: 'User Input',
  nodeTypeAgentReasoning: 'AI Reasoning',
  nodeTypeCondition: 'Condition Branch',
  nodeTypeAgentQuestion: 'AI Question',
  nodeTypeUserResponse: 'User Response',
  nodeTypeAgentAction: 'Agent Action',
  nodeTypeScriptExecution: 'Script Execution',
  nodeTypeMCPTool: 'MCP Tool',
  nodeTypeAgentSkill: 'Agent Skill',

  // Node type short names (for toolbar)
  nodeShortUserInput: 'Input',
  nodeShortAgentReasoning: 'Reasoning',
  nodeShortCondition: 'Condition',
  nodeShortAgentQuestion: 'Question',
  nodeShortUserResponse: 'Response',
  nodeShortAgentAction: 'Action',
  nodeShortScriptExecution: 'Script',
  nodeShortMCPTool: 'MCP Tool',
  nodeShortAgentSkill: 'Agent Skill',

  // Toolbar tooltips
  addNodeTooltip: (nodeName: string) => `Add ${nodeName}`,

  // Empty canvas
  workspaceReady: 'WORKSPACE READY',
  workspaceHint: 'Enter your workflow idea on the left, the engine will generate the canvas in real-time',

  // Theme names and descriptions
  themeTechDarkName: 'Tech Dark',
  themeTechDarkDesc: 'Professional tech style with sharp edges',
  themeGlassmorphismName: 'Glassmorphism',
  themeGlassmorphismDesc: 'Frosted glass effect with soft gradients',
  themeMinimalName: 'Minimal Light',
  themeMinimalDesc: 'Clean and simple, content-focused',

  // Account Modal
  accountTitle: 'Account',
  accountCurrentBalance: 'Current Balance',
  accountTopup: 'Top Up',
  accountTopupHint: 'Select an amount to top up via Paddle',
  accountTotalSpent: 'Total Spent',
  accountTransactions: 'Transactions',
  accountRecentTransactions: 'Recent Transactions',
  accountNoTransactions: 'No transactions yet',
  accountLogout: 'Log Out',
  accountMemberSince: 'Member since',
  accountLoginRequired: 'Please log in to continue',
  accountTopupError: 'Failed to process topup. Please try again.',

  // Payment Modal
  paymentConfirmTitle: 'Confirm Payment',
  paymentInsufficientTitle: 'Insufficient Balance',
  paymentCost: 'Cost',
  paymentCurrentBalance: 'Current Balance',
  paymentShortfall: 'Shortfall',
  paymentConfirmButton: 'Confirm Payment',
  paymentProcessing: 'Processing...',
  paymentSelectTopup: 'Select Topup Amount',
  paymentShortfallHint: 'You need',
  paymentShortfallHintMore: 'more to proceed',
  paymentSinglePayment: 'Single Payment',

  // History Tab
  historyTitle: 'History',
  historyEmpty: 'No history yet',
  historyEmptyHint: 'Create your first workflow to get started!',
  historyGeneratedPrompt: 'Generated Prompt',
  historyNoPrompt: '(No prompt recorded)',
  historyNodeCount: 'Nodes',
  historyCost: 'Cost',
  historyDownload: 'Download JSON',
  historyDelete: 'Delete',
  historyDeleteConfirm: 'Delete this history record?',
};
