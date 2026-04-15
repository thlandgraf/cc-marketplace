# Brainstorming Techniques — Agent Prompt Templates

Per-technique agent prompt templates for Phase 2 of the brainstorm-plus pipeline. Each subagent starts fresh with no conversation context, so every prompt is fully self-contained — it carries the thought, classification, anchor, and project summary verbatim.

## Canonical technique list

| Name (flag) | Label | Best for | Anchor required? |
|---|---|---|---|
| `scamper` | SCAMPER | Mutating an existing entity through 7 lenses | **Yes** |
| `crazy-8s` | Crazy 8s | Fast variant generation — 8 shapes of one idea | No |
| `reverse` | Reverse Brainstorming | Finding failure modes, risks, anti-patterns | No |
| `constraint` | Constraint-Based | Stress-testing under artificial limits | No |
| `first-principles` | First Principles | Decomposing to fundamentals, rebuilding | No |
| `analogy` | Analogy / Cross-Domain | Borrowing patterns from unrelated domains | No |
| `six-hats` | Six Thinking Hats | Multi-stakeholder / subjective decisions | No |
| `random-input` | Random Input | Forcing novel connections from unrelated stimulus | No |

**SCAMPER is the only technique that hard-requires an anchor.** If the thought is free-range and no anchor exists, either (a) skip SCAMPER, or (b) synthesize a concrete anchor from the thought before dispatching SCAMPER (the agent will do this if instructed).

## Common prompt header

Every subagent prompt begins with this header. The main skill fills the four placeholders:

```
You are running a brainstorming session using the {TECHNIQUE_LABEL} technique.

## Context

- **Original thought**: {THOUGHT}
- **Classification**: {CLASSIFICATION}
- **Anchor**: {ANCHOR}
- **Project summary**: {PROJECT_SUMMARY}

Your job is to apply the {TECHNIQUE_LABEL} technique to the thought and produce 4–8 distinct ideas. This is a SPECIFICATION-level brainstorm, so stay at the level of goals, features, requirements, and user outcomes — do NOT produce implementation details (no tech stacks, no library names, no code, no architecture patterns).
```

## Common output format

Every agent is instructed to produce output in this shape:

```markdown
# {Technique Label} — Ideas

## Idea 1: <3–6 word label>

<1–2 sentence description of the idea, in specification-level terms.>

**Why this matters:** <1 sentence on why this idea is worth exploring.>

## Idea 2: <label>

...

## Commentary

<2–4 sentences of free-form observations: surprises, risks, tensions between the ideas, or patterns you noticed while applying the technique.>
```

Enforce this structure in every prompt so Phase 3's parser has predictable landmarks.

---

## SCAMPER

**When to use**: the thought targets an existing entity that can be mutated (feature-extension, requirement-modification, change-request classifications). Requires an anchor.

**Agent prompt template**:

```
{COMMON_HEADER}

## Technique: SCAMPER

SCAMPER is a mutation framework with seven lenses. For each lens, ask: "How could the thought be transformed through this lens?"

- **S**ubstitute — replace a component with something else
- **C**ombine — merge with another concept
- **A**dapt — borrow a pattern from elsewhere
- **M**odify — change scale, intensity, shape, or frequency
- **P**ut to another use — repurpose for a different user or context
- **E**liminate — remove a part; what's the minimum viable form?
- **R**everse — invert the order, roles, or polarity

Pick 4–8 lenses that produce the strongest ideas for this thought — not all 7 will apply. Each idea you produce must use exactly one SCAMPER lens.

**Label each idea with the lens used**, like this:

## Idea 1 (Substitute): <label>

If the anchor is null (thought is free-range), synthesize a concrete starting shape from the thought before mutating — crystallize the thought into one sentence of "the baseline feature would be..." and mutate that.

{COMMON_OUTPUT_FORMAT}
```

**Expected output**: 4–8 ideas, each labeled with its SCAMPER lens.

**Common failure modes**: agent applies only 1–2 lenses and padded with variations; agent produces implementation details ("substitute PostgreSQL with DynamoDB"). Mitigation: the header's "specification-level" clause plus the explicit "stay at the level of goals, features, requirements, and user outcomes" reminder.

---

## Crazy 8s

**When to use**: fast variant generation when the thought has a clear shape but multiple possible expressions. Great for features, UI/flow decisions, API shapes.

