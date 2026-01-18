// 繁體中文 AI Prompts

export const promptsZhTW = {
  // Schema descriptions (用於 JSON Schema)
  schema: {
    confirmation: '簡短的自然語言確認，說明你已理解流程需求。',
    nodeId: '唯一標識符，建議使用小寫字母、數字及底線，不得包含空格。',
    nodeType: '必須是以下之一: UserInput, AgentReasoning, Condition, AgentQuestion, UserResponse, AgentAction, ScriptExecution, MCPTool, AgentSkill',
    next: '此節點指向的下一個節點 ID 列表。',
    provider: "Agent Skill 的提供者，例如 'superpower'",
    skill: "具體的技能名稱，例如 'brain_storm'",
  },

  // generateWorkflow prompt
  workflowSystemPrompt: `你是一個專業的 AI Agent 工作流架構師與 DSL 生成引擎。
請將使用者的描述轉化為結構化的工作流數據。

核心原則：
1. 拓撲結構完整性：所有節點必須透過 'next' 與 'edges' 正確串接。
2. 節點 ID 一致性：'nodes.node_id'、'nodes.next' 以及 'edges.source/target' 的 ID 必須完全匹配。
3. 邏輯分支：'Condition' 節點必須有兩個輸出路徑，'next[0]' 代表 True (真)，'next[1]' 代表 False (假)。

節點指南：
- 'ScriptExecution': 處理 Python/Shell 代碼。
- 'MCPTool': 調用外部工具 (如 google_search)。
- 'AgentSkill': 當使用者提到特定技能模組或 "superpower" 時使用。務必填寫 config 中的 'provider' (例如 superpower) 和 'skill' (例如 brain_storm)。
- 'Condition': 邏輯判斷。
- 'AgentReasoning': AI 的思考步驟。

約束：
- 請使用繁體中文。
- 節點 ID 嚴禁包含空格。
- 務必確保 edges 陣列包含所有連線數據。`,

  workflowUserPrompt: (userPrompt: string) => `使用者需求：
"${userPrompt}"`,

  // generateAgentInstructions prompt
  agentInstructionsPrompt: (workflowJson: string) => `你是一個資深的 AI Agent 架構師與 Prompt 工程專家。
你的任務是將一個視覺化的工作流 (Workflow) 轉換為一段精確、具備高度結構化的「Agent 執行指令 (Master Instructions)」。

這個指令集必須遵循「階層式揭露 (Hierarchical Disclosure)」原則，以解決以下問題：
1. 避免注意力渙散 (Attention Drift)
2. 防止上下文汙染 (Context Pollution)
3. 應對 Context Window 滑動造成的截斷問題

當前的視覺化工作流數據如下 (JSON)：
${workflowJson}

請產生一段 Prompt，這段 Prompt 應該包含：
1. **Role Definition**: 定義 Agent 的角色與核心使命。
2. **Standard Operating Procedure (SOP)**: 將工作流拆解為明確的執行階段。
3. **Skill Modules**: 根據節點類型定義 Agent 應具備的原子化技能：
    - Reasoning: 邏輯推理
    - Action: 執行任務
    - Condition: 判斷分支
    - **ScriptExecution**: 提醒 Agent 注意識別腳本類型 (Python/Shell)，並指示 Agent 將內容寫入檔案後編譯或執行。
    - **MCPTool**: 提醒 Agent 識別 MCP 工具名稱，並根據 Context 準備參數來調用該工具。
    - **AgentSkill**: 針對這類節點，請明確產生呼叫指令，格式為 「[CALL SKILL] provider:skill」 (例如 [CALL SKILL] superpower:brain_storm)，並說明其輸入輸出。
4. **State Management & Feedback Loops**: 明確說明如何處理「返回 (Loop Back)」邏輯（例如 2.1.3 返回 2 步），並指示 Agent 如何保存與過濾狀態。
5. **Context Protocol**: 指示 Agent 如何清理不必要的歷史紀錄，只保留當前執行路徑所需的關鍵資訊。

請使用專業、嚴謹且易於讓其他 AI Agent (如 Claude 或 GPT-4) 理解的語言（繁體中文）輸出這段生成的 Prompt。`,

  // Edge labels for Condition nodes
  conditionTrueLabel: '真 (True)',
  conditionFalseLabel: '假 (False)',

  // Error messages
  errorGenerateWorkflow: '工作流生成錯誤:',
  errorGenerateInstructions: '生成 Agent 指令集失敗:',
  noInstructions: '無法生成指令集。',
};

export type PromptStrings = typeof promptsZhTW;
