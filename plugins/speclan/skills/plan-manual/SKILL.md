---
name: SPECLAN Plan Manual
description: >-
  This skill should be used when the user asks to "plan manual implementation",
  "create a manual plan", "list approved specs for implementation",
  "plan-manual", "show approved requirements", "prepare implementation plan",
  or wants to generate a plan file listing all approved SPECLAN requirements
  ready for manual implementation.
version: 0.7.0
---

# SPECLAN Plan Manual

Generate a plan file listing all approved SPECLAN features, requirements, and change requests as an ordered hierarchical checklist. The plan file is written to `speclan/.local/plans/` as an audit trail and implementation checklist.

The plan file is **pure data** — no embedded operational prompts. The `implement-manual` skill carries the procedural knowledge.

## Workflow Overview

1. Detect speclan directory
2. Query approved specifications (features, requirements, change requests)
3. Group children by parent, determine pre-check status
4. Determine implementation order
5. Create plan file
6. Validate plan file
7. Present summary to user

## Step 1: Detect Speclan Directory

Locate the speclan directory in the project. Check for `speclan/` in the project root (look for `speclan/features/` or `speclan/goals/` subdirectories). If not found, report error and stop.

```bash
SPECLAN_DIR="./speclan"
```

## Step 2: Query Specifications

**MANDATORY: Use the query script for querying. Do NOT manually glob or grep to discover approved specs.**

Run these Bash commands to get all approved specs as JSON:

```bash
QUERY="${CLAUDE_PLUGIN_ROOT}/skills/speclan-query/scripts/query.sh"

# Get all approved specs
APPROVED_FEATURES=$("$QUERY" --type feature --filter-status approved --full "$SPECLAN_DIR")
APPROVED_REQS=$("$QUERY" --type requirement --filter-status approved --full "$SPECLAN_DIR")
APPROVED_CRS=$("$QUERY" --type change-request --filter-status approved --full "$SPECLAN_DIR")
```

The output is JSON arrays with `id`, `slug`, `type`, `path`, `title`, `status` fields per entity.

If all three arrays are empty (`[]`), report:
```
No approved specifications found in speclan/.

To approve specs for implementation, set their status to "approved":
  status: approved
```

## Step 3: Build Hierarchy

Build a tree containing **only approved items and their ancestor chain**. Items that are neither approved nor ancestors of approved items are **excluded** from the plan.

### 3a: Approved Items

All items from `APPROVED_FEATURES`, `APPROVED_REQS`, and `APPROVED_CRS` are the actionable items — they appear as `[ ]` in the plan.

### 3b: Resolve Parent Chains

For each approved requirement and change request, resolve its full parent chain up to the feature level by **reading the spec files directly**.

**Approved requirements** — read the spec → extract the `feature:` frontmatter field → note the parent feature. Read the parent feature spec to get its title and status.

**Approved change requests** — read the spec → extract `parentId` and `parentType` frontmatter fields:
- If `parentType: requirement` → the CR nests under that requirement at level 3. Navigate to the parent requirement spec (two directory levels up from `change-requests/`) to get the requirement's title, status, and `feature:` field. Both the requirement and the feature are ancestors.
- If `parentType: feature` → the CR nests directly under the feature at level 2. Read the feature spec.

**To find a parent spec from a CR path:** The parent directory is two levels up from the CR file (above `change-requests/`):
```
CR path:   speclan/.../requirements/R-YYYY-.../change-requests/CR-ZZZZ-slug.md
Parent:    speclan/.../requirements/R-YYYY-.../R-YYYY-*.md
```

### 3c: Assemble the Tree

**CRITICAL: The checkbox is determined by the spec's `status:` field, NOT by whether the item was in the query results.**

For each item in the tree, assign the checkbox by reading its spec status:

1. `status: approved` → `[ ]` (pending implementation)
2. Any other status (`in-development`, `under-test`, `released`) → `[x]` (already past planning)

**Only items with `status: approved` get `[ ]`.** Ancestors resolved in Step 3b are NOT approved — they MUST be `[x]`.

**Do NOT include sibling items that have no approved descendants.**

### Example