**Agent prompt template**:

```
{COMMON_HEADER}

## Technique: Crazy 8s

Crazy 8s is high-speed variant generation — produce 8 distinct variants of the thought, each taking a different angle on the same core idea. Speed over polish. Volume is the goal.

Pick angles that fit the thought. Useful angles:

- **Minimal** version — the smallest possible form that still delivers value
- **Maximal** version — the most ambitious form, unconstrained by effort
- **User-initiated** version — the user triggers it explicitly
- **System-initiated** version — the system triggers it automatically
- **One-shot** version — single action, done
- **Continuous** / streaming version — ongoing process
- **Admin-scoped** version — only for privileged users
- **Self-serve** version — end users own it fully
- **Synchronous** version — immediate feedback
- **Asynchronous** version — deferred / eventual

Each variant must be distinct from the others — don't pad with near-duplicates. If fewer than 8 genuinely distinct variants exist for this thought, produce as many as you can (minimum 4) and say so in the commentary.

**Label each idea with its angle**, like this:

## Idea 1 (Minimal): <label>

{COMMON_OUTPUT_FORMAT}
```

**Expected output**: 4–8 variants, each labeled with its angle.

**Common failure modes**: all 8 variants are near-duplicates; agent optimizes for quality and only produces 2–3. Mitigation: explicit "volume is the goal" framing and distinct-angle labels.

---

## Reverse Brainstorming

**When to use**: when the thought involves risk, security, reliability, user trust, or failure-sensitive flows. Also useful for change requests against released entities (inverted failure modes reveal regression risk).

**Agent prompt template**:

```
{COMMON_HEADER}

## Technique: Reverse Brainstorming

Reverse brainstorming flips the question: instead of "how do we do this well?", ask "how could we do this terribly?" — then invert each failure into a constructive insight.

### Step 1 — Produce 4–6 failure modes

Generate 4–6 distinct ways to make the thought FAIL, BE TERRIBLE, or CAUSE HARM. Be specific and creative. The worse the failure, the more valuable the inversion.

### Step 2 — Invert each failure

For each failure, invert it into a constructive insight or mitigation. The inversion is the actual idea you report.

**Format**: each idea is the inversion; the "Why this matters" line names the original failure mode.

Example:

## Idea 1: Validate at every trust boundary

Enforce input validation at every boundary where untrusted data crosses into a trusted zone — not just at the system edge.

**Why this matters:** Original failure mode — "trust all internal inputs blindly" — would have allowed a single compromised internal service to poison the entire data pipeline.

---

{COMMON_OUTPUT_FORMAT}
```

**Expected output**: 4–6 inverted ideas, each naming the original failure mode in the "why this matters" line.

**Common failure modes**: agent skips Step 1 and jumps to constructive ideas (no inversion); agent produces very generic failure modes ("make it bad"). Mitigation: two-step procedure enforced in the prompt.

---

## Constraint-Based

**When to use**: nearly always valuable. Especially strong for features with hidden complexity, performance-sensitive flows, or when the default solution is obvious and the team needs to break out of it.

**Agent prompt template**:

```
{COMMON_HEADER}

## Technique: Constraint-Based

Constraint-based brainstorming applies artificial limits to force creative problem-space exploration. Produce 4–8 ideas, each answering the question under a different constraint.

Pick constraints that stress-test the thought. Candidate constraints:

- **No backend** — must work client-side or via static assets only
- **No user authentication** — must work without identity
- **Budget = €0** — no paid services, no infrastructure spend
- **Must work offline** — no network assumption
- **Single external integration** — must talk to exactly one outside system
- **Single user role** — only works for one type of user
- **Fully reversible** — no destructive actions allowed
- **Real-time only** — no batch, no deferred processing
- **No stored state** — must be stateless
- **One-screen UI** — must fit on a single view with no navigation
- **No written content** — must work without any text (icons, shapes, sounds)

Each constraint forces a different shape than the default solution. Don't repeat constraints across ideas.

**Label each idea with its constraint**, like this:

## Idea 1 (No backend): <label>

{COMMON_OUTPUT_FORMAT}
```

**Expected output**: 4–8 ideas, each under a distinct constraint.

**Common failure modes**: agent picks trivial constraints that don't change the shape ("no ML" for a non-ML feature); agent ignores the constraint and produces the default solution with the constraint named. Mitigation: the "forces a different shape than the default" framing.

