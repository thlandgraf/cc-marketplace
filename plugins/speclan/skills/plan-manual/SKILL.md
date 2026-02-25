---
name: SPECLAN Plan Manual
description: >-
  This skill should be used when the user asks to "plan manual implementation",
  "create a manual plan", "list approved specs for implementation",
  "plan-manual", "show approved requirements", "prepare implementation plan",
  or wants to generate a plan file listing all approved SPECLAN requirements
  ready for manual implementation.
version: 0.2.0
---

# SPECLAN Plan Manual

Generate a plan file listing all approved SPECLAN features and their requirements, ready for manual implementation. The plan file is written to `speclan/.local/plans/` as an audit trail and implementation checklist.

## Workflow Overview

1. Detect speclan directory
2. Query approved specifications
3. Group requirements by parent feature
4. Create plan file with embedded implementation prompts
5. Present summary to user

## Step 1: Detect Speclan Directory

Locate the speclan directory in the project. Check for `speclan/` in the project root (look for `speclan/features/` or `speclan/goals/` subdirectories). If not found, report error and stop.

```bash
SPECLAN_DIR="./speclan"
```

## Step 2: Query Approved Specifications

Find all approved requirements and their parent features using the speclan-query script:

```bash
QUERY="${CLAUDE_PLUGIN_ROOT}/skills/speclan-query/scripts/query.sh"

# Get all approved requirements with full details
APPROVED_REQS=$("$QUERY" --type requirement --filter-status approved --full "$SPECLAN_DIR")

# Get all approved features for context
APPROVED_FEATURES=$("$QUERY" --type feature --filter-status approved --full "$SPECLAN_DIR")
```

If no approved requirements found, report:
```
No approved requirements found in speclan/.

To approve requirements for implementation, set their status to "approved":
  status: approved
```

## Step 3: Group Requirements by Parent Feature

For each approved requirement:
1. Read the requirement file's frontmatter `feature:` field to get the parent feature ID
2. Read that feature file to get its title and path
3. Group requirements under their parent feature

Sort features by ID (lower IDs first = higher priority). Sort requirements within each feature by ID.

## Step 4: Create Plan File

Ensure the output directory exists:
```bash
mkdir -p "$SPECLAN_DIR/.local/plans"
```

### Filename

Derive filename from the feature slug and current timestamp:
```
speclan/.local/plans/{feature-slug}.{YYYY-MM-DDTHH-MM}.manual.md
```

- **Single feature**: Use that feature's slug (e.g., `export-to-document.2026-02-04T15-44.manual.md`)
- **Multiple features**: Use `manual` as slug (e.g., `manual.2026-02-25T14-30.manual.md`)

### Plan File Format

The plan file uses a **two-level nested checkbox structure** with embedded implementation prompts in fenced code blocks. This is the EXACT format — follow it precisely:

````markdown
# Manual Implementation Plan

- [ ] [F-XXXX] Feature Title

  ```text
  ## Implement Feature F-XXXX: Feature Title

  ### Specifications

  Read the feature specification at [Feature Title]({feature-path}).

  Implement the following requirements:
  - [R-AAAA: Req Title]({requirement-path})
  - [R-BBBB: Req Title]({requirement-path})

  ### Context

  Implement feature `{feature-path}` "Feature Title".

  Fulfill these requirements:
  - `{requirement-path}`: Req Title
  - `{requirement-path}`: Req Title

  Progress: This is the first item in the plan. No prior implementations to build upon.

  ```

  - [ ] [R-AAAA] Req Title

    ```text
    ## Implement Requirement R-AAAA: Req Title

    ### Specifications

    Read the requirement specification at [Req Title]({requirement-path}).

    This requirement is part of feature F-XXXX: Feature Title.
    Read the feature specification at [Feature Title]({feature-path}) for context.

    ### Context

    See feature F-XXXX context for implementation situation and progress.

    ```

  - [ ] [R-BBBB] Req Title

    ```text
    ## Implement Requirement R-BBBB: Req Title

    ### Specifications

    Read the requirement specification at [Req Title]({requirement-path}).

    This requirement is part of feature F-XXXX: Feature Title.
    Read the feature specification at [Feature Title]({feature-path}) for context.

    ### Context

    See feature F-XXXX context for implementation situation and progress.

    ```
````

### Indentation Rules

- **Feature checkboxes**: Top-level `- [ ] [F-XXXX] Title` (no indent)
- **Feature code blocks**: Indented 2 spaces under feature checkbox
- **Requirement checkboxes**: Indented 2 spaces under feature: `  - [ ] [R-XXXX] Title`
- **Requirement code blocks**: Indented 4 spaces under feature (2 under requirement)

### Progress Line in Feature Prompts

The `Progress:` line in each feature's code block tracks position:
- **First feature**: `Progress: This is the first item in the plan. No prior implementations to build upon.`
- **Subsequent features**: `Progress: 0 of {N} items completed. Build upon existing implementations.` (where N = total feature count)

### Paths

All paths in the plan file are relative to the project root (e.g., `speclan/features/F-1991-copy-export/F-0544-export-to-document/F-0544-export-to-document.md`). Do NOT use `./` prefix.

## Step 5: Present Summary

After the plan file is written, display a summary:

```
## Manual Implementation Plan Created

Plan file: speclan/.local/plans/{filename}

{feature-count} features, {requirement-count} requirements ready for implementation.

Run the `implement-manual` skill to start implementing requirements one by one.
```

## Error Handling

| Scenario | Action |
|----------|--------|
| No speclan directory | Report error, stop |
| No approved requirements | Report message with guidance to approve specs |
| Query script not found | Fall back to manual grep: `grep -rl "^status: approved" speclan/features/` |
| Parent feature not found | Warn, list requirement without feature context |

## Notes

- This skill only creates the plan file — it does not start implementation
- For automated batch implementation, use the `/speclan:implement` command instead
- The plan file at `speclan/.local/plans/` serves as an audit trail and implementation reference
- The `.local/` directory is typically gitignored and holds per-user state
- The `implement-manual` skill parses `- [ ]` / `- [x]` checkboxes to track progress
