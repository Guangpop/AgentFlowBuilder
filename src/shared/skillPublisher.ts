import { Workflow } from './types.js';
import { SkillGrade, QUALITY_THRESHOLD } from './skillGrading.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SkillInfo {
  name: string;
  description: string;
  path: string;
  grade?: { score: number; grade: string; passing: boolean };
  createdAt?: string;
}

export interface PublishResult {
  success: boolean;
  path: string;
  message: string;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)/);
    if (kv) result[kv[1]] = kv[2].trim();
  }
  return result;
}

export function getGlobalSkillsDir(): string {
  const dir = path.join(os.homedir(), '.claude', 'skills');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function publishSkill(
  name: string,
  skillMd: string,
  workflow: Workflow,
  grade: SkillGrade,
  forcePublish: boolean = false
): PublishResult {
  if (grade.score < QUALITY_THRESHOLD && !forcePublish) {
    return {
      success: false,
      path: '',
      message: `Score ${grade.score} is below threshold ${QUALITY_THRESHOLD}. Pass forcePublish=true to override.`,
    };
  }

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const globalSkillsDir = getGlobalSkillsDir();
  const skillDir = path.join(globalSkillsDir, slug);
  const refsDir = path.join(skillDir, 'references');

  fs.mkdirSync(refsDir, { recursive: true });

  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd, 'utf-8');
  fs.writeFileSync(
    path.join(refsDir, 'workflow.json'),
    JSON.stringify(workflow, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(refsDir, 'grading.json'),
    JSON.stringify(grade, null, 2),
    'utf-8'
  );

  return {
    success: true,
    path: skillDir,
    message: `Skill published to ${skillDir}`,
  };
}

export function listPublishedSkills(): SkillInfo[] {
  const globalSkillsDir = getGlobalSkillsDir();
  const results: SkillInfo[] = [];

  let entries: string[];
  try {
    entries = fs.readdirSync(globalSkillsDir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    const entryPath = path.join(globalSkillsDir, entry);
    const skillMdPath = path.join(entryPath, 'SKILL.md');

    if (!fs.existsSync(skillMdPath)) continue;

    let stat;
    try {
      stat = fs.statSync(entryPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;

    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter.tags || !frontmatter.tags.includes('agentflow-generated')) {
      continue;
    }

    const info: SkillInfo = {
      name: frontmatter.name || entry,
      description: frontmatter.description || '',
      path: entryPath,
    };

    const gradingPath = path.join(entryPath, 'references', 'grading.json');
    if (fs.existsSync(gradingPath)) {
      try {
        const gradeData = JSON.parse(fs.readFileSync(gradingPath, 'utf-8'));
        info.grade = {
          score: gradeData.score,
          grade: gradeData.grade,
          passing: gradeData.passing,
        };
      } catch {
        // ignore malformed grading file
      }
    }

    try {
      info.createdAt = stat.birthtime.toISOString();
    } catch {
      // birthtime not available on all platforms
    }

    results.push(info);
  }

  return results;
}

export function loadPublishedSkill(
  name: string
): { skillMd: string; workflow?: Workflow; grade?: SkillGrade } | null {
  const globalSkillsDir = getGlobalSkillsDir();
  const skillDir = path.join(globalSkillsDir, name);
  const skillMdPath = path.join(skillDir, 'SKILL.md');

  if (!fs.existsSync(skillMdPath)) {
    return null;
  }

  const skillMd = fs.readFileSync(skillMdPath, 'utf-8');

  let workflow: Workflow | undefined;
  const workflowPath = path.join(skillDir, 'references', 'workflow.json');
  if (fs.existsSync(workflowPath)) {
    try {
      workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
    } catch {
      // ignore malformed workflow file
    }
  }

  let grade: SkillGrade | undefined;
  const gradingPath = path.join(skillDir, 'references', 'grading.json');
  if (fs.existsSync(gradingPath)) {
    try {
      grade = JSON.parse(fs.readFileSync(gradingPath, 'utf-8'));
    } catch {
      // ignore malformed grading file
    }
  }

  return { skillMd, workflow, grade };
}
