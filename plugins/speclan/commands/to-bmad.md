---
name: speclan:to-bmad
description: Generate a BMAD-standard PRD from approved SPECLAN specs using BMAD's native PRD creation workflow
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Skill
argument-hint: "[feature-ids...]"
---

# SPECLAN To-BMAD Command

Generate a BMAD-standard PRD by feeding approved SPECLAN specifications into BMAD's native PRD creation workflow (`/bmad-bmm-create-prd`). This produces richer output (user journeys, risk mitigation, phased scoping) than the standalone converter because BMAD's PM agent synthesizes the PRD natively.

For the standalone converter approach (no BMAD skills required), use `/speclan:to-bmad-prd` instead.

## Prerequisites

This command requires:
- **BMAD-METHOD installed** in the project (`_bmad/` directory)
- **BMAD skills available**: `/bmad-agent-bmm-pm` and `/bmad-bmm-create-prd`
- **Approved SPECLAN specifications** to convert

## Instructions

### 1. Check BMAD Installation and Skills

Verify BMAD is installed:

```bash
ls _bmad/ 2>/dev/null
```

If `_bmad/` does not exist:
```
Error: BMAD-METHOD is not installed in this project.

Install BMAD first: npx bmad-method install

Alternative: Use /speclan:to-bmad-prd for standalone PRD generation without BMAD.
```

Check whether the required BMAD skills are available. Look for `/bmad-agent-bmm-pm` and `/bmad-bmm-create-prd` in the available skills list.

If either skill is missing:
```
Error: Required BMAD skills not found.

Missing: /bmad-bmm-create-prd (and/or /bmad-agent-bmm-pm)

Please install the BMAD-METHOD skills before running this command.

Alternative: Use /speclan:to-bmad-prd for standalone PRD generation without BMAD skills.
```

### 2. Find Approved Specifications

Query SPECLAN directory for all approved entities:

```bash
QUERY_SCRIPT="${CLAUDE_PLUGIN_ROOT}/skills/speclan-query/scripts/query.sh"
bash "$QUERY_SCRIPT" --type feature --filter-status approved --full <speclan-dir>
```

**Note:** The speclan-dir is a **positional argument** (last argument), NOT a named flag.

**If specific feature IDs provided as arguments:**
- Only include specified features and their requirements
- Verify each is approved (warn if not)
- Allow override with confirmation

**If no approved features found:**
```
No approved specifications found for PRD generation.

To approve features for export:
1. Review features: change status from 'draft'/'review' to 'approved'
2. Run /speclan:to-bmad again
```

### 3. Collect Specification Inventory

Build a complete inventory of what BMAD's PRD creator should read:

**3a. Core documents:**
- `speclan/vision.md` (if exists)
- `speclan/mission.md` (if exists)

**3b. Goals:**
- All goal files in `speclan/goals/`

**3c. Approved features and requirements:**
- All approved parent features with their full trees (child features, requirements)
- Record the relative path from project root for each file

### 4. Prepare Instruction for BMAD PRD Creator

Construct the instruction to pass to `/bmad-bmm-create-prd`. The instruction must tell BMAD's PM agent to:

1. Read each approved SPECLAN specification listed below
2. Use the SPECLAN content as the primary input for PRD creation
3. For each FR and NFR, include a markdown link (relative to project root) to the source SPECLAN file for traceability
4. Follow standard BMAD PRD structure and quality standards

**Instruction template:**

```
Create a PRD from the following approved SPECLAN specifications. These specifications
are stored as markdown files with YAML frontmatter in the speclan/ directory.

## Input Documents

### Vision & Mission
- speclan/vision.md
- speclan/mission.md

### Goals
{list each goal file path}

### Approved Features ({count} specifications)
{for each approved feature, list the file path}

## Traceability Requirement

For EACH functional requirement (FR) and non-functional requirement (NFR) in the PRD,
include a markdown link to the source SPECLAN file. Format:

- **FR1:** Player can move left and right ([R-0443](speclan/features/F-0471/F-0159/requirements/R-0443/R-0443.md))

This creates bidirectional traceability between the PRD and SPECLAN specifications.

## Additional Instructions

- Read the FULL content of each specification file (frontmatter + body)
- Use SPECLAN feature hierarchy to organize capability areas
- Features tagged 'nfr' should map to Non-Functional Requirements
- Preserve the exact language from specifications — do not introduce implementation
  details not present in the source
- Include scope tags (scope-mvp, scope-growth, scope-vision) in phased development section
```

### 5. Invoke BMAD PRD Creation

Run `/bmad-bmm-create-prd` with the prepared instruction. This hands off to BMAD's PM agent which will:
- Read all listed specification files
- Synthesize a BMAD-standard PRD with all standard sections
- Include SPECLAN traceability links
- Write the output to `_bmad-output/planning-artifacts/prd.md`

### 6. Verify Output

After BMAD completes PRD creation, verify:

**6a. File exists:**
```bash
ls _bmad-output/planning-artifacts/[Pp][Rr][Dd]*.md
```

**6b. Traceability links present:**
Spot-check that FR/NFR lines contain markdown links back to `speclan/` paths.

**6c. Coverage check:**
Compare the count of approved features against the PRD's capability areas to ensure nothing was dropped.

### 7. Output Summary

```
## PRD Generation Complete (BMAD-native)

Generated BMAD-standard PRD using BMAD's native PRD creation workflow.

### Source
| Type | Count |
|------|-------|
| Goals | X |
| Features | Y |
| Requirements | Z |

### Generated PRD
Location: _bmad-output/planning-artifacts/prd.md
Method: BMAD-native (/bmad-bmm-create-prd)

### Traceability
Each FR/NFR includes a markdown link back to the source SPECLAN specification file.

### Next Steps (using BMAD workflows)
1. **Validate:** /bmad-bmm-validate-prd — Run BMAD's 13-step PRD validation
2. **Refine:** /bmad-bmm-edit-prd — Interactively refine with PM agent
3. **Continue pipeline:** /bmad-bmm-create-architecture — Generate architecture from the PRD
4. **Epic breakdown:** /bmad-bmm-create-epics-and-stories — Break PRD into implementable epics
```

### 8. Handle Edge Cases

**BMAD skill invocation fails:**
- Report the error clearly
- Suggest: "Try /speclan:to-bmad-prd as a fallback (standalone converter, no BMAD skills needed)"

**PRD missing traceability links:**
- Note in summary: "Some FR/NFR lines may be missing SPECLAN links. Verify traceability manually."

**Partial coverage:**
- List features that appear in the approved inventory but have no corresponding capability area in the PRD
- Suggest re-running or manually adding missing sections with `/bmad-bmm-edit-prd`
