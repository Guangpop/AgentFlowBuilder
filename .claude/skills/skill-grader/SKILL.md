---
name: skill-grader
description: |
  Evaluates Agent Skills against a 6-pillar 100-point scoring rubric and produces structured grading reports with actionable improvement recommendations. Use this skill whenever the user wants to evaluate a skill's quality, asks "grade this skill", "evaluate this SKILL.md", "rate my skill", "這個 skill 品質如何", "幫我評分這個技能", "skill 品質檢查", or when a manufacturing workflow needs quality assurance after creating a skill. Works standalone or as part of skill manufacturing pipelines (x-skill-scout, github-skill-creator).
---

# Skill Grader — 6-Pillar Quality Evaluation

## Quick Reference

| Resource | Path | When to Read |
|----------|------|-------------|
| Scoring Rubric | `references/scoring-rubric.md` | Need detailed sub-score criteria for each pillar |
| PDA Architecture | `references/pda-architecture.md` | Need to assess or recommend multi-tier structure |
| Report Template | `references/report-template.md` | Need output format for standalone or pipeline mode |
| Grading Example | `references/grading-example.md` | Want to see a complete worked example with realistic scores and evidence |

## Quality Gate

Default minimum passing score: **80/100 (Grade B)**

| Grade | Range | Meaning |
|-------|-------|---------|
| A | 90-100 | Production-ready, exemplary |
| B | 80-89 | Good quality, minor improvements possible |
| C | 70-79 | Adequate, notable gaps to address |
| D | 60-69 | Needs significant work |
| F | < 60 | Major revision required |

## Step 1: Locate and Read the Target Skill

1. Read the target SKILL.md file
2. Check for a `references/` subdirectory — read all files if present
3. Measure SKILL.md body size (excluding frontmatter):
   - Count bytes: `wc -c < SKILL.md` minus frontmatter
   - Note: this determines PDA tier expectations in Step 3

## Step 1b: Scope Compliance Pre-Check

Before scoring, determine the skill's intended scope and check for project-specific leakage:

**Checklist** (any failure triggers Pillar 6 penalty: **-5 Project scope leakage**):
- [ ] No hardcoded project file paths (e.g., `scripts/x-crawler.ts`, `data/x/`, `.session/x/`)
- [ ] No references to specific project APIs or routes (e.g., `GET /api/x/bookmarks`)
- [ ] No assumptions that specific tools/crawlers/systems already exist in the user's project
- [ ] All configuration is parameterized or uses generic recommendations
- [ ] Skill works in a vanilla Claude Code environment without project-specific setup

**Exception**: Skills explicitly scoped to a single project (installed only in project `.claude/skills/`, not global `~/.claude/skills/`) are exempt from this check.

## Step 2: Score Each Pillar

Evaluate against 6 pillars. For sub-score details, read `references/scoring-rubric.md`.

| # | Pillar | Max | Key Question |
|---|--------|-----|-------------|
| 1 | **Progressive Disclosure Architecture** | 30 | Is information layered, navigable, and token-efficient? |
| 2 | **Ease of Use** | 25 | Can a user find what they need quickly? Are triggers discoverable? |
| 3 | **Spec Compliance** | 15 | Does frontmatter follow conventions? Is naming correct? |
| 4 | **Writing Style** | 10 | Is tone imperative, concise, and objective? |
| 5 | **Utility** | 20 | Does it solve a real problem with clear steps and feedback? |
| 6 | **Modifiers** | ±15 | Bonuses for checklists, grep-friendly, output specs. Penalties for narrative, broken refs. |

**Scoring procedure per pillar**:
1. Read the pillar's criteria from `references/scoring-rubric.md`
2. Evaluate the target skill against each sub-criterion
3. Assign sub-scores and sum for the pillar total
4. Note specific evidence for each score (quote or reference line)

## Step 3: Assess PDA Tier Structure

Determine if the skill's structure matches its complexity:

| Body Size | Sub-domains? | Expected Structure |
|-----------|-------------|-------------------|
| < 3KB | Any | Tier 1 only (single SKILL.md) — acceptable |
| 3-5KB | No | Tier 1 only — acceptable |
| 3-5KB | Yes (2+ topics) | Tier 1 + references/ — recommended |
| > 5KB | Any | Tier 1 + references/ — required |

For detailed PDA guidance, read `references/pda-architecture.md`.

**Scoring impact**: A skill > 5KB without references/ loses up to 10 points on the PDA pillar. A skill < 3KB with unnecessary references/ is noted but not penalized.

## Step 4: Generate the Grading Report

Use the appropriate template from `references/report-template.md`:
- **Standalone mode** (user invoked directly): Full report with per-pillar notes
- **Pipeline mode** (called from manufacturing workflow): Compact GRADE_RESULT block

Calculate: `total = pillar_1 + pillar_2 + pillar_3 + pillar_4 + pillar_5 + modifiers`

Cap total at 0 minimum and 100 maximum.

## Step 5: Produce Improvement Recommendations

For each pillar scoring below 70% of its maximum:

1. Identify the specific deficit with evidence
2. Provide a concrete fix (rewrite example, structural change, or addition)
3. Estimate score improvement if the fix is applied

Order recommendations by estimated impact (highest first). Limit to top 3.

## Pipeline Integration

When called from manufacturing workflows (x-skill-scout, github-skill-creator):

1. Accept the newly created skill content as context
2. Read `references/scoring-rubric.md` for criteria
3. Score all 6 pillars
4. If score < quality gate (default 80):
   - Apply the highest-impact improvement recommendation
   - Rewrite the skill
   - Re-score (maximum 2 iterations)
5. Output the compact GRADE_RESULT block (see `references/report-template.md`)
6. If still below threshold after 2 iterations: output with `passed: false` flag
