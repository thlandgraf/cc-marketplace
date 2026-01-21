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

### 4. Ask Clarifying Questions

Use AskUserQuestion to gather:

| Question | Options |
|----------|---------|
| Priority | high, medium, low |
| Any dependencies? | Let user type task IDs or "none" |

### 5. Search for Related Context

Use Grep to find related code or existing tasks:
- Search codebase for keywords from the title
- Check existing tasks for potential dependencies

### 6. Create Task File

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

### 7. Report Result

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