---

## First Principles

**When to use**: genuinely new concepts (new-goal, new-feature from scratch), when the thought carries buried assumptions, or when the team has been iterating on an existing pattern for too long and needs to reset.

**Agent prompt template**:

```
{COMMON_HEADER}

## Technique: First Principles Decomposition

First principles breaks a thought into its irreducible components, questions every assumption, then rebuilds from the ground up.

### Step 1 — Decompose

List 4–6 components of the thought. For each, note: is this a FACT (something we know) or an ASSUMPTION (something we're taking for granted)?

### Step 2 — Question each assumption

For each assumption, ask: is this necessary, or is it habit? What would happen if we dropped it?

### Step 3 — Rebuild

Produce 4–8 reconstructions of the thought, each starting from a different **minimal set** of components. Each reconstruction is one idea.

**Format**: each idea is framed as "Starting from only [minimal assumptions], the thought becomes: [rebuilt shape]".

Example:

## Idea 1: Minimal — identity + action log

Starting from only "we can identify a user" and "we can record actions taken", the thought becomes: a lightweight audit trail with no authorization layer, where every action is recorded but never blocked.

**Why this matters:** Drops the assumption that authorization must happen pre-action, opening the design space for "log everything, review async" patterns used in reversible systems.

---

Show your decomposition work (Steps 1 and 2) in the Commentary section, since it provides context for why the rebuilds are what they are.

{COMMON_OUTPUT_FORMAT}
```

**Expected output**: 4–8 reconstructions + a commentary section showing the decomposition work.

**Common failure modes**: agent skips the decomposition and produces generic ideas; agent treats "first principles" as a slogan without actually questioning assumptions. Mitigation: three-step procedure enforced.

---

## Analogy / Cross-Domain

**When to use**: when the thought has a clear domain shape and a cross-domain pattern might transfer cleanly. Especially valuable for concurrency, coordination, resource management, and user behavior problems.

**Agent prompt template**:

```
{COMMON_HEADER}

## Technique: Analogy / Cross-Domain Transfer

Analogy brainstorming borrows patterns from unrelated domains. Produce 4–8 ideas, each drawing from a DIFFERENT source domain.

Candidate source domains:

- **Biology / nature** — immune systems, ecosystems, swarm behavior, moulting, symbiosis
- **Physical systems** — thermostats, valves, pipes, traffic flow, lock mechanisms
- **Human institutions** — libraries, courts, markets, neighborhoods, guilds
- **Games** — chess, go, card games, MMO economies, sports rules
- **Other software systems** — git, Unix pipes, SMTP, HTTP, BitTorrent, Kubernetes (pattern only, not implementation)
- **Other industries** — aviation (ATC, cockpits), logistics (containerization), retail (inventory, pricing), healthcare (triage)

Each idea names the source domain and its pattern, then adapts it to the thought.

**Format**: "In [DOMAIN], [PATTERN] solves [SIMILAR PROBLEM]. Applied to our thought: [ADAPTATION]."

Example:

## Idea 1 (Biology): Immune-style pre-clearance

In the human immune system, T-cells clear a pathogen signature once and then respond faster to future exposures. Applied to our thought: the first request from a new source triggers full validation; subsequent requests with the same signature short-circuit to a cached "pre-cleared" path.

**Why this matters:** Surfaces a graduated-trust model where the validation cost amortizes across repeat interactions, without sacrificing security on first contact.

---

Label each idea with its source domain.

{COMMON_OUTPUT_FORMAT}
```

**Expected output**: 4–8 ideas, each drawing from a distinct domain.

**Common failure modes**: agent picks only software domains (too close, no novelty); agent makes shallow analogies that don't transfer ("like Amazon does it"). Mitigation: the diverse domain list and the "names the pattern" requirement.

---

## Six Thinking Hats

**When to use**: multi-stakeholder decisions, subjective or values-laden thoughts, decisions with emotional or risk dimensions. Each hat produces a different angle, so it's great when the thought has social or process dimensions.

**Agent prompt template**:

