# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgentFlowBuilder is a visual node-based workflow editor that uses Google Gemini AI to convert natural language descriptions into structured AI agent workflows. Built with React 19 + TypeScript + Vite.

## Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Environment Setup

Create `.env.local` with:
```
GEMINI_API_KEY=your_key_here
```

## Architecture

### Core Files
- `App.tsx` - Main state management, tab system, workflow operations, Gemini API calls
- `types.ts` - TypeScript definitions for nodes, edges, workflows
- `constants.tsx` - Node type configurations with colors and icons
- `services/gemini.ts` - Gemini API integration (Flash for workflow gen, Pro for instructions)

### Components
- `WorkflowCanvas.tsx` - Interactive canvas with pan/zoom, node dragging, connection drawing
- `ChatSidebar.tsx` - Left panel (420px) for AI prompt input and workflow description
- `NodeProperties.tsx` - Right panel (420px) for editing selected node properties

### Data Flow
1. User enters natural language prompt in ChatSidebar
2. `generateWorkflow()` calls Gemini Flash to produce structured JSON
3. Post-processing validates/slugifies node IDs, auto-layouts nodes, rebuilds edges
4. WorkflowCanvas renders nodes and edges
5. User can edit via NodeProperties panel
6. `generateAgentInstructions()` converts workflow to hierarchical instruction set

### Node Types (9 total)
- `UserInput`, `AgentReasoning`, `Condition`, `AgentQuestion`, `UserResponse`, `AgentAction`, `ScriptExecution`, `MCPTool`, `AgentSkill`

### Key Patterns
- Edges are rebuilt from each node's `next` array (source of truth)
- Condition nodes require exactly 2 outputs (True/False branches)
- Node IDs are auto-slugified (lowercase, underscores)
- Canvas uses fixed 420px sidebars with flex-fill center

## Export Formats
- JSON (raw workflow data)
- Markdown (documentation)
- Mermaid diagram (visual representation)

## Notes
- UI text is in Traditional Chinese (繁體中文)
- All styling assumes dark theme (slate-950 base)
- Tailwind CSS loaded via CDN
