---
name: SPECLAN Grill
description: >-
  Grilling session that stress-tests SPECLAN specifications through a relentless
  one-question-at-a-time interview. Its core duties: reduce ambiguities, clarify
  contradictions (spec vs spec, spec vs code), and close definition gaps —
  undefined terms, vague language, missing edge cases — before specs get
  approved. Use when the user asks to "grill me", "grill the spec", "challenge
  this feature", "stress-test the requirements", "poke holes in the spec",
  "resolve ambiguities", "find contradictions", "clarify open questions",
  "work through the TBDs", "interview me about a spec", "review spec quality",
  or wants to sharpen a Goal/Feature/Requirement (G-###, F-####, R-####)
  before approval — even if they never say the word "grill".
version: 0.1.9
---

# SPECLAN Grill

Interview the user relentlessly about the target specification(s) until you reach a shared understanding. Walk down each branch of the spec tree — the feature, its requirements, its linked goals — resolving dependencies between decisions one by one. For each question, provide your recommended answer.

Ask the questions **one at a time**, waiting for the user's response before continuing. A barrage of ten questions gets ten shallow answers; one pointed question with a recommendation gets a real decision.

If a question can be answered by exploring the codebase or the other specs, explore instead of asking. The user's time is for judgment calls, not for facts you can look up.

## Session Language

The user may request the interview in another language via `--language <lang>` (e.g. `--language de`, `--language german`) or by asking in conversation. In that case, conduct the entire dialogue — questions, recommended answers, scenario probes, the "apply or note?" prompts, and the end-of-session summary — in that language.

Resolve the session language in this order:

1. An explicit `--language` on the current invocation
2. The language most recently set via `--language` (or requested in conversation) earlier in this session — once a user chooses a language, a later `/speclan:grill` without the flag continues in it rather than snapping back to English mid-conversation
3. English

The specs themselves stay **English**, always. SPECLAN files are the canonical artifact shared across the team and tooling; the interview language is a convenience for the person being grilled. So any text written to a spec file — sharpened wording, new requirements, change requests, frontmatter — is English, regardless of session language. When proposing a spec edit during a non-English session, show the English wording that will be written, embedded in the foreign-language question (e.g. ask in German, quote the proposed English requirement text verbatim).

The session has three duties, and every question should serve at least one of them:

1. **Reduce ambiguities** — wording that two readers would implement differently must be narrowed until only one reading survives.
2. **Clarify contradictions** — where two specs, or a spec and the code, or the user's stated intent and the written spec disagree, force a decision about which is right and record it.
3. **Close definition gaps** — concepts the spec relies on but never defines, edge cases it is silent about, promises in user stories that no requirement covers, and open questions the spec itself records (`Open Questions` sections, `TBD`, `TODO`).

The purpose is to catch these problems while they are cheap: a vague requirement costs one edit today and a rework cycle after implementation. Specs in `draft` and `review` are where grilling pays off most — that's the last gate before `approved` turns words into work.

## Selecting the Target

### 1. Locate the speclan root

```bash
source "${CLAUDE_PLUGIN_ROOT}/skills/speclan-format/scripts/detect-speclan.sh"
```

This sets `$SPECLAN_ROOT`. If no speclan root is found, inform the user that no SPECLAN project was detected and stop.

### 2. Resolve what to grill

- **Explicit entity ID** (e.g. `F-1049`, `R-2046`) — grill that entity together with its children (requirements under a feature, nested features), its linked goals, and any active change requests. Locate it via the query script:

  ```bash
  "${CLAUDE_PLUGIN_ROOT}/skills/speclan-query/scripts/query.sh" \
    --type all --filter-id F-1049 --full "$SPECLAN_ROOT"
  ```

- **No ID, but the session already has a topic** — if the conversation has been about a particular feature or area, locate the matching spec by exploring `$SPECLAN_ROOT` (query script plus grep over titles and slugs), then confirm the match with the user before starting: "You've been working on the export pipeline — shall I grill you on F-1203 Export Pipeline?"

- **No ID, no topic** — list the specs that benefit most from grilling: those in `draft` or `review` status.

  ```bash
  "${CLAUDE_PLUGIN_ROOT}/skills/speclan-query/scripts/query.sh" \
    --type all --full "$SPECLAN_ROOT"
  ```

  Filter the JSON for `draft` and `review`, present the candidates, and let the user pick.

### 3. Build the holistic picture before the first question

A spec is never just its file — read the tree under `$SPECLAN_ROOT` as a **chain of thought** running from the root to the target: goal → root feature → subfeature → requirement → change request. Each level is a refinement of the one above: the goal states *why*, the feature *what*, the requirement *precisely what*, and change requests *how it evolved*. Walk the target's full ancestor chain plus its children and judge every step: does each level still follow from its parent? A requirement that doesn't serve its feature, or a subfeature that has drifted from the root feature's intent, is a break in the chain of thought — prime grilling material.

Then traverse the **reference graph**. The relative markdown links inside spec bodies are named relationships (depends on, owned by, conflicts with, refines), and they carry the holistic view that the directory tree alone cannot. Follow them in both directions:

- **Outgoing** — read every spec the target links to. The sentence around the link states what the relationship claims; the linked spec tells you whether that claim still holds. A stale claim is a contradiction waiting to be clarified.
- **Incoming** — find the specs that link *to* the target, e.g. `grep -rn "R-2046" "$SPECLAN_ROOT" --include="*.md"`. Whoever references the target relies on it; a change agreed during grilling may break those expectations, so bring the referencing specs into the interview before applying the change.

While reading, also collect every **open question the specs already contain** — `Open Questions` sections, `TBD`, `TODO`, `FIXME`, "to be decided/defined/clarified", or sentences ending in `?`:

```bash
grep -rniE 'open question|TBD|TODO|FIXME|to be (decided|defined|clarified)' "$SPECLAN_ROOT" --include="*.md"
```

These go on the session's question list before anything you infer yourself (see "Clear the spec's own open questions" below).

Also check the backlog from earlier sessions: if `$SPECLAN_ROOT/artifacts/open-questions.md` exists, entries concerning the target (or its chain) join the question list first — a previous grilling already established these are unresolved, so the new session resumes them instead of rediscovering them (see "The Open-Questions Backlog" below).

This mirrors the `ask` skill's context-gathering procedure (`references/context-gathering.md`) — reuse it. Grounded questions ("R-2046 says 'fast' — but the chain above it, F-1049 and G-292, promises sub-second lookups, and R-3105 links here as its latency baseline; is 'fast' the same budget?") are worth far more than generic checklist questions. Never grill from a single file read; grill from the chain and the graph.

## During the Session

Each category below serves one of the three duties — ambiguity, contradiction, or definition gap — and catches a distinct failure mode. Mix them as the material demands — don't run them as a fixed checklist.

### Sharpen fuzzy language

Vague or unverifiable phrasing ("fast", "user-friendly", "should handle errors gracefully", "supports large files") cannot be implemented or tested consistently — every reader fills the gap differently. When you find such phrasing, propose precise, testable wording: "R-2046 says 'responds quickly' — I'd recommend 'responds within 500ms at p95'. Does that match your intent?"

### Challenge terminology consistency

When a term in one spec conflicts with how another spec or the code uses it, call it out immediately with both references: "F-1049 calls them 'customers' but R-2031 and `src/models/user.ts` say 'accounts' — are these the same concept? Which term is canonical?" Inconsistent vocabulary in specs becomes inconsistent vocabulary in code.

### Demand definitions for load-bearing terms

When a spec leans on a concept it never defines — "active subscription", "stale record", "primary contact" — every reader invents their own definition, and the gaps surface as bugs. Ask for the definition with a recommended one: "R-2046 hinges on 'active pet' — I'd define it as 'status is not deceased or transferred'. Correct?" Once resolved, write the definition into the spec where the term carries the most weight, so it travels with the requirement that depends on it.

### Probe with concrete scenarios

Invent specific edge-case scenarios that force the user to be precise about boundaries: empty states, concurrent actions, failure modes, permission boundaries, scale limits. "A user deletes a pet while a health check on that pet is still running — what does R-2046 say should happen? It currently says nothing. I'd recommend the check is cancelled and logged."

### Cross-reference specs against each other

Both the hierarchy chain and the inline link graph make claims that must hold up:

- Does each requirement actually serve its parent feature, or has it drifted? Read the whole chain root-feature → subfeature → requirement: every step must follow from the one above.
- Does the feature deliver on the goals it lists in `goals:`?
- Does the user story promise something no requirement covers? Gaps here are missing requirements.
- Does this feature's scope overlap a sibling feature's? Overlaps become ownership disputes at implementation time.
- Do the inline links still tell the truth? A sentence like "follows the state machine defined in [R-2031 …]" is a claim about R-2031 — if R-2031 has since changed, the claim is now a contradiction to clarify.

### Cross-reference with code

When the user states how something works or should work, check whether existing code agrees before accepting the statement. Surface contradictions with file references: "You said partial cancellation is possible, but `src/orders/cancel.ts:42` cancels the entire order — which is right, and should the spec or the code change?"

### Clear the spec's own open questions

Open questions written into a spec are the author asking to be grilled — they outrank anything you infer yourself, so handle them first. For each one, bring it to the user with a recommended answer like any other question. When it is resolved and the user applies the decision, **replace the question in the spec with the answer** — an answered question left standing as `TBD` misleads every future reader into reopening it. If the user cannot answer yet, leave the question in place but sharpen it: record what was discussed, what the options are, and what information is missing to decide — and log it in the open-questions backlog (see "The Open-Questions Backlog" below) so the next session picks it up.

### Test acceptance-criteria completeness

Every requirement must be verifiable — that is what `review-manual` will eventually check it against. For each requirement ask yourself, and if unclear ask the user: "How would a reviewer prove this is done?" If there is no answer, the requirement needs acceptance criteria before it deserves `approved`.

## Capturing Decisions — Ask Per Finding

When a question is resolved, do not silently edit the spec and do not let the decision evaporate into the chat log. Ask the user right then, for that finding: **apply the sharpened wording to the spec now, or just note it for the end-of-session summary?**

When the user chooses to apply:

- **Editable specs** (`draft`, `review`, `approved`) — edit the file directly. Follow the rules from the `speclan-format` skill: keep the H1 matching the `title` field, update the `updated:` timestamp, preserve all frontmatter fields.
- **Locked specs** (`in-development`, `under-test`, `released`) — never edit directly; the `guard-locked-specs` hook will block it, and rightly so. Offer to file a Change Request instead, created per the `speclan-format` layout (`{parent}/change-requests/CR-####-slug.md`).
- **The finding touches both an editable and a locked spec** (e.g. a draft requirement contradicts a released one) — prefer resolving it in the editable spec, *if that resolution is meaningful*. A locked spec describes work in flight or shipped reality, and a Change Request carries real process cost; aligning the draft with reality is usually the cheaper and correct fix. But don't contort an editable spec just to dodge a CR: when the grilling established that the locked spec itself is wrong — reality must change — the CR is the honest outcome. Recommend the direction, and let the user decide.
- **A missing requirement was revealed** — offer to create it as a new `draft` requirement under the feature.

**Minting IDs:** whenever grilling creates a new SPECLAN entity of any kind — Change Request, Requirement, Feature, Goal — the ID MUST come from the `speclan-id-generator` skill (invoke it as `/speclan:speclan-id-generator`). Never invent an ID, count up from the highest existing one, or copy-and-modify another spec's ID: hand-rolled IDs collide silently across branches and sessions, and since the filename is the source of truth in SPECLAN, a collision corrupts two specs at once. The generator is the single authority for collision-free IDs.

### Write inferred relationships as inline links

Grilling constantly surfaces relationships between specs — "this depends on R-2031", "this only covers what F-1200 doesn't", "this conflicts with G-087". When such a relationship is confirmed and the edit is applied, capture it **inline in the prose, at the point where the relationship matters**, as a relative markdown link whose surrounding sentence names the relationship:

```markdown
Cancellation follows the state machine defined in
[R-2031 Order Cancellation](../R-2031-order-cancellation/R-2031-order-cancellation.md);
this requirement only adds the partial-refund case.

Vaccination records are out of scope here — they are owned by
[F-1200 Pet Health](../../F-1200-pet-health/F-1200-pet-health.md).
```

Do **not** collect these into a "Related" or "References" section. A bare link list says *that* two specs are connected but loses *why* — and the why is exactly what the grilling session just established. Inline placement keeps the relationship readable in context and survives later edits to the rest of the file.

Compute the relative path from the linking file's own location, following the directory-based storage layout from `speclan-format` (e.g. requirement → sibling requirement is `../R-XXXX-slug/R-XXXX-slug.md`; requirement → its feature's sibling feature is `../../../F-XXXX-slug/F-XXXX-slug.md`; anything → goal is `<up to speclan root>/goals/G-XXX-slug.md`). Verify the target file exists before writing the link — a broken relative link is worse than no link.

