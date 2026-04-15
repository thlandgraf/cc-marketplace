---
name: speclan-engineering:brainstorm
description: Use this skill to turn a rough thought, half-formed idea, "what if" question, or quick concept into SPECLAN specifications through an interactive brainstorming session. Triggers when the user says "I have an idea", "what if we", "I'm thinking about", "let's explore", "rough idea", "can we add", "should we support", "quick thought", "random thought", "brainstorm", "brainstorm with me", or invokes `/speclan-engineering:brainstorm`. Grounds the thought in the existing project, runs a divergence-and-convergence loop via AskUserQuestion with free-text follow-ups, and — when the user explicitly says they're ready — crafts goals, features, requirements, or change requests via `speclan-format`'s creation procedure. Use whenever a user wants to explore a vague idea before committing to specs, even if they don't say "brainstorm" explicitly. Do NOT use this skill when the user has a finished PRD/HLRD document to import (use `/speclan-engineering:hlrd`) or just wants to query existing specs (use `/speclan:ask`).
version: 0.1.0
---

# SPECLAN Brainstorm Pipeline

Transform a rough thought into SPECLAN artifacts through an interactive loop: ground the thought in the existing project, explore it, decide when to commit, and craft the specs with one quality pass first.

Unlike `/speclan-engineering:hlrd` (a one-shot pipeline over a finished document), this is a **loop**. The user decides when exploration is done and the skill transitions to spec crafting. A typical session produces 1–3 entities.

## Pipeline at a glance

```
Phase 0  → Preflight & Grounding       (understand the thought and its context)
Phase 1  → Exploration Loop            (up to 5 rounds, user-gated)
Phase 2  → Spec Shaping                (enumerate entities, confirm)
Phase 3  → Quality Clarification       (≤1 question per entity, cap 3 total)
Phase 4  → Creation                    (delegate to speclan-format)
Phase 5  → Cross-Referencing           (inline links, enforce no-References-section rule)
Phase 6  → Summary                     (report + offer next actions)
```

## Prerequisites

1. **`speclan` plugin must be loaded.** Verify `speclan-format`, `speclan-id-generator`, and `speclan-query` are available. If missing, stop and tell the user to install the `speclan` plugin.

2. **`speclan/` directory.** Detect it under `$CLAUDE_PROJECT_DIR`. If absent, ask via `AskUserQuestion` whether to create it, point to a different path, or cancel.

3. **File creation delegation.** Every spec file produced by this skill goes through `speclan-format`'s "Creating New Specifications" procedure — never re-derive directory paths or slug rules here. Body templates and merge rules for existing entities live in `${CLAUDE_PLUGIN_ROOT}/../hlrd-authoring/references/entity-content.md` and are shared across both commands.

## Phase 0 — Preflight & Grounding

Brainstorms fail when the skill starts generating ideas before understanding what the user is actually asking about. Grounding is non-optional.

Read `references/grounding.md` now — it contains the classification taxonomy, anchoring procedure, and the interpretation-presentation pattern. The remainder of Phase 0 follows.

### Step 1 — Resolve the thought

- **`$ARGUMENTS` non-empty**: treat as the rough thought. Do not detect file paths — brainstorm inputs are thoughts, not documents. If the argument happens to be a path, treat it as a typo and use the literal text.
- **`$ARGUMENTS` empty**: use `AskUserQuestion` with options `Share a rough idea`, `Explore an existing spec (by ID)`, `Cancel`. On the first two, follow up with a free-text question capturing the idea or the ID.

### Step 2 — Build lightweight context

You need just enough context to ground the thought — not a full project scan:

1. `Read` `speclan/vision.md` and `speclan/mission.md` if they exist. Skip silently if absent.
2. `Glob` `speclan/goals/G-*.md` and Read each file's frontmatter (`id`, `title`, `status`). Skip body content.
3. `Glob` `speclan/features/F-*/F-*.md` (top-level only, no `**`) and Read each frontmatter. Skip nested child features for speed — Phase 0 doesn't need them.

This gives you a map of vision + all goals + top-level features in a handful of reads. Deeper context is loaded on demand during anchoring.

### Step 2.5 — Resolve the owner value

Every spec this pipeline creates or modifies gets its `owner` frontmatter field set to the current git user name, resolved once and cached in pipeline state. Follow the **Owner field resolution** procedure in `../hlrd-authoring/references/entity-content.md` — primary: `git config user.name`, fallbacks: `git config --global user.name`, `$USER`, finally `AskUserQuestion`. Store the result as `owner_value` and reuse it for every entity created in this session.

Report the resolved owner to the user in the grounding-confirmation message: *"Running brainstorm as owner: `<owner_value>`"* so they know what will be stamped on any specs produced.

### Step 3 — Anchor the thought

