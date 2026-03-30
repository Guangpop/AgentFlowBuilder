# Scoring Rubric — Detailed Criteria

## Pillar 1: Progressive Disclosure Architecture (PDA) — 30 points

### Token Economy (0-10)

| Score | Criteria |
|-------|----------|
| 9-10 | SKILL.md body ≤ 4KB; no section exceeds 40 lines; information density is high with zero redundancy |
| 7-8 | Body ≤ 6KB; most sections are concise; minor redundancy |
| 5-6 | Body ≤ 8KB; some bloated sections but still navigable |
| 3-4 | Body > 8KB; significant redundancy or wall-of-text sections |
| 0-2 | Massive single file with no structure; overwhelming to scan |

### Layered Structure (0-10)

| Score | Criteria |
|-------|----------|
| 9-10 | SKILL.md has quick reference table linking to well-organized references/; each reference is standalone and focused |
| 7-8 | Has references/ but organization could improve; or single-file skill where content warrants single file |
| 5-6 | Has references/ but files overlap or are poorly scoped |
| 3-4 | Content > 5KB with no references/ split; or references/ with only 1 file |
| 0-2 | No structure consideration; everything dumped in one place |

**Exemption**: Skills with body < 3KB are scored 8/10 minimum for layered structure (single file is appropriate).

### Navigation Signals (0-10)

| Score | Criteria |
|-------|----------|
| 9-10 | Clear heading hierarchy (h1 → h2 → h3); quick reference table at top; cross-references use relative paths; reader finds info without full read |
| 7-8 | Good headings and some cross-references; minor navigation gaps |
| 5-6 | Headings present but inconsistent; no quick reference table |
| 3-4 | Flat structure; hard to find specific information |
| 0-2 | No meaningful headers; stream-of-consciousness format |

---

## Pillar 2: Ease of Use — 25 points

### Metadata Quality (0-8)

| Score | Criteria |
|-------|----------|
| 7-8 | `description` includes specific trigger phrases in both EN and ZH; clearly states WHEN to use; `name` is kebab-case matching directory |
| 5-6 | Has trigger phrases but only in one language; or description is vague about when to trigger |
| 3-4 | Minimal description; missing trigger phrases |
| 0-2 | Missing or invalid frontmatter fields |

### Discoverability (0-7)

| Score | Criteria |
|-------|----------|
| 6-7 | 3+ natural trigger phrases that match how users actually speak; covers both "do X" and "help with X" patterns |
| 4-5 | 2 trigger phrases; reasonable but incomplete coverage |
| 2-3 | 1 trigger phrase or overly technical phrasing |
| 0-1 | No trigger phrases; would never be discovered automatically |

### Terminology Consistency (0-5)

| Score | Criteria |
|-------|----------|
| 5 | One term per concept throughout; no conflicting synonyms |
| 3-4 | Mostly consistent; 1-2 synonym swaps that could confuse |
| 1-2 | Multiple terms for same concept; reader must guess equivalences |
| 0 | Contradictory terminology |

### Workflow Clarity (0-5)

| Score | Criteria |
|-------|----------|
| 5 | Numbered sequential steps; decision points use IF/THEN or decision tree; expected output stated per step |
| 3-4 | Steps are clear but decision points implicit; or outputs not always stated |
| 1-2 | Steps exist but ordering is ambiguous; unclear when done |
| 0 | No discernible workflow; instructions are scattered |

---

## Pillar 3: Spec Compliance — 15 points

### Frontmatter Validity (0-5)

| Score | Criteria |
|-------|----------|
| 5 | Valid YAML with `name` and `description` using `|` block scalar; parses without error |
| 3-4 | Valid YAML but minor issues (single-line description, missing `|`) |
| 1-2 | YAML present but has syntax issues |
| 0 | No frontmatter or completely invalid |

### Naming Conventions (0-5)

| Score | Criteria |
|-------|----------|
| 5 | Directory name is kebab-case; matches `name` field; reference files use descriptive kebab-case |
| 3-4 | Name matches but references use inconsistent naming |
| 1-2 | Name mismatch between directory and frontmatter |
| 0 | No naming convention followed |

### Description Quality (0-5)

