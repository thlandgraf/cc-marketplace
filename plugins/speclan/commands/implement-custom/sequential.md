---
name: speclan:implement-custom-sequential
description: >-
  Sequential implementation strategy for custom planfiles. Implements items
  one by one in dependency order with cross-session CLAUDE.md knowledge
  bridging, structured logging, tests, and milestone reviews. Use after
  priming a session with a SPECLAN custom planfile. Sequential is the right
  choice for complex plans with strong dependencies between items — each
  item builds on the prior one's output, so order and completeness matter.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - EnterPlanMode
  - ExitPlanMode
argument-hint: "Use after priming with a SPECLAN custom planfile. Sequential is best for complex plans with strong dependencies between items."
---

# Sequential Implementation Strategy

Implement a custom planfile's items one by one in dependency order. Each item follows a strict cycle: read spec, implement with logging, write tests, verify, mark done. At feature boundaries, run a broader milestone review.

Custom planfiles contain standalone requirements and change requests not nested under a pending feature. Handle both nested and standalone items.

## Phase 0: Orient

### 0a. Read the Planfile

Parse the planfile to understand the full scope:

- `[~]` items — **resume these first** (partial work from a prior session)
- `[ ]` items — pending work
- `[?]` items — **needs review**: read the spec's acceptance criteria, verify the implementation against them, fix any gaps found, then mark `[x]`
- `[x]` items — done, skip

Distinguish item types — this determines the implementation approach:
- **Features (F-) and Requirements (R-)** — new functionality to build
- **Change Requests (CR-)** — existing implementation must be found and altered, not built from scratch. CR lines in the planfile are annotated with `CHANGE REQUEST: find and alter existing implementation`

Count the totals and report the current state to the user.

### 0b. Resume Check

Priority order for picking up work:
1. **`[?]` items first** — review them: verify implementation against spec acceptance criteria, fix gaps, then mark `[x]`
2. **`[~]` items next** — resume partial implementation from a prior session
3. **`[ ]` items last** — new work, proceed to ordering (Step 0c)

If `[?]` or `[~]` items exist, skip ordering — handle them first, then return to determine order for remaining `[ ]` items.

### 0c. Determine Implementation Order

Analyze dependencies between all `[ ]` items. For each one, read its spec and look for:

1. **Parent-child** — directory nesting and `feature:` / `parentId:` frontmatter fields. Parents before children.
2. **Cross-references** — markdown links or phrases like "depends on R-XXXX", "requires R-XXXX", "after R-XXXX" in the spec body.
3. **Logical sequencing** — foundations before consumers (types before services, contracts before implementations, providers before consumers).

For 3+ features, use the `implementation-order` agent (`subagent_type: speclan:implementation-order`) to determine feature order.

For standalone items (R-/CR- not under a pending feature), sequence them after their parent feature's other children, or by dependency if no parent is pending.

### 0d. Record Implementation Order

Write the determined order somewhere recoverable for the next session — a comment block at the top of the planfile. Keep it to a numbered list with rationale. This is purely for cross-session continuity of the ordering decision.

---

## Phase 1: Per-Item Implementation Cycle

For each item in the determined order, run this cycle. Complete one item fully before starting the next.

### Step 1 — Read the Specification

Extract the spec path from the planfile link sub-bullet (path inside parentheses):

```
- [ ] [R-0548] Title
  - [R-0548](speclan/.../R-0548-slug/R-0548-slug.md)
```

Read the spec file thoroughly — scope, acceptance criteria, business rules.

Then discover context:

**Ancestors** — walk up the directory tree from the spec path. Each parent directory matching `F-XXXX-*` or `R-XXXX-*` is an ancestor entity. Read its spec (the `.md` with the same name as the directory) to understand what system this item belongs to and what concepts mean in context.

**References** — scan the spec body for markdown links to other specs (`[R-1496](../R-1496-.../R-1496-....md)`). Read referenced specs to understand cross-cutting concerns, dependencies, and integration points the implementation must respect.

**Prior work** — check for CLAUDE.md files in the code areas you're about to touch. They contain architecture decisions, contracts, and gotchas captured during earlier implementation steps. This is especially important when resuming in a new session.

### Step 2 — Mark In-Progress

Edit the planfile: change `[ ]` to `[~]` for this item.

If the spec has a `status:` frontmatter field, set it to `in-development`. This status update is the **only** edit allowed on spec files — never change spec content (titles, descriptions, acceptance criteria, scope).

### Step 3 — Implement

Build the implementation based on the spec's scope and acceptance criteria. "Implement" means writing or changing **source code in the codebase** — never editing spec files in `speclan/`. Specs are input (what to build), not output (what to change).

**For requirements and features** — build new functionality as described; the requirements belong to a feature so understand its context.

