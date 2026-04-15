# Synthesis — Cross-Technique Clustering

Phase 3 of the brainstorm-plus pipeline: parse the free-form markdown returned by each subagent, cluster similar ideas across techniques, identify the 2–3 strongest threads, and present them to the user for a drill-down choice.

## Input

- `agent_outputs` — dictionary keyed by technique name, each value is the markdown returned by that subagent (typically 300–800 words).
- `classification` — the Phase 0 grounding classification, used as a tie-breaker.
- `anchor` — the anchor entity details or `null`.

## Step 1 — Parse ideas from each agent's output

Each agent was instructed to follow a conventional format (per `techniques.md`):

```markdown
# <Technique Label> — Ideas

## Idea 1: <label>
<description>
**Why this matters:** <impact>

## Idea 2 (Lens Label): <label>
...

## Commentary
...
```

Agents may drift — tolerate variation. Robust parsing:

1. **Locate idea headers** by scanning for `##` H2 blocks whose heading contains the substring `Idea` (case-sensitive for `Idea` helps reduce false positives from Commentary). Regex hint: `^##\s+(Idea|Variant|Angle)`. Some techniques use technique-specific terms (SCAMPER uses "Idea 1 (Substitute)"); the word "Idea" is consistent across all templates.
2. **Extract the label** — everything after the first colon in the header line, trimmed.
3. **Extract the description** — the paragraph(s) between the header and either the next H2 or the `**Why this matters:**` marker, whichever comes first.
4. **Extract the "why this matters" line** if present — optional, used as a tie-breaker when ranking.
5. **Capture the Commentary section** separately — it's not clustered but feeds thread context.

If an agent's output has fewer than 3 parseable ideas (minimum viable contribution), flag it as `low-yield` and exclude it from clustering — it can still contribute commentary but not a thread.

If the agent failed to produce ANY parseable ideas, drop the output entirely (consistent with Phase 2 Step 4 floor check).

## Step 2 — Build the idea pool

After parsing, the pool is a flat list:

```
idea_pool = [
  { technique, label, description, why_matters, raw_markdown },
  ...
]
```

Each idea carries its originating technique, which is the primary corroboration signal.

## Step 3 — Cluster by similarity

Clustering is **semantic**, not lexical. Two ideas belong to the same cluster if they propose the same underlying concept, even with different wording. This is a judgment call — don't over-engineer it.

### Similarity signals (in priority order)

1. **Same anchor entity** — both ideas reference the same existing spec ID or the same crystallized concept from the thought. Strong signal.
2. **Same core verb** — both ideas propose the same action (e.g., "validate", "cache", "defer", "expose") applied to the same object. Strong signal.
3. **Same domain noun set** — both ideas operate in the same domain (e.g., both mention "team roles" or both mention "audit trail"). Moderate signal.
4. **Same constraint / lens** — both ideas were produced by applying the same SCAMPER lens, Crazy 8s angle, or Six Hats hat. Weak signal on its own but combines with others.

Two ideas go into the same cluster when any two of the four signals match, OR when the strong signal (1 or 2) matches alone.

### Clustering rules

- **Minimum cluster size**: 1 idea. Single-idea clusters are valid and can become threads (see Step 4's orthogonal novelty rule).
- **Overlap**: an idea belongs to exactly one cluster — if it could fit into two, place it in the cluster with the highest corroboration count. Break ties by placing it with the cluster whose techniques it's *most distinct* from (to maximize that cluster's diversity).
- **Cluster label**: synthesize a 3–6 word label capturing the shared concept. Don't reuse any individual idea's label — the cluster label should describe the **thread** not any single member.

## Step 4 — Identify strong threads

Rank clusters by strength:

```
strength = corroboration_count × (1 + orthogonal_novelty_score)
```

Where:

- **`corroboration_count`**: number of **distinct techniques** that contributed at least one member idea to the cluster. A cluster with 3 ideas from SCAMPER and 1 from Reverse has corroboration_count = 2 (two distinct techniques), not 4. Cross-technique agreement is the main signal.

