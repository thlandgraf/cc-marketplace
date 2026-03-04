---
name: SPECLAN Implement Manual
description: >-
  This skill should be used when the user asks to "implement next feature",
  "implement manual", "continue implementation", "implement-manual",
  "pick up the plan", "implement from plan", or wants to implement the next
  undone item from a manual implementation plan file. Picks up a plan
  file created by the plan-manual skill and implements items one at a time.
version: 0.6.0
---

# SPECLAN Implement Manual

Pick up a manual implementation plan file and implement the next actionable item. The plan file is a pure data checklist — this skill carries the procedural knowledge for how to implement each item.

## Checkbox States

Plan files use four checkbox states to track progress:

| Checkbox | State | Meaning |
|----------|-------|---------|
| `[ ]` | Pending | Not yet started |
| `[~]` | In development | Implementation in progress |
| `[?]` | In review | Implementation finished, awaiting review |
| `[x]` | Done | Reviewed and accepted |

## Plan File Structure

The plan file has a three-level hierarchy:

```
- [ ] [F-XXXX] Feature Title                               ← Level 1
  - [F-XXXX](path/to/feature-spec.md)                      ← SPEC PATH (extract from parentheses)
  - [ ] [R-AAAA] Requirement Title                          ← Level 2
    - [R-AAAA](path/to/requirement-spec.md)                 ← SPEC PATH
  - [ ] [R-BBBB] Requirement Title                          ← Level 2
    - [R-BBBB](path/to/requirement-spec.md)                 ← SPEC PATH
    - [ ] [CR-0088] CR Title — CHANGE REQUEST: ...          ← Level 3
      - [CR-0088](path/to/change-request-spec.md)           ← SPEC PATH
- [x] [F-YYYY] Already Implemented Feature                  ← pre-checked
  - [F-YYYY](path/to/feature-spec.md)
  - [x] [R-CCCC] Already Done Requirement                   ← pre-checked
    - [R-CCCC](path/to/requirement-spec.md)
  - [ ] [CR-0042] New Change Request — CHANGE REQUEST: ...  ← pending
    - [CR-0042](path/to/change-request-spec.md)
```

Each checkbox line has a **markdown link sub-bullet** below it containing the spec file path inside the `(...)` parentheses. These paths are the primary data for reading spec files.

