// Skill Quality Gate — references local skills for grading, improvement, and description optimization.
// This module generates prompts that instruct AI assistants to use the project's
// .claude/skills/skill-grader/ and .claude/skills/skill-creator/ for quality evaluation.

export interface PillarScores {
  progressiveDisclosure: number;  // max 30
  easeOfUse: number;              // max 25
  specCompliance: number;         // max 15
  writingStyle: number;           // max 10
  utility: number;                // max 20
  modifiers: number;              // range -15 to +15
}

export interface SkillGrade {
  score: number;
  grade: string;        // A, B, C, D, F
  pillarScores: PillarScores;
  feedback: string[];
  passing: boolean;
}

export const QUALITY_THRESHOLD = 80;
export const MAX_ITERATIONS = 3;

export const GRADE_MAP: Record<string, [number, number]> = {
  'A': [90, 100],
  'B': [80, 89],
  'C': [70, 79],
  'D': [60, 69],
  'F': [0, 59],
};

// Skill paths relative to project root
const SKILL_GRADER_PATH = '.claude/skills/skill-grader';
const SKILL_CREATOR_PATH = '.claude/skills/skill-creator';

export function generateGradingPrompt(skillMd: string): string {
  return `You are a skill quality evaluator. Grade the following SKILL.md using the skill-grader skill.

## SKILL.md to Grade

\`\`\`markdown
${skillMd}
\`\`\`

## Instructions

1. Read the skill-grader skill at \`${SKILL_GRADER_PATH}/SKILL.md\` and follow its complete evaluation process.
2. Read the detailed scoring rubric at \`${SKILL_GRADER_PATH}/references/scoring-rubric.md\` for per-pillar sub-criteria.
3. Execute all steps defined in skill-grader: locate the skill, run scope compliance pre-check, score each of the 6 pillars, assess PDA tier, and generate the grading report.
4. Use "Pipeline mode" (compact GRADE_RESULT block) as defined in \`${SKILL_GRADER_PATH}/references/report-template.md\`.

## Output Format

After following the skill-grader process, return ONLY a JSON object with this structure (no markdown fences, no explanation):

{
  "score": <number 0-100>,
  "grade": "<A|B|C|D|F>",
  "pillarScores": {
    "progressiveDisclosure": <number 0-30>,
    "easeOfUse": <number 0-25>,
    "specCompliance": <number 0-15>,
    "writingStyle": <number 0-10>,
    "utility": <number 0-20>,
    "modifiers": <number -15 to +15>
  },
  "feedback": [
    "<actionable feedback string>",
    ...
  ],
  "passing": <boolean, true if score >= ${QUALITY_THRESHOLD}>
}`;
}

export function generateImprovementPrompt(skillMd: string, grade: SkillGrade): string {
  const lowPillars: string[] = [];
  const entries: Array<{ key: keyof PillarScores; name: string; max: number }> = [
    { key: 'progressiveDisclosure', name: 'Progressive Disclosure Architecture', max: 30 },
    { key: 'easeOfUse', name: 'Ease of Use', max: 25 },
    { key: 'specCompliance', name: 'Spec Compliance', max: 15 },
    { key: 'writingStyle', name: 'Writing Style', max: 10 },
    { key: 'utility', name: 'Utility', max: 20 },
    { key: 'modifiers', name: 'Modifiers', max: 15 },
  ];

  for (const entry of entries) {
    const actual = grade.pillarScores[entry.key];
    const threshold = entry.max * 0.7;
    if (actual < threshold) {
      lowPillars.push(`- **${entry.name}**: scored ${actual}/${entry.max} (needs ${Math.ceil(threshold)}+)`);
    }
  }

  const feedbackSection = grade.feedback.length > 0
    ? `## Specific Feedback from Grading\n\n${grade.feedback.map(f => `- ${f}`).join('\n')}`
    : '';

  return `You are a skill improvement specialist. Improve the SKILL.md below from ${grade.score}/100 to ${QUALITY_THRESHOLD}+.

## Current SKILL.md

\`\`\`markdown
${skillMd}
\`\`\`

## Pillars Scoring Below 70% of Max

${lowPillars.length > 0 ? lowPillars.join('\n') : 'All pillars are above 70% threshold, but total score is still below passing. Improve across the board.'}

${feedbackSection}

## Instructions

1. Read the skill-creator skill at \`${SKILL_CREATOR_PATH}/SKILL.md\` for skill creation best practices and patterns.
2. Read the scoring rubric at \`${SKILL_GRADER_PATH}/references/scoring-rubric.md\` to understand exactly what each pillar requires.
3. Rewrite the SKILL.md addressing every low-scoring pillar while keeping the skill's core purpose intact.
4. Ensure YAML frontmatter is valid with name + description using | block scalar.
5. Keep the body concise (target ≤ 4KB for top token economy score).
6. Use imperative voice throughout.
7. Add verification steps, examples, and error recovery where missing.

Return ONLY the improved SKILL.md content, no explanations.`;
}

