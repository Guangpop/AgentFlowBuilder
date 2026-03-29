# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgentFlow Builder (`agentflow-mcp`) is an npm MCP Server package for AI Agent workflow generation. It includes a visual node-based workflow editor web UI and an MCP server that exposes workflow tools to AI assistants like Claude. Built with TypeScript, Express, React 19, and Vite.

## Commands

```bash
npm run build          # Build everything (server + web)
npm run build:server   # Build MCP server (TypeScript compilation)
npm run build:web      # Build React web app (Vite)
npm run dev:mcp        # Run MCP server in dev mode
npm run dev:web        # Run web UI in dev mode
```

## Architecture

The project has three main layers:

### MCP Server (`src/mcp/`)
- Exposes workflow generation and management as MCP tools
- Communicates via stdio transport with AI assistants
- Entry point: `src/mcp/server.ts`

### Web UI (`src/web-app/`)
- React 19 + TypeScript + Vite single-page application
- Visual node-based workflow editor with canvas, sidebars
- Served by the Express server in production
- Entry point: `src/web-app/index.tsx`
- Build config: `vite.config.ts` (root: `src/web-app`, output: `dist/web-app`)

### Web Server (`src/web/`)
- Express server serving the built web app and REST APIs
- APIs: `/api/list`, `/api/load/:name`, `/api/save`, `/api/delete/:name`, `/api/watch` (SSE)
- Manages workflows as JSON files in a local `workflows/` directory
- Entry point: `src/web/server.ts`

### Shared Logic (`src/shared/`)
- TypeScript types, utilities, and workflow logic shared between MCP server and web app
- Node types, edge rebuilding, validation, export formats

### CLI (`src/cli.ts`)
- Entry point for the `agentflow-mcp` binary
- Dispatches to MCP server or web server based on commands

## Key Concepts

### Node Types (9 total)
- `UserInput`, `AgentReasoning`, `Condition`, `AgentQuestion`, `UserResponse`, `AgentAction`, `ScriptExecution`, `MCPTool`, `AgentSkill`

### Key Patterns
- Edges are rebuilt from each node's `next` array (source of truth)
- Condition nodes require exactly 2 outputs (True/False branches)
- Node IDs are auto-slugified (lowercase, underscores)
- Workflows are stored as JSON files on disk

### Export Formats
- JSON (raw workflow data)
- Markdown (documentation)
- Mermaid diagram (visual representation)

## Build Configuration

- `tsconfig.json` - Compiles `src/shared/`, `src/mcp/`, `src/web/`, `src/cli.ts` to `dist/`
- `vite.config.ts` - Builds `src/web-app/` to `dist/web-app/`
- `tailwind.config.js` - Scans `src/web-app/**/*.{tsx,ts,jsx,js}`
- `postcss.config.js` - Tailwind + Autoprefixer

## Notes
- UI text is in Traditional Chinese
- All styling assumes dark theme (slate-950 base)
- Package type is ESM (`"type": "module"`)
- No external auth or payment integrations