Keep a running tally of findings throughout the session. End with a short summary:

```markdown
## Grill Session Summary — F-1049 Pet Management

**Applied to specs:**
- R-2046: "responds quickly" → "responds within 500ms at p95"

**Filed:**
- CR-0812 on R-2031 (locked): clarify cancellation semantics
- R-4102 (new, draft): pet deletion during active health check

**Noted, not applied:**
- F-1049 scope overlap with F-1200 around vaccination records — revisit when F-1200 leaves draft

**Deferred to backlog:**
- R-2046: behaviour of running health checks on pet deletion — waiting on ops input
```

## The Open-Questions Backlog

Grill sessions get aborted and questions get deferred — the user runs out of time, or an answer needs input from someone not in the room. Those unresolved questions must not evaporate with the session: maintain them in `$SPECLAN_ROOT/artifacts/open-questions.md`.

**Writing.** When the session ends (or is aborted) with questions still open — asked but deferred, or queued but never reached — append one entry per question. Create the file (and the `artifacts/` directory) lazily, only when there is something to write. Entries are in English, like the specs. Format:

```markdown
# Open Questions

Maintained by grill sessions. Each entry is an unresolved question from an
aborted or deferred grilling. Remove an entry once it is clarified.

## R-2046 — What happens to running health checks when a pet is deleted?
- **Spec:** [R-2046 Health Check](../features/F-1049-pet-management/requirements/R-2046-health-check/R-2046-health-check.md)
- **Raised:** 2026-06-10
- **Blocked on:** ops input about cancellation semantics
- **Recommended answer:** cancel and log
- **Options discussed:** cancel-and-log vs. let-finish-and-discard
```