- **`orthogonal_novelty_score`**: a 0 to 1 bonus. Non-zero when:
  - The cluster has exactly 1 contributing technique (single-technique cluster), AND
  - The cluster's concept aligns with the classification in a non-obvious way (e.g., a Random Input anchor surfaced a lifecycle concept that the SCAMPER/Reverse agents missed entirely but which fits `change-request` perfectly).

  Compute orthogonal_novelty as follows: give 0.5 by default for a single-technique cluster; add another 0.5 if the technique is one of the "long-tail" techniques (Analogy, Random Input) since those are specifically trying to break out of obvious territory. Strong cross-technique clusters get 0 (they don't need the bonus).

### Example strength calculation

| Cluster | Ideas | Techniques | Corroboration | Novelty | Strength |
|---|---|---|---|---|---|
| Role-scoped approval | 3 | SCAMPER, Reverse, Six Hats | 3 | 0 | 3.0 |
| Audit trail separation | 2 | Reverse, First Principles | 2 | 0 | 2.0 |
| Moulting-inspired lifecycle | 1 | Random Input | 1 | 1.0 | 2.0 |
| Constraint-free fast path | 1 | Constraint-Based | 1 | 0.5 | 1.5 |

Top-ranked: Role-scoped approval (3.0), then Audit trail separation (2.0) tied with Moulting-inspired lifecycle (2.0). Break the tie by preferring the cross-technique cluster over the single-technique one (more corroboration wins ties).

## Step 5 — Pick the top 3 threads

Pick the top **3** clusters by strength. If fewer than 3 distinct clusters exist (i.e., all ideas converged on 1 or 2 concepts), pick all of them — don't pad with weak clusters.

If the strongest cluster has strength ≥ 2× the second-strongest, **surface that to the user** in the thread presentation. It means the brainstorm converged strongly on one idea, and the other threads are mostly noise.

## Step 6 — Synthesize each thread

For each picked cluster, produce:

- **Label** (3–6 words, already assigned in Step 3)
- **Summary** (2–3 sentences explaining the concept and why it's a thread)
- **Contributing techniques** (list of technique names with a 1-clause note each on what they surfaced)

Example synthesis:

> **Thread A: Role-scoped approval workflows** *(SCAMPER · Reverse · Six Hats)*
>
> Multiple agents converged on the idea that team roles should gate approval workflows rather than merely read access. SCAMPER's Substitute lens proposed replacing ACLs with role-based approval gates. Reverse flagged that read-gating leaks draft content to non-approvers. Six Hats' Black hat identified the audit risk of unscoped approvals.

Keep summaries factual — don't editorialize. The user reads this to make a drill choice, not to be sold on one thread.

## Step 7 — Present to user

Use `AskUserQuestion` with the top threads as options:

```
Which thread do you want to drill into?

1. Thread A: <label>
2. Thread B: <label>
3. Thread C: <label>
4. Hybrid — combine multiple
5. Cancel
```

`AskUserQuestion` supports up to 4 options per question, which exactly fits 3 threads + Hybrid. If only 2 threads exist, drop Thread C. If only 1 thread exists, skip the question entirely and advance with that thread as the focus.

**On "Hybrid"**: a free-text follow-up asks the user which threads to merge and how. Set `current_focus` to the user's merged description (not an automatic merge — let the user describe the combination).

**On "Cancel"**: exit the pipeline cleanly. No specs created, no rollback (nothing was written yet).

## Failure modes and mitigations

| Failure | Symptom | Mitigation |
|---|---|---|
| Agent outputs mostly implementation details | Parser extracts ideas that mention specific tech | Flag `low-yield` during Step 1 and reduce weight |
| All agents converge on one idea | 1 cluster in Step 3 | Present that one cluster as the only thread, skip the question |
| All agents diverge with zero overlap | N clusters, each corroboration = 1 | Rely on orthogonal novelty scoring; present top 3 by strength |
| Parsing fails for an agent | No `## Idea N` headers found | Drop the agent's contribution; log to commentary |
| User picks "Cancel" | No progress | Exit cleanly, no Phase 4 |

## What this synthesis is NOT

- **Not a summarization task.** The goal is clustering and ranking, not producing a consolidated narrative of all ideas. The user already has the option to reject the synthesis and inspect individual agent outputs; we don't need to capture every idea in the final presentation.
- **Not a vote.** Corroboration is not "most agents agree". It's "multiple techniques independently surfaced the same concept", which is a stronger signal than popularity.
- **Not a ranking of techniques.** Don't tell the user "SCAMPER produced the best ideas". Tell them "these threads emerged; here's which techniques contributed to each". The techniques are means, the threads are ends.
