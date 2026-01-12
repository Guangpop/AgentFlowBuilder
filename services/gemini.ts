import { GoogleGenAI, Type } from "@google/genai";
import { Workflow, WorkflowResponse, NodeType } from "../types";

// 使用命名參數初始化，並直接使用 process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const WORKFLOW_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    confirmation: {
      type: Type.STRING,
      description: "簡短的自然語言確認，說明你已理解流程需求。",
    },
    workflow: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        nodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              node_id: { type: Type.STRING },
              node_type: { 
                type: Type.STRING, 
                description: "必須是以下之一: UserInput, AgentReasoning, Condition, AgentQuestion, UserResponse, AgentAction" 
              },
              description: { type: Type.STRING },
              inputs: { type: Type.ARRAY, items: { type: Type.STRING } },
              outputs: { type: Type.ARRAY, items: { type: Type.STRING } },
              next: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["node_id", "node_type", "description", "inputs", "outputs", "next"]
          }
        },
        edges: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              source: { type: Type.STRING },
              target: { type: Type.STRING },
              label: { type: Type.STRING },
              isLoop: { type: Type.BOOLEAN }
            }
          }
        }
      },
      required: ["name", "description", "nodes", "edges"]
    }
  },
  required: ["confirmation", "workflow"]
};

export const generateWorkflow = async (prompt: string): Promise<WorkflowResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `你是一個 AI Agent 工作流構建引擎。
      請分析使用者的描述，並將其拆解為結構化的節點式工作流。
      
      要求：
      1. 每個步驟都必須是一個獨立的節點。
      2. 使用 'Condition' 節點處理分支邏輯。
      3. 確保 node_id 唯一且具備描述性。
      4. 所有輸出（包括節點與確認訊息）請使用繁體中文。
      
      使用者工作流描述：
      "${prompt}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: WORKFLOW_SCHEMA,
      },
    });

    const data = JSON.parse(response.text || '{}') as WorkflowResponse;
    
    // 自動佈局
    if (data.workflow && data.workflow.nodes) {
      data.workflow.nodes = data.workflow.nodes.map((node, index) => ({
        ...node,
        position: {
          x: 50 + (index % 3) * 300,
          y: 50 + Math.floor(index / 3) * 200
        }
      }));
    }

    return data;
  } catch (error) {
    console.error("工作流生成錯誤:", error);
    throw error;
  }
};

/**
 * 使用 Gemini 3 Pro 產生基於「階層式揭露」原則的 Agent Skill 指令集
 */
export const generateAgentInstructions = async (workflow: Workflow): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `你是一個資深的 AI Agent 架構師與 Prompt 工程專家。
你的任務是將一個視覺化的工作流 (Workflow) 轉換為一段精確、具備高度結構化的「Agent 執行指令 (Master Instructions)」。

這個指令集必須遵循「階層式揭露 (Hierarchical Disclosure)」原則，以解決以下問題：
1. 避免注意力渙散 (Attention Drift)
2. 防止上下文汙染 (Context Pollution)
3. 應對 Context Window 滑動造成的截斷問題

當前的視覺化工作流數據如下 (JSON)：
${JSON.stringify(workflow, null, 2)}

請產生一段 Prompt，這段 Prompt 應該包含：
1. **Role Definition**: 定義 Agent 的角色與核心使命。
2. **Standard Operating Procedure (SOP)**: 將工作流拆解為明確的執行階段。
3. **Skill Modules**: 根據節點類型 (Reasoning, Action, Condition) 定義 Agent 應具備的原子化技能。
4. **State Management & Feedback Loops**: 明確說明如何處理「返回 (Loop Back)」邏輯（例如 2.1.3 返回 2 步），並指示 Agent 如何保存與過濾狀態。
5. **Context Protocol**: 指示 Agent 如何清理不必要的歷史紀錄，只保留當前執行路徑所需的關鍵資訊。

請使用專業、嚴謹且易於讓其他 AI Agent (如 Claude 或 GPT-4) 理解的語言（繁體中文）輸出這段生成的 Prompt。`,
      config: {
        temperature: 1,
        thinkingConfig: { thinkingBudget: 32768 } // 使用 Pro 模型的思維鏈
      },
    });

    return response.text || "無法生成指令集。";
  } catch (error) {
    console.error("生成 Agent 指令集失敗:", error);
    throw error;
  }
};
