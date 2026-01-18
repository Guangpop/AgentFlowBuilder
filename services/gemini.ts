import { GoogleGenAI, Type } from "@google/genai";
import { Workflow, WorkflowResponse, NodeType } from "../types";
import { Language } from "../locales";
import { getPrompts } from "../prompts";

// 延遲初始化 - 只在需要時才建立實例
let ai: GoogleGenAI | null = null;

const getAI = (language: Language): GoogleGenAI => {
  if (!ai) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const p = getPrompts(language);
      throw new Error(p.schema.confirmation); // Will be overridden by caller
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

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
              node_id: { type: Type.STRING, description: "唯一標識符，建議使用小寫字母、數字及底線，不得包含空格。" },
              node_type: { 
                type: Type.STRING, 
                description: "必須是以下之一: UserInput, AgentReasoning, Condition, AgentQuestion, UserResponse, AgentAction, ScriptExecution, MCPTool, AgentSkill" 
              },
              description: { type: Type.STRING },
              inputs: { type: Type.ARRAY, items: { type: Type.STRING } },
              outputs: { type: Type.ARRAY, items: { type: Type.STRING } },
              next: { type: Type.ARRAY, items: { type: Type.STRING }, description: "此節點指向的下一個節點 ID 列表。" },
              config: {
                 type: Type.OBJECT,
                 properties: {
                    scriptType: { type: Type.STRING },
                    scriptContent: { type: Type.STRING },
                    toolName: { type: Type.STRING },
                    provider: { type: Type.STRING, description: "Agent Skill 的提供者，例如 'superpower'" },
                    skill: { type: Type.STRING, description: "具體的技能名稱，例如 'brain_storm'" }
                 }
              }
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

/**
 * 輔助函數：將字串轉為安全的 ID 格式
 */
const slugifyId = (id: string) => id.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

export const generateWorkflow = async (prompt: string, language: Language = 'zh-TW'): Promise<WorkflowResponse> => {
  const p = getPrompts(language);

  try {
    const response = await getAI(language).models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${p.workflowSystemPrompt}

${p.workflowUserPrompt(prompt)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: WORKFLOW_SCHEMA,
      },
    });

    const data = JSON.parse(response.text || '{}') as WorkflowResponse;
    
    // 強力後處理 (Robust Post-processing)
    if (data.workflow && data.workflow.nodes) {
      // 1. 清洗所有節點 ID 並建立對照表，防止 AI 產生的 ID 格式不一
      const idMap = new Map<string, string>();
      data.workflow.nodes.forEach(node => {
        const cleanId = slugifyId(node.node_id);
        idMap.set(node.node_id, cleanId);
        node.node_id = cleanId;
      });

      // 2. 更新 next 引用
      data.workflow.nodes.forEach(node => {
        if (node.next) {
          node.next = node.next
            .map(n => idMap.get(n) || slugifyId(n))
            .filter(n => data.workflow.nodes.some(existing => existing.node_id === n));
        }
      });

      // 3. 自動佈局 (網格佈局優化)
      data.workflow.nodes = data.workflow.nodes.map((node, index) => ({
        ...node,
        position: {
          x: 100 + (index % 3) * 450,
          y: 100 + Math.floor(index / 3) * 350
        }
      }));

      // 4. 重建 Edges 陣列以確保畫布連線
      // 我們以 nodes.next 為真理來源 (Source of Truth)，確保視覺與邏輯同步
      const finalEdges: any[] = [];
      const nodeIds = new Set(data.workflow.nodes.map(n => n.node_id));

      data.workflow.nodes.forEach(node => {
        if (node.next && Array.isArray(node.next)) {
          node.next.forEach((targetId, index) => {
            if (nodeIds.has(targetId)) {
              const isCondition = node.node_type === NodeType.Condition;
              let label = '';
              if (isCondition) {
                // 依照 App.tsx 中 Condition 節點的預設輸出順序
                label = index === 0 ? p.conditionTrueLabel : p.conditionFalseLabel;
              }

              finalEdges.push({
                id: `edge-${node.node_id}-${targetId}-${index}`,
                source: node.node_id,
                target: targetId,
                sourcePortIndex: index,
                targetPortIndex: 0,
                label: label,
                isLoop: false
              });
            }
          });
        }
      });
      
      // 更新最終的工作流連線
      data.workflow.edges = finalEdges;
    }

    return data;
  } catch (error) {
    console.error(p.errorGenerateWorkflow, error);
    throw error;
  }
};

/**
 * 使用 Gemini 3 Pro 產生基於「階層式揭露」原則的 Agent Skill 指令集
 */
export const generateAgentInstructions = async (workflow: Workflow, language: Language = 'zh-TW'): Promise<string> => {
  const p = getPrompts(language);

  try {
    const response = await getAI(language).models.generateContent({
      model: "gemini-3-pro-preview",
      contents: p.agentInstructionsPrompt(JSON.stringify(workflow, null, 2)),
      config: {
        temperature: 1,
        thinkingConfig: { thinkingBudget: 32768 } // 使用 Pro 模型的思維鏈
      },
    });

    return response.text || p.noInstructions;
  } catch (error) {
    console.error(p.errorGenerateInstructions, error);
    throw error;
  }
};