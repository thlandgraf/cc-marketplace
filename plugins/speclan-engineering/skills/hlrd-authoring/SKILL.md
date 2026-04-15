---
name: speclan-engineering:hlrd-authoring
description: Use this skill to import a High-Level Requirements Document (HLRD), PRD, product brief, or requirements markdown/text document into the SPECLAN directory structure. Triggers when the user asks to "import this PRD", "turn this requirements doc into specs", "bootstrap specs from my document", "hlrd import", "ingest this requirements document", "scaffold speclan from this doc", or invokes `/speclan-engineering:hlrd`. Owns the full multi-phase pipeline that extracts a project Vision and Mission, plans Goals and Features, creates or modifies them, generates testable Requirements, and cross-references everything — all driven by interactive AskUserQuestion prompts for ambiguities and decisions. Use this skill whenever a user wants to convert prose requirements into structured SPECLAN specs, even if they don't explicitly say "HLRD".
version: 0.1.0
---

# HLRD Authoring Pipeline

Transform an unstructured High-Level Requirements Document (HLRD) into a structured SPECLAN specification hierarchy through an interactive, multi-phase pipeline.

This skill is a faithful adaptation of the VSCode `hlrd-wizard` ([`apps/vscode-extension/src/services/hlrd-agent.service.ts`](https://github.com/digital-dividend/speclan)) for Claude Code — replacing MCP tool calls with native file operations (Read/Write/Edit/Glob/Grep) and replacing the webview multi-choice UI with `AskUserQuestion` prompts.

## Pipeline at a glance

```
Preflight       → Input resolution, speclan detection, entry point, complexity
Phase 0         → Vision & Mission  (speclan/vision.md, speclan/mission.md)
Phase 1         → Planning          (Goals + Features plan, with clarifications)
Phase 2         → Entity Creation   (Goals → Features, create & modify)
Phase 2.5       → Requirements      (per feature, testable + traceable)
Phase 3         → Cross-Referencing (inline markdown links + goal contributions)
Summary         → Report what was created / modified / failed
```

Each phase is described in full below. Details that would otherwise bloat this file live in the `references/` directory — consult them when running the corresponding phase.

## Prerequisites

Before running any phase, verify the environment:

1. **speclan plugin must be loaded.** Look for the `speclan-format`, `speclan-id-generator`, and `speclan-query` skills in the available skills list. If any are missing, stop and tell the user to install the `speclan` plugin (this skill reuses them rather than duplicating their logic).

2. **`speclan/` directory.** Detect it by looking for `speclan/goals/` or `speclan/features/` under `$CLAUDE_PROJECT_DIR`. If none is found, ask the user via AskUserQuestion:
   - `Create speclan/ now (goals/, features/, templates/)` — proceed and `mkdir -p` the structure
   - `Use a different path` — ask for the path in a follow-up
   - `Cancel` — stop the pipeline

3. **Never** run this pipeline against a speclan directory that contains only `released`, `in-development`, `under-test`, or `deprecated` entities unless the user is operating in create-only mode. These statuses are locked and require Change Requests rather than direct edits — the `speclan-format` skill has the full lifecycle rules.

## Preflight

### Step 1 — Resolve HLRD content

The command passes `$ARGUMENTS` verbatim. Auto-detect the input form:

- **Path**: if the argument ends in `.md`, `.txt`, `.markdown`, or is an existing file path under the project, Read it. Treat the file as read-only (never modify the HLRD source).
- **Inline text**: if the argument is non-empty text that isn't a path (contains spaces or newlines, or no existing file matches), treat it as inline HLRD content.
- **Empty**: use AskUserQuestion to ask the user how they want to provide the HLRD. Offer: `Provide a file path`, `Paste inline content`. On "file path", ask for the path in a follow-up. On "paste inline", tell the user to reply with the full HLRD text in their next message, then continue the pipeline once they do.
- **Path given but missing**: AskUserQuestion reporting the missing file and asking for a corrected path.

Compute the word count of the resolved content — you need it for Step 4.

### Step 2 — Confirm the speclan directory

Having detected the `speclan/` location in the prerequisites, remember its absolute path. Every subsequent file operation uses paths relative to this root.

### Step 2.5 — Resolve the owner value

Every spec this pipeline creates or modifies gets its `owner` frontmatter field set to the current git user name, resolved once and cached in pipeline state. Follow the **Owner field resolution** procedure in `references/entity-content.md` — primary: `git config user.name`, fallbacks: `git config --global user.name`, `$USER`, finally `AskUserQuestion`. Store the result as `owner_value` and reuse it for every entity created in this run.

Report the resolved owner to the user in the initial status message: *"Running HLRD import as owner: `<owner_value>`"*, so they know what will be stamped on every produced spec.

### Step 3 — Entry point

Use AskUserQuestion to ask where the import should land:

- `Import at project root` — new top-level goals/features
- `Nest under an existing feature` — imports a subtree; requires picking a parent feature

If the user picks "Nest under an existing feature", list candidate features. Delegate to the `speclan-query` skill to enumerate features by status (prefer `draft` / `review` / `approved`, skip locked statuses). If `speclan-query` is unavailable, fall back to `Glob` `speclan/features/**/F-*.md` and Read each file's frontmatter for its `title` and `status`.

`AskUserQuestion` supports up to 4 options per question. If there are more than 4 candidates, present them in pages of 4 with an explicit "Show more candidates" option on each page until the user picks one or explicitly cancels.

Record the decision as:
- `{ mode: 'root' }` — top-level import
- `{ mode: 'subtree', parentFeatureId: 'F-####', parentFeatureTitle: '...' }` — subtree import

### Step 4 — Complexity recommendation

Compute the recommended complexity level from the word count using `references/complexity-levels.md` (word-count → level index → feature range). Then use AskUserQuestion to confirm, presenting all five options with the recommendation marked. Read `references/complexity-levels.md` now if you haven't yet — it has the exact thresholds, feature ranges, and the guidance text to inject into the planning prompt.

Store the chosen level index; subsequent phases use it to shape the plan.

## Phase 0 — Vision & Mission

**Goal:** Create or update `speclan/vision.md` and `speclan/mission.md` based on the HLRD, so the project has a strategic foundation before feature planning begins.

This phase always runs — even for subtree imports — because the AI is instructed to leave a file "unchanged" when the existing content is already comprehensive, so the cost of running it when it's unnecessary is minimal. Refusing to run it, by contrast, would silently skip a chance to align the project's north star with the newly imported scope.

**Read `references/vision-mission.md` now.** It contains the full extraction procedure, the aspirational-vs-operational tone rules, word counts, anti-implementation guardrails, and the create/update/unchanged decision logic.

After the phase completes, report to the user: `Vision {created|updated|unchanged}, Mission {created|updated|unchanged}`.

## Phase 1 — Planning

**Goal:** Produce a lightweight plan of Goals and Features to create or modify — NOT full entity content, and NOT requirements (those come in Phase 2.5).

### Step 1 — Explore existing specs

Before producing a plan, explore what already exists so the plan can reference existing entities instead of duplicating them:

1. `Glob` `speclan/goals/G-*.md` and Read each file's frontmatter (`id`, `title`, `status`).
2. `Glob` `speclan/features/**/F-*.md` and build a lightweight in-memory feature tree (id, title, parent-id inferred from directory nesting, status).
3. `Grep` the HLRD's key domain nouns across `speclan/` to find semantically related entities.
4. If a `speclan-query` skill call gives you richer filtering, prefer it.

### Step 2 — Draft the plan

Produce an internal plan listing each proposed entity with these fields:

- `type`: `goal` or `feature`
- `action`: `create` or `modify` or `reference` (`reference` means the HLRD item maps to an existing entity — record it but take no action this phase)
- `title`: 3–6 words for goals, capability name for features
- `summary`: 1–2 sentences describing what this entity covers
- `existingId`: required for `modify` and `reference`
- `parentHint`: for features — the parent feature title/ID or `null` for root (subtree imports default the parent to the selected entry-point feature)
- `isLeaf`: features only — whether this feature will have child features beneath it

**Budget the feature count** according to the complexity level chosen in preflight. If the plan exceeds the top of the range, collapse related features; if it falls below the bottom, split compound features.

**Respect the entry-point.** For a subtree import, every new top-level feature becomes a child of the entry-point feature. For a root import, features can be root-level or children.

### Step 3 — Clarification loop

The reference agent uses multi-choice JSON to surface ambiguities. In Claude Code, translate each would-be clarification into an `AskUserQuestion` call — see `references/clarification-patterns.md` for the translation rules and anti-patterns (read it before the first clarification).

Hard limits:

- **At most 2 rounds** of clarification per planning pass. If after round 2 ambiguities remain, make a reasonable judgment call and proceed — the user can iterate via change requests later.
- **At most 5 clarifications per round**, delivered as 5 separate `AskUserQuestion` calls (the tool supports ≤4 questions per invocation, so batching is not worth the complexity — one question per call is clearer).
- **Hard cap of 8 total clarifications** across both rounds. Prefer to ask fewer, higher-value questions.

Only ask when the ambiguity would genuinely change the entity structure — scope ambiguity, multiple valid interpretations, unclear parent/child relationships, missing priorities. **Never** ask about implementation details, styling, or edge cases that can be reasonably inferred. A typical HLRD produces 2–5 clarification questions total; finding zero ambiguities is unusual — re-read the document before concluding none exist.

Fold each answer directly into the plan before proceeding.

### Step 4 — Report the plan

Before entering Phase 2, show the user a brief summary: `I'm about to create X goals and Y features (Z marked for modification). Starting now.` Do NOT wait for approval — the user explicitly chose create-and-go rather than an approval gate. If you need to pause, stream progress clearly so they can interrupt.

## Phase 2 — Entity Creation

**Goal:** Create the planned Goals and Features on disk, and apply modifications to any existing entities marked `action: modify`. Requirements are deferred to Phase 2.5.

### Delegation — never re-derive structural rules

File creation is a **thin wrapper** around the `speclan-format` skill. The authoritative procedure for creating any SPECLAN file lives in `speclan-format`'s "Creating New Specifications" section — it owns template discovery, ID requests, directory location, filename conventions, `mkdir` discipline, frontmatter field lists, and bidirectional linking. **Follow that procedure.** Do not recompute directory paths or slug rules in this skill — if you find yourself doing so, you've drifted.

This skill only contributes:

1. **HLRD-derived content** — the goal/feature/requirement body text, derived from the plan and the HLRD source, following the body templates in `references/entity-content.md`.
2. **HLRD-specific metadata** — setting `owner: <owner_value>` (the cached git user name resolved in Preflight Step 2.5), `status: draft`, and linking the HLRD-planning decisions into the content (feature goals, requirement parent, etc.).
3. **Merge rules for `action: modify`** — how to fold HLRD content into existing draft/review/approved entities without breaking invariants. These live in `references/entity-content.md`.

Read `references/entity-content.md` now for body templates and merge rules. It does **not** duplicate the structural rules from `speclan-format`.

### Ordering

Always create in this order:

1. **Goals** (any order within the batch — goals are independent).
2. **Parent features** (features with no parent, or whose parent already exists).
3. **Child features** (top-down: a child can only be created after its parent exists).

This order mirrors the reference pipeline's `generateCreationOrder()` logic and prevents dangling parent references.

### Generating IDs

Delegate to the `speclan-id-generator` skill for all ID generation. Request IDs in batches where possible:

- One batch of goal IDs equal to the number of goals to create.
- One batch of feature IDs equal to the number of features. For child features, include `--parent <parentId>` so the ID falls after existing siblings and preserves creation order.

Collect all IDs upfront. If the generator reports collisions during creation, request fresh IDs and retry — do not recycle or manually invent IDs.

### Creating a goal

1. **Follow `speclan-format`'s "Creating New Specifications" procedure for entity type `goal`**, passing the title from the plan. That procedure handles template discovery (`speclan/templates/goals/`), ID generation (via `speclan-id-generator`), slug derivation, file location, and frontmatter fields.
2. **Fill the body** using the Goal body template in `references/entity-content.md`, populated from the plan's `summary` and the relevant HLRD sections.
3. **Set HLRD-specific frontmatter**: `owner: <owner_value>` (the cached git user name resolved in Preflight Step 2.5), `status: draft`.
4. Report `Goal G-### created: <title>`.

### Creating a feature

1. **Follow `speclan-format`'s "Creating New Specifications" procedure for entity type `feature`**, passing the title and — for nested features — the parent feature's ID. That procedure handles template discovery (`speclan/templates/features/`), parent-aware ID generation, the directory-based storage layout (including root/child/subtree-entry-point nesting), `mkdir` discipline, and frontmatter fields.
2. **Fill the body** using the Feature body template in `references/entity-content.md`, populated from the plan's `summary`, user story (derived from HLRD), and scope.
3. **Set HLRD-specific frontmatter**: `owner: <owner_value>` (the cached git user name resolved in Preflight Step 2.5), `status: draft`, `leaf: <true|false>` per the plan's `isLeaf` flag.
4. Leave the `goals:` frontmatter list empty for now — Phase 3 populates it via bidirectional linking once all features exist.
5. Report `Feature F-#### created: <title>`.

### Modifying an existing entity

If `action: modify`, apply the merge rules from `references/entity-content.md`. Key invariants:

- Never change the entity ID, type, status, owner, or `created` timestamp.
- Never downgrade status (e.g. `approved` → `draft`).
- Append acceptance criteria, user stories, or success criteria — do not replace.
- Set `updated` to the current ISO-8601 timestamp.
- Preserve existing cross-references and markdown links.
- Refuse to modify entities in locked statuses (`in-development`, `under-test`, `released`, `deprecated`) — surface a warning and convert the action to "create a change request" (currently out of scope; just warn for now and skip).

Use `Edit` rather than `Write` for modifications so the diff is tractable for the user.

### Failure handling

Track failures in a running list. A single failed entity must not stop the pipeline — continue with the remainder and report all failures in the summary. Classify each failure as:

- `id-collision` — retry with fresh IDs
- `io-error` — surface path + reason, skip
- `validation-error` — the content didn't meet speclan-format rules; surface, skip
- `locked-status` — entity in a locked status, can't modify; skip with warning

## Phase 2.5 — Requirements Generation

**Goal:** For each Feature created in Phase 2, generate 1–3 (simple), 3–5 (moderate), or 5–7 (complex) testable requirements derived from the HLRD and the feature's purpose.

Requirements are generated **per feature**, sequentially, so the agent has fresh context each time.

### Procedure per feature

1. Read the feature file (frontmatter + body) that was just created.
2. Check `speclan/features/F-####/.../requirements/` for existing requirements — if 7 or more exist, skip generation for that feature.
3. Check `speclan/templates/requirements/` for a requirement template; if one exists, use its structure.
4. Assess the feature's complexity:
   - **Simple** (1–3 requirements): single-purpose features, basic CRUD, straightforward UI.
   - **Moderate** (3–5): multi-faceted features, business logic, integrations.
   - **Complex** (5–7): cross-cutting concerns, security, workflows, multi-system.
5. Derive each requirement from the feature's description, user story, and the relevant HLRD sections. Each requirement must be:
   - **Atomic** — tests one thing.
   - **Testable** — has clear pass/fail criteria.
   - **Traceable** — clearly derived from HLRD content or feature description.
6. For each requirement, **follow `speclan-format`'s "Creating New Specifications" procedure for entity type `requirement`**, passing the title and parent feature ID. That procedure handles the parent-aware ID generation (`--parent <featureId>`), the directory-based storage layout inside the parent feature's `requirements/` directory, and the `feature: F-####` frontmatter linkage. Fill the body using the Requirement body template in `references/entity-content.md` — in particular, acceptance criteria must use GFM task list checkboxes (`- [ ] Given X, when Y, then Z`) for trackability. Set HLRD-specific frontmatter: `owner: <owner_value>` (the cached git user name resolved in Preflight Step 2.5), `status: draft`.
7. Report `Feature F-####: N requirements created`.

**Prefer fewer high-quality requirements over many vague ones.** Overlap between requirements within a feature is a strong sign to consolidate.

Avoid asking clarifications during this phase — the planning clarifications should have resolved structural ambiguities, and per-requirement questions produce noise. Make reasonable interpretations and move on.

## Phase 3 — Cross-Referencing

**Goal:** Weave inline markdown cross-references into each touched entity's existing prose, establish bidirectional goal contributions for features, and enforce the "inline-only" rule across every entity created or modified in this pipeline run.

Read `references/cross-referencing.md` before starting this phase — it contains the **canonical inline-only contract** (shared across every `speclan-engineering` skill), the "what to link / what NOT to link" rules (TreeView already handles parent/child/sibling), the relative-path rules, the bidirectional goal-contribution procedure, and the post-creation validation step that fails the phase if any entity contains a `## Related`, `## References`, `## See Also`, or `## Links` section.

**This phase is mandatory** — do not skip it even if the pipeline produced only a handful of entities. Coherence across the spec set depends on the inline-linking discipline being applied uniformly.

Process each entity created or modified in Phases 2 and 2.5 once, in this order:

1. Goals — link to features that contribute to them (after features are processed, bidirectionally).
2. Features — identify goal contributions (bidirectional edit), then add inline links to related features and requirements.
3. Requirements — add inline links to related features.

Bidirectional links matter: when a feature is added as a contributor to a goal, update BOTH the goal's `contributors:` frontmatter list AND the feature's `goals:` frontmatter list. The `speclan-format` skill defines the field names.

## Summary

Produce a final report to the user with these counts:

- **Vision/Mission**: `created|updated|unchanged` for each
- **Goals**: `N created, M modified`
- **Features**: `N created, M modified`
- **Requirements**: `N created` (grouped by feature)
- **Cross-references**: `N links added`
- **Goal contributions**: `N links added`
- **Failures**: list each failed entity with its classification and a human-readable reason

If there are failures, offer via AskUserQuestion whether to retry the failed entities, edit them manually, or leave them for a later pass.

## Error handling and cancellation

- **User cancels mid-pipeline** (says "stop", "cancel", etc.): stop cleanly, report what was completed and what remains. Do NOT roll back — written files stay.
- **Transient errors** (file system busy, etc.): retry up to 3 times with brief backoff, then classify as `io-error` and continue.
- **Pipeline-stopping errors** (speclan dir became unreadable, catastrophic permission denial): stop, report, ask for guidance via AskUserQuestion.

## References

- `references/vision-mission.md` — Phase 0 procedure, vision/mission guardrails, tone rules, create/update/unchanged logic.
- `references/complexity-levels.md` — Complexity slider definitions, word-count thresholds, ID pool sizing.
- `references/clarification-patterns.md` — How to translate multi-choice clarifications into `AskUserQuestion` calls.
- `references/entity-content.md` — Goal/Feature/Requirement content structure, YAML frontmatter, merge rules for modify.
- `references/cross-referencing.md` — Inline linking strategy, relative paths, goal-contribution bidirectional edits.

## Related skills

This skill depends on the `speclan` plugin and delegates to:

- `speclan-format` — canonical directory layout, YAML frontmatter, status lifecycle.
- `speclan-id-generator` — collision-free ID generation (via `generate-id.mjs`).
- `speclan-query` — listing/filtering existing entities by type and status.

Never duplicate logic from those skills — always delegate so the canonical knowledge stays in one place.
