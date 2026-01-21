---
name: todo:add
description: Create a new task in the todo system
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
  - TodoWrite
argument-hint: "<task description>"
---

# Todo Add Command

Create a new task in `todo/open/` with auto-incremented ID.

## Workflow

### 1. Ensure Todo Directory Exists

Check for `todo/` directory in project root. If not found, create structure:
```
todo/
├── open/
├── wip/
└── done/
```

### 2. Determine Next ID

Find the highest existing task ID across all directories:
```bash
find todo -name "[0-9]*.md" 2>/dev/null | grep -oE '[0-9]+' | sort -n | tail -1
```

Next ID = highest + 1, zero-padded to 3 digits (001, 002, etc.)

### 3. Parse Description

From the ARGUMENT, extract:
- **Title**: First sentence or line (used for filename slug)
- **Description**: Full argument text

Generate slug from title: lowercase, spaces to hyphens, remove special chars.
Example: "Fix login bug in auth module" → `fix-login-bug-in-auth-module`

### 4. Search for Related Tasks (BEFORE asking questions)

**Only suggest dependencies if there's actual similarity.**

1. Extract keywords from new task title (ignore stop words like "the", "a", "fix", "add", "update")
2. Search existing open/wip tasks for keyword matches:
   ```bash
   # Get keywords from title
   keywords=$(echo "<title>" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' ' ')

   # Search each keyword in existing tasks
   for kw in $keywords; do
     grep -ril "$kw" todo/open/ todo/wip/ 2>/dev/null
   done | sort | uniq -c | sort -rn
   ```

3. **Only consider tasks as related if they match 2+ keywords OR share the same component/module**

4. Build related_tasks list with:
   - Task ID
   - Title (from first heading)
   - Match reason (which keywords matched)

### 5. Ask Clarifying Questions

Use AskUserQuestion with **multiSelect: true** for dependencies:

```yaml
questions:
  - question: "What priority should this task have?"
    header: "Priority"
    multiSelect: false
    options:
      - label: "High"
        description: "Urgent, blocks other work"
      - label: "Medium (Recommended)"
        description: "Normal priority"
      - label: "Low"
        description: "Nice to have, not urgent"

  # ONLY show this question if related_tasks is NOT empty
  - question: "Any dependencies on other tasks?"
    header: "Dependencies"
    multiSelect: true  # Allow selecting multiple dependencies
    options:
      - label: "None"
        description: "No dependencies, can start immediately"
      # Add ONLY tasks from related_tasks list:
      - label: "Task <ID>"
        description: "<title> (matched: <keywords>)"
      # ... more related tasks
```

**IMPORTANT:**
- Do NOT show dependency question if no related tasks found
- Do NOT suggest ALL existing tasks - only those with keyword/topic similarity
- Always include "None" as first option
- Show max 4 related tasks (most relevant first)

### 6. Search for Related Code Context

Use Grep to find related code (for populating the Tasks section):
- Search codebase for keywords from the title
- Identify files/modules that might need changes

### 7. Create Task File

Create file at `todo/open/<ID>-<slug>.md`:

```markdown
# <ID>: <Title>

**Status:** open | **Priority:** <priority> | **Assignee:** unassigned
**Created:** <date> | **Branch:** <id>-<slug>

## Description
<full description from argument>

## Tasks
- [ ] <inferred task 1>
- [ ] <inferred task 2>

## Dependencies
- Depends on: <ids or "none">
- Blocks: <ids or "none">

## PRD
<!-- Inferred from implementation decisions -->

## Implementation Log
<!-- Auto-populated by /todo:update -->
```

### 8. Report Result

Output confirmation:
```
Created task: todo/open/<ID>-<slug>.md

# <ID>: <Title>
Priority: <priority>
Dependencies: <deps>

Use /todo:start <ID> to begin working.
```

## Notes

- **Never auto-commit**: User controls git workflow
- **ID format**: Always 3 digits, zero-padded (001, 042, 123)
- **Slug**: Max 50 chars, kebab-case
- Get current date with: `date +%Y-%m-%d`