export function generateDescriptionOptimizationPrompt(skillMd: string): string {
  return `You are a skill metadata optimizer. Improve the \`description\` field in the SKILL.md frontmatter for better trigger accuracy.

## Current SKILL.md

\`\`\`markdown
${skillMd}
\`\`\`

## Instructions

1. Read the skill-creator skill at \`${SKILL_CREATOR_PATH}/SKILL.md\` — refer to its description optimization section.
2. Read the description optimization script logic at \`${SKILL_CREATOR_PATH}/scripts/improve_description.py\` for principles on how descriptions are evaluated.
3. Apply these principles:
   - **Imperative phrasing**: Start with an action verb.
   - **User-intent focused**: Describe the user's problem, not the implementation.
   - **Distinctive language**: Use terms that differentiate this skill from others.
   - **Specific trigger phrases**: Include both English and Traditional Chinese (繁體中文) trigger phrases.
   - **Max 500 characters** for the description field.
   - **Use | block scalar** YAML syntax.

Return ONLY the improved SKILL.md with the optimized description field. No explanations.`;
}

export function generateQualityGateInstructions(): string {
  return `## Skill Quality Gate Loop

Follow these steps to convert, grade, and publish a skill. Do NOT ask the user for confirmation during this loop.

### Required Skills

This quality gate uses two skills located in the project:
- **skill-grader**: \`${SKILL_GRADER_PATH}/\` — 6-pillar 100-point scoring rubric
- **skill-creator**: \`${SKILL_CREATOR_PATH}/\` — skill creation best practices and description optimization

### Step 1: Convert to Skill Draft
Call \`convert_to_skill\` to generate the initial SKILL.md draft.

### Step 2: Grade the Draft
Call \`get_skill_quality_gate\` with \`action='grade'\`. Follow the returned instructions which reference the local skill-grader skill. Read \`${SKILL_GRADER_PATH}/SKILL.md\` and \`${SKILL_GRADER_PATH}/references/scoring-rubric.md\` to execute the grading process.

### Step 3: Produce Grade
Produce a SkillGrade JSON with: score (0-100), grade (A/B/C/D/F), pillarScores, feedback, passing (true if >= ${QUALITY_THRESHOLD}).

### Step 4: Check Pass/Fail
If score >= ${QUALITY_THRESHOLD}, proceed to Step 7.

### Step 5: Improve if Failing
If score < ${QUALITY_THRESHOLD}, call \`get_skill_quality_gate\` with \`action='improve'\`. Follow the returned instructions which reference both skill-grader and skill-creator.

### Step 6: Re-grade
Go back to Step 2.

### Step 7: Optimize Description
Call \`get_skill_quality_gate\` with \`action='optimize_description'\`. Follow the returned instructions which reference skill-creator's description optimization process.

### Step 8: Publish
Call \`publish_skill\` with the final SKILL.md content.

### Constraints
- Maximum ${MAX_ITERATIONS} grade-improve iterations. After ${MAX_ITERATIONS} iterations, proceed to Step 7 regardless of score.
- Do NOT ask the user for confirmation between steps.
- Report the final score and grade to the user when complete.`;
}
