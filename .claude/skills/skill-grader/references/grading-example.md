# Grading Example — Worked Case Study

## Hypothetical Skill: `deploy-to-cloud`

This example demonstrates grading a complete skill from start to finish, showing how sub-scores combine into pillar totals and how to apply the rubric in practice.

### Target Skill Structure

```
.claude/skills/deploy-to-cloud/
├── SKILL.md (2.8KB body)
└── references/
    ├── deployment-targets.md
    ├── error-recovery.md
    └── verification-checklist.md
```

---

## Step 1: Pillar 1 — Progressive Disclosure Architecture (30 pts)

### Token Economy (8/10)
- SKILL.md body: 2.8KB (well under 4KB limit) ✓
- No section exceeds 40 lines ✓
- Evidence: Quick reference table + 5 focused sections (Setup, Deploy Steps, Verify, Rollback, Troubleshoot)
- Minor: Rollback section could be slightly more concise
- **Score: 8/10**

### Layered Structure (9/10)
- Main SKILL.md with clear quick reference table linking to 3 reference files ✓
- References are standalone and focused:
  - `deployment-targets.md` → specific cloud platform configs
  - `error-recovery.md` → error handling patterns
  - `verification-checklist.md` → post-deploy verification
- Cross-references use relative paths (`references/error-recovery.md`) ✓
- **Score: 9/10**

### Navigation Signals (9/10)
- Clear h2→h3 hierarchy (Setup → Prerequisites, Deploy Steps → Phase 1/2/3, etc.)
- Quick reference table at top with "When to Read" column ✓
- Relative path links to all references ✓
- Minor: One h3 heading could be clearer ("Error Handling" vs "When Deployment Fails")
- **Score: 9/10**

**Pillar 1 Total: 8 + 9 + 9 = 26/30**

---

## Step 2: Pillar 2 — Ease of Use (25 pts)

### Metadata Quality (7/8)
- Description includes specific triggers: "deploy a service to cloud", "push code to production", "setup CI/CD", "cloud deployment pipeline"
- Bilingual: EN ("deploy to cloud") + ZH ("部署到雲端", "雲端部署流程") ✓
- YAML valid and properly structured ✓
- Slight weakness: description could mention "rollback scenarios" explicitly
- **Score: 7/8**

### Discoverability (6/7)
- 4 natural trigger phrases: "deploy to cloud", "cloud deployment", "production rollout", "CI/CD setup"
- Covers both "do X" (deploy) and "help with X" (setup pipeline) patterns ✓
- Minor: Could include "how do I migrate to cloud?" as variant
- **Score: 6/7**

### Terminology Consistency (5/5)
- Consistent terms throughout:
  - "deployment target" always means the cloud service
  - "phase" always refers to sequential steps
  - "artifact" always means built code/binary
- No synonym confusion ✓
- **Score: 5/5**

### Workflow Clarity (5/5)
- Numbered steps: Phase 1 (Prepare) → Phase 2 (Deploy) → Phase 3 (Verify) → Phase 4 (Rollback if needed)
- Decision point: "IF verification fails THEN proceed to Rollback section" ✓
- Output per step: "Expected output: Service running on target platform, health check passing"
- **Score: 5/5**

**Pillar 2 Total: 7 + 6 + 5 + 5 = 23/25**

---

## Step 3: Pillar 3 — Spec Compliance (15 pts)

### Frontmatter Validity (5/5)
- Valid YAML with `name: deploy-to-cloud` (kebab-case) ✓
- `description:` uses `|` block scalar ✓
- Parses without syntax error ✓
- **Score: 5/5**

### Naming Conventions (4/5)
- Directory: `deploy-to-cloud` (kebab-case) ✓
- Matches `name` field ✓
- Reference files: `deployment-targets.md`, `error-recovery.md`, `verification-checklist.md` (all kebab-case with hyphens) ✓
- Minor: Could use more consistent prefix (e.g., `deploy-target-config.md` instead of `deployment-targets.md`)
- **Score: 4/5**

### Description Quality (5/5)
- First sentence is action verb: "Orchestrates..." (action-oriented) ✓
- Includes trigger scenarios: "push code to cloud", "production rollout", "CI/CD pipeline setup"
- Length: ~350 chars (well under 500 limit) ✓
- **Score: 5/5**

