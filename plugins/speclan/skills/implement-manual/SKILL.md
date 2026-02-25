---
name: SPECLAN Implement Manual
description: >-
  This skill should be used when the user asks to "implement next feature",
  "implement manual", "continue implementation", "implement-manual",
  "pick up the plan", "implement from plan", or wants to implement the next
  undone feature from a manual implementation plan file. Picks up a plan
  file created by the plan-manual skill and implements features one at a time.
version: 0.3.0
---

# SPECLAN Implement Manual

Pick up a manual implementation plan file and implement the next undone feature with all its requirements. This is the execution companion to the `plan-manual` skill.

## Workflow Overview

1. Find plan files
2. Select plan file (ask if multiple, recommend latest)
3. Find the next undone feature
4. Ask user for implementation instructions
5. Execute implementation (feature + all requirements together)
6. Mark feature and all its requirements done in plan file

## Step 1: Find Plan Files

Look for manual plan files:

```bash
SPECLAN_DIR="./speclan"
PLANS_DIR="$SPECLAN_DIR/.local/plans"
```

Find all `*.manual.md` files in the plans directory:

```bash
ls "$PLANS_DIR"/*.manual.md 2>/dev/null
```

If no plan files found, report:
```
No manual implementation plans found.

Run the plan-manual skill first to create a plan from approved requirements.
```

## Step 2: Select Plan File

If only one plan file exists, use it automatically.

If multiple plan files exist, present them to the user using AskUserQuestion. Sort by filename (which contains the timestamp) and **recommend the latest one** (last in sorted order):

```
Which plan file to use?

1. export-to-document.2026-02-04T15-44.manual.md
2. multi-tenancy.2026-02-10T09-22.manual.md
3. analysis-engine.2026-02-25T14-30.manual.md (Recommended)
```

## Step 3: Find Next Undone Feature

Read the selected plan file. The file has a two-level nested structure:

```
- [ ] [F-XXXX] Feature Title        ← feature (top-level)
  - [ ] [R-AAAA] Requirement Title   ← requirement (indented under feature)
  - [ ] [R-BBBB] Requirement Title
- [x] [F-YYYY] Another Feature       ← already done
  - [x] [R-CCCC] Requirement Title
```

Find the **first unchecked feature** (`- [ ] [F-XXXX]`). This is the next implementation unit.

Extract:
- **Feature ID**: `F-XXXX` from `[F-XXXX]`
- **Feature title**: text after `] `
- **All child requirements**: the indented `- [ ] [R-XXXX]` items under it

If no unchecked features remain, report:
```
All features in this plan are complete!

Plan file: {filename}
```

## Step 4: Extract Implementation Prompt

The feature has an embedded implementation prompt in a fenced code block directly below it:

```
- [ ] [F-XXXX] Feature Title

  ```text
  ## Implement Feature F-XXXX: Feature Title

  ### Specifications
  ...
  ### Context
  ...
  ```
```

Extract the full text content between the `` ```text `` and closing `` ``` `` markers. This is the pre-built implementation prompt containing the feature spec path, all requirement paths, and context.

## Step 5: Ask for Implementation Instructions

Display the next feature and ask for implementation instructions using AskUserQuestion:

```
## Next: F-XXXX — {Feature Title}

Requirements:
- R-AAAA: {Req Title}
- R-BBBB: {Req Title}

What implementation instructions do you have?

Provide context about:
- Where to implement (files, modules, components)
- Technical approach preferences
- Constraints or existing patterns to follow
```

The user provides free-text instructions, or "none" to proceed without additional instructions.

## Step 6: Execute Implementation

Combine the extracted feature implementation prompt with the user's instructions:

```markdown
{extracted feature implementation prompt from Step 4}

### Implementation Instructions

{user's instructions from Step 5, or "No additional instructions provided."}
```

Execute by:

1. Reading the feature specification file at the path from the prompt
2. Reading ALL requirement specification files listed in the prompt
3. Following the user's implementation instructions
4. Implementing the feature with all its requirements in the codebase

The feature and all its requirements are implemented **together** as a single unit.

## Step 7: Mark Feature and Requirements Done

After implementation completes, update the plan file. Check off the feature AND all its requirements:

```
- [x] [F-XXXX] Feature Title
  ...
  - [x] [R-AAAA] Requirement Title
  ...
  - [x] [R-BBBB] Requirement Title
```

Change every `- [ ]` to `- [x]` for the feature line and all its indented requirement lines.

Report completion:
```
Implemented F-XXXX: {Feature Title} ({N} requirements)

Progress: {done}/{total} features complete.
Remaining: {remaining} features.

Run implement-manual again to continue with the next feature.
```

## Error Handling

| Scenario | Action |
|----------|--------|
| No plan files found | Report error, suggest running plan-manual first |
| Plan file has no unchecked features | Report all complete |
| Feature spec file not found | Report error, skip to next unchecked feature |
| Requirement spec file not found | Warn, proceed without that requirement |
| Code block missing for feature | Construct prompt manually from checkbox data |
| Plan file parse error | Report error with line details |

## Notes

- Implements ONE feature (with all its requirements) per invocation
- Run repeatedly to work through the plan feature by feature
- Works with plan files created by the `plan-manual` skill
- Progress is tracked via `- [ ]` / `- [x]` checkboxes in the plan file
- The plan file serves as a persistent audit trail across sessions
- Implementation prompts are pre-built in the plan file — no need to reconstruct them
