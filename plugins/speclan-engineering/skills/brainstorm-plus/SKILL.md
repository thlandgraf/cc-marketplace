---
name: speclan-engineering:brainstorm-plus
description: Use this skill for high-effort brainstorming sessions that spawn multiple parallel subagents — each applying a distinct ideation technique (SCAMPER, Crazy 8s, Reverse, First Principles, Analogy, Six Hats, Constraint-Based, Random Input) — then synthesizes the results into strong threads the user can drill into before crafting SPECLAN specs. Triggers when the user says "deep brainstorm", "brainstorm plus", "multi-angle brainstorm", "throw everything at this", "I want a thorough exploration", "parallel brainstorm", "give me more ideas", "I'm stuck — explore harder", or invokes `/speclan-engineering:brainstorm-plus`. Use this when a rough thought deserves more effort than single-agent brainstorming — gnarly architectural decisions, ambiguous product directions, or stuck ideation. Do NOT use this skill when the user has a finished PRD (use `/speclan-engineering:hlrd`), wants a quick brainstorm (use `/speclan-engineering:brainstorm`), or is asking about existing specs (use `/speclan:ask`).
version: 0.1.0
---

# SPECLAN Brainstorm Plus Pipeline

Multi-agent brainstorming that produces sharper specs by dispatching 3–5 parallel subagents — each applying a distinct ideation technique — then synthesizing the cross-technique output into strong threads for interactive progression.

## How this differs from `/brainstorm`

