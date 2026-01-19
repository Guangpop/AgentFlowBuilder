# Agent Flow Builder

A visual node-based workflow editor that converts natural language descriptions into structured AI agent workflows.

![Agent Flow Builder Screenshot](docs/images/screenshot.png)

[![Demo Video](https://img.youtube.com/vi/NqIp4d7LQxg/maxresdefault.jpg)](https://youtu.be/NqIp4d7LQxg)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Claude API Key ([get one here](https://console.anthropic.com/))

### Run Locally

```bash
# 1. Clone and install
git clone https://github.com/anthropics/agent-flow-builder.git
cd agent-flow-builder
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local and add your VITE_LOCAL_API_KEY

# 3. Start dev server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Environment Variables (Local)

Create `.env.local` with:

```env
VITE_LOCAL_API_KEY=your_claude_api_key_here
```

That's it! The app runs in local mode with just your Claude API key.

## Features

- **AI-Powered Workflow Generation** - Describe your workflow in natural language, AI generates the node structure
- **Visual Canvas Editor** - Drag, connect, and edit nodes with an intuitive interface
- **SOP Generation** - Convert workflows into detailed Agent SOP instructions
- **Multiple Export Formats** - JSON, Markdown, Mermaid diagrams
- **Multi-language Support** - Traditional Chinese (繁體中文) and English

## Node Types

- User Input / User Response
- AI Reasoning / AI Question
- Condition Branch
- Agent Action
- Script Execution (Python, Shell, Node.js)
- MCP Tool
- Agent Skill

## Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run preview  # Preview production build
```

## Project Structure

```
├── api/                    # Vercel serverless functions
├── components/             # React components
│   ├── WorkflowCanvas.tsx  # Main canvas with nodes/edges
│   ├── ChatSidebar.tsx     # AI prompt input
│   └── NodeProperties.tsx  # Node editor panel
├── contexts/               # React contexts
├── locales/                # i18n translations
├── lib/                    # Utility libraries
├── prompts/                # AI prompt templates
└── services/               # AI service integrations
```

---

## Production Environment

For production deployment, the following stack is used:

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **AI**: Claude API (via Vercel serverless functions)
- **Database**: Supabase (PostgreSQL)
- **Payment**: TapPay (Taiwan)
- **Deployment**: Vercel

Production environment variables (set in Vercel Dashboard):

- `ANTHROPIC_API_KEY` - Backend Claude API key
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - Database
- `TAPPAY_PARTNER_KEY`, `TAPPAY_MERCHANT_ID` - Payment integration

## License

MIT
