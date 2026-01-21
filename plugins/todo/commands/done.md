---
name: todo:done
description: Mark a task as complete - move to done, finalize log
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

# Todo Done Command

Mark a task as complete. Move from `todo/wip/` to `todo/done/` and finalize the implementation log.

## Workflow

### 1. Select Task

**If ARGUMENT provided:**
- Find task file matching the ID in `todo/wip/`

**If NO ARGUMENT:**
- Try to infer from current git branch
- If not on task branch, list tasks in `todo/wip/` and let user pick

### 2. Validate Completion

Read the task file and check:
- Are all tasks in the Tasks section complete? `[x]`

If incomplete tasks remain:
```
Warning: Some tasks are not marked complete:
- [ ] Add tests
- [ ] Update documentation

Complete anyway?
```

Options:
- "Yes, close it" - proceed
- "No, keep working" - cancel

### 3. Final Log Entry

Add final entry to Implementation Log:

```markdown
### <date> <time>
**Completed** by <user>
**Summary:** <brief summary of what was accomplished>
```

### 4. Update Task Header

```markdown
**Status:** done | **Priority:** <unchanged> | **Assignee:** <user>
**Created:** <created> | **Started:** <started> | **Completed:** <now>
```

### 5. Move Task File

```bash
mv todo/wip/<id>-<slug>.md todo/done/
```

### 6. Report Result

```
Completed: <ID> - <Title>

Duration: <started> → <completed>
File: todo/done/<id>-<slug>.md

Implementation log preserved for future reference.
```

## Optional: Branch Cleanup Hint

After marking done, suggest:
```
Task complete. You may want to:
1. Merge branch <id>-<slug> to main
2. Delete the branch: git branch -d <id>-<slug>

(These are not done automatically)
```

## Error Handling

| Condition | Response |
|-----------|----------|
| No tasks in wip/ | "No tasks in progress. Use /todo:start first." |
| Task not found | "Task <ID> not found in todo/wip/" |
| Task in open/ | "Task <ID> hasn't been started yet. Use /todo:start first." |
| Task already done | "Task <ID> is already complete" |

## Notes

- **Never auto-commit**: Moving the file and updating it does not trigger git commit
- **Never auto-merge**: User handles git merge workflow
- Get current timestamp with: `date +"%Y-%m-%d %H:%M"`
- The completed task file serves as documentation for what was done
