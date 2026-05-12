# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgentFlow Builder (`agentflow-mcp`) is an npm MCP Server package for AI Agent workflow generation. It includes a visual node-based workflow editor web UI and an MCP server that exposes 12 tools to AI assistants like Claude — including a skill quality gate that auto-grades, iterates, and publishes production-ready skills. Built with TypeScript, Express, React 19, and Vite.

Workflows are stored as **Markdown** (`workflows/*.md`, YAML frontmatter + prose body) as the canonical format; `.json` is a legacy/cache fallback.

## Commands

```bash
npm run build          # Build everything (server + web)
npm run build:server   # Build MCP server (TypeScript compilation)
npm run build:web      # Build React web app (Vite)
npm run dev:mcp        # Run MCP server in dev mode
npm run dev:web        # Run web UI in dev mode (with HMR)
npm start              # Run production web server (port 3000)
npx vitest run         # Run unit tests
```

## Architecture

```
src/
├── shared/                  # Pure logic shared across server / web
│   ├── types.ts             # WorkflowNode, Edge, Workflow, NodeType enum
│   ├── constants.ts         # Node metadata, categories, defaults
│   ├── schema.ts            # JSON schema for workflow generation
│   ├── workflowSchema.ts    # Zod runtime schema (used in MD parser)
│   ├── workflowMd.ts        # Parser/serializer: workflow ↔ Markdown (canonical)
│   ├── mdToWorkflow.ts      # Best-effort shaper: generic md → workflow draft
│   ├── validation.ts        # Structural validation rules
│   ├── postProcess.ts       # ID cleanup, auto-layout, edge rebuilding
│   ├── export.ts            # Mermaid + Markdown export + sanitizeMermaidLabel
│   ├── prompts/             # i18n prompt templates (en / zh-TW / ja)
│   │   ├── chatPrompt.ts    # Self-contained "paste into ChatGPT/Gemini" prompt
│   │   ├── en.ts            # English AI prompts
│   │   ├── zh-TW.ts         # Traditional Chinese AI prompts
│   │   └── ja.ts            # Japanese AI prompts
│   ├── skillConverter.ts    # Workflow → SKILL.md conversion (topologicalSort)
│   ├── skillGrading.ts      # Quality gate prompts (grade / improve / optimize)
│   └── skillPublisher.ts    # Publish to ~/.claude/skills/
├── mcp/
│   ├── server.ts            # MCP Server (stdio, 12 tools registered here)
│   └── fileManager.ts       # Workflow file I/O (.md primary, .json legacy)
├── web/
│   └── server.ts            # Express server + REST + SSE + /api/import (markitdown spawn)
├── web-app/
│   ├── App.tsx              # Main React app (canvas / instructions / mermaid / md / json tabs)
│   ├── index.tsx            # React DOM entry
│   ├── components/
│   │   ├── WorkflowCanvas.tsx    # Canvas editor (pan, zoom, drag-to-connect)
│   │   ├── NodeProperties.tsx    # Node configuration panel (title + description)
│   │   ├── InstructionsTab.tsx   # IDE / Chat tab — generates SOP / chat prompts
│   │   ├── ChatSidebar.tsx       # Sidebar: workflow list + Import dropdown (File / URL)
│   │   ├── SettingsPanel.tsx     # Theme + language picker
│   │   ├── WelcomeModal.tsx      # First-run onboarding
│   │   ├── MermaidPreview.tsx    # Mermaid render with theme-aware variables
│   │   ├── ThemePreviewCard.tsx  # Theme picker card
│   │   ├── ViewerPage.tsx        # Thin re-export → viewer/
│   │   └── viewer/
│   │       ├── ViewerPage.tsx        # Orchestrator: mode + walk state + Mermaid coloring
│   │       ├── ReadModeContent.tsx   # Read mode — article + Condition BranchTabs + back pill
│   │       ├── WalkModeContent.tsx   # Walk mode — single-card step + action buttons
│   │       ├── WalkBreadcrumb.tsx    # Trail breadcrumb (rewind-on-click)
│   │       ├── ViewerTOC.tsx         # TOC with three-state (current/visited/faded)
│   │       ├── BranchTabs.tsx        # Condition TRUE/FALSE 5-step BFS preview
│   │       ├── BranchCard.tsx        # Single TRUE/FALSE branch card
│   │       ├── NodeTypeChip.tsx      # Node-type chip palette (light + dark)
│   │       └── viewerUtils.ts        # renderMarkdown, splitNodeForViewer, BFS, entry node
│   ├── contexts/
│   │   ├── ThemeContext.tsx      # Theme + language management
│   │   └── ToastContext.tsx      # Toast notifications
│   ├── locales/             # UI i18n (en, zh-TW, ja)
│   └── styles/themes.ts    # 4 themes: warm, techDark, glassmorphism, minimal
└── cli.ts                   # CLI entry (default: MCP server, `serve`: web UI)

.claude/skills/
├── skill-grader/            # 6-pillar 100-point scoring rubric
└── skill-creator/           # Skill creation patterns + description optimizer
```

