---
name: constitution:check
description: Check code or recent session work for constitution violations
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - TodoWrite
argument-hint: "[file, path, or description - leave empty for session review]"
---

# Constitution Check Command

Check for violations against the project's constitution rules.

## Workflow

### 1. Locate Constitution File

Search for constitution file:
```
constitution.md
doc/constitution.md
```

If no constitution exists, report:
```
No constitution found. Use /constitution:add to create one.
```

### 2. Load Constitution Rules

Read the constitution file and parse rules by section. Build a mental checklist of what to verify.

### 3. Determine Check Target

**If ARGUMENT provided:**
- File path → Check that specific file
- Directory path → Check all files in directory
- Description → Interpret and find relevant files

**If NO ARGUMENT (default):**
Check the work done in the current session:
- Review files that were created or modified in this conversation
- Look at recent edits made by Claude
- Check any code that was written or changed

Use this bash command to see recent git changes as a starting point:
```bash
git diff HEAD~5 --name-only 2>/dev/null || git status --porcelain
```

### 4. Analyze Against Constitution

For each file/change being checked:

1. Read the file content
2. Compare against each relevant constitution rule
3. Note any violations

**Check categories:**
- **Patterns:** Is the code following required patterns?
- **Anti-patterns:** Is the code using forbidden approaches?
- **Conventions:** Does naming/structure follow conventions?
- **Technology rules:** Are framework-specific rules followed?
- **Constraints:** Are limits/constraints respected?

### 5. Report Violations

Output a structured violation report:

```
## Constitution Check Results

**Target:** <what was checked>
**Constitution:** <path to constitution file>

### Violations Found

| # | Rule | Location | Issue |
|---|------|----------|-------|
| 1 | <rule violated> | `file:line` | <what's wrong> |
| 2 | <rule violated> | `file:line` | <what's wrong> |

### Suggested Fixes

1. **`file:line`** - <how to fix>
2. **`file:line`** - <how to fix>

### Summary

- Files checked: X
- Violations: Y
- Severity: <low/medium/high>
```

If no violations:
```
## Constitution Check Results

**Target:** <what was checked>

No violations found. Code complies with constitution.
```

## Session Work Detection

When checking current session work without an argument:

1. **Recall conversation context** - What files were discussed, created, or edited?
2. **Check modified files** - Use git or file timestamps to find recent changes
3. **Focus on code changes** - Prioritize checking actual code over documentation

Common session work patterns:
- New files created with Write tool
- Existing files modified with Edit tool
- Code generated in response to user requests

## Violation Severity

Classify violations by impact:

| Severity | Description |
|----------|-------------|
| **High** | Security risks, breaking constraints, critical anti-patterns |
| **Medium** | Pattern violations, convention breaks, suboptimal practices |
| **Low** | Style issues, minor convention deviations |

## Examples

**Input:** (no argument)
**Action:** Review files edited in current conversation, check against constitution rules, report any violations.

**Input:** `src/components/`
**Action:** Scan all files in src/components/, check each against constitution, report violations.

**Input:** `the new auth module`
**Action:** Find auth-related files, check implementation against constitution rules.
