---
name: todo:start
description: Start working on a task - move to wip, create branch, assign to me
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Bash
  - AskUserQuestion
  - TodoWrite
argument-hint: "[task-id]"
---

# Todo Start Command

Move a task from `todo/open/` to `todo/wip/`, create a git branch, and assign to current user.

## Workflow

### 1. Check Git State

**CRITICAL**: Require clean git working directory before creating branch.

```bash
git status --porcelain
```

If output is non-empty, show error:
```
Error: Uncommitted changes detected. Please commit or stash changes before starting a new task.

Modified files:
<list of files>
```

### 2. Select Task

**If ARGUMENT provided:**
- Find task file matching the ID in `todo/open/`
- Pattern: `todo/open/<ID>-*.md`

**If NO ARGUMENT:**
- List all tasks in `todo/open/`
- Use AskUserQuestion to let user pick one:

```
Which task do you want to start?

1. 001-fix-login-bug - Fix login bug in auth module
2. 002-add-dark-mode - Add dark mode support
3. 003-refactor-api - Refactor API endpoints
```

### 3. Validate Task

- Confirm task exists in `todo/open/`
- If task is in `wip/` or `done/`, show appropriate error

### 4. Get User Info

```bash
git config user.name || whoami
```

### 5. Create Git Branch

Extract slug from filename and create branch:
```bash
git checkout -b <id>-<slug>
```

Example: Task `042-fix-login-bug.md` → branch `042-fix-login-bug`

### 6. Move Task File

Move from `todo/open/` to `todo/wip/`:
```bash
mv todo/open/<id>-<slug>.md todo/wip/
```

### 7. Update Task File

Edit the task file to update:

```markdown
**Status:** wip | **Priority:** <unchanged> | **Assignee:** <user>
**Created:** <unchanged> | **Started:** <now> | **Branch:** <id>-<slug>
```

Add to Implementation Log:
```markdown
## Implementation Log

### <date> <time>
**Started** by <user>
```

### 8. Report Result

```
Started task: <ID> - <Title>

Branch: <id>-<slug>
Assignee: <user>
File: todo/wip/<id>-<slug>.md

Ready to work. Use /todo:update to log progress.
```

## Error Handling

| Condition | Response |
|-----------|----------|
| No tasks in open/ | "No open tasks. Use /todo:add to create one." |
| Task not found | "Task <ID> not found in todo/open/" |
| Task already in wip | "Task <ID> is already in progress" |
| Uncommitted changes | "Please commit or stash changes first" |
| Branch exists | "Branch <name> already exists. Delete it or use different task." |

## Notes

- **Never auto-commit**: Moving the file and updating it does not trigger git commit
- Get current timestamp with: `date +"%Y-%m-%d %H:%M"`
