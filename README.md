# AgentFlowBuilder

> Design AI agent workflows visually. Generate executable skills and commands for Claude Code, Cursor, and Antigravity — no coding required.

![AgentFlowBuilder Screenshot](images/hero-banner.png)

AgentFlowBuilder is an MCP Server + visual editor that turns workflow diagrams into production-ready AI agent instructions. You design the flow, your AI assistant writes the code.

**Zero API cost.** The server makes no LLM calls — Claude does all the reasoning using your existing subscription.

## Why AgentFlowBuilder?

| Pain Point | How AgentFlowBuilder Solves It |
|---|---|
| Writing complex agent prompts is error-prone | Visual node editor — drag, connect, done |
| Agent instructions get long and context decays | Hierarchical Disclosure breaks work into micro-tasks |
| Sharing workflows across IDEs requires rewriting | Export to Claude Code, Cursor, or Antigravity format in one click |
| Hosting AI tools costs money | Runs 100% locally as an MCP Server — zero server cost, zero API keys |
| Text-based workflows are hard to review | Mermaid diagrams + Markdown docs generated automatically |
| Generated skills are inconsistent quality | Built-in quality gate: auto-grades, iterates, and publishes only when score ≥ 80/100 |

**Example:** Design a workflow on the canvas → switch to the Instructions tab → select your IDE (Claude Code, Cursor, or Antigravity) → choose output type (Skills, Commands, or Workflows) → click Copy SOP Prompt → paste into your AI tool in the AgentFlow Builder project → AI auto-generates, grades, improves, and publishes the skill.

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/Guangpop/AgentFlowBuilder.git
cd AgentFlowBuilder
npm install && npm run build
```

### 2. Add to Claude Code as MCP Server

```bash
claude mcp add agentflow -- node /path/to/AgentFlowBuilder/dist/cli.js
```

Then ask Claude:

```
"Help me build a customer support agent workflow"
"Generate a code review workflow with feedback loops"
"Export my workflow as Claude Code skills"
```

### 3. Visual Editor

```bash
npm start
```

Three steps to your first agent skill:

1. **Add nodes** — drag from the categorized toolbar (User / Agent / System)
2. **Connect the flow** — draw edges between nodes to define execution order
3. **Copy SOP prompt** — choose your IDE, click Copy, paste into your AI tool

## Use Cases

From zero-code beginners to advanced engineering teams — here are real examples showing what you say, what gets generated, and how you use it.

---

### Example 1: Customer Support Agent (Beginner — no coding required)

**What you say to Claude:**

```
"Help me build a customer support workflow"
```

**What gets generated:**

```
User Input (customer message)
  → Agent Reasoning (classify: billing / technical / general)
    → Condition (is technical?)
      → True: Agent Action (search knowledge base & draft solution)
      → False: Agent Action (generate friendly response from FAQ)
        → Agent Question (ask: "Did this resolve your issue?")
          → Condition (resolved?)
            → True: Agent Action (close ticket, send satisfaction survey)
            → False: Agent Action (escalate to human agent with full context)
```

**How to use it:**

Export as a **Command** → generates a file like `customer-support.md`. After your AI tool loads it:

```
/customer-support "I was charged twice for my subscription last month"
```

The AI agent follows your workflow step-by-step: classifies the issue as billing, searches your FAQ, drafts a response, and asks the customer if it's resolved. No manual prompt writing needed — the workflow IS the prompt.

---

### Example 2: Meeting Notes Summarizer (Intermediate — integrating external tools)

**What you say to Claude:**

```
"Build a meeting notes workflow. It should read a transcript, extract action items 
with owners and deadlines, then output a structured summary in Markdown."
```

**What gets generated:**

```
User Input (paste transcript or file path)
  → Agent Reasoning (identify speakers, topics, decisions)
    → Agent Action (extract action items: task / owner / deadline)
      → Condition (has unassigned action items?)
        → True: Agent Question (ask: "Who should own these tasks?")
          → User Response (assign owners)
        → False: (continue)
      → Agent Action (generate Markdown summary with sections:
          Attendees, Key Decisions, Action Items table, Next Steps)
        → Script Execution (save summary to ./meeting-notes/{date}.md)