Given: F-8152 (`released`), R-5847 (`released`), CR-2630 (`approved`):

```
- [x] [F-8152] Change Request Boxes   ← released, ancestor → [x]
  - [x] [R-5847] Merge CR into Spec   ← released, ancestor → [x]
    - [ ] [CR-2630] Also for under-test — CHANGE REQUEST: find and alter existing implementation
```

F-8152 and R-5847 are `[x]` because their status is NOT `approved`. Only CR-2630 is `[ ]` because its status IS `approved`. **Never mark a non-approved spec as `[ ]`.**

## Step 3b: Determine Implementation Order

Use the `implementation-order` agent (Task tool, subagent_type: `speclan:implementation-order`) to determine optimal order.

**Feature ordering** — if there are 2 or more features:

```
Determine implementation order for features:
- F-XXXX
- F-YYYY
[list all feature IDs from Step 3]

SPECLAN directory: {SPECLAN_DIR}
```

If there is only 1 feature, no feature ordering needed.

**Requirement ordering** — for each feature with 2 or more requirements:

```
Determine implementation order for requirements:
- R-AAAA
- R-BBBB
- R-CCCC
[list all requirement IDs for this feature]

Parent feature: F-XXXX
SPECLAN directory: {SPECLAN_DIR}
```

Use the returned order to sequence items within each feature in the plan file.

## Step 4: Create Plan File

Ensure the output directory exists:
```bash
mkdir -p "$SPECLAN_DIR/.local/plans"
```

### Filename

```
speclan/.local/plans/{slug}.{YYYY-MM-DDTHH-MM}.plan.md
```

Characterize the plan's scope in exactly three hyphenated words as the slug. The slug should capture what the plan is about at a glance.

Examples: `svg-graph-rendering`, `auth-flow-rework`, `news-help-assistant`, `table-export-fix`

### Plan File Format

**Read the reference file** at `references/plan-file-format.md` for the complete template, formatting rules, and concrete examples.

**CRITICAL: Follow the template in the reference file EXACTLY. Do NOT add operational prompts, code blocks, or your own wording. The plan file is a pure checklist.**

## Step 5: Validate Plan File

**Do NOT just re-read the plan file.** The plan file is the output being validated — it cannot validate itself. Instead, open each referenced spec file and compare its `status:` field against the checkbox in the plan.

For each checkbox line in the plan:

1. Extract the entity ID (e.g., `F-6089`, `R-5847`, `CR-2630`)
2. Extract the spec file path from the `(...)` parentheses in the link sub-bullet below it
3. **Read that spec file** using the Read tool — do NOT rely on any cached or in-memory data from earlier steps
4. Extract the `status:` value from the spec's YAML frontmatter
5. Compare: `status: approved` → checkbox MUST be `[ ]`, any other status → checkbox MUST be `[x]`

If any mismatch is found, **fix it immediately** by editing the plan file. Then report the corrections:

```
Validation: fixed {count} checkbox(es):
- {ID}: status is {status}, changed [ ] → [x]
```

If all checkboxes are correct, proceed silently.

## Step 6: Present Summary

After the plan file is validated, display a summary:

```
## Manual Implementation Plan Created

Plan file: speclan/.local/plans/{filename}

{feature-count} features, {requirement-count} requirements, {cr-count} change requests.
{pending-count} items pending implementation.

Run the `implement-manual` skill to start implementing.
```

## Error Handling

| Scenario | Action |
|----------|--------|
| No speclan directory | Report error, stop |
| No approved specs (all three arrays empty) | Report message with guidance to approve specs |
| Query script not found | Fall back to manual grep: `grep -rl "^status: approved" speclan/features/` |
| Parent feature not found | Warn, list item without feature context |

## Notes

- This skill only creates the plan file — it does not start implementation
- For automated batch implementation, use the `/speclan:implement` command instead
- The plan file at `speclan/.local/plans/` serves as an audit trail and implementation reference
- The `.local/` directory is typically gitignored and holds per-user state
- The `implement-manual` skill uses checkbox states (`[ ]` → `[~]` → `[?]` → `[x]`) to track progress
