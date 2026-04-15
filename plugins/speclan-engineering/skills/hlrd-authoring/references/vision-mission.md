# Vision & Mission Extraction — Phase 0

Phase 0 of the HLRD pipeline. Runs before planning. Reads (or creates) `speclan/vision.md` and `speclan/mission.md` using the HLRD content as the source of truth.

## Why this matters

Vision and Mission are strategic anchor documents. Features and goals that follow should be traceable back to them. Running Phase 0 before planning means the planner has a north star to align against, and catches drift when the HLRD introduces scope the existing vision doesn't cover.

## Vision vs. Mission — tone & purpose

| Aspect    | Vision                                         | Mission                                              |
|-----------|------------------------------------------------|------------------------------------------------------|
| Purpose   | Aspirational future state                      | Current operational purpose                          |
| Timeframe | Future (3–5+ years)                            | Present                                              |
| Question  | "What do we want to become?"                   | "What do we do, for whom, and why it matters?"       |
| Tone      | Inspirational, motivating                      | Actionable, concrete                                 |
| Length    | 1–2 core sentences, 200–400 words total        | 2–4 core sentences, 200–400 words total              |
| Changes   | Rarely                                          | Evolves with product                                 |

### Vision examples (from the reference)

- "To be the most trusted specification platform for enterprise software teams"
- "A world where every software requirement is traced from business goal to passing test"

### Mission examples (from the reference)

- "We help specification engineers manage requirements hierarchies through intuitive tooling, reducing documentation drift and improving traceability"
- "SPECLAN enables teams to define, track, and validate software specifications from goals to tests using plain Markdown"

## Procedure

### Step 1 — Read existing documents

- `Read` `speclan/vision.md` — if it doesn't exist, that's fine, capture "absent".
- `Read` `speclan/mission.md` — same.

Both files live at the **speclan root**, NOT under `speclan/goals/` or `speclan/features/`. Path is `<speclan-root>/vision.md` and `<speclan-root>/mission.md`.

### Step 2 — Analyze the HLRD

From the HLRD content, identify:

- **Project purpose and domain** — what problem is being solved, for whom
- **Stakeholders and users** — who benefits
- **Outcomes enabled** — what becomes possible because of this project
- **Strategic value propositions** — why the project matters

These map onto Vision (aspirational framing) and Mission (operational framing).

### Step 3 — Decide create / update / unchanged for each file

Apply this decision tree **independently** for vision and mission:

```
if file does not exist:
    → create from HLRD analysis
elif HLRD adds significant new context (new stakeholder class, new domain, shift in north star):
    → update: enhance without overwriting, preserving existing content where it still holds
else:
    → unchanged: leave it alone
```

"Significant new context" is a judgment call. A good heuristic: if the HLRD introduces a capability class, user segment, or value proposition that isn't represented in the existing vision/mission — even implicitly — it's significant. If the HLRD is simply adding detail to something already covered, it isn't.

### Step 4 — Write content (create or update)

Use `Write` for create, `Edit` for update. Target 200–400 words per file. Format as Markdown with H1 title and H2 sections.

**Vision template:**

```markdown
# Vision

[Aspirational paragraph — 1–2 sentences describing the future state]

## The World We're Building

[Paragraph expanding on the long-term picture — what becomes possible, how stakeholders experience it, what problems disappear]

## Guiding Principles

- [Principle 1]
- [Principle 2]
- [Principle 3]
```

**Mission template:**

```markdown
# Mission

[Operational paragraph — 2–4 sentences describing what we do, for whom, and why]

## What We Do

[Paragraph describing the concrete activities and outputs]

## Who We Serve

[Paragraph identifying the primary users/stakeholders and their needs]

## How We Measure Success

- [Outcome 1]
- [Outcome 2]
- [Outcome 3]
```

Templates are starting points — adapt structure to fit the project. A one-page project doesn't need three H2 sections.

### Step 5 — Report the outcome

Report to the caller: `Vision {created|updated|unchanged}, Mission {created|updated|unchanged}`.

## Anti-implementation guardrails

**NEVER** include the following in vision or mission content:

- Technology stack names (React, PostgreSQL, Kubernetes, etc.)
- Framework or library names
- Architecture patterns (microservices, event sourcing, etc.)
- Programming languages or platforms
- Specific API or protocol references
- Deployment topology

**INSTEAD**, describe:

- User outcomes and benefits
- Business value and impact
- Problems being solved from a user perspective
- Strategic differentiators framed in user-facing language

**Why**: vision and mission should outlive any specific tech stack. If a rewrite to a different language or framework is forced, the vision should survive unchanged.

## Subtree imports

When the HLRD is being imported as a subtree under an existing feature (entry-point mode), the vision and mission are almost always **unchanged** — the subtree is a narrowing, not a redirection, and adding subtree scope to project-wide vision usually dilutes it. Default to `unchanged` unless the subtree introduces a genuinely new domain the project didn't previously cover.
