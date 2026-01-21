---
name: todo:update
description: Log implementation progress - auto-detect work from git diff and session
allowed-tools:
  - Read
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
  - TodoWrite
argument-hint: ""
---

# Todo Update Command

Update the current task with implementation progress. Auto-detects work done via git diff and Claude session context.

## Workflow

### 1. Identify Current Task

**Primary**: Infer from current git branch name
```bash
git branch --show-current
```

If branch matches pattern `<id>-<slug>`, find corresponding task in `todo/wip/`.

**Fallback**: If not on a task branch or no matching task:
- Check `todo/wip/` for tasks
- If exactly one task, use it
- If multiple, ask user to pick
- If none, offer to create new task (see step 1b)

### 1b. No Active Task - Offer to Create

If no task is active but work was detected:
```
No active task found, but you have uncommitted changes.

Would you like to:
1. Create a new task from this work
2. Cancel
```

If user chooses to create, invoke `/todo:add` workflow with inferred description.

### 2. Detect Work Done

**From Git:**
```bash
git diff --name-only HEAD
git diff --name-only --cached
```

Combine to get list of modified files.

**From Session Context:**
Consider files that were edited during this Claude session (you have awareness of what files you modified).

### 3. Summarize Changes

For each modified file, briefly describe the change:
- New file: "Created <file> - <brief purpose>"
- Modified: "Updated <file> - <what changed>"
- Deleted: "Removed <file>"

### 4. Ask for Additional Context

Use AskUserQuestion:
```
Detected changes in:
- src/auth/login.js
- tests/auth.test.js

Anything to add to the log? (optional)
```

Options:
- "Looks good" - proceed with auto-detected summary
- "Add details" - let user type additional notes
- "Skip this update" - cancel

### 5. Update Implementation Log

Append to the task file's Implementation Log section:

```markdown
### <date> <time>
**Files modified:**
- `src/auth/login.js` - Fixed token validation
- `tests/auth.test.js` - Added 3 test cases
**Notes:** <user's additional context if provided>
**Result:** In progress
```

### 6. Update Task Checkboxes

Review the Tasks section and ask:
```
Current tasks:
- [ ] Investigate root cause
- [ ] Implement fix
- [ ] Add tests

Any tasks completed? (select all that apply)
```

Update checkboxes:
- `[ ]` → `[x]` for completed tasks
- Keep `[ ]` for incomplete

### 7. Update PRD Section

If implementation decisions were made that clarify requirements:
- Ask user if PRD should be updated
- Add inferred requirements based on what was built

### 8. Report Result

```
Updated: <ID> - <Title>

Changes logged:
- <file1>
- <file2>

Tasks: 2/4 complete
```

## Notes

- **Never auto-commit**: Updates to task file are not committed
- Get current timestamp with: `date +"%Y-%m-%d %H:%M"`
- Log format should be concise but informative for later catch-up