Per `references/grounding.md`:

1. Scan the thought for explicit entity IDs: `G-\d{3}`, `F-\d{4}`, `R-\d{4}`, `CR-\d{4}`. If any match, `Glob` to find the file(s) and `Read` them fully — these become the anchor entities.
2. If no explicit ID, extract 2–3 salient nouns from the thought and `Grep` them across `speclan/` with `-l` to find candidate entities. `Read` up to 3 top candidates.
3. If nothing matches, the thought is free-range — proceed without an anchor.

### Step 4 — Classify

Using the thought + anchor + context, classify the intent into exactly one of:

- `new-goal` — strategic outcome, no editable anchor
- `new-feature` — capability, possibly under an existing goal/feature
- `feature-extension` — modifies an existing editable feature
- `new-requirement` — testable obligation under a specific feature
- `requirement-modification` — modifies an existing editable requirement
- `change-request` — any modification to a locked entity (`in-development`, `under-test`, `released`, `deprecated`)
- `not-speclan` — the thought is not specification-shaped (e.g., implementation debugging, general chat)

`references/grounding.md` has decision examples for each class.

### Step 5 — Present the interpretation

Summarize back to the user in 1–3 sentences:

> I read this as **`<classification>`** targeting **`<anchor-or-free-range>`**, in the context of **`<project-summary>`**. Does that match what you have in mind?

Then `AskUserQuestion` with options `Yes, proceed`, `Close — I meant something else`, `Let me rephrase`. On `Let me rephrase`, a free-text follow-up captures the new framing; loop back to Step 3. On `Close`, offer 2–3 alternative classifications via `AskUserQuestion`.

### Step 6 — Handle `not-speclan`

If the thought isn't spec-shaped, don't force it into the pipeline. Say so directly and suggest a better tool:

- Implementation question → answer informally in the conversation, no pipeline.
- Question about existing specs → suggest `/speclan:ask`.
- Finished requirements document → suggest `/speclan-engineering:hlrd`.

Then exit the pipeline cleanly.

## Phase 1 — Exploration Loop

**Goal:** Help the user sharpen the thought until they have enough clarity to commit to specs. The loop runs between 0 and 5 rounds; the user decides when to exit.

### Loop state

Track:
- `round_count` — starts at 0, increments after each round
- `synthesis` — running picture of the evolving idea, updated after each round
- `commitment_gate_answer` — most recent response to the "ready to craft specs?" question

### Per-round procedure

**Step 1 — Divergence (free-form).** Produce 3–4 distinct angles or expansions on the current synthesis. Choose the framing that surfaces genuine ambiguity — don't cite a framework, just ask naturally. Useful framings to pick from (pick what fits the thought, not a formula):

- "What's the minimum viable version?"
- "What's the maximal version?"
- "Who else benefits from this that we haven't named?"
- "What breaks if we don't do this?"
- "What's the first user action when this exists?"
- "What's explicitly out of scope?"
- "What's the hidden assumption we're making?"

Present each angle as a 1-sentence expansion tied to the thought. Present them via `AskUserQuestion` (up to 4 options) so the user can pick one to drill into — and they can always pick "Let me answer in my own words" for a free-text response.

**Step 2 — Drill-down.** Based on the user's pick, ask 1–2 targeted clarifying questions. Mix `AskUserQuestion` (when meaningful choices exist) and plain free-text prompts ("Say more about that — what's the acceptance test for this?"). Keep drill-down tight: two questions max per round.

**Step 3 — Synthesize.** Update the running `synthesis` and show it back to the user as plain text (no question):

> **So far I'm hearing:** *<1–3 sentence summary weaving the original thought and the new drill-down into a sharper statement>*

Don't preface this with "Let me summarize" or similar meta-talk — just state it directly.

**Step 4 — Commitment gate.** `AskUserQuestion`:

> Ready to shape this into specs?

Options (when `round_count < 5`):

1. `Yes — craft specs now` → advance to Phase 2
2. `Keep exploring (one more round)` → loop back to Step 1
3. `Change direction` → free-text follow-up asking what to pivot toward; reset synthesis focus and loop
4. `Cancel` → exit the pipeline

### Round cap enforcement

After 5 completed rounds, **remove** the `Keep exploring` option from the gate and add a gentle nudge:

> We've been exploring for five rounds — momentum drops past this point. I'd suggest shaping specs now and iterating from there. Want to proceed, change direction, or cancel?

The user can still `Change direction` or `Cancel`, but the path of least resistance is now forward.

## Phase 2 — Spec Shaping

**Goal:** Enumerate the concrete entities the session will produce and confirm the plan.

### Step 1 — Derive the entity list

From the final synthesis + classification + anchor, determine what to create. For each entity, capture:

- `type`: `goal` | `feature` | `requirement` | `changeRequest`
- `action`: `create` | `modify` | `changeRequest`
- `title`: short descriptive title (following the style rules in `../hlrd-authoring/references/entity-content.md`)
- `parent`: parent entity ID if any (feature's goal, requirement's feature, CR's target)
- `summary`: 1–2 sentences describing the entity
- `existingId`: for `modify` or `changeRequest`, the ID of the entity being touched

Most brainstorms produce 1–3 entities. More than 3 is a signal that the thought deserves `/speclan-engineering:hlrd` instead — offer the switch if the count exceeds 3.

### Step 2 — Apply the edit-vs-CR rule

For each entity marked `modify`:

- Read the target's `status` from its frontmatter.
- If status is `draft`, `review`, or `approved` → keep `action: modify` (edit in place).
- If status is `in-development`, `under-test`, `released`, or `deprecated` → change `action` to `changeRequest` and record the original target as `parentId`/`parentType` per `references/change-request-workflow.md`.

This rule is applied silently — don't make the user choose. The lifecycle decides.

### Step 3 — Present the plan

Show the plan in plain text:

> **Based on our brainstorm, I'll:**
>
> - **Create** Goal `G-???` — Enable Partner Self-Service
> - **Create** Feature `F-????` — Shop Lifecycle (under G-???)
> - **File** Change Request `CR-????` — Add microchipping validation (against R-0001, status: released)

Use `???` for IDs you haven't generated yet — they come in Phase 4.

Then `AskUserQuestion`:

> Proceed with this plan?

Options:

1. `Create them all` → advance to Phase 3
2. `Refine an entity first` → drop into a sub-loop that asks which entity, then lets the user adjust title, parent, or drop it; loop back to Step 3
3. `Cancel` → exit the pipeline

## Phase 3 — Quality Clarification

**Goal:** One targeted pass to improve spec quality before creation. Strictly bounded.

### Budget

- **At most 1 question per entity** in the plan.
- **Hard cap of 3 questions total** across all entities, even if the plan has more than 3.
- Questions are only asked when the answer would **materially change the spec content** — not when it would just refine wording.

### Per-entity check

For each entity (in plan order), assess:

- **Goals**: Is the success criterion concrete enough to know when it's achieved? If not, ask.
- **Features**: Is the user story's `<user type>` clear? If "a user" is the best you can do, ask.
- **Requirements**: Is the acceptance criterion testable? If Given/When/Then would require a guess, ask.
- **Change requests**: Is the change narrative specific about what changes? If it's vague, ask.

If any of these are already clear from the brainstorm conversation, **skip** the question for that entity. Don't burn budget asking things you already know.

Each question is one `AskUserQuestion` call with 2–4 options **or** a plain free-text prompt, whichever fits better. Fold the answer into the entity's content before moving to Phase 4.

Once you've asked 3 questions total, stop asking entirely — subsequent entities are crafted with the information already in hand.

## Phase 4 — Creation

**Goal:** Write the entities to disk, following the same delegation discipline as `/speclan-engineering:hlrd`.

### Delegation rules

File creation is a **thin wrapper** around `speclan-format`'s "Creating New Specifications" procedure. Never re-derive directory paths, filename patterns, `mkdir` discipline, or frontmatter field lists in this skill.

For each entity in the plan, apply the rule matching its `action`:

#### `action: create` (goal | feature | requirement)

1. **Follow `speclan-format`'s "Creating New Specifications" procedure** for the entity type, passing the title and parent ID (if any). That procedure calls `speclan-id-generator`, handles template discovery, computes the directory path, and writes the frontmatter.
2. **Fill the body** using the appropriate template in `${CLAUDE_PLUGIN_ROOT}/../hlrd-authoring/references/entity-content.md`. That reference is shared between `hlrd-authoring` and this skill to avoid drift.
3. **Set session-specific frontmatter**: `owner: <owner_value>` (the cached git user name resolved in Phase 0 Step 2.5), `status: draft`.
4. For features, leave `goals:` empty if no anchor goal exists; populate it if the brainstorm selected one.
5. Report: `{type} {id} created: <title>`.

#### `action: modify` (editable status)

1. Apply the merge rules in `../hlrd-authoring/references/entity-content.md` (section "Merge rules for `action: modify`").
2. Use `Edit` rather than `Write` for tractable diffs.
3. Update the `updated` timestamp to the current ISO-8601 time.
4. Never downgrade status, never change `id`/`type`/`owner`/`created`.
5. Report: `{type} {id} modified: <short change description>`.

#### `action: changeRequest` (locked status target)

Follow `references/change-request-workflow.md` — it covers directory location, ID generation, frontmatter fields (`parentId`, `parentType`, `changeType`, `description`, `changes`), body template, and the "never edit the locked entity directly" rule.

Report: `Change Request {id} filed against {parentType} {parentId}`.

### Failure handling

Track failures in a running list. A single failed entity must not stop the pipeline — continue with the remainder and report all failures in Phase 6 (Summary). Classifications:

- `id-collision` — retry with fresh ID
- `io-error` — surface path + reason, skip
- `validation-error` — content didn't meet speclan-format rules; surface, skip
- `locked-status-violation` — attempted to modify a locked entity that should have been a CR; surface, convert to CR on-the-fly if possible, else skip

## Phase 5 — Cross-Referencing

**Goal:** Weave inline markdown cross-references between every entity touched in Phase 4 and the rest of the spec set, establish bidirectional goal contributions for any new or modified features, and enforce the inline-only rule so coherence doesn't decay.

**Delegate to `${CLAUDE_PLUGIN_ROOT}/../hlrd-authoring/references/cross-referencing.md`** — this is the canonical cross-referencing contract shared across every `speclan-engineering` skill. It defines:

- The **inline-only rule** (no `## Related` / `## References` / `## See Also` / `## Links` sections, ever)
- What to link and what NOT to link (TreeView handles parent/child/sibling — don't duplicate)
- Relative-path rules between entity types
- The bidirectional goal-contribution procedure
- The post-creation **validation step** that scans each touched file for forbidden sections and stops the phase if any are found

### Scope for brainstorm sessions

Brainstorm sessions typically touch 1–3 entities. For each:

1. **Created entities**: run the discovery pass in `cross-referencing.md` Step "Discovery strategy", scanning the existing spec set for relevant targets and weaving inline links into the new entity's prose.
2. **Modified entities** (`action: modify`): re-scan the modified regions for new links (the merge added prose that may mention related entities). Preserve existing inline links — only add, never remove.
3. **Change requests** (`action: changeRequest`): link from the CR body (Summary, Rationale, Proposed Changes) to the entities mentioned in the narrative. The CR is a short file, so the link count is typically low but the links are high-value.

### Validation step

After adding links, scan each touched file via `Grep` for forbidden sections (`^## Related`, `^## References`, `^## See Also`, `^## Links`). If any are found, they are a pipeline bug — rewrite inline per `cross-referencing.md` Enforcement Validation, or escalate via `AskUserQuestion` if rewriting fails.

Brainstorm's creation phase never produces these sections when it follows the shared `entity-content.md` templates, but the validation step is the safety net.

## Phase 6 — Summary

Produce a final report:

> **Brainstorm session complete:**
>
> - **Created:** G-001 Enable Partner Self-Service, F-1200 Shop Lifecycle
> - **Modified:** F-1100 Authentication (added partner auth flow)
> - **Change Requests filed:** CR-0001 against R-0001
> - **Failures:** none

Then offer follow-ups via `AskUserQuestion`:

1. `Refine the requirements for a created feature` (if features were created)
2. `Run another brainstorm session` (same thought, new angle)
3. `Switch to /speclan-engineering:hlrd for a deeper pass`
4. `Done — exit`

These are convenience shortcuts; the user can always ignore them and go back to the conversation.

## Error handling and cancellation

- **User cancels at any gate:** stop cleanly, no rollback. Files already written stay.
- **User goes silent during a free-text prompt:** wait for the next message. If the next message is unrelated, `AskUserQuestion` whether to continue the brainstorm or abort.
- **Transient file system errors:** retry 3× with brief backoff, then classify as `io-error` and continue.
- **Pipeline-stopping errors** (speclan dir unreadable, catastrophic permission denial): stop, report, ask via `AskUserQuestion` how to proceed.

## References

- `references/grounding.md` — Classification taxonomy, anchoring procedure, interpretation-presentation pattern, `not-speclan` handling.
- `references/change-request-workflow.md` — CR creation for locked-status entities: directory, ID, frontmatter, body template, "never edit the locked entity" rule.
- `../hlrd-authoring/references/entity-content.md` — **Shared** body templates, style rules, and merge rules. Re-used across `/hlrd` and `/brainstorm` to avoid drift.
- `../hlrd-authoring/references/cross-referencing.md` — **Shared** canonical cross-referencing contract: the inline-only rule, what to link / what not to link, relative paths, bidirectional goal contributions, and the post-creation validation step. Used by Phase 5.

## Related skills

This skill depends on the `speclan` plugin and delegates to:

- `speclan-format` — "Creating New Specifications" procedure; canonical directory layout, filename conventions, frontmatter fields, status lifecycle.
- `speclan-id-generator` — collision-free ID generation for all entity types including `changeRequest`.
- `speclan-query` — listing/filtering existing entities during Phase 0 context scan and anchoring.

Never duplicate logic from those skills — always delegate.
