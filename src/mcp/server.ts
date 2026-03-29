import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { NODE_TYPE_INFO } from '../shared/constants.js';
import { WORKFLOW_SCHEMA } from '../shared/schema.js';
import { validateWorkflow } from '../shared/validation.js';
import { postProcessWorkflow } from '../shared/postProcess.js';
import { generateMermaid, generateMarkdown, cleanWorkflowForExport } from '../shared/export.js';
import { getPrompts, Language } from '../shared/prompts/index.js';
import { FileManager } from './fileManager.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'agentflow-mcp',
    version: '1.0.0',
  });

  // Tool 1: get_node_types
  server.tool(
    'get_node_types',
    'Returns all available node types with their labels, descriptions, colors, and required config fields.',
    {},
    async () => {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(NODE_TYPE_INFO, null, 2),
          },
        ],
      };
    }
  );

  // Tool 2: get_generation_guide
  server.tool(
    'get_generation_guide',
    'Returns the system prompt, JSON schema, and node type descriptions needed to generate a workflow. Use this to understand how to produce valid workflow JSON.',
    {
      language: z.enum(['en', 'zh-TW']).optional().describe('Language for prompts. Defaults to "en".'),
    },
    async ({ language }) => {
      const lang: Language = language || 'en';
      const prompts = getPrompts(lang);

      const nodeTypeDescriptions = Object.values(NODE_TYPE_INFO).map(info => ({
        type: info.type,
        label: info.label,
        description: info.description,
        requiredConfig: info.requiredConfig || [],
      }));

      const result = {
        systemPrompt: prompts.workflowSystemPrompt,
        schema: WORKFLOW_SCHEMA,
        nodeTypeDescriptions,
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // Tool 3: validate_workflow
  server.tool(
    'validate_workflow',
    'Validates a workflow object, checking for structural errors (missing fields, invalid node types, broken references) and warnings.',
    {
      workflow: z.record(z.any()).describe('The workflow object to validate.'),
    },
    async ({ workflow }) => {
      try {
        const result = validateWorkflow(workflow);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ valid: false, errors: [err.message], warnings: [] }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 4: post_process_workflow
  server.tool(
    'post_process_workflow',
    'Post-processes a raw workflow response: cleans/slugifies node IDs, fixes next references, auto-layouts nodes, and rebuilds edges from the next arrays.',
    {
      workflowResponse: z.record(z.any()).describe('The raw workflow response object containing "confirmation" and "workflow" fields.'),
      language: z.enum(['en', 'zh-TW']).optional().describe('Language for condition labels. Defaults to "en".'),
    },
    async ({ workflowResponse, language }) => {
      try {
        const lang: Language = language || 'en';
        // Deep clone to avoid mutating input
        const cloned = JSON.parse(JSON.stringify(workflowResponse));
        const result = postProcessWorkflow(cloned, lang);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: err.message }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 5: save_workflow
  server.tool(
    'save_workflow',
    'Saves a workflow to a JSON file. The name is used as the filename (sanitized). Returns the file path.',
    {
      name: z.string().describe('Name for the workflow file (will be sanitized for filesystem safety).'),
      workflow: z.record(z.any()).describe('The workflow object to save.'),
      directory: z.string().optional().describe('Directory to save workflows in. Defaults to ./workflows/'),
    },
    async ({ name, workflow, directory }) => {
      try {
        const fm = new FileManager(directory);
        const filePath = fm.save(name, workflow as any);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, path: filePath, name }),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: false, error: err.message }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 6: load_workflow
  server.tool(
    'load_workflow',
    'Loads a workflow from a JSON file by name. Returns the workflow object and file path.',
    {
      name: z.string().describe('Name of the workflow file to load (without .json extension).'),
      directory: z.string().optional().describe('Directory to load from. Defaults to ./workflows/'),
    },
    async ({ name, directory }) => {
      try {
        const fm = new FileManager(directory);
        const { workflow, path } = fm.load(name);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ workflow, path }),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: err.message }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 7: list_workflows
  server.tool(
    'list_workflows',
    'Lists all workflow JSON files in the workflow directory with metadata (name, path, modified date, node count, description).',
    {
      directory: z.string().optional().describe('Directory to list workflows from. Defaults to ./workflows/'),
    },
    async ({ directory }) => {
      try {
        const fm = new FileManager(directory);
        const workflows = fm.list();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ workflows, directory: fm.getDir() }),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: err.message }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 8: export_workflow
  server.tool(
    'export_workflow',
    'Exports a saved workflow in the specified format: "json" (clean, without positions), "markdown" (documentation), or "mermaid" (diagram).',
    {
      name: z.string().describe('Name of the workflow to export.'),
      format: z.enum(['json', 'markdown', 'mermaid']).describe('Export format.'),
      directory: z.string().optional().describe('Directory to load from. Defaults to ./workflows/'),
    },
    async ({ name, format, directory }) => {
      try {
        const fm = new FileManager(directory);
        const { workflow } = fm.load(name);

        let output: string;

        switch (format) {
          case 'json':
            output = JSON.stringify(cleanWorkflowForExport(workflow), null, 2);
            break;
          case 'mermaid':
            output = generateMermaid(workflow);
            break;
          case 'markdown': {
            const labels = {
              workflow: 'Workflow',
              nodeList: 'Node List',
              functionDescLabel: 'Description',
              inputEndpoints: 'Inputs',
              outputEndpoints: 'Outputs',
              none: 'None',
              flowTopology: 'Flow Topology',
            };
            output = generateMarkdown(workflow, labels);
            break;
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: output,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: err.message }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 9: get_instruction_template
  server.tool(
    'get_instruction_template',
    'Returns the agent instructions prompt template with the specified workflow JSON embedded. This prompt can be sent to an LLM to generate hierarchical agent execution instructions.',
    {
      name: z.string().describe('Name of the workflow to generate instructions for.'),
      language: z.enum(['en', 'zh-TW']).optional().describe('Language for the instructions prompt. Defaults to "en".'),
      directory: z.string().optional().describe('Directory to load from. Defaults to ./workflows/'),
    },
    async ({ name, language, directory }) => {
      try {
        const fm = new FileManager(directory);
        const { workflow } = fm.load(name);
        const lang: Language = language || 'en';
        const prompts = getPrompts(lang);

        const workflowJson = JSON.stringify(cleanWorkflowForExport(workflow), null, 2);
        const instructionPrompt = prompts.agentInstructionsPrompt(workflowJson);

        return {
          content: [
            {
              type: 'text' as const,
              text: instructionPrompt,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: err.message }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AgentFlow MCP Server running on stdio');
}
