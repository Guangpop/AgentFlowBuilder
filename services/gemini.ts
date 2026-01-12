import { GoogleGenAI, Type } from "@google/genai";
import { WorkflowResponse, NodeType } from "../types";

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