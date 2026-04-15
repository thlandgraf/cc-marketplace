# Grounding — Phase 0 Classification & Anchoring

Grounding is the difference between a brainstorm that produces sharp specs and one that produces vague ones. A thought like *"what if we added team roles?"* could be a new feature, a CR on an existing auth feature, a new requirement under user management, or not a spec at all — and the downstream pipeline is wasted if the grounding phase picks wrong.

This document covers: (1) the classification taxonomy, (2) the anchoring procedure, (3) how to present the interpretation, (4) how to handle the `not-speclan` exit.

## The seven classifications

Every thought maps to exactly one of these seven classes. Pick the **narrowest** class that fits — if a thought could be a `feature-extension` or a `new-feature`, prefer the extension when an editable parent exists.

### 1. `new-goal`

The thought describes a **strategic outcome** that isn't already a goal in the project, and doesn't cleanly fit under an existing goal.

**Signals:**
- Language about business value, market position, user segment, long-term ambition
- No anchor to an existing feature
- Sentence could be rephrased as "We want to become ____" or "We want ____ to be possible"

**Example:** *"I want this tool to eventually replace JIRA for requirements tracking"* → new-goal.

### 2. `new-feature`

The thought describes a **capability** — something the system would do — that doesn't exist as an entity yet.

**Signals:**
- Language about what users can do or what the system provides
- Fits naturally under an existing goal (anchor to goal) or as a root feature
- Not describing a change to an existing feature

**Example:** *"we should support webhook notifications when specs are approved"* → new-feature.

### 3. `feature-extension`

The thought describes **adding to or changing** an existing feature that's in an editable status (`draft`, `review`, `approved`).

**Signals:**
- Explicit anchor to an existing feature via ID, name, or strong domain overlap
- Thought frames the change as "expand", "also support", "include", "on top of X"
- Anchor's status is editable

**Example:** *"F-1234 should also handle team invitations"* (F-1234 is `draft`) → feature-extension.

### 4. `new-requirement`

The thought is a **specific testable obligation** that belongs under a specific feature.

**Signals:**
- Language about what must be true, what must happen, pass/fail criteria
- Anchors to a feature (new-requirement cannot be orphaned)
- Narrow in scope — one thing the system must do

**Example:** *"authentication should lock accounts after 5 failed attempts"* (anchor: F-1100 Auth, `draft`) → new-requirement.

### 5. `requirement-modification`

The thought modifies an existing requirement in an editable status.

**Signals:**
- Anchor to an existing R-#### entity
- Thought frames the change as expanding, tightening, or clarifying existing acceptance criteria
- Anchor's status is editable

**Example:** *"R-0042 should also cover SSO users, not just password users"* (R-0042 is `approved`) → requirement-modification.

### 6. `change-request`

The thought modifies an entity in a **locked** status (`in-development`, `under-test`, `released`, `deprecated`). These cannot be edited directly — a CR-#### file must be created adjacent to the target.

**Signals:**
- Anchor to an existing entity
- Anchor's status is locked
- The brainstorm output must be a CR, regardless of what the user says

**Example:** *"add microchipping validation to F-5678"* (F-5678 is `released`) → change-request.

### 7. `not-speclan`

The thought isn't a specification at all. Common cases:

- **Implementation questions** — *"how do I debug this TypeError?"* → answer informally, no pipeline.
- **Queries about existing specs** — *"what's the status of the payment feature?"* → redirect to `/speclan:ask`.
- **Finished requirements docs** — *"I have a PRD to import"* → redirect to `/speclan-engineering:hlrd`.
- **Personal / meta chat** — *"this is hard, can you explain requirements engineering?"* → answer conversationally.

When you classify as `not-speclan`, exit the brainstorm pipeline cleanly and route the user to the right tool or just answer in conversation. Don't force a spec where none belongs.

## Anchoring procedure

Anchoring finds the existing entities (if any) the thought is about. It runs in two passes.

### Pass 1 — Explicit ID extraction

Scan the thought for entity ID patterns:

- `G-\d{3}` — Goal
- `F-\d{4}` — Feature
- `R-\d{4}` — Requirement
- `CR-\d{4}` — Change Request

For every match, locate the file via `Glob` (e.g., `speclan/features/**/F-1234*.md`) and `Read` it fully. Capture its `title`, `status`, and enough of the body to understand what it is. These are **anchor entities**.

If the thought mentions an ID that doesn't exist on disk, surface that to the user — they may be remembering an ID wrong. Ask via `AskUserQuestion` whether to search by title instead.

### Pass 2 — Noun-based discovery

If Pass 1 found no anchors, extract 2–3 **salient nouns** from the thought — concrete domain terms, not filler words. Example: *"what if we let users share their shopping carts with friends?"* → `shopping-cart`, `share`, `friends`.

Then `Grep` each noun across `speclan/` with `-l -i` (list files, case-insensitive). Collect the top matches. For each, `Read` the frontmatter and the first ~20 lines of the body to judge relevance.

Keep the top 3 candidates at most. If several files look equally relevant, prefer:
1. Features over goals over requirements (features are the natural anchor level)
2. Editable statuses over locked statuses
3. Lower IDs (higher priority, per speclan ordering)

If Pass 2 finds no strong matches, the thought is **free-range** — proceed without an anchor.

## Presenting the interpretation

Once you have a classification and anchor (if any), present it back to the user before entering the exploration loop. The format:

> I read this as **`<classification>`** targeting **`<anchor-description>`**, in the context of **`<project-summary>`**. Does that match what you have in mind?

Concrete examples:

> I read this as a **new feature** targeting a **free-range scope** (no existing feature matches), in the context of a project whose mission is **"help teams track requirements from goals to tests"**. Does that match what you have in mind?

> I read this as a **feature extension** targeting **F-1234 User Authentication** (`draft`), in the context of a project with **3 editable goals and 12 editable features**. Does that match what you have in mind?

> I read this as a **change request** targeting **F-5678 Payment Processing** (`released` — cannot be edited directly), in the context of a project with **active release in progress**. I'll need to file a CR-#### instead of editing F-5678 directly. Does that match what you have in mind?

Then `AskUserQuestion`:

> Does this interpretation match?

Options:
1. `Yes, proceed` → advance to Phase 1
2. `Close, but let me rephrase` → free-text follow-up; re-run Pass 2 with the new framing
3. `No — different interpretation` → offer 2–3 alternatives as a second `AskUserQuestion`

Keep the interpretation to 3 sentences or fewer. If you can't summarize it in 3 sentences, you haven't grounded it yet — loop back.

## Handling `not-speclan`

When the thought is not spec-shaped, **do not pretend it is**. Exit the pipeline with a clear message:

- **Implementation question:** answer it directly in conversation. Don't invoke any further pipeline phases.
- **Query about existing specs:** say *"This looks like a question about existing specs — try `/speclan:ask` for a richer answer with relationships and hierarchy."* Then either invoke that command or wait for the user's next message.
- **Finished PRD:** say *"This looks like a full requirements document rather than a brainstorm thought — `/speclan-engineering:hlrd` is built for that pipeline and handles vision/mission extraction too."* Then wait.
- **Meta / chat:** answer conversationally, with no pipeline framing.

The brainstorm skill's job is to help the user produce *sharp* specs from *vague* thoughts. If the thought is sharp already or the output isn't a spec at all, the right move is to step aside.
