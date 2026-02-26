---
name: speclan:review-manual
description: Review all in-review items from a manual implementation plan
allowed-tools:
  - Read
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
  - EnterPlanMode
argument-hint: "[plan-file]"
---

# SPECLAN Review Manual Command

Review all in-review items from a manual implementation plan.

**FORBIDDEN: Do NOT use Edit or Write on any file inside `speclan/` except `speclan/.local/plans/*.plan.md`. Spec files are read-only. Do NOT change any spec `status:` field. The only Edit allowed is `[?]` → `[x]` in the plan file.**

## Instructions

Apply the `review-manual` skill to review all `[?]` items and verify their implementations against their specs.

### Arguments

- `[plan-file]` - Optional path to a specific plan file. If omitted, searches `speclan/.local/plans/` for `*.plan.md` files.

### Example

```bash
# Review next item (auto-detect plan file)
/speclan:review-manual

# Use a specific plan file
/speclan:review-manual speclan/.local/plans/export-to-document.2026-02-04T15-44.plan.md
```
