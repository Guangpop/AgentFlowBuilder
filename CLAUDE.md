# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgentFlow Builder (`agentflow-mcp`) is an npm MCP Server package for AI Agent workflow generation. It includes a visual node-based workflow editor web UI and an MCP server that exposes 12 tools to AI assistants like Claude — including a skill quality gate that auto-grades, iterates, and publishes production-ready skills. Built with TypeScript, Express, React 19, and Vite.

## Commands

```bash
npm run build          # Build everything (server + web)
npm run build:server   # Build MCP server (TypeScript compilation)
npm run build:web      # Build React web app (Vite)
npm run dev:mcp        # Run MCP server in dev mode
npm run dev:web        # Run web UI in dev mode (with HMR)
npm start              # Run production web server (port 3000)
```

## Architecture

```
src/
├── shared/                  # Types, validation, export, prompts, schema, skill pipeline
│   ├── types.ts             # WorkflowNode, Edge, Workflow, NodeType enum
│   ├── constants.ts         # Node metadata, categories, defaults
│   ├── schema.ts            # JSON schema for workflow generation
│   ├── validation.ts        # Structural validation rules
│   ├── postProcess.ts       # ID cleanup, auto-layout, edge rebuilding
│   ├── export.ts            # JSON / Markdown / Mermaid export
│   ├── prompts/             # i18n prompt templates (en, zh-TW)
│   ├── skillConverter.ts    # Workflow → SKILL.md conversion
│   ├── skillGrading.ts      # Quality gate prompts (grade / improve / optimize)
│   └── skillPublisher.ts    # Publish to ~/.claude/skills/
├── mcp/
│   ├── server.ts            # MCP Server (stdio, 12 tools registered here)
│   └── fileManager.ts       # Workflow file I/O (./workflows/*.json)
├── web/
│   └── server.ts            # Express server + REST APIs + SSE + Vite dev integration
├── web-app/
│   ├── App.tsx              # Main React app
│   ├── index.tsx            # React DOM entry
│   ├── components/
│   │   ├── WorkflowCanvas.tsx    # Main canvas editor (pan, zoom, drag-to-connect)
│   │   ├── NodeProperties.tsx    # Node configuration panel
│   │   ├── InstructionsTab.tsx   # Agent instructions + IDE export + Copy SOP Prompt
│   │   ├── ChatSidebar.tsx       # Chat/assistant sidebar
│   │   ├── SettingsPanel.tsx     # Global settings
│   │   ├── WelcomeModal.tsx      # Initial onboarding modal
│   │   ├── MermaidPreview.tsx    # Mermaid diagram preview
│   │   └── ThemePreviewCard.tsx  # Theme viewer
│   ├── contexts/
│   │   ├── ThemeContext.tsx      # Theme management
│   │   └── ToastContext.tsx      # Toast notifications
│   ├── locales/             # i18n (en, zh-TW)
│   └── styles/themes.ts    # Tailwind theme configuration
└── cli.ts                   # CLI entry (default: MCP server, `serve`: web UI)

.claude/skills/
├── skill-grader/            # 6-pillar 100-point scoring rubric
│   ├── SKILL.md
│   └── references/          # scoring-rubric.md, report-template.md, pda-architecture.md, grading-example.md
└── skill-creator/           # Skill creation patterns + description optimizer
    ├── SKILL.md
    ├── agents/              # grader.md, comparator.md, analyzer.md
    ├── references/          # schemas.md
    └── scripts/             # Description optimization scripts
```

### MCP Server (`src/mcp/server.ts`)
- 12 tools registered in a single file (no separate tool files)
- Communicates via stdio transport with AI assistants
- Tools: `get_node_types`, `get_generation_guide`, `validate_workflow`, `post_process_workflow`, `save_workflow`, `load_workflow`, `list_workflows`, `export_workflow`, `get_instruction_template`, `convert_to_skill`, `get_skill_quality_gate`, `publish_skill`

### Web UI (`src/web-app/`)
- React 19 + TypeScript + Vite single-page application
- 8 components + 2 contexts
- Visual node-based workflow editor with canvas, sidebars, instructions tab
- Served by the Express server in production
- Build config: `vite.config.ts` (root: `src/web-app`, output: `dist/web-app`)

### Web Server (`src/web/server.ts`)
- Express server serving the built web app and REST APIs
- APIs: `/api/list`, `/api/load/:name`, `/api/save`, `/api/delete/:name`, `/api/watch` (SSE)
- Manages workflows as JSON files in a local `workflows/` directory
- Integrates Vite dev server when `--dev` flag is passed

### CLI (`src/cli.ts`)
- `agentflow-mcp` (no args) → starts MCP server on stdio
- `agentflow-mcp serve` → starts web server on port 3000
- `agentflow-mcp serve --dev` → starts web server with Vite HMR

## Key Concepts

### Node Types (9 total)
| Category | Nodes |
|----------|-------|
| **User** | `UserInput`, `UserResponse` |
| **Agent** | `AgentReasoning`, `AgentQuestion`, `AgentAction` |
| **System** | `Condition`, `ScriptExecution`, `MCPTool`, `AgentSkill` |

### Key Patterns
- Edges are rebuilt from each node's `next` array (source of truth)
- Condition nodes require exactly 2 outputs (True/False branches)
- Node IDs are auto-slugified (lowercase, underscores)
- Workflows are stored as JSON files on disk (`./workflows/`)
- SSE (`/api/watch`) keeps web UI and MCP tools in real-time sync

### Export Formats
- **Skills** (.md) — reusable agent capabilities with YAML frontmatter
- **Commands** (.md) — slash commands triggered by user input
- **Workflows** (.md) — step-by-step execution plans
- **JSON** — raw workflow data for backup or sharing
- **Markdown** — system design documentation
- **Mermaid** — visual flow diagrams

### Skill Quality Gate
Workflow → SKILL.md conversion pipeline with automatic quality enforcement:
1. `convert_to_skill` — generates SKILL.md draft from workflow
2. `get_skill_quality_gate` (action: `grade`) — scores against 6-pillar rubric (max 100 pts)
3. If score < 80 → `get_skill_quality_gate` (action: `improve`) → re-grade (up to 3 iterations)
4. `get_skill_quality_gate` (action: `optimize_description`) — optimize trigger phrases
5. `publish_skill` — publishes to `~/.claude/skills/{name}/` (requires score >= 80 unless `forcePublish`)

Pillar weights: Progressive Disclosure (30), Ease of Use (25), Utility (20), Spec Compliance (15), Writing Style (10), Modifiers (-15 to +15)

## Build Configuration

- `tsconfig.json` — compiles `src/shared/`, `src/mcp/`, `src/web/`, `src/cli.ts` to `dist/`
- `vite.config.ts` — builds `src/web-app/` to `dist/web-app/`
- `tailwind.config.js` — scans `src/web-app/**/*.{tsx,ts,jsx,js}`
- `postcss.config.js` — Tailwind + Autoprefixer

## Notes
- UI text is in Traditional Chinese (i18n supported: en, zh-TW)
- All styling assumes dark theme (slate-950 base)
- Package type is ESM (`"type": "module"`)
- No external auth, payment, or cloud dependencies
- No LLM calls — MCP tools return prompt templates; the AI assistant does all reasoning
