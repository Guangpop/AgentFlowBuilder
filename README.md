# agentflow-mcp

MCP Server for AI agent workflow generation with a local visual editor.

The MCP tools return **prompt templates and JSON schemas**; your AI assistant (Claude) does the reasoning. Workflows sync to disk as JSON files and can be edited visually through the built-in web UI.

## Features

- **9 MCP tools** for end-to-end workflow generation, validation, and export
- **Local web UI** — React canvas editor with pan/zoom, node dragging, and connection drawing
- **File system sync** — MCP tools and web UI share a `./workflows/` directory with real-time SSE updates
- **9 node types** — UserInput, AgentReasoning, Condition, AgentQuestion, UserResponse, AgentAction, ScriptExecution, MCPTool, AgentSkill
- **Export formats** — JSON, Markdown, Mermaid diagram
- **No API keys needed** — the server itself makes zero LLM calls

## Installation

```bash
# Add to Claude Code (recommended)
claude mcp add agentflow -- npx agentflow-mcp

# Or install globally
npm install -g agentflow-mcp
```

## Usage

### MCP Tools (via Claude Code)

Once added as an MCP server, you can ask Claude things like:

```
"幫我生成一個客服 agent 的 workflow"
"列出所有已存的 workflows"
"把 customer_service workflow 匯出成 mermaid 圖"
"幫我把 news_fetcher workflow 生成 agent instructions"
```

### Web UI

```bash
# Start the visual editor (opens browser automatically)
npx agentflow-mcp serve

# Custom port
npx agentflow-mcp serve --port 8080
```

The web UI reads and writes to the same `./workflows/` directory used by the MCP tools. Changes made in either place are synced in real time.

## MCP Tools Reference

| Tool | Description |
|------|-------------|
| `get_node_types` | Available node types and their schemas |
| `get_generation_guide` | Prompt template + JSON schema for workflow generation |
| `validate_workflow` | Structural validation of a workflow |
| `post_process_workflow` | ID cleanup, auto-layout, edge rebuilding |
| `save_workflow` | Save workflow to `./workflows/` |
| `load_workflow` | Load workflow from `./workflows/` |
| `list_workflows` | List all saved workflows |
| `export_workflow` | Export as JSON, Markdown, or Mermaid |
| `get_instruction_template` | Prompt template for generating agent instructions |

## Architecture

```
src/
├── shared/       # Pure logic — types, postProcess, export, validation, prompts, schema
├── mcp/          # MCP Server (stdio transport via @modelcontextprotocol/sdk)
├── web/          # Express server for local web UI + SSE file watching
├── web-app/      # React 19 + Vite visual canvas editor
└── cli.ts        # CLI entry point (mcp default, serve subcommand)
```

**Key concepts:**

- Edges are rebuilt from each node's `next` array (single source of truth)
- Condition nodes always have exactly 2 outputs (True/False branches)
- Node IDs are auto-slugified to lowercase with underscores
- Workflows are stored as plain JSON files on disk

## Development

```bash
git clone https://github.com/Guangpop/AgentFlowBuilder.git
cd AgentFlowBuilder
npm install

npm run build           # Build everything
npm run build:server    # TypeScript compilation only
npm run build:web       # Vite build only

npm run dev:mcp         # Dev mode MCP server
npm run dev:web         # Dev mode web UI
```

## License

MIT