**For change requests** (lines annotated `CHANGE REQUEST: find and alter existing implementation`) — a CR describes changes to existing **code**, not changes to specs. The workflow is:
1. Read the CR spec to understand what needs to change
2. Read the parent entity's spec to understand the original design
3. Search the codebase for the existing **code** that implements the parent entity
4. Alter that code as the CR describes — do not rebuild from scratch
5. Leave all spec files (`speclan/**`) untouched — the CR spec stays as-is, the parent spec stays as-is

**Logging and tracing** — add structured logging at meaningful boundaries:
- Service entry/exit with operation name and key parameters
- External API calls (provider, endpoint, request shape, response status)
- Error paths with enough context to diagnose without reproducing (what failed, what was the input, what was expected)
- Use the project's existing logging framework and conventions
- The goal: when something breaks at 3 AM, the logs tell you what happened, in your code and at external providers, without requiring a debugger

**Follow conventions** — match the project's existing patterns for file organization, naming, error handling, and module structure.

### Step 4 — Write Tests

Create tests for all source code produced in Step 3:

- **Unit tests** for business logic and pure functions
- **Integration tests** for service boundaries, external interactions, and anything the spec's acceptance criteria describe as observable behavior
- Map acceptance criteria (`Given...When...Then`) directly to test cases where possible
- Match the project's testing framework and conventions

Run the tests. Fix failures before proceeding.

### Step 5 — Verify Against Spec

Walk through each acceptance criterion in the spec:
- For each `Given...When...Then`, confirm the implementation and tests cover it
- For each scope item, confirm it exists in the code
- For change requests, confirm the existing **code** behavior was changed as the CR describes (not just new code added alongside, and not the spec altered)

If gaps exist, fix them in the **source code** and re-run tests.

### Step 6 — Mark for Review

Edit the planfile: change `[~]` to `[?]` for this item.

If the spec has a `status:` frontmatter field, set it to `under-test`.

### Step 7 — Capture Concepts in CLAUDE.md (near the code)

As implementation produces code, concepts emerge — design patterns, invariants, integration contracts, non-obvious gotchas. When a concept is worth remembering, create or update a CLAUDE.md file **closest to the code the concept belongs to**.

- If you created `src/providers/local/`, and the local provider has a retry contract that callers must understand, put it in `src/providers/local/CLAUDE.md`
- If you established a pattern across all providers in `src/providers/`, put it in `src/providers/CLAUDE.md`
- If a gotcha applies project-wide, put it in the project root CLAUDE.md

**What to capture:**
- Architecture decisions ("chose X over Y because...")
- Contracts and invariants ("all providers must implement `probe()` — callers rely on it for availability checks")
- Non-obvious behavior ("API returns 200 with error in body, must check `.error` field")
- Integration points ("exports `RunnerConfig` — consumed by the CI integration module")

**What NOT to capture:** routine implementation facts derivable from reading the code. Only write what saves a future reader (human or AI) from having to reverse-engineer intent.

### Step 8 — Report Progress

```
Completed: [ID] Title — now in review.
Progress: {done}/{total} items.
Next: [ID] Title
```

---

## Phase 2: Milestone Review

Trigger a milestone review when one of these occurs:

- **Feature complete** — all children of a feature are `[?]` or `[x]`
- **Logical group complete** — a cluster of related standalone items is done (e.g., all "provider foundation" requirements)

### Review checklist:

1. **Integration** — do the implemented pieces work together? Check data flow across module boundaries. Run any existing integration or e2e tests.
2. **Logging coverage** — can you trace a request end-to-end through the implemented feature using only the logs? If not, add the missing log points.
3. **Test coverage** — do tests cover all acceptance criteria from the specs? Any untested paths?
4. **Spec compliance** — re-read the feature spec (if applicable) and confirm the overall intent is met, not just individual requirement checkboxes.

Fix findings immediately. Update CLAUDE.md with corrections.

For standalone items without a feature grouping, run a lighter review after each item: spec compliance + tests pass.

---

## Phase 3: Wrap Up

When all planfile items are `[x]`:

1. Update CLAUDE.md plan section with final status
2. Report completion:

```
## Plan Complete

Plan: {filename}
Items implemented: {count}
Items ready for review: {review_count}

Run review to verify implementations against specs.
```

---

## Cross-Session Continuity

These plans often span multiple Claude Code sessions. Two things carry state across sessions:

1. **Planfile checkboxes** — `[~]` marks where to resume, `[?]`/`[x]` marks what's done
2. **CLAUDE.md files near the code** — capture the concepts, decisions, and contracts that emerged during implementation

**When resuming in a new session:**

1. Read the planfile — find the first `[~]` (resume implementation) or `[?]` (needs review) or `[ ]` (next) item
2. Read CLAUDE.md files in the areas you'll be working in — recover architecture decisions, patterns, and gotchas from prior sessions
3. Continue from where the prior session left off

**When ending a session mid-plan:**

The current item should be either `[~]` (in progress, will resume) or `[?]` (needs review, will resume) or `[ ]` (next item starts fresh). Ensure any concepts worth remembering are captured in the appropriate CLAUDE.md before ending.
