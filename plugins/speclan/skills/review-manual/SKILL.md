---
name: SPECLAN Review Manual
description: >-
  This skill should be used when the user asks to "review plan",
  "review implementations", "review manual", "review-manual",
  "review from plan", "check all implementations", or wants to review
  all in-review items from a manual implementation plan file. Picks up a
  plan file created by the plan-manual skill and reviews ALL [?] items
  at once, verifying spec compliance and code quality.
version: 0.8.0
---

# SPECLAN Review Manual

Pick up a manual implementation plan file and review ALL in-review items at once. Read every `[?]` item's spec, verify the implementation satisfies acceptance criteria, and assess code quality via two parallel subagents.

**CRITICAL CONSTRAINTS:**
- **NEVER edit spec files.** Do NOT use Edit or Write tools on any file inside `speclan/` except `speclan/.local/plans/*.plan.md`. No status changes (do NOT set status to "accepted", "released", or anything else), no acceptance criteria updates, no frontmatter changes. Spec files are input only — read them, never modify them. Spec statuses stay as `under-test`.
- **Only the plan file is modified** — the sole Edit operation in this entire skill is changing `[?]` → `[x]` checkboxes in the `*.plan.md` file after user approval. No other file is written to.
- **Review ALL `[?]` items in one invocation.** Do NOT review one item at a time.

## Plan File Structure

The plan file has a three-level hierarchy:

```
- [?] [F-XXXX] Feature Title                               ← Level 1
  - [F-XXXX](path/to/feature-spec.md)                      ← SPEC PATH (extract from parentheses)
  - [?] [R-AAAA] Requirement Title                          ← Level 2
    - [R-AAAA](path/to/requirement-spec.md)                 ← SPEC PATH
  - [?] [R-BBBB] Requirement Title                          ← Level 2
    - [R-BBBB](path/to/requirement-spec.md)                 ← SPEC PATH
    - [?] [CR-0088] CR Title — CHANGE REQUEST: ...          ← Level 3
      - [CR-0088](path/to/change-request-spec.md)           ← SPEC PATH
```

Each checkbox line has a **markdown link sub-bullet** below it containing the spec file path inside the `(...)` parentheses.

