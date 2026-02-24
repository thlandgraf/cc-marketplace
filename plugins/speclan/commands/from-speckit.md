---
name: speclan:from-speckit
description: Convert speckit specifications to SPECLAN format
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
argument-hint: "[speckit-directory]"
---

# SPECLAN From-Speckit Command

Convert speckit phase-based specifications to SPECLAN hierarchical format.

## Prerequisites

This command requires understanding of both formats:

**Speckit Format** (source):
- Located in `specs/` directory
- Numbered directories: `###-phase-name/`
- `spec.md` with bold markdown metadata
- User stories with priorities (P1-P4), optionally grouped into PART sections
- Functional requirements (FR-###)
- Success criteria (SC-###)

**SPECLAN Format** (target):
- Located in `speclan/` directory
- Entity hierarchy: Goal → Feature → Child Feature → Requirement
- YAML frontmatter with proper IDs (G-###, F-####, R-####)
- Directory-based storage with `change-requests/` subdirectories

## Instructions

### 1. Check Plugin Dependency

Verify speckit plugin is installed. If not:
```
Error: speckit plugin is not installed.

The /speclan:from-speckit command requires speckit for full functionality.
Install speckit plugin to enable this command.

Proceeding with manual conversion...
```

### 2. Locate Speckit Specs

Find speckit specifications:
- Default: `specs/` in project root
- Or use provided directory argument
- Look for numbered directories with `spec.md` files

### 3. Parse Speckit Format

For each `spec.md` file, extract:

**Metadata:**
- Feature Branch name
- Created date
- Status
- Input source

**Content:**
- User stories (with priorities P1-P4)
- PART sections (if present)
- Functional requirements (FR-###)
- Success criteria (SC-###)
- Acceptance scenarios (Given/When/Then)
- Key entities and business rules
- Assumptions and constraints

### 4. Map to SPECLAN Entities

Convert speckit elements to a **3-level hierarchy**:

| Speckit Element | SPECLAN Entity |
|-----------------|----------------|
| Phase (###-name) | Parent Feature (F-####) |
| User Story / PART section | Child Feature (F-####), nested under parent |
| Functional Requirement (FR-###) | Requirement (R-####), under the child feature |
| Success Criterion (SC-###) | Success criteria in parent feature body |
| Priority (P1-P4) | `priority-p#` tag on child feature and its requirements |
| Acceptance Scenario (Given/When/Then) | Acceptance criteria in requirement body |

**CRITICAL RULES:**

1. **DO NOT add back-references.** No `## Source` sections linking to speckit files.

2. **All generated entities get `status: review`** — converted specs are ready for review, not initial drafts.

3. **Every file body MUST start with `# Title`** — H1 heading matching the frontmatter `title` field. No content before it. Subsequent sections use `## Heading` (H2) and below.

4. **Directory and file names must be clean** — Names must match pattern `{PREFIX}-{digits}-{kebab-slug}`. No curly braces, spaces, quotes, or other special characters.

5. **DO NOT carry over speckit identifiers** into SPECLAN specs. No FR-###, SC-###, US-N, or PART A/B/C references. SPECLAN entities have their own identity. Describe functional requirements in plain language as numbered items instead.

6. **DO NOT create template directories.** The command generates `goals/` and `features/` trees only.

7. **Requirements use directory-based storage** — Each requirement is a directory containing its .md file: `requirements/R-ZZZZ-slug/R-ZZZZ-slug.md`. NEVER store requirements as flat files like `requirements/R-ZZZZ-slug.md`.

8. **IDs MUST be globally unique** — Never generate IDs for multiple child features in a single batch without writing the previous batch's files to disk first. The ID generator's collision detection only works against files already on disk. Generate → write → generate → write, one child feature at a time.

### 5. Identify Child Feature Groupings

Before generating files, analyze each spec.md to identify child feature boundaries:

**Pattern A: PART sections** (e.g., "PART A: Product Separation", "PART B: Contact Roles")
- Each PART becomes one child feature
- User stories within the PART contribute to the child feature's description
- FRs within the PART become requirements under that child feature

**Pattern B: User stories without PARTs** (e.g., US1-US7 at top level)
- Group user stories by functional domain (authentication, data management, workflow, etc.)
- Each group becomes one child feature
- Aim for 3-7 child features per parent (not 1:1 user story to feature)
- When in doubt, group by P1/P2/P3 priority tiers

### 6. Generate Entity IDs (Phased)

Generate IDs using the speclan-id-generator JS CLI. IDs are generated **in phases** because `--parent` requires the parent entity to exist on disk.

```bash
SCRIPT="${CLAUDE_PLUGIN_ROOT}/skills/speclan-id-generator/scripts/generate-id.mjs"
```

**Phase A — Parent feature IDs** (no `--parent`, generated first):
```bash
node "$SCRIPT" --type feature --count <num-phases> --speclan-root <speclan-dir>
# Output: {"ok":true,"data":{"type":"feature","ids":["F-1234","F-5678",...]}}
```
Parse IDs with `jq -r '.data.ids[]'`. Write parent feature files to disk immediately.

**Phase B — Child feature IDs** (with `--parent`, after parent files exist):
```bash
# For each parent feature:
node "$SCRIPT" --type feature --parent F-1234 --count <num-children> --speclan-root <speclan-dir>
```
The `--parent` flag generates IDs **end-biased after existing siblings**, preserving natural ordering within the parent. Write child feature files to disk immediately.

**Phase C — Requirement IDs** (with `--parent`, **one child feature at a time**):
```bash
# For EACH child feature individually:
#   1. Generate requirement IDs for this child feature
node "$SCRIPT" --type requirement --parent F-YYYY --count <num-reqs> --speclan-root <speclan-dir>
#   2. Write all requirement files for this child feature to disk
#   3. THEN move to the next child feature
```
**CRITICAL: Generate and write requirements one child feature at a time.** The ID generator detects collisions only against files already on disk. If you generate requirement IDs for multiple child features before writing any to disk, you WILL get duplicate IDs.

**Phase D — Goal IDs** (after all features exist, step 10):
```bash
node "$SCRIPT" --type goal --count <num-goals> --speclan-root <speclan-dir>
```

**IMPORTANT:** The pattern at every level is: **generate IDs → write files to disk → generate next batch**. Never batch ID generation across multiple parents without writing intermediate results.

### 7. Determine Owner

Get the git identity for the `owner` field on all generated entities:

```bash
OWNER=$(git config user.name)
```

If git user.name is not set, prompt the user for an owner value. Never leave `owner` empty.

### 8. Generate SPECLAN Files

Write files **top-down**: all parent features first (Phase A IDs), then child features (Phase B IDs), then requirements (Phase C IDs). Each level must be on disk before generating the next level's IDs with `--parent`.

#### Parent Feature (one per speckit phase)

```yaml
---
id: F-XXXX
type: feature
title: [from speckit Feature Branch name]
status: review
owner: [OWNER from git config]
created: [from speckit created date]
updated: [current date]
goals: []  # Updated in Goal Creation step
depends-on: [F-XXXX]  # Previous phase's parent feature (omit for first phase)
tags: [phase-N]
---
```

**Directory layout:**

```
speclan/features/F-XXXX-slug/
├── F-XXXX-slug.md              ← parent feature file
├── F-YYYY-child-1/             ← child feature (sibling of parent .md)
│   ├── F-YYYY-child-1.md
│   └── requirements/
│       └── R-ZZZZ-req/
│           └── R-ZZZZ-req.md
└── F-YYYY-child-2/             ← another child feature
    └── ...
```

**IMPORTANT: Child feature directories are SIBLINGS of the parent .md file, NOT nested inside a subdirectory named after the parent.**

Anti-pattern (WRONG — double-nesting):
```
F-XXXX-slug/F-XXXX-slug/F-YYYY-child/  ← NEVER do this
```

**Body content:** Must start with `# Title`. Then: Overview, Scope (In/Out), Key Entities, Success Criteria (as checkboxes).

#### Child Feature (one per User Story group or PART section)

```yaml
---
id: F-YYYY
type: feature
title: [from User Story title or PART name]
status: review
owner: [OWNER from git config]
created: [from speckit created date]
updated: [current date]
goals: []  # Updated in Goal Creation step
requirements: [R-XXXX, R-XXXX, ...]
tags: [priority-p1]
---
```

**Directory:** `speclan/features/F-XXXX-parent/F-YYYY-child/`
**Body content:** Must start with `# Title`. Then: User Story (As a... I want... so that...), Scope, Business Context.

#### Requirement (one per FR or logical FR group)

```yaml
---
id: R-ZZZZ
type: requirement
title: [descriptive title — no speckit FR numbers]
status: review
owner: [OWNER from git config]
created: [current]
updated: [current]
feature: F-YYYY
---
```

**Directory:** `speclan/features/F-XXXX-parent/F-YYYY-child/requirements/R-ZZZZ-slug/R-ZZZZ-slug.md`

Requirements use **directory-based storage** (directory name matches file name):
```
CORRECT:  requirements/R-ZZZZ-slug/R-ZZZZ-slug.md
WRONG:    requirements/R-ZZZZ-slug.md  ← flat file, NEVER do this
```

**Body content:** Must start with `# Title`. Then: Description (plain language, no FR-### references), Acceptance Criteria (Given/When/Then checkboxes).

### 9. Capture Phase Dependencies

Speckit phases build sequentially (001 → 002 → 003...).

For each parent feature derived from phase N > 1:
- Add `depends-on:` field listing the parent feature ID of phase N-1
- If a phase explicitly references entities from a non-adjacent phase, add that dependency too

```yaml
# Parent feature for Phase 003
depends-on:
  - F-XXXX  # Phase 002 parent feature ID
```

### 10. Create Goals

After all features and requirements are generated, analyze the full set of parent features and synthesize Goals:

1. **Group parent features by strategic theme** — Look for natural business domains across the phases (e.g., "Installation Workflow Management", "Multi-Tenant Platform", "Energy Analysis").

2. **Create one Goal per theme:**

```yaml
---
id: G-XXX
type: goal
title: [strategic theme name]
status: review
owner: [OWNER from git config]
created: [current date]
updated: [current date]
contributors:
  - F-XXXX
  - F-YYYY
---
```

Body content: Must start with `# Title`. Then: Overview (1-2 paragraphs on what this goal achieves and why), Success Indicators (measurable outcomes derived from contributing features' success criteria), Contributing Features (linked list).

3. **Update feature `goals:` arrays** — Set `goals: [G-XXX]` on each parent feature and its children.

4. **Create `speclan/goals/` directory** and write goal files as flat files: `G-XXX-slug.md`.

### 11. Create Vision and Mission

After the full specification tree is generated (features, requirements, AND goals), create Vision and Mission files that synthesize the overall product direction. These are created LAST because the full picture is needed.

**Vision** (`speclan/vision.md`):
```markdown
# Vision

[One paragraph: the aspirational future state the product enables.
Derived from the full set of goals and features. Forward-looking, inspirational.]
```

**Mission** (`speclan/mission.md`):
```markdown
# Mission

[One paragraph: what the product does, for whom, and how it delivers value.
Derived from the scope sections across all parent features. Present-tense, concrete.]
```

### 12. Output Summary

```
## Conversion Complete

Converted [X] speckit phases to SPECLAN hierarchical format.

### Created Entities
| Type | Count |
|------|-------|
| Goals | X |
| Parent Features | Y |
| Child Features | Z |
| Requirements | W |

### Structure
speclan/
├── vision.md
├── mission.md
├── goals/
│   └── G-XXX-strategic-theme.md
└── features/
    └── F-XXXX-phase-name/
        ├── F-XXXX-phase-name.md
        ├── F-YYYY-child-feature-1/
        │   ├── F-YYYY-child-feature-1.md
        │   └── requirements/
        │       └── R-ZZZZ-description/
        │           └── R-ZZZZ-description.md
        └── F-YYYY-child-feature-2/
            └── ...

### Next Steps
1. Review converted specifications
2. Review goal groupings and adjust if needed
3. Adjust child feature groupings if needed
```

## Incremental Conversion

If some specs already converted:
- Detect existing SPECLAN entities by checking `speclan/features/` for phase-tagged features
- Skip already-converted speckit specs
- Only convert new or modified specs
- Update existing specs if speckit changed

## Error Handling

If speckit directory not found:
```
Error: No speckit specifications found.

Expected location: specs/
Expected format: ###-phase-name/spec.md

Verify speckit specs exist before running this command.
```
