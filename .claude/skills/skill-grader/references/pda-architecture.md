# Progressive Disclosure Architecture (PDA) for Agent Skills

## The 3-Tier Structure

### Tier 1: SKILL.md (Entry Point)

- **Target size**: ≤ 5KB
- **Contains**: Overview, quick reference table, step-by-step workflow summary
- **Quick reference table** links to Tier 2 resources
- **Must be self-contained** for simple use cases — a user should be able to use the skill without reading references/

### Tier 2: references/ (Detailed Guides)

- **Per file**: 2-5KB, focused on a single topic
- **Naming**: kebab-case descriptive names (e.g., `scoring-rubric.md`, `error-handling.md`)
- **Referenced** from SKILL.md via relative paths: `references/scoring-rubric.md`
- **Standalone**: each file readable independently without requiring other reference files

### Tier 3: docs/ (Supporting Materials)

- Training programs, templates, validation reports
- Only needed for complex skills with onboarding requirements
- Most skills do NOT need Tier 3

## Decision Matrix

| Skill body size | Sub-domains? | Recommended Structure |
|----------------|-------------|----------------------|
| < 3KB | Any | Tier 1 only |
| 3-5KB | No (single workflow) | Tier 1 only |
| 3-5KB | Yes (2+ distinct topics) | Tier 1 + Tier 2 |
| > 5KB | Any | Tier 1 + Tier 2 (mandatory) |

## How to Split Content

1. **Keep in SKILL.md**: Workflow steps, quick reference table, decision trees, summary tables, the "80% use case"
2. **Move to references/**: Detailed scoring rubrics, extended examples, specialized guides, format specifications, reference tables > 30 rows
3. **Add Quick Reference table** at top of SKILL.md:

```markdown
## Quick Reference

| Resource | Path | Purpose |
|----------|------|---------|
| Detailed Rubric | `references/scoring-rubric.md` | Full scoring criteria |
| Architecture Guide | `references/pda-architecture.md` | Structure guidelines |
```

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Fix |
|-------------|---------------|-----|
| Everything in one SKILL.md > 5KB | Token waste; hard to navigate | Split into Tier 1 + Tier 2 |
| references/ with only 1 file | Overhead without benefit | Merge back into SKILL.md |
| references/ that duplicate SKILL.md | Redundancy wastes tokens | References extend, not repeat |
| Tier 2 files that cross-reference each other | Creates dependency chains | Each reference must be standalone |
| Forcing PDA on a 2KB skill | Over-engineering | Single file is fine for small skills |
| Project-specific content in global skill | Breaks portability; assumes tools/paths/APIs that don't exist in other projects | Replace with generic recommendations; parameterize all paths and config |

## Directory Structure Template

```
.claude/skills/{skill-name}/
├── SKILL.md                    # Tier 1: overview + workflow
└── references/                 # Tier 2: detailed guides
    ├── {topic-a}.md
    ├── {topic-b}.md
    └── {topic-c}.md
```
