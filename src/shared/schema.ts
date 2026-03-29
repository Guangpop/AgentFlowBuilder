export const WORKFLOW_SCHEMA = {
  type: "object" as const,
  properties: {
    confirmation: {
      type: "string",
      description: "Brief natural language confirmation of understanding the workflow requirements."
    },
    workflow: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              node_id: { type: "string", description: "Unique identifier, use lowercase letters, numbers and underscores only." },
              node_type: {
                type: "string",
                enum: ["UserInput", "AgentReasoning", "Condition", "AgentQuestion", "UserResponse", "AgentAction", "ScriptExecution", "MCPTool", "AgentSkill"],
                description: "Type of the node"
              },
              description: { type: "string" },
              inputs: { type: "array", items: { type: "string" } },
              outputs: { type: "array", items: { type: "string" } },
              next: { type: "array", items: { type: "string" }, description: "List of next node IDs this node points to." },
              config: {
                type: "object",
                properties: {
                  scriptType: { type: "string" },
                  scriptContent: { type: "string" },
                  toolName: { type: "string" },
                  provider: { type: "string" },
                  skill: { type: "string" }
                }
              }
            },
            required: ["node_id", "node_type", "description", "inputs", "outputs", "next"]
          }
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              source: { type: "string" },
              target: { type: "string" },
              label: { type: "string" },
              isLoop: { type: "boolean" }
            }
          }
        }
      },
      required: ["name", "description", "nodes", "edges"]
    }
  },
  required: ["confirmation", "workflow"]
};