The **Spec** link is relative from `artifacts/` — the same inline-link discipline as everywhere else. Capture the recommendation and the options discussed so the next session (possibly months later, possibly a different person) resumes the thought instead of restarting it.

**Reading.** Every session checks this file during picture-building; entries touching the target join the question list first.

**Removing.** The moment a backlogged question is clarified — in a grill session or because the user resolves it any other way and tells you — delete its entry. A backlog that keeps answered questions stops being trusted, and an untrusted backlog is dead. If the last entry goes, delete the file; an empty backlog is noise in `artifacts/`. Note that resolving a backlog entry usually pairs with a spec edit (the answer lands in the spec; the question leaves the backlog).

## Leveraged Skills

This skill builds on:

- **`speclan-format`** (`${CLAUDE_PLUGIN_ROOT}/skills/speclan-format/SKILL.md`) — file structure, status lifecycle, edit constraints, frontmatter fields
- **`speclan-query`** (`${CLAUDE_PLUGIN_ROOT}/skills/speclan-query/SKILL.md`) — entity discovery and filtering via `scripts/query.sh`
- **`speclan-id-generator`** (`${CLAUDE_PLUGIN_ROOT}/skills/speclan-id-generator/SKILL.md`) — the mandatory, sole source of IDs for every entity grill creates (invoke as `/speclan:speclan-id-generator`)
- **`ask`** (`${CLAUDE_PLUGIN_ROOT}/skills/ask/SKILL.md`) — the context-gathering procedure (`references/context-gathering.md`) for building the picture around an entity
