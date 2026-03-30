# Grading Report Templates

## Full Report (Standalone Mode)

Use this format when the skill-grader is invoked directly by the user.

```
## Skill Grading Report

**Skill**: {skill-name}
**Path**: {skill-path}
**Evaluated**: {YYYY-MM-DD}
**Structure**: {Tier 1 only / Tier 1+2 / Tier 1+2+3}

### Overall: {N}/100 — Grade {A/B/C/D/F}

**Quality Gate**: {PASSED / FAILED} (threshold: {N}/100)

### Pillar Breakdown

| Pillar | Score | Max | % |
|--------|-------|-----|---|
| Progressive Disclosure Architecture | {n} | 30 | {n}% |
| Ease of Use | {n} | 25 | {n}% |
| Spec Compliance | {n} | 15 | {n}% |
| Writing Style | {n} | 10 | {n}% |
| Utility | {n} | 20 | {n}% |
| Modifiers | {+/-n} | ±15 | — |
| **Total** | **{N}** | **100** | **{N}%** |

### PDA Tier Assessment

- **Current structure**: {description}
- **Recommended**: {appropriate tier}
- **Verdict**: {Appropriate / Should add references/ / Over-engineered}

### Top 3 Improvements

1. **{Pillar}** ({current}/{max}): {specific recommendation}
   - Impact: +{N} points estimated
2. **{Pillar}** ({current}/{max}): {specific recommendation}
   - Impact: +{N} points estimated
3. **{Pillar}** ({current}/{max}): {specific recommendation}
   - Impact: +{N} points estimated

### Strengths

- {strength 1}
- {strength 2}

### Per-Pillar Notes

{Detailed notes on scoring rationale for each pillar}
```

## Compact Report (Pipeline Mode)

Use this format when called from manufacturing workflows (x-skill-scout, github-skill-creator). The subagent outputs this structured block for the parent to parse.

```
GRADE_RESULT:
  skill: {name}
  score: {N}/100
  grade: {A-F}
  passed: {true/false}
  threshold: {N}
  pillars:
    pda: {n}/30
    ease_of_use: {n}/25
    spec_compliance: {n}/15
    writing_style: {n}/10
    utility: {n}/20
    modifiers: {+/-n}
  pda_tier:
    current: {tier description}
    recommended: {tier description}
    appropriate: {true/false}
  top_improvements:
    - "{improvement 1} (+{N} pts)"
    - "{improvement 2} (+{N} pts)"
    - "{improvement 3} (+{N} pts)"
```

## Quality Summary Table (Post-Manufacturing)

Use this format after a batch of skills have been manufactured and graded.

```
╔══════════════════════════════════════════════════════════════╗
║  Skill Quality Report                                       ║
╚══════════════════════════════════════════════════════════════╝

| # | Skill | Score | Grade | Gate | Weakest Pillar |
|---|-------|-------|-------|------|----------------|
| 1 | {name} | {N}/100 | {A-F} | PASSED/FAILED | {pillar name} |
| 2 | {name} | {N}/100 | {A-F} | PASSED/FAILED | {pillar name} |

Pass rate: {N}/{total} ({percentage}%)
Average: {avg}/100
```
