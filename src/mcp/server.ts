import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { NODE_TYPE_INFO } from '../shared/constants.js';
import { WORKFLOW_SCHEMA } from '../shared/schema.js';
import { validateWorkflow } from '../shared/validation.js';
import { postProcessWorkflow } from '../shared/postProcess.js';
import { generateMermaid, generateMarkdown, cleanWorkflowForExport } from '../shared/export.js';
import { serializeWorkflowMd } from '../shared/workflowMd.js';
import { serializeWorkflowJson } from '../shared/workflowJson.js';
import { serializeByFormat } from '../shared/codecRegistry.js';
import { getPrompts, Language } from '../shared/prompts/index.js';
import { FileManager } from './fileManager.js';
import { workflowToSkillMd } from '../shared/skillConverter.js';
import {
  generateGradingPrompt,
  generateImprovementPrompt,
  generateDescriptionOptimizationPrompt,
  generateQualityGateInstructions,
  QUALITY_THRESHOLD,
  MAX_ITERATIONS,
  SkillGrade,
} from '../shared/skillGrading.js';
import { publishSkill } from '../shared/skillPublisher.js';

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
        skillQualityGate: {
          enabled: true,
          threshold: QUALITY_THRESHOLD,
          maxIterations: MAX_ITERATIONS,
          toolSequence: ['convert_to_skill', 'get_skill_quality_gate', 'publish_skill'],
          instructions: generateQualityGateInstructions(),
        },
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
    'Saves a workflow to workflows/{name}.{format}. JSON (default) and Markdown are co-equal formats; MD uses YAML frontmatter + prose. If the workflow already exists in exactly one format, that format is preserved unless you pass `format`.',
    {
      name: z.string().describe('Name for the workflow file (will be sanitized for filesystem safety).'),
      workflow: z.record(z.any()).describe('The workflow object to save.'),
      format: z.enum(['json', 'md']).optional().describe('Save format. Defaults to json, or the existing file format if one exists.'),
      directory: z.string().optional().describe('Directory to save workflows in. Defaults to ./workflows/'),
    },
    async ({ name, workflow, format, directory }) => {
      try {
        const fm = new FileManager(directory);
        const result = fm.save(name, workflow as any, format ? { format } : undefined);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, path: result.path, format: result.format, name }),
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
    'Loads a workflow by name. Resolves the file by format precedence (json default, then md); an explicit extension in the name loads that exact format. Returns the workflow, path, selected format, and available formats.',
    {
      name: z.string().describe('Name of the workflow file to load (without extension).'),
      directory: z.string().optional().describe('Directory to load from. Defaults to ./workflows/'),
    },
    async ({ name, directory }) => {
      try {
        const fm = new FileManager(directory);
        const { workflow, path, format, candidates } = fm.load(name);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ workflow, path, format, formats: candidates.map((c: any) => c.format) }),
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
    'Lists all workflows in the workflow directory. Returns metadata (name, selected path, selectedFormat, available formats, modified date, node count, description). When multiple formats share a basename, selection follows the json-default precedence.',
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
    'Exports a saved workflow in the specified format: "md" (frontmatter+prose — round-trips to canvas), "json" (clean dump, no positions), "markdown" (documentation-style table), or "mermaid" (diagram). JSON and MD are co-equal formats.',
    {
      name: z.string().describe('Name of the workflow to export.'),
      format: z.enum(['md', 'json', 'mjs', 'markdown', 'mermaid']).describe('Export format. "mjs" emits an approximate Claude Code dynamic-workflow script.'),
      directory: z.string().optional().describe('Directory to load from. Defaults to ./workflows/'),
    },
    async ({ name, format, directory }) => {
      try {
        const fm = new FileManager(directory);
        const { workflow } = fm.load(name);

        let output: string;

        switch (format) {
          case 'md':
            output = serializeWorkflowMd(workflow);
            break;
          case 'json':
            output = serializeWorkflowJson(workflow, { shape: 'clean' });
            break;
          case 'mjs':
            output = serializeByFormat(workflow, 'mjs');
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

  // Tool 10: convert_to_skill
  server.tool(
    'convert_to_skill',
    'Converts a workflow into a SKILL.md draft and returns quality gate instructions. The draft must be graded and improved before publishing.',
    {
      name: z.string().describe('Workflow name to convert (loads from workflows/ directory).'),
      workflow: z.record(z.any()).optional().describe('Optional: provide the workflow object directly instead of loading by name.'),
      language: z.enum(['en', 'zh-TW']).optional().describe('Language for the generated skill. Defaults to "en".'),
      directory: z.string().optional().describe('Directory to load workflow from. Defaults to ./workflows/'),
    },
    async ({ name, workflow, language, directory }) => {
      try {
        let wf = workflow;
        if (!wf) {
          const fm = new FileManager(directory);
          const loaded = fm.load(name);
          wf = loaded.workflow;
        }

        const lang = language || 'en';
        const skillMd = workflowToSkillMd(wf as any, lang, name);
        const qualityGateInstructions = generateQualityGateInstructions();

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                skillMd,
                qualityGateInstructions,
                note: 'This is a draft SKILL.md. You MUST now run the quality gate loop: grade → improve → optimize → publish. Do NOT ask the user for confirmation during this process.',
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }],
          isError: true,
        };
      }
    }
  );

  // Tool 11: get_skill_quality_gate
  server.tool(
    'get_skill_quality_gate',
    'Returns a prompt for the AI assistant to execute a quality gate action (grade, improve, or optimize_description) on a SKILL.md.',
    {
      skillMd: z.string().describe('The SKILL.md content to evaluate or improve.'),
      action: z.enum(['grade', 'improve', 'optimize_description']).describe('Quality gate action to perform.'),
      grade: z.record(z.any()).optional().describe('The SkillGrade JSON from a previous grading (required for action="improve").'),
      iteration: z.number().optional().describe('Current iteration number (1-based). Defaults to 1.'),
    },
    async ({ skillMd, action, grade, iteration }) => {
      try {
        const currentIteration = iteration || 1;
        let prompt: string;

        switch (action) {
          case 'grade':
            prompt = generateGradingPrompt(skillMd);
            break;
          case 'improve':
            if (!grade) {
              return {
                content: [{ type: 'text' as const, text: JSON.stringify({ error: 'grade parameter is required for action="improve"' }) }],
                isError: true,
              };
            }
            prompt = generateImprovementPrompt(skillMd, grade as unknown as SkillGrade);
            break;
          case 'optimize_description':
            prompt = generateDescriptionOptimizationPrompt(skillMd);
            break;
        }

        const result: Record<string, any> = {
          prompt,
          maxIterations: MAX_ITERATIONS,
          currentIteration,
          threshold: QUALITY_THRESHOLD,
        };

        if (action === 'grade') {
          result.skillGraderPath = '.claude/skills/skill-grader/';
          result.scoringRubricPath = '.claude/skills/skill-grader/references/scoring-rubric.md';
        }

        if (currentIteration >= MAX_ITERATIONS) {
          result.note = `Maximum iterations (${MAX_ITERATIONS}) reached. You may publish with forcePublish=true even if the score is below ${QUALITY_THRESHOLD}.`;
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: err.message }) }],
          isError: true,
        };
      }
    }
  );

  // Tool 12: publish_skill
  server.tool(
    'publish_skill',
    'Publishes a quality-verified SKILL.md to ~/.claude/skills/{name}/ for cross-project discovery. Requires a passing grade (>= 80) unless forcePublish is true.',
    {
      name: z.string().describe('Skill name (will be slugified for directory name).'),
      skillMd: z.string().describe('The final SKILL.md content to publish.'),
      workflow: z.record(z.any()).describe('The original workflow object (saved as reference).'),
      grade: z.object({
        score: z.number(),
        grade: z.string(),
        pillarScores: z.record(z.number()),
        feedback: z.array(z.string()),
        passing: z.boolean(),
      }).describe('The SkillGrade from the quality gate.'),
      forcePublish: z.boolean().optional().describe('Set to true to publish even if score < 80 (after max iterations).'),
    },
    async ({ name, skillMd, workflow, grade, forcePublish }) => {
      try {
        const result = publishSkill(
          name,
          skillMd,
          workflow as any,
          grade as unknown as SkillGrade,
          forcePublish || false
        );

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          ...(result.success ? {} : { isError: true }),
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ success: false, error: err.message }) }],
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
