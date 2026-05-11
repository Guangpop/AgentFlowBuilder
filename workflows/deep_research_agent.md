---
name: Deep Research Agent
nodes:
  - id: receive_topic
    type: UserInput
    title: Receive Topic
    outputs: [output]
    next: [plan_strategy]
    position: {x: 500, y: 50}
  - id: plan_strategy
    type: AgentReasoning
    title: Plan Strategy
    inputs: [input]
    outputs: [output]
    next: [search_web]
    position: {x: 500, y: 200}
  - id: search_web
    type: MCPTool
    title: Search Web
    inputs: [input]
    outputs: [output]
    next: [evaluate_sources]
    position: {x: 500, y: 350}
    config: {tool_name: brave_web_search, parameters: "query, count=10"}
  - id: evaluate_sources
    type: AgentReasoning
    title: Evaluate Sources
    inputs: [input]
    outputs: [output]
    next: [has_enough_quality]
    position: {x: 500, y: 500}
  - id: has_enough_quality
    type: Condition
    title: Has Enough Quality
    inputs: [input]
    outputs: [true_output, false_output]
    next: {"true": extract_findings, "false": refine_query}
    position: {x: 500, y: 650}
  - id: refine_query
    type: AgentSkill
    title: Refine Query
    inputs: [input]
    outputs: [output]
    next: [search_web]
    position: {x: 250, y: 500}
    config: {provider: superpower, skill: brain_storm}
  - id: extract_findings
    type: AgentReasoning
    title: Extract Findings
    inputs: [input]
    outputs: [output]
    next: [all_questions_covered]
    position: {x: 500, y: 830}
  - id: all_questions_covered
    type: Condition
    title: All Questions Covered
    inputs: [input]
    outputs: [true_output, false_output]
    next: {"true": synthesize_report, "false": search_web}
    position: {x: 500, y: 1000}
  - id: synthesize_report
    type: AgentReasoning
    title: Synthesize Report
    inputs: [input]
    outputs: [output]
    next: [generate_markdown]
    position: {x: 500, y: 1180}
  - id: generate_markdown
    type: ScriptExecution
    title: Generate Markdown
    inputs: [input]
    outputs: [output]
    next: [save_draft]
    position: {x: 500, y: 1350}
    config: {language: Python}
  - id: save_draft
    type: AgentAction
    title: Save Draft
    inputs: [input]
    outputs: [output]
    next: [ask_review]
    position: {x: 500, y: 1500}
  - id: ask_review
    type: AgentQuestion
    title: Ask Review
    inputs: [input]
    outputs: [output]
    next: [user_feedback]
    position: {x: 500, y: 1650}
  - id: user_feedback
    type: UserResponse
    title: User Feedback
    inputs: [input]
    outputs: [output]
    next: [is_approved]
    position: {x: 500, y: 1800}
  - id: is_approved
    type: Condition
    title: Is Approved
    inputs: [input]
    outputs: [true_output, false_output]
    next: {"true": finalize_report, "false": incorporate_feedback}
    position: {x: 500, y: 1950}
  - id: incorporate_feedback
    type: AgentReasoning
    title: Incorporate Feedback
    inputs: [input]
    outputs: [output]
    next: [search_web]
    position: {x: 250, y: 1950}
  - id: finalize_report
    type: AgentAction
    title: Finalize Report
    inputs: [input]
    next: []
    position: {x: 500, y: 2130}
---

# Deep Research Agent

An autonomous deep research agent that plans research strategy, searches multiple sources, evaluates quality, iteratively gathers information, synthesizes findings into a structured report, and refines based on user feedback. Showcases all 9 node types.

## Receive Topic {#receive_topic}

Receive the research topic and any specific requirements (depth, focus areas, output format) from the user.

## Plan Strategy {#plan_strategy}

Analyze the research topic and decompose it into 3-5 sub-questions. Identify key search queries, relevant domains, and potential source types (academic, news, technical docs). Create a prioritized research plan.

## Search Web {#search_web}

Execute web search using the current sub-question as query. Retrieve top results with titles, URLs, and snippets.

## Evaluate Sources {#evaluate_sources}

Evaluate each search result for relevance, credibility, and recency. Score sources on a 1-5 scale. Filter out low-quality, outdated, or irrelevant results. Keep top 3-5 sources per sub-question.

## Has Enough Quality {#has_enough_quality}

Check if we have at least 2 high-quality sources (score >= 4) for the current sub-question. If not, we need to refine the search query.

## Refine Query {#refine_query}

Use brainstorming skill to generate alternative search queries — rephrase with synonyms, add domain-specific terms, or narrow/broaden scope to find better sources.

## Extract Findings {#extract_findings}

Deep-read each qualified source. Extract key facts, statistics, quotes, and arguments. Tag each finding with its source URL for citation. Identify contradictions or gaps between sources.

## All Questions Covered {#all_questions_covered}

Check if all sub-questions from the research plan have been investigated. If remaining sub-questions exist, loop back to search the next one.

## Synthesize Report {#synthesize_report}

Synthesize all findings into a coherent narrative. Organize by themes (not by source). Highlight key insights, identify consensus vs. debate, note limitations and knowledge gaps. Structure as: Executive Summary → Key Findings → Detailed Analysis → Conclusions.

## Generate Markdown {#generate_markdown}

Format the synthesized report into a polished Markdown document with proper headings, bullet points, citation links, and a references section. Generate a table of contents.

### config.script

```python
# Format findings into structured Markdown report
# with TOC, citations, and references section
report = format_research_report(findings)
write_file('research_report.md', report)
```

## Save Draft {#save_draft}

Save the generated report draft to the local filesystem and prepare a summary preview for the user to review.

## Ask Review {#ask_review}

Present the report summary to the user. Ask: Are you satisfied with this report? Would you like to (1) approve and finalize, (2) request deeper research on specific sections, or (3) adjust the focus/scope?

## User Feedback {#user_feedback}

User reviews the report draft and provides feedback — approve, request revisions, or ask for deeper research on specific areas.

## Is Approved {#is_approved}

Check if the user approved the report. If not, they want revisions or deeper research on specific topics.

## Incorporate Feedback {#incorporate_feedback}

Parse the user's feedback to understand what needs to change. If they want deeper research, add new sub-questions to the plan. If they want revisions, note the specific adjustments needed. Update the research plan accordingly.

## Finalize Report {#finalize_report}

Finalize the approved report. Save the definitive version, generate export formats (Markdown + PDF-ready), and confirm completion to the user with the file path.