### MCP Server (`src/mcp/server.ts`)
- 12 tools registered in a single file (no separate tool files)
- Communicates via stdio transport with AI assistants
- Tools: `get_node_types`, `get_generation_guide`, `validate_workflow`, `post_process_workflow`, `save_workflow`, `load_workflow`, `list_workflows`, `export_workflow`, `get_instruction_template`, `convert_to_skill`, `get_skill_quality_gate`, `publish_skill`

### Web UI (`src/web-app/`)
- React 19 + TypeScript + Vite single-page application
- 4 themes (warm / techDark / glassmorphism / minimal) — use `theme.*` tokens, never hardcoded colors
- 3 UI languages (en / zh-TW / ja) via `useTheme().t`
- Viewer (`?mode=view&workflow=name` or click "Viewer" in header) renders workflow.md
- Build config: `vite.config.ts` (root: `src/web-app`, output: `dist/web-app`)

### Web Server (`src/web/server.ts`)
- Express server serving the built web app and REST APIs
- APIs:
  - `/api/list`, `/api/load/:name`, `/api/save`, `/api/delete/:name`
  - `/api/watch` (SSE for file change events)
  - `/api/import` — file (`application/octet-stream` body + `x-filename` header) or URL (`application/json` body) → markitdown → workflow draft
- markitdown is spawned via `markitdown` CLI first (pipx / uv tool / brew pip), falls back to `python3 -m markitdown`
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
- **Canonical storage = Markdown.** YAML frontmatter holds the skeleton (nodes + `next`); prose bodies hold long-form descriptions per node section (`## Title {#node_id}`).
- **Edges are derived from `next[]`** at load time — never stored in the MD.
- **Condition nodes** require exactly 2 outputs (True/False branches).
- **Node IDs** are auto-slugified (lowercase, underscores or CJK).
- **`title` is short**, `description` is long-form prose.
- **SSE (`/api/watch`)** keeps web UI and MCP tools in real-time sync.
- **Showcase workflows whitelist**: `.gitignore` ignores all `workflows/*.md` by default; only the four demos (`customer_service_agent`, `deep_research_agent`, `issue_triage_test`, `oiwai_message_assistant`) are explicitly allowed. To publish a new demo, add an explicit `!workflows/<name>.md` line.

### Instructions Tab — IDE vs Chat
- **IDE tab** (Claude / Antigravity / Cursor): generates prefix + Hierarchical Disclosure prompt + Skill Quality Gate instructions. User pastes into the AgentFlowBuilder project's AI tool, which runs the quality loop.
- **Chat tab** (ChatGPT / Gemini / Grok / Claude.ai / DeepSeek): generates a self-contained prompt with workflow SOP, branching table, and operating rules. User pastes into any LLM chat. Two execution modes: **Step-by-step** (agent pauses each stage) or **Plan-then-Execute** (agent shows full plan, waits for GO).

### Import Dropdown (sidebar)
- **From file** (`.md` / `.json` native; everything else → `/api/import` → markitdown subprocess → `shapeMdToWorkflow`)
- **From URL** (regular URL → markitdown with YAML frontmatter; YouTube URL → transcript)
- markitdown installation: `uv tool install 'markitdown[all]'` or `pipx install 'markitdown[all]'`

### Viewer (Read + Walk)
- **Read mode**: article-style render with section nav, Condition node TRUE/FALSE BranchTabs (5-step BFS preview), back-pill on jump
- **Walk mode**: single-card step navigation, action buttons (Next / TRUE-FALSE / Loop back / End reached), trail breadcrumb, Mermaid `.walked-current/visited/faded` coloring, TOC three-state

### Export Formats
- **Skills** (.md) — reusable agent capabilities with YAML frontmatter
- **Commands** (.md) — slash commands triggered by user input
- **Workflows** (.md) — step-by-step execution plans
- **JSON** — raw workflow data (legacy / backup)
- **Markdown** — system design documentation
- **Mermaid** — visual flow diagrams (output sanitized via `sanitizeMermaidLabel`)

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
- `vitest.config.ts` — test runner config (uses `*.test.ts` co-located with sources)

## Notes
- **i18n**: UI supports en / zh-TW / ja. Default = browser language. Switch in Settings.
- **Themes**: 4 themes (warm / techDark / glassmorphism / minimal). All components must use `theme.*` tokens from `useTheme()`; never hardcode colors.
- **No LLM calls in this codebase.** MCP tools return prompt templates; the AI assistant or user's chat client does all reasoning. The single exception: the optional `/api/import` endpoint spawns markitdown (deterministic, not LLM-based) for file/URL extraction.
- **Package type** is ESM (`"type": "module"`).
- **No external auth, payment, or cloud dependencies.**
- **Tests** (`*.test.ts`) live next to the source file (`workflowMd.test.ts`, `mdToWorkflow.test.ts`, `export.test.ts`, `fileManager.test.ts`). Run with `npx vitest run`.
