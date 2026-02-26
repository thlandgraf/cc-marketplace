---
name: speclan:implement-manual
description: Implement the next feature from a manual implementation plan
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - EnterPlanMode
argument-hint: "[plan-file]"
---

# SPECLAN Implement Manual Command

Pick up a manual implementation plan and implement the next actionable item.

## Instructions

Apply the `implement-manual` skill to find the next actionable item and implement it.

### Arguments

- `[plan-file]` - Optional path to a specific plan file. If omitted, searches `speclan/.local/plans/` for `*.plan.md` files.

### Example

```bash
# Implement next item (auto-detect plan file)
/speclan:implement-manual

# Use a specific plan file
/speclan:implement-manual speclan/.local/plans/export-to-document.2026-02-04T15-44.plan.md
```