(See also: the plan-manual skill's `references/plan-file-format.md` for the canonical format spec.)

## Workflow Overview

**IMPORTANT: Always use `EnterPlanMode` at Step 4.** Steps 4–7 run in plan mode — research and build the review plan for user approval before executing.

1. Find plan files
2. Select plan file (ask if multiple, recommend latest)
3. Parse plan, collect ALL `[?]` items (or exit if none/done)
4. Enter plan mode
5. Read ALL spec files for every `[?]` item
6. Identify implementation files (scope the review)
7. Build review plan for user approval
8. Execute review (spec compliance + code quality subagents)
9. Present combined review report
10. User decision (accept or defer)
11. Apply transitions (if accepting)
12. Report completion

## Step 1: Find Plan Files

```bash
SPECLAN_DIR="./speclan"
PLANS_DIR="$SPECLAN_DIR/.local/plans"
ls "$PLANS_DIR"/*.plan.md 2>/dev/null
```

If no plan files found, report:
```
No manual implementation plans found.

Run the plan-manual skill first to create a plan from approved requirements.
```

## Step 2: Select Plan File

If only one plan file exists, use it automatically.

If multiple plan files exist, present them to the user using AskUserQuestion. Sort by filename (which contains the timestamp) and **recommend the latest one**.

## Step 3: Parse Plan and Collect ALL `[?]` Items

Read the selected plan file. Parse the checkbox hierarchy and collect every `[?]` item into a flat list:

1. Identify all features (level 1) by `[F-XXXX]` pattern
2. For each feature, identify its children (requirements `[R-XXXX]` and change requests `[CR-XXXX]`)
3. Collect every item with a `[?]` checkbox into the review scope — this includes **features themselves**, not just their children. A `[?]` feature is a reviewable item just like a `[?]` requirement.
4. Note the spec file paths in the markdown link sub-bullets (read in Step 5)

**Example:** Given this plan:
```
- [?] [F-0297] SVG Rendering          ← counted as [?] item #1
  - [x] [R-0266] Layout               ← skipped (already [x])
  - [?] [R-0754] Arrow Connections     ← counted as [?] item #2
  - [?] [R-1496] Hover Tooltips       ← counted as [?] item #3
  - [?] [R-1635] Package Delivery     ← counted as [?] item #4
```
The review scope is **4 items**: F-0297, R-0754, R-1496, R-1635. Read all 4 specs, verify all 4, mark all 4 as `[x]`.

If no `[?]` items exist:
- If `[ ]` or `[~]` items remain, report: "Items are still in progress. Nothing ready for review yet." Then **STOP**.
- If all items are `[x]`, report completion and ask whether to delete the plan file using AskUserQuestion:

```
All items in this plan have been reviewed and accepted.

Plan file: {filename}

Delete the plan file?
```

If the user agrees, delete the plan file. Then **STOP**.

## Step 4: Enter Plan Mode

Use `EnterPlanMode`. All subsequent steps (5–7) run in plan mode to research and build the review plan before execution.

## Step 5: Read ALL Spec Files

For every `[?]` item collected in Step 3, extract the spec file path from inside the parentheses `(...)` of its markdown link sub-bullet. For example:

```
  - [?] [R-0266] Bottom-Up Layered Layout
    - [R-0266](speclan/features/F-0297-.../R-0266-bottom-up-layered-layout.md)
```

Read every spec file. Do NOT skip any.

From each spec, extract all acceptance criteria — the `- [ ] Given...When...Then...` lines. These are the verification targets for Step 8.

### Discover Specification Context

After reading the item specs, discover and read the broader context to understand the system being reviewed:

**Ancestors** — walk up the directory tree from each spec file path. Each parent directory matching `F-XXXX-*` or `R-XXXX-*` is an ancestor entity. Find and read its spec file (the `*.md` file with the same name as the directory). For example, given:
```
speclan/features/F-8512-speclannet/F-0212-online-help/F-1680-speclan-plugin/F-1680-speclan-plugin.md
```
The ancestors are F-8512 (speclannet) and F-0212 (online-help) — read both specs to understand the broader system context.

**References** — scan each spec body for markdown links to other specs (e.g., `[R-1496](../R-1496-hover-tooltips/R-1496-hover-tooltips.md)`). Read referenced specs to understand cross-cutting concerns and dependencies relevant to the review.

## Step 6: Identify Implementation Files

Determine which source files to review across the entire scope. Use two strategies:

**Strategy 1 — Git-based discovery:**

Extract the `updated` date from spec YAML frontmatter and find changed files:

```bash
SINCE_DATE=$(grep -m1 '^updated:' path/to/spec.md | awk -F"'" '{print $2}')
git log --since="$SINCE_DATE" --diff-filter=ACMR --name-only --pretty=format:"" | sort -u
```

**Strategy 2 — Spec-guided search:**
Extract key terms from spec titles, scope sections, and acceptance criteria. Use grep/glob to find relevant source files.

Combine results from both strategies into a single implementation file list covering the full review scope.

## Step 7: Build Review Plan

Present the review plan for user approval:

```
## Review Plan

### Items to Review ({count} specs)

- [F-XXXX] Feature Title
- [R-AAAA] Requirement Title ({n} acceptance criteria)
- [R-BBBB] Requirement Title ({n} acceptance criteria)
- [CR-CCCC] CR Title ({n} acceptance criteria)

### Implementation Files ({count} files)

- src/...
- src/...

### Total: {total} acceptance criteria to verify

Proceed with review?
```

Exit plan mode after user approves.

## Step 8: Execute Review

### Spec Compliance (primary, blocking)

Verify every acceptance criterion collected in Step 5 — across ALL `[?]` specs. For each criterion:

1. Parse the Given/When/Then statement to understand what must be true
2. Search the implementation files for code that satisfies the criterion
3. Assess whether the implementation fulfills the criterion
4. Record verdict: **PASS** / **FAIL** / **PARTIAL** with evidence (file:line references)

**For change requests**: Verify the alteration was applied correctly — check that the original behavior was changed as specified, not just that new code exists.

### Code Quality (secondary, advisory)

Launch two subagents **in parallel** via the Task tool. Invoke both Task tool calls in the same response block so they execute concurrently:

**Subagent 1 — Code Hygiene:**
```
Task tool, subagent_type: speclan:code-hygiene-reviewer

Review code hygiene for implementation of [F-XXXX] [Feature Title]:

Implementation files:
- {list all files from Step 6}

Report findings categorized as Critical/Major/Minor with file:line evidence.
```

**Subagent 2 — Architecture:**
```
Task tool, subagent_type: speclan:architecture-reviewer

Review architecture for implementation of [F-XXXX] [Feature Title]:

Implementation files:
- {list all files from Step 6}

Context: {brief description of what was implemented}

Report findings categorized as Critical/Major/Minor with file:line evidence.
```

## Step 9: Present Combined Review Report

```markdown
## Review Report

### Spec Compliance

#### [R-AAAA] Requirement Title
| # | Acceptance Criterion (short) | Verdict | Evidence |
|---|------------------------------|---------|----------|
| 1 | Given X, When Y, Then Z      | PASS    | file.ts:45 |
| 2 | Given A, When B, Then C      | FAIL    | Not found |

#### [R-BBBB] Requirement Title
| # | Acceptance Criterion (short) | Verdict | Evidence |
|---|------------------------------|---------|----------|
| 1 | Given D, When E, Then F      | PASS    | file.ts:23 |

(one section per requirement/CR)

**Overall: {pass_count}/{total} criteria passed.**

### Code Hygiene (Advisory)

{hygiene subagent findings — Critical/Major/Minor}

### Architecture (Advisory)

{architecture subagent findings — Critical/Major/Minor}
```

## Step 10: User Decision

**If all criteria PASS and no critical code quality findings:**

Ask via AskUserQuestion to confirm acceptance:
```
All {total} acceptance criteria passed. Accept and mark as done?
```

**If any criteria FAIL or PARTIAL:**

Present findings and recommend immediate fixes:
```
{fail_count} acceptance criteria need attention.

Recommend fixing these issues now. After fixing, confirm to accept.
Otherwise, leave in review and re-run review-manual later.
```

Wait for the user. The user may:
- Fix the issues and confirm → proceed to accept
- Say "accept anyway" → proceed to accept
- Decline → leave `[?]`, no state changes, **STOP**

## Step 11: Apply Transitions

After the user confirms, edit the **plan file only** — change `[?]` to `[x]` for every item collected in Step 3 (features, requirements, CRs).

**"Accept" means marking plan checkboxes `[x]`. It does NOT mean changing spec statuses.**

**FORBIDDEN:** Do NOT use Edit or Write on ANY file inside `speclan/` except `speclan/.local/plans/*.plan.md`. Do NOT change any spec `status:` field. Do NOT set statuses to "accepted", "released", or any other value. Spec statuses remain `under-test` — human testing happens separately.

## Step 12: Report Completion

If all items in the plan are now `[x]`, offer to delete the plan file:

```
All {total} items reviewed and accepted.

Plan file: {filename}

Delete the plan file?
```

Otherwise report progress:

```
Reviewed and accepted {count} items.

Progress: {done}/{total} items complete.
Remaining: {pending} pending, {in_progress} in progress.
```

## Error Handling

| Scenario | Action |
|----------|--------|
| No plan files found | Report error, suggest running plan-manual first |
| No `[?]` items (but `[ ]`/`[~]` exist) | Report items still in progress |
| All items `[x]` | Report done, offer to delete plan file |
| Spec file not found at path | Report error, continue with remaining specs |
| Implementation files not found | Ask user to provide file paths manually |
| Subagent failure | Present spec compliance results alone, note code quality review incomplete |
| Plan file parse error | Report error with details |

## Notes

- Reviews ALL `[?]` items in one invocation — no re-run needed
- Works with plan files created by the `plan-manual` skill
- **NEVER edit spec files** — do not use Edit or Write on any `speclan/` file
- Spec compliance is blocking; code quality findings are advisory
- The accept/defer decision is always with the user