```
{COMMON_HEADER}

## Technique: Six Thinking Hats

The Six Thinking Hats technique applies six distinct lenses in sequence. Produce 1–2 ideas per hat (aim for 6–10 total). Each idea must genuinely come from that hat's perspective — mechanical hat labels don't count, the actual thinking must differ.

- **WHITE (facts)** — What do we objectively know about this thought? What data exists? What's measurable?
- **RED (emotions)** — What's the gut reaction? What would users feel the first time they see this? Delight, frustration, confusion?
- **BLACK (risks)** — What could go wrong? What's the worst-case failure mode? What's the hidden cost?
- **YELLOW (benefits)** — What's the upside? What's the best-case outcome? Why would someone champion this?
- **GREEN (creativity)** — What's the most novel angle? What hasn't been tried? What would be weird but maybe brilliant?
- **BLUE (process / meta)** — What's the meta-decision here? How should we decide this? What's the sequence of actions?

**Label each idea with its hat**, like this:

## Idea 1 (Black): <label>

The six hats are not equally valuable for every thought — if the thought is purely factual, Red produces nothing useful; if the thought is emotional, White is thin. Produce 1 idea for weak-hat categories, 2 for strong-hat ones.

{COMMON_OUTPUT_FORMAT}
```

**Expected output**: 6–10 ideas, each labeled with one of six hats.

**Common failure modes**: agent produces mechanically-labeled ideas that don't differ in substance; agent produces too many or too few per hat. Mitigation: "must genuinely come from that hat's perspective" + "1 idea for weak-hat categories, 2 for strong-hat ones".

---

## Random Input

**When to use**: when the thought is vague or broad and needs stimulus to break out of the obvious; when previous brainstorming attempts converged too quickly. Least reliable technique — use when other techniques haven't produced enough diversity.

**Agent prompt template**:

```
{COMMON_HEADER}

## Technique: Random Input

Random input injects unrelated stimulus to force novel connections. Pick 4–8 random anchors from the pool below, then force a connection between each anchor and the thought.

### Anchor pool — pick 4–8 from different categories

- **Household objects**: kettle, broom, umbrella, spatula, mirror, lamp, clock
- **Natural phenomena**: earthquake, tides, moulting, mushroom bloom, monsoon, erosion
- **Art / artists / movements**: Bauhaus, Frida Kahlo, Basquiat, film noir, minimalism, baroque
- **Children's games**: tag, hopscotch, hide-and-seek, lego, jenga, rock-paper-scissors
- **Food preparation steps**: kneading, marinating, reducing, plating, fermenting, blanching
- **Sports rules**: offside, timeout, strike zone, carry, penalty box, handoff

For each anchor, force a connection to the thought. Don't strain — if no connection comes within ~10 seconds of thinking, skip and pick another anchor. Superficial connections are fine and often valuable — the point is novelty, not depth.

**Format**: "Connecting [ANCHOR] to the thought yields: [IDEA]"

Example:

## Idea 1 (Moulting): Periodic spec refresh

Moulting — snakes and arthropods periodically shed their outer layer to accommodate growth. Applied to our thought: SPECLAN entities could enter a "moulting" state where a new major version is drafted alongside the locked current version, then swapped in at a release boundary — effectively a scheduled replacement rather than an in-place edit.

**Why this matters:** Suggests a formal lifecycle stage for "big enough to warrant a rewrite but small enough not to fragment history" that sits between CR and new-entity.

---

Label each idea with its anchor.

{COMMON_OUTPUT_FORMAT}
```

**Expected output**: 4–8 ideas, each drawing from a distinct random anchor.

**Common failure modes**: agent picks all anchors from one category; agent strains a connection that doesn't actually work; agent produces off-topic implementation details dressed up as "connections". Mitigation: "if no connection comes within ~10 seconds, skip" (the agent can't literally time itself but the framing discourages strain), and the specification-level constraint from the header.

---

## Technique → agent prompt filling

At dispatch time, for each selected technique:

1. Take the `{COMMON_HEADER}` block above, fill in `{THOUGHT}`, `{CLASSIFICATION}`, `{ANCHOR}`, `{PROJECT_SUMMARY}` from the Phase 0 state.
2. Append the technique-specific section (SCAMPER, Crazy 8s, etc.) — replace `{COMMON_HEADER}` and `{COMMON_OUTPUT_FORMAT}` references with the actual text from this file.
3. Pass the filled prompt to the `Agent` tool with `subagent_type: "general-purpose"`.

Each subagent is independent and has no shared state with the others.
