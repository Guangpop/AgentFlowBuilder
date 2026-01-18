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
  moreSettings: 'More Settings (Coming Soon)',
  canvasGrid: 'Canvas Grid',
  shortcutHints: 'Shortcut Hints',
  show: 'Show',
  enabled: 'Enabled',
  resetToDefault: 'Reset to Default',
  resetConfirm: 'Are you sure you want to reset all settings to default?',

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
  instructionsTitle: 'Agent Skill SOP Generator',
  instructionsDescription: 'Based on the "Hierarchical Disclosure" principle, Gemini 3 Pro deeply analyzes your workflow and transforms it into an execution manual that prevents AI attention drift.',
  generateInstructions: 'Generate Agent SOP',
  regenerateInstructions: 'Regenerate Instructions',
  generatingInstructions: 'Building Skill SOP...',
  generatingSubtext: 'Gemini 3 Pro is deeply analyzing workflow topology and processing state machine logic',
  readyToEncode: 'Ready to encode your workflow into agent intelligence',
  usageSuggestion: 'Usage Suggestion',
  usageDescription: 'Paste the following content to your AI agent to generate workflow and Agent Skills:',
  usageTemplate: 'Please generate workflow instructions and related Agent skills based on the following workflow',
  usagePlaceholder: '[ Copy the generated instructions below and paste here ]',
  generatedPrompt: 'GENERATED MASTER SYSTEM PROMPT',
  copyPrompt: 'Copy Prompt',
  copied: 'Copied',

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
};