| Phase | `/brainstorm` | `/brainstorm-plus` |
|-------|---------------|--------------------|
| Grounding | Main skill | **Same** (references brainstorm's procedure) |
| Divergence | Main skill produces 3–4 angles per round | **3–5 parallel subagents**, each one technique, one shot |
| Synthesis | Inline in the conversation loop | **Explicit Phase 3** with cross-technique clustering |
| Progression loop | Up to 5 rounds | Up to **3 rounds** (subagents already did the heavy lifting) |
| Spec shaping / quality / creation | Main skill | **Same** (references brainstorm's procedure) |

The delta is phases 0.5–3. Everything else is shared.

## Pipeline at a glance

```
Phase 0  → Grounding                (REUSE brainstorm Phase 0)
Phase 1  → Technique Selection      (NEW — parse flags OR auto-pick 3–5 techniques)
Phase 2  → Parallel Agent Dispatch  (NEW — spawn subagents in one turn)
Phase 3  → Synthesis & Thread Pick  (NEW — cluster, present 2–3 threads, user picks)
Phase 4  → Interactive Progression  (REUSE brainstorm Phase 1, cap 3 rounds)
Phase 5  → Spec Shaping             (REUSE brainstorm Phase 2)
Phase 6  → Quality Clarification    (REUSE brainstorm Phase 3)
Phase 7  → Creation                 (REUSE brainstorm Phase 4)
Phase 8  → Cross-Referencing        (REUSE brainstorm Phase 5)
Phase 9  → Summary                  (REUSE brainstorm Phase 6 + technique contributions)
```

## Prerequisites

1. **`speclan` plugin loaded** — `speclan-format`, `speclan-id-generator`, `speclan-query`. Same as `/brainstorm`.
2. **`Agent` tool available** — if the harness doesn't expose parallel subagent dispatch, fall back to recommending `/speclan-engineering:brainstorm` and stop.
3. **`speclan/` directory exists or will be created** — same handling as `/brainstorm`.
4. **File creation delegation** — every spec goes through `speclan-format`'s "Creating New Specifications" procedure. Shared body templates live in `${CLAUDE_PLUGIN_ROOT}/../hlrd-authoring/references/entity-content.md`.

## Phase 0 — Grounding

**Delegate to `/brainstorm` skill's Phase 0.** Load `${CLAUDE_PLUGIN_ROOT}/../brainstorm/SKILL.md` and `${CLAUDE_PLUGIN_ROOT}/../brainstorm/references/grounding.md`. Follow the procedure exactly: resolve the thought, detect speclan directory, build lightweight context, **resolve the `owner_value` from `git config user.name` and cache it** (brainstorm Phase 0 Step 2.5), anchor via explicit IDs or noun Grep, classify into one of the seven types, present the interpretation, handle `not-speclan` exit.

**One difference at argument resolution**: before treating `$ARGUMENTS` as the thought, strip the `--techniques=<csv>` flag if present. See Phase 1 Step 1 for flag parsing — it runs before grounding Step 1 so the thought passed to grounding is the pure text.

State captured from Phase 0 for downstream phases:

- `thought` — the cleaned rough idea
- `classification` — one of the seven classes from `grounding.md`
- `anchor` — the anchor entity details or `null`
- `project_summary` — 1-sentence description of the project's vision/mission
- `owner_value` — the resolved git user name used as the `owner` field on every spec this pipeline creates or modifies

If classification is `not-speclan`, exit the pipeline (same as `/brainstorm`).

## Phase 1 — Technique Selection

**Goal:** Decide which 3–5 brainstorming techniques to dispatch as parallel subagents.

### Step 1 — Parse the flag (if present)

Before handing the thought to Phase 0, scan `$ARGUMENTS` for `--techniques=<csv>`:

- **Pattern**: `--techniques=<comma-separated-names>` at the start, end, or middle of `$ARGUMENTS`.
- **Valid names**: `scamper`, `crazy-8s`, `reverse`, `constraint`, `first-principles`, `analogy`, `six-hats`, `random-input`. See `references/techniques.md` for the canonical list.
- **Strip the flag** from `$ARGUMENTS` before passing the remaining text as the thought.
- **Validate** each name. If any is invalid (typo, unknown), use `AskUserQuestion` to show the valid list and ask the user to fix. Don't silently drop invalid names.
- **Count check**: the user may specify 1–8 techniques. If they specify more than 5, warn via `AskUserQuestion` that synthesis works best with ≤5 and let them confirm or trim.

If the flag was present and valid, skip to Step 3 (user-picked, no auto-selection).

### Step 2 — Auto-selection (no flag)

Read `references/technique-selection.md` now — it contains the decision matrix that maps `(classification, anchor, thought_shape)` to 3–5 techniques.

Apply the matrix:

1. **Mandatory techniques** per classification (e.g., SCAMPER is mandatory for `feature-extension`).
2. **Skip rules** based on preconditions (e.g., SCAMPER requires an anchor; skip if `anchor == null`).
3. **Boost rules** based on thought shape (e.g., include `six-hats` when the thought is multi-stakeholder, `random-input` when the thought is vague/short, `analogy` when the thought has a clear domain).
4. **Cap at 5** — never dispatch more than 5 subagents in one session. If more techniques qualify, drop the lowest-priority ones per the matrix's tie-breaker.

Record the selection as `selected_techniques: [<name>, ...]` with a 1-line reason per technique.

### Step 3 — Present for confirmation

Show the user the selected techniques in plain text:

> **For this brainstorm I'm dispatching these techniques in parallel:**
>
> 1. **SCAMPER** — the thought targets an existing feature, so mutation lenses apply
> 2. **Reverse Brainstorming** — the thought touches risk/security
> 3. **Constraint-Based** — stress-testing surfaces constraints you may not have considered
> 4. **First Principles** — the thought has buried assumptions worth exposing
>
> Spawning 4 parallel subagents. This will take longer than a regular brainstorm but produces a richer starting point.

Then `AskUserQuestion`:

> Dispatch these techniques?

Options:

1. `Dispatch as planned` → advance to Phase 2
2. `Adjust selection — let me pick` → drop into a sub-loop: show the 8 canonical techniques via `AskUserQuestion` (may need pagination since `AskUserQuestion` supports ≤4 options per question — split into two pages of 4), let the user toggle selections, then confirm the final list
3. `Cancel` → exit the pipeline

## Phase 2 — Parallel Agent Dispatch

**Goal:** Spawn one `general-purpose` subagent per selected technique, **in a single turn** for true parallelism.

### Step 1 — Build prompts

For each technique in `selected_techniques`, read its agent prompt template from `references/techniques.md` and fill in the placeholders:

- `{THOUGHT}` — the cleaned thought from Phase 0
- `{CLASSIFICATION}` — the grounding classification
- `{ANCHOR}` — the anchor entity details, or "free-range (no anchor)"
- `{PROJECT_SUMMARY}` — the 1-sentence project summary

Each prompt is self-contained — subagents start fresh with no conversation context, so the prompt must carry every fact the subagent needs.

### Step 2 — Dispatch in one turn

**CRITICAL**: spawn all subagents in a **single message** with multiple `Agent` tool calls. Do not spawn them sequentially — parallel dispatch is the whole point of this skill.

Each call uses:
- `subagent_type: "general-purpose"`
- `description`: "<technique-name> brainstorm"
- `prompt`: the filled prompt template

### Step 3 — Collect outputs

Each subagent returns a markdown document. Tag the output with its technique name and store under `agent_outputs[<technique>] = <markdown>`.

Agents are instructed to follow a conventional structure (per-idea headers, commentary section), but they may drift. Phase 3's parsing is robust to reasonable variation.

### Step 4 — Handle failures

- **Empty or clearly off-task output** (subagent ignored the technique, produced a summary of the thought, hallucinated implementation details) → drop the agent, continue with the remaining.
- **Timeout or hard error** → drop, continue.
- **Floor check**: if fewer than **2 agents** return usable output, stop and `AskUserQuestion`:
  - `Retry the failed agents once`
  - `Fall back to /speclan-engineering:brainstorm` (which doesn't need parallel agents)
  - `Cancel`

Failures below the floor are rare but the floor prevents a thin synthesis from being presented as rich.

## Phase 3 — Synthesis & Thread Pick

**Goal:** Cluster ideas across agents, identify the 2–3 strongest threads, and let the user pick one (or a hybrid) to drill into during Phase 4.

Read `references/synthesis.md` now — it contains the parsing strategy for free-form agent markdown, the clustering rules, and the thread-strength heuristic.

### Step 1 — Parse agent outputs

For each `agent_outputs[<technique>]`:

1. Extract ideas by scanning for heading patterns (`## Idea N:`, `## <lens> — <label>`, numbered lists). `synthesis.md` has the robust pattern list.
2. Capture per idea: technique name, label (3–6 words), description (1–2 sentences).
3. Capture the technique's commentary section as context (not a cluster candidate — used when picking threads).

### Step 2 — Cluster across techniques

Apply the similarity rules in `synthesis.md`:

- Keyword overlap in labels (domain nouns)
- Shared anchor entities mentioned in descriptions
- Conceptual overlap even with different wording (use judgment, not string match)

Each cluster is `{ label, member_ideas: [...], contributing_techniques: [...] }`.

### Step 3 — Identify strong threads

Rank clusters by strength using the heuristic:

> `strength = corroboration_count × (1 + orthogonal_novelty_score)`

- **corroboration_count**: distinct techniques that contributed a member idea. 2+ techniques agreeing = strong.
- **orthogonal_novelty_score**: 0.5 bonus if a single-technique cluster surfaces an angle no other technique mentioned but which aligns with the grounding classification.

Pick the top **3** clusters. If fewer than 3 distinct clusters exist (i.e., all agents converged on 1–2 ideas), pick all of them — don't pad with weak clusters.

### Step 4 — Present threads

Synthesize each thread into a 3–6 word label + 2–3 sentence summary listing contributing techniques. Example:

> **Thread A: Role-scoped approval workflows** *(SCAMPER · Reverse · Six Hats)*
> Multiple agents converged on the idea that team roles should gate approval workflows rather than read access. SCAMPER surfaced the "Substitute" lens (replace ACL with role-approval), Reverse pointed out that read-gating leaks draft content, Six Hats' black-hat flagged the audit risk of unscoped approvals.

Then `AskUserQuestion`:

> Which thread do you want to drill into?

Options:

1. `Thread A: <label>` → set `current_focus = thread A`, advance to Phase 4
2. `Thread B: <label>` → set `current_focus = thread B`
3. `Thread C: <label>` → set `current_focus = thread C`
4. `Hybrid — combine multiple` → free-text follow-up asking which threads to merge and how; set `current_focus` to the merged description
5. `Cancel` → exit the pipeline

(If you have only 2 threads, reduce options to 1–2 + Hybrid + Cancel. If only 1 thread, skip the question and advance with it as the focus.)

## Phase 4 — Interactive Progression

**Delegate to `/brainstorm` skill's Phase 1 (Exploration Loop)** with two modifications:

1. **Seed `synthesis`** with the `current_focus` from Phase 3 (instead of the raw thought).
2. **Reduce the round cap from 5 to 3.** The subagents already did most of the divergence work — the interactive loop is for sharpening, not re-exploring. After 3 rounds, insist on Phase 5 per the `/brainstorm` cap-enforcement rules.

Everything else in the loop is unchanged: `AskUserQuestion` commitment gate, free-form drill-down, synthesis updates between rounds.

## Phase 5 — Spec Shaping

**Delegate to `/brainstorm` skill's Phase 2 verbatim.** Enumerate entities, apply edit-vs-CR rule, present plan, refine sub-loop.

## Phase 6 — Quality Clarification

**Delegate to `/brainstorm` skill's Phase 3 verbatim.** ≤1 question per entity, hard cap 3 total.

## Phase 7 — Creation

**Delegate to `/brainstorm` skill's Phase 4 verbatim.** File creation goes through `speclan-format`'s creation procedure; body templates from the shared `hlrd-authoring/references/entity-content.md`; CRs follow `brainstorm/references/change-request-workflow.md`.

## Phase 8 — Cross-Referencing

**Delegate to `/brainstorm` skill's Phase 5 verbatim.** Every entity touched in Phase 7 gets inline markdown cross-references woven into its existing prose, features get bidirectional goal contributions, and the post-creation validation step enforces the inline-only rule by scanning for forbidden `## Related` / `## References` / `## See Also` / `## Links` sections.

This phase is mandatory and applies the **same canonical contract** as `/hlrd` and `/brainstorm` — see `../hlrd-authoring/references/cross-referencing.md`.

## Phase 9 — Summary

**Delegate to `/brainstorm` skill's Phase 6** with one addition: include a line listing which techniques contributed to the final spec content, so the user can see which subagent shaped the outcome:

> **Techniques that shaped this output:** SCAMPER, Reverse Brainstorming, First Principles (3 of 4 dispatched — Constraint-Based was dispatched but did not contribute to the selected thread)

This closes the loop on "which technique actually helped" and informs future flag decisions.

## Error handling and cancellation

Inherits all error-handling rules from `/brainstorm`. Additional rules specific to the agent-dispatch phase:

- **Dispatch failure** (harness rejects `Agent` tool calls) — stop, report, suggest `/speclan-engineering:brainstorm` as fallback.
- **Partial dispatch** (some agents spawn, others fail immediately) — proceed with what succeeded as long as the floor of 2 is met.
- **User cancels during the dispatch wait** — agents in flight cannot be cleanly aborted; report that agents may have completed and the result is being discarded.

## References

- `references/technique-selection.md` — Decision matrix: `(classification, anchor, thought_shape) → 3–5 techniques`.
- `references/techniques.md` — Per-technique agent prompt templates, expected output structure, failure modes.
- `references/synthesis.md` — Parsing strategy for free-form agent markdown, clustering rules, thread-strength heuristic.
- `../brainstorm/SKILL.md` — Phases 0 (Grounding), 1 (Exploration Loop, used as Phase 4), 2 (Spec Shaping), 3 (Quality Clarification), 4 (Creation), 5 (Cross-Referencing), 6 (Summary).
- `../brainstorm/references/grounding.md` — Classification taxonomy used by Phase 0.
- `../brainstorm/references/change-request-workflow.md` — CR creation for locked entities.
- `../hlrd-authoring/references/entity-content.md` — Shared body templates and merge rules.
- `../hlrd-authoring/references/cross-referencing.md` — **Shared** canonical cross-referencing contract used by Phase 8 (inline-only rule, validation, relative paths, goal contributions).

## Related skills

Same as `/brainstorm`:

- `speclan-format` — creation procedure, canonical structure.
- `speclan-id-generator` — ID generation.
- `speclan-query` — entity enumeration and filtering.

Never duplicate logic from those skills — always delegate.