| Score | Criteria |
|-------|----------|
| 5 | First sentence is action-oriented verb phrase; includes trigger scenarios; ≤ 500 chars |
| 3-4 | Good but too long or missing some trigger scenarios |
| 1-2 | Vague or purely technical description |
| 0 | Missing or single word |

---

## Pillar 4: Writing Style — 10 points

### Imperative Voice (0-4)

| Score | Criteria |
|-------|----------|
| 4 | All instructions use imperative ("Read the file", "Score each pillar"); no passive voice |
| 3 | Mostly imperative; 1-2 passive or narrative sentences |
| 1-2 | Mixed voices; some sections read as documentation rather than instructions |
| 0 | Primarily passive or narrative; reads like an essay |

### Objectivity (0-3)

| Score | Criteria |
|-------|----------|
| 3 | No promotional language; no background stories; no source attribution in body |
| 2 | Minor slip (one "powerful" or "amazing"); or brief background context |
| 1 | Some marketing language or narrative sections |
| 0 | Body contains stories, attributions, or promotional content |

### Conciseness (0-3)

| Score | Criteria |
|-------|----------|
| 3 | No redundant sentences; tables for structured data; code examples are minimal but complete |
| 2 | Minor redundancy; could trim 10-20% without losing information |
| 1 | Significant redundancy; same concepts repeated in different sections |
| 0 | Extremely verbose; information buried in prose |

---

## Pillar 5: Utility — 20 points

### Problem-Solving Power (0-7)

| Score | Criteria |
|-------|----------|
| 6-7 | Addresses a real, recurring need; steps specific enough to execute without guessing; covers happy path + at least one error case |
| 4-5 | Addresses real need but steps sometimes vague; or no error handling |
| 2-3 | Need is questionable or steps require significant interpretation |
| 0-1 | No clear problem solved; or entirely aspirational |

### Degrees of Freedom (0-5)

| Score | Criteria |
|-------|----------|
| 5 | Adapts to different contexts; has configurable parameters or decision branches; works across project types; no project-specific assumptions |
| 3-4 | Some adaptability; works in most but not all relevant contexts; minor project-specific references that could be parameterized |
| 1-2 | Hardcoded to specific scenario; assumes specific project structure or tools exist |
| 0 | Single-use; only works in the project it was created in |

### Feedback Loops (0-4)

| Score | Criteria |
|-------|----------|
| 4 | Includes verification steps; user knows when succeeded or failed; output format specified |
| 2-3 | Some verification; output format partially specified |
| 1 | No verification; user must check manually |
| 0 | No feedback mechanism; fire-and-forget |

### Examples (0-4)

| Score | Criteria |
|-------|----------|
| 4 | Concrete examples (code, sample output, or template); copy-pasteable; match described workflow |
| 2-3 | Examples present but not directly usable; or mismatch with workflow |
| 1 | Vague examples or aspirational snippets |
| 0 | No examples |

---

## Pillar 6: Modifiers — +/-15 points

### Bonuses (up to +15)

| Bonus | Points | Criteria |
|-------|--------|----------|
| Checklist | +3 | Includes a checklist for tracking progress or review |
| Grep-friendly | +2 | Consistent heading format; keyword anchors; easy to search |
| Skill ecosystem | +2 | References or invokes other skills (creates interoperability) |
| Error recovery | +3 | Has explicit error recovery or fallback instructions |
| Output specification | +3 | Has a structured output format with template |
| DO/DON'T pairs | +2 | Includes explicit good/bad pattern comparisons |

### Penalties (up to -15)

| Penalty | Points | Criteria |
|---------|--------|----------|
| Narrative in body | -5 | Background stories, event descriptions, or attributions in SKILL.md body |
| Invalid YAML | -5 | Frontmatter doesn't parse |
| Hardcoded values | -3 | Values that should be configurable are hardcoded |
| **Project scope leakage** | **-5** | **Hardcoded references to a specific project (file paths like `scripts/x-crawler.ts`, internal APIs like `GET /api/x/bookmarks`, assumptions like "this project already uses X"). Global skills must work in any project.** |
| Broken references | -3 | Links to non-existent files |
| Redundant content | -2 | Same information repeated in SKILL.md and references/ |
| Missing paired docs | -2 | Skill created by manufacturing pipeline lacks description file |