**Pillar 3 Total: 5 + 4 + 5 = 14/15**

---

## Step 4: Pillar 4 — Writing Style (10 pts)

### Imperative Voice (4/4)
- All instructions: "Read the deployment target config", "Run the pre-deploy verification", "Execute the rollback"
- No passive voice detected ✓
- Even procedural sections maintain imperative tone
- **Score: 4/4**

### Objectivity (3/3)
- No promotional language ("powerful", "amazing") ✗
- No background stories or event narratives ✓
- No source attribution in body ✓
- **Score: 3/3**

### Conciseness (3/3)
- No redundant sentences; each step has one clear action ✓
- Deployment matrix (platforms × configurations) uses table format ✓
- Code examples (bash commands) are minimal but complete ✓
- **Score: 3/3**

**Pillar 4 Total: 4 + 3 + 3 = 10/10**

---

## Step 5: Pillar 5 — Utility (20 pts)

### Problem-Solving Power (6/7)
- Addresses a real, recurring need: "deploying to cloud safely" ✓
- Steps are specific and executable: "Pull image from registry → Create service → Expose port → Run health check"
- Covers happy path (successful deployment) ✓
- Covers error case (verification failure → rollback) ✓
- Minor: Could include timeout handling for long deployments
- **Score: 6/7**

### Degrees of Freedom (4/5)
- Adapts to 3 cloud platforms: AWS, GCP, Azure
- Has configurable parameters: service port, replica count, health check endpoint
- Works across different application types: web, API, worker processes
- Minor: Doesn't address multi-region deployments
- **Score: 4/5**

### Feedback Loops (4/4)
- Verification step: Run health check, verify logs, confirm traffic routing ✓
- User knows success state: "Service reporting healthy in cloud console"
- User knows failure state: "Health check timeout → run rollback"
- Output format specified: YAML config applied, service online
- **Score: 4/4**

### Examples (4/4)
- Concrete example: AWS CloudFormation template snippet ✓
- Copy-pasteable bash commands with comments ✓
- Sample output showing expected logs and metrics ✓
- Matches workflow exactly ✓
- **Score: 4/4**

**Pillar 5 Total: 6 + 4 + 4 + 4 = 18/20**

---

## Step 6: Pillar 6 — Modifiers (±15 pts)

### Bonuses Applied

| Bonus | Points | Evidence |
|-------|--------|----------|
| Checklist | +3 | `references/verification-checklist.md` with 8-point post-deploy checklist |
| Output specification | +3 | Each phase explicitly states expected outputs (service URL, status, metrics) |
| Error recovery | +3 | Dedicated rollback section with automatic rollback triggers |

**Total Bonuses: +9**

### Penalties Applied

None detected. No narrative, valid YAML, all references exist, no broken links, no redundancy, good scope clarity.

**Total Penalties: 0**

**Pillar 6 Total: +9**

---

## Final Score Calculation

| Pillar | Score | Max |
|--------|-------|-----|
| Progressive Disclosure Architecture | 26 | 30 |
| Ease of Use | 23 | 25 |
| Spec Compliance | 14 | 15 |
| Writing Style | 10 | 10 |
| Utility | 18 | 20 |
| Modifiers | +9 | ±15 |
| **TOTAL** | **92** | **100** |

---

## Grade Assignment

- **Score**: 92/100
- **Grade**: A (90-100 range)
- **Quality Gate**: PASSED (≥ 80)

---

## Explanation of Key Decisions

**Why 26/30 on PDA?** The skill meets the 3KB threshold exemption's minimum (8/10), but achieves 9 on layering and navigation by exceeding base expectations with excellent reference organization.

**Why 23/25 on Ease of Use?** Metadata is strong, discoverability is excellent but could be slightly broader. Terminology and workflow are perfect.

**Why +9 on Modifiers?** Three bonuses (checklist, output spec, error recovery) align perfectly with the skill's purpose. No penalties apply.

---

## Top Improvement (if required)

If this skill were at 79/100 instead of 92, the recommendation would be:

1. **Pillar 5 – Utility** (18/20): Add multi-region deployment logic to `deployment-targets.md`
   - Impact: +2 points → total 94/100

This example skill is production-ready and requires no improvement.