```

**How to use it:**

Export as a **Skill** → the AI agent can invoke it anytime during a conversation:

```
"Summarize today's standup" → (paste transcript) → get a structured .md file
```

The skill is reusable — it works for any meeting type. The Condition node ensures no action item is left without an owner.

---

### Example 3: PR Review Agent (Advanced — multi-source context gathering)

**What you say to Claude:**

```
"I need a PR review agent workflow. It should:
- Pull PR diff and file changes from GitHub
- Fetch the related Jira ticket for context (comments, description, acceptance criteria)
- Read our team's coding standards and architecture docs
- Review the code against all this context
- Post a structured review comment on the PR"
```

**What gets generated:**

```
User Input (PR URL or PR number)
  → MCP Tool [GitHub] (fetch PR diff, changed files, PR description)
    → Agent Reasoning (extract Jira ticket ID from PR title/branch name)
      → MCP Tool [Jira] (fetch ticket: description, acceptance criteria, comments)
        → MCP Tool [GitHub] (read team docs: CODING_STANDARDS.md, ARCHITECTURE.md)
          → Agent Skill (load relevant domain knowledge based on changed file paths)
            → Agent Reasoning (review code against:
                1. Jira acceptance criteria — does the PR fulfill the ticket?
                2. Coding standards — naming, patterns, error handling
                3. Architecture docs — does it follow system design?
                4. Security — SQL injection, XSS, auth checks
                5. Performance — N+1 queries, unnecessary re-renders)
              → Condition (critical issues found?)
                → True: Agent Action (post "Changes Requested" review with:
                    ## Summary
                    ## Critical Issues (must fix)
                    ## Suggestions (nice to have)
                    ## Checklist vs. Acceptance Criteria)
                → False: Agent Action (post "Approved" review with:
                    ## Summary
                    ## Minor Suggestions
                    ## Approval note)
```

**How to use it:**

Export as a **Command** → becomes a one-liner in your daily workflow:

```
/review-pr 1234
```

The agent autonomously: pulls the diff from GitHub → finds the Jira ticket → reads your team's coding standards → performs a structured review → posts the result as a PR comment. What used to take 30–60 minutes of context-switching now takes one command.

**Why this works:** The MCP Tool nodes connect to real external services (GitHub, Jira, Bitbucket — any tool with an MCP server). The Agent Skill node loads your team's pre-written knowledge files. The workflow orchestrates everything into a single, repeatable process.

---

### Example 4: Release Changelog Generator (Advanced — multi-step pipeline)

**What you say to Claude:**

```
"Build a release changelog workflow. Compare two git tags, categorize all commits,
fetch related Jira tickets for business context, and generate a changelog 
for both engineering and product teams."
```

**What gets generated:**

```
User Input (from_tag, to_tag)
  → Script Execution (git log --oneline {from_tag}..{to_tag})
    → Agent Reasoning (categorize commits: feature / fix / refactor / chore)
      → Agent Reasoning (extract all ticket IDs from commit messages)
        → MCP Tool [Jira] (batch fetch tickets: title, type, epic, priority)
          → Agent Reasoning (generate two versions:
              1. Engineering changelog: commit details, breaking changes, migration steps
              2. Product changelog: user-facing features, bug fixes, business impact)
            → Agent Action (write CHANGELOG.md with both sections)
              → Condition (has breaking changes?)
                → True: Agent Action (create migration guide in MIGRATION.md)
                → False: Agent Action (done — output file paths)
```

**How to use it:**

```
/release-changelog v2.3.0 v2.4.0
```

Produces a professional changelog with both engineering and product sections, plus an automatic migration guide if there are breaking changes. Product managers get business context; engineers get technical details — from a single command.

---

### What These Examples Show

| Complexity | You Provide | AgentFlowBuilder Does |
|---|---|---|
| **Beginner** | A one-sentence idea | Generates the full workflow, exports as a slash command |
| **Intermediate** | A feature description with requirements | Builds a reusable skill with branching logic |
| **Advanced** | Multi-source requirements with integrations | Orchestrates MCP tools, knowledge bases, and conditional logic into one command |

The key insight: **you don't write prompts — you design flows.** The visual editor makes the logic reviewable, shareable, and maintainable. When requirements change, you move nodes instead of rewriting thousands of words of prompt text.

## Features

- **9 node types** — cover every agent pattern from simple Q&A to complex branching logic
- **Visual canvas editor** — pan, zoom, drag-to-connect with real-time preview
- **Multi-IDE export** — generate Skills, Commands, or Workflows for Claude Code, Cursor, and Antigravity
- **Skill quality gate** — auto-grades skills against a 6-pillar rubric, iterates until ≥ 80/100, and publishes to `~/.claude/skills/` for cross-project discovery
- **MCP Server** — 12 tools accessible from any MCP-compatible AI assistant
- **File system sync** — web UI and MCP tools share `./workflows/` with live SSE updates
- **Mermaid + Markdown** — auto-generated diagrams and documentation
- **Fully local** — no cloud, no accounts, no API keys

## Node Types

| Category | Node | Purpose |
|----------|------|---------|
| **User** | User Input | Entry point — receives user request |
| | User Response | Collects follow-up information |
| **Agent** | Agent Reasoning | AI logic and decision-making |
| | Agent Question | AI asks clarifying questions |
| | Agent Action | Executes a task |
| **System** | Condition | True/False branching |
| | Script Execution | Run Python, Shell, or Node.js |
| | MCP Tool | Call external MCP tools |
| | Agent Skill | Invoke reusable agent skills |

## Export Formats

| Format | Use For |
|--------|---------|
| **Skills** (.md) | Reusable agent capabilities with YAML frontmatter |
| **Commands** (.md) | Slash commands triggered by user input |
| **Workflows** (.md) | Step-by-step execution plans |
| **JSON** | Raw workflow data for backup or sharing |
| **Markdown** | System design documentation |
| **Mermaid** | Visual flow diagrams |

## Skill Quality Gate

Generated skills are automatically graded and improved before publishing. The quality gate uses two bundled skills:

- **skill-grader** (`.claude/skills/skill-grader/`) — 6-pillar 100-point scoring rubric: Progressive Disclosure Architecture, Ease of Use, Spec Compliance, Writing Style, Utility, and Modifiers
- **skill-creator** (`.claude/skills/skill-creator/`) — skill creation best practices, improvement patterns, and description optimization

**How it works:**

1. AI generates a SKILL.md draft from your workflow via `convert_to_skill`
2. AI grades the draft using skill-grader (reading `references/scoring-rubric.md`)
3. If score < 80, AI improves the skill using skill-creator guidance, then re-grades (up to 3 iterations)
4. AI optimizes the description for trigger accuracy (EN + ZH trigger phrases)
5. AI publishes the final skill to `~/.claude/skills/{name}/` — discoverable by Claude Code in any project

**Via MCP:** The quality gate runs automatically when you ask your AI tool to generate a skill.

**Via Web UI:** Click "Copy Prompt" in the Instructions tab → paste into your AI tool **in the AgentFlow Builder project directory** → AI executes the full quality loop.

## MCP Tools Reference

| Tool | Description |
|------|-------------|
| `get_node_types` | Available node types and their schemas |
| `get_generation_guide` | Prompt template + JSON schema for workflow generation (includes quality gate instructions) |
| `validate_workflow` | Structural validation of a workflow |
| `post_process_workflow` | ID cleanup, auto-layout, edge rebuilding |
| `save_workflow` | Save workflow to `./workflows/` |
| `load_workflow` | Load workflow from `./workflows/` |
| `list_workflows` | List all saved workflows |
| `export_workflow` | Export as JSON, Markdown, or Mermaid |
| `get_instruction_template` | Prompt template for generating agent instructions |
| `convert_to_skill` | Convert a workflow to SKILL.md draft with quality gate instructions |
| `get_skill_quality_gate` | Get grading, improvement, or description optimization prompts |
| `publish_skill` | Publish a quality-verified skill to `~/.claude/skills/` |

## Architecture

```
src/
├── shared/            # Types, validation, export, prompts, schema
│   ├── skillConverter.ts    # Workflow → SKILL.md conversion
│   ├── skillGrading.ts      # Quality gate prompts (references local skills)
│   └── skillPublisher.ts    # Publish to ~/.claude/skills/
├── mcp/               # MCP Server (stdio transport, 12 tools)
├── web/               # Express server + SSE file watching
├── web-app/           # React 19 + Vite visual editor
└── cli.ts             # CLI entry (mcp default, serve subcommand)

.claude/skills/
├── skill-grader/      # 6-pillar scoring rubric + references
└── skill-creator/     # Skill creation patterns + description optimizer scripts
```

## Development

```bash
git clone https://github.com/Guangpop/AgentFlowBuilder.git
cd AgentFlowBuilder
npm install

npm run build          # Build everything
npm run dev:mcp        # Dev MCP server
npm run dev:web        # Dev web UI (with HMR)
```

## Contributing

Contributions welcome! Please open an issue first to discuss what you'd like to change.

## License

MIT