(See also: the plan-manual skill's `references/plan-file-format.md` for the canonical format spec.)

## Workflow Overview

**IMPORTANT: Always use `EnterPlanMode` at the start.** All steps below run in plan mode — research, parse, and build the implementation plan for user approval before executing.

1. Find plan files
2. Select plan file (ask if multiple, recommend latest)
3. Parse plan and find next actionable item (or exit if done)
4. Mark items `[~]` + set spec status to `in-development`
5. Ask user for implementation instructions
6. Execute implementation
7. Set spec status to `under-test`
8. Mark items `[?]` in plan file

## Step 1: Find Plan Files

```bash
SPECLAN_DIR="./speclan"
PLANS_DIR="$SPECLAN_DIR/.local/plans"
ls "$PLANS_DIR"/*.plan.md 2>/dev/null
```

If no plan files found, report:
```
No manual implementation plans found.

Run the plan-manual skill first to create a plan from approved requirements.
```

## Step 2: Select Plan File

If only one plan file exists, use it automatically.

If multiple plan files exist, present them to the user using AskUserQuestion. Sort by filename (which contains the timestamp) and **recommend the latest one**.

## Step 3: Parse Plan and Find Next Actionable Item

Read the selected plan file. Parse the checkbox hierarchy:

1. Identify all features (level 1) by `[F-XXXX]` pattern
2. For each feature, identify its children (requirements `[R-XXXX]` and change requests `[CR-XXXX]`)
3. Note the spec file paths in the markdown link sub-bullets (read in Step 6)

**Find the first actionable item** using this priority:

1. **Resume `[~]`**: Find the first `[~]` checkbox in document order. A `[~]` item has a partial implementation in the codebase — search for existing code before continuing.
   - If it is a feature (level 1): Resume in **Mode A** — the feature and all its children (whether `[~]` or still `[ ]`).
   - If it is a requirement or CR under an `[x]` feature: Resume in **Mode B** — just that individual item.
2. **Feature `[ ]`**: A feature where the feature itself is `[ ]` — implement in **Mode A** (the whole feature with all `[ ]` children together)
3. **Late-added `[ ]`**: A `[ ]` requirement or CR whose parent feature is `[x]` — implement in **Mode B** (first `[ ]` child in document order, one per invocation)

Items marked `[?]` (in-review) or `[x]` (done) are skipped.

If no `[~]` or `[ ]` items exist, report completion and ask whether to remove the plan file using AskUserQuestion:

```
All items in this plan are complete. Nothing left to implement.

Plan file: {filename}

Delete the plan file?
```

If the user agrees, delete the plan file. Then **STOP**.

### Implementation Modes

**Mode A — Full Feature**: Feature checkbox is `[ ]`. Read the feature spec + ALL child requirement/CR specs. Implement everything together as one unit.

**Mode B — Individual Item**: Feature checkbox is `[x]` but has `[ ]` children (new requirements or CRs approved after the feature was implemented). Implement the first `[ ]` child in document order as a single work unit. Subsequent children are picked up in future invocations.

## Step 4: Mark as In-Development

Update the plan file checkboxes from `[ ]` to `[~]`:

**Mode A**: Mark the feature AND all its `[ ]` children as `[~]`.
**Mode B**: Mark only the individual `[ ]` item as `[~]`.

Also set `status: in-development` in the SPECLAN spec file frontmatter for all items being marked `[~]`.

(If resuming a `[~]` item, the marks and statuses are already correct — no change needed.)

## Step 5: Ask for Implementation Instructions

Display the next work unit and ask using AskUserQuestion:

**Mode A — Full Feature:**
```
## Next: [F-XXXX] Feature Title

Requirements:
- [R-AAAA] Req Title
- [R-BBBB] Req Title

What implementation instructions do you have?

Provide context about:
- Where to implement (files, modules, components)
- Technical approach preferences
- Constraints or existing patterns to follow
```

**Mode B — Individual Item (Requirement):**
```
## Next: [R-XXXX] Requirement Title

Parent feature: [F-YYYY] Feature Title

What implementation instructions do you have?
```

**Mode B — Individual Item (Change Request):**
```
## Next: [CR-XXXX] CR Title

CHANGE REQUEST — this modifies existing implementation.
Parent: [F-YYYY] Feature Title / [R-ZZZZ] Requirement Title

What implementation instructions do you have?
```

The user provides free-text instructions, or "none" to proceed without additional instructions.

## Step 6: Execute Implementation

### Read Spec Files

The plan file contains spec file paths in markdown link sub-bullets directly below each checkbox line. For example:

```
  - [ ] [R-0266] Bottom-Up Layered Layout
    - [R-0266](speclan/features/F-0297-.../R-0266-bottom-up-layered-layout.md)
```

Extract the path from inside the parentheses `(...)` of each link sub-bullet. Then read each spec file.

**Mode A — Full Feature**: Read ALL of these spec files:
1. The feature spec (from the feature's link sub-bullet)
2. Every child requirement spec (from each requirement's link sub-bullet)
3. Every child CR spec (from each CR's link sub-bullet)

**Mode B — Individual Item**: Read BOTH of these:
1. The individual item's spec (from its link sub-bullet)
2. The parent feature's spec (from the feature's link sub-bullet, for context)

Do NOT skip any spec files. Every spec contains acceptance criteria and technical details essential for correct implementation.

### Discover Specification Context

After reading the item specs, discover and read the broader context to understand the system being built:

**Ancestors** — walk up the directory tree from each spec file path. Each parent directory matching `F-XXXX-*` or `R-XXXX-*` is an ancestor entity. Find and read its spec file (the `*.md` file with the same name as the directory). For example, given:
```
speclan/features/F-8512-speclannet/F-0212-online-help/F-1680-speclan-plugin/F-1680-speclan-plugin.md
```
The ancestors are F-8512 (speclannet) and F-0212 (online-help) — read both specs to understand what system this feature belongs to and what "online-help" means in context.

**References** — scan each spec body for markdown links to other specs (e.g., `[R-1496](../R-1496-hover-tooltips/R-1496-hover-tooltips.md)`). Read referenced specs to understand cross-cutting concerns, dependencies, and related functionality that the implementation must integrate with.

### Implement

Build a step-by-step implementation plan.

**For requirements**: Build new functionality as described in the spec.

**For change requests**: The CR spec references the entity it modifies (via `feature:` or `requirement:` frontmatter). Read the parent entity's spec to understand the original design. Search the codebase for the existing implementation of that functionality. Alter the existing code as described in the CR spec — do NOT rebuild from scratch.

Combine spec content with user's instructions from Step 5.

## Step 7: Update Spec Statuses to Under-Test

After implementation is complete, update the SPECLAN spec file frontmatter:

**Mode A**: Set `status: under-test` in the feature spec AND all implemented requirement/CR specs.
**Mode B**: Set `status: under-test` in the individual item's spec only.

## Step 8: Mark as In-Review

Update the plan file checkboxes from `[~]` to `[?]`:

**Mode A**: Mark the feature AND all its children as `[?]`.
**Mode B**: Mark only the individual item as `[?]`.

Report completion:
```
Implemented {item description} — now in review.

Progress: {reviewed+done}/{total} items complete.
Remaining: {pending} items pending.

Run implement-manual again to continue.
```

## Error Handling

| Scenario | Action |
|----------|--------|
| No plan files found | Report error, suggest running plan-manual first |
| Plan file has no actionable items | Report all complete or in review |
| Spec file not found at path | Report error, skip to next actionable item |
| Plan file parse error | Report error with details |

## Notes

- Implements ONE work unit per invocation (full feature or individual item)
- Run repeatedly to work through the plan
- Works with plan files created by the `plan-manual` skill
- Progress is tracked via checkbox states: `[ ]` → `[~]` → `[?]` → `[x]`
- The plan file serves as a persistent audit trail across sessions
- `[x]` marking (done) is done by the user after review, not by this skill
