# Technique Selection — Decision Matrix

How Phase 1 auto-selects 3–5 brainstorming techniques when the user hasn't specified `--techniques=<csv>`. This matrix maps `(classification, anchor, thought_shape)` onto a ranked list of techniques, capped at 5.

## Inputs

From Phase 0 Grounding, you have:

- `classification` — one of `new-goal`, `new-feature`, `feature-extension`, `new-requirement`, `requirement-modification`, `change-request`, `not-speclan` (the last causes an exit, never reaches this phase)
- `anchor` — entity details or `null`
- `thought` — the cleaned rough idea

Compute these additional signals from the thought:

- `word_count` — total words in the thought
- `noun_count` — rough count of distinct domain nouns (proper nouns, technical terms, user-facing concepts)
- `has_risk_language` — thought mentions security, trust, reliability, regression, compliance, validation, or similar risk-sensitive terms
- `has_multi_stakeholder_language` — thought mentions roles, permissions, teams, approvals, admin/user tiers, or trade-offs between stakeholder needs
- `has_domain_clarity` — thought stays in one clear domain (e.g., "shopping cart" — retail; "authentication" — identity); false if the thought is very abstract

These signals are judgment calls, not regexes. Don't over-engineer the detection.

## Step 1 — Mandatory techniques by classification

Start with the mandatory set for the classification. These are techniques that **always** add value for that class.

| Classification | Mandatory techniques |
|---|---|
| `new-goal` | First Principles, Crazy 8s |
| `new-feature` | Crazy 8s, Constraint-Based |
| `feature-extension` | SCAMPER, Reverse |
| `new-requirement` | Reverse, Constraint-Based |
| `requirement-modification` | SCAMPER, Reverse |
| `change-request` | SCAMPER, Reverse, Six Hats |

**Rule**: SCAMPER is the only technique with a hard precondition — it requires `anchor != null`. For classifications where SCAMPER is mandatory and the anchor is missing (rare but possible), drop SCAMPER silently and add First Principles instead.

## Step 2 — Boost techniques based on thought signals

Add techniques from this table when the corresponding signal is present. These are **signal-driven boosts**, not requirements.

| Signal | Technique to add | Why |
|---|---|---|
| `has_risk_language == true` | Reverse (if not already mandatory) | Risk-sensitive thoughts benefit most from failure-mode exploration |
| `has_multi_stakeholder_language == true` | Six Hats | Each hat captures a stakeholder lens |
| `has_domain_clarity == true` | Analogy | Analogies transfer cleanly when the target domain is clear |
| `word_count < 20` AND `noun_count < 5` | Random Input | Vague/short thoughts need stimulus to break out of obvious ideas |
| `has_domain_clarity == false` | First Principles | Unclear thoughts benefit from decomposition |
| Anchor is in a **locked** status (`released`, `in-development`, `under-test`, `deprecated`) | Six Hats (Black hat especially) | Locked entities have higher regression risk |

Apply every matching boost. Duplicates (a technique mandatory AND boosted) count once.

## Step 3 — Cap at 5

If the combined list (mandatory + boosts) exceeds 5, drop in this priority order (lowest first):

1. **Random Input** — least reliable technique; drop first
2. **Analogy** — valuable but narrower scope than general-purpose techniques
3. **Six Hats** — drop if the thought isn't genuinely multi-stakeholder (re-check `has_multi_stakeholder_language`)
4. **First Principles** — drop if the thought is simple and the classification is narrow (e.g., `new-requirement` under a clearly-defined feature)

Never drop the mandatory techniques from Step 1 — if dropping the boosts still leaves more than 5, drop the boosts from lowest priority until the count is 5.

## Step 4 — Floor at 3

If the combined list has fewer than 3 techniques, add from this fallback order until 3:

1. **Constraint-Based** — almost always produces value; safe default
2. **First Principles** — broad applicability
3. **Crazy 8s** — broad applicability

## Examples

### Example 1

- **Classification**: `feature-extension`
- **Anchor**: `F-1234 User Authentication` (`draft`)
- **Thought**: *"expand F-1234 to support team-level permissions and role inheritance"*
- **Signals**: `has_multi_stakeholder_language = true`, `has_domain_clarity = true`, `word_count = 10`, `noun_count = 4`

**Step 1 — Mandatory**: SCAMPER, Reverse
**Step 2 — Boosts**: Six Hats (multi-stakeholder), Analogy (domain clarity = identity), Random Input (short + few nouns)
**Combined**: SCAMPER, Reverse, Six Hats, Analogy, Random Input → 5
**Step 3 — Cap**: already at 5, no drops
**Step 4 — Floor**: not applied

**Selection**: SCAMPER, Reverse, Six Hats, Analogy, Random Input
**Rationale per technique** (to present to user):
- SCAMPER: mutate an existing draft feature through substitution/combination lenses
- Reverse: failure-mode exploration surfaces role-inheritance edge cases
- Six Hats: multi-stakeholder thought (admins, members, guests)
- Analogy: identity domain has many cross-domain analogues (filesystem perms, org charts, etc.)
- Random Input: short thought benefits from stimulus

### Example 2

- **Classification**: `new-goal`
- **Anchor**: `null`
- **Thought**: *"I want this tool to eventually replace JIRA for requirements tracking across our whole portfolio"*
- **Signals**: `has_domain_clarity = true` (requirements tracking), `word_count = 17`, `noun_count = 4`, `has_multi_stakeholder_language = false`

**Step 1 — Mandatory**: First Principles, Crazy 8s
**Step 2 — Boosts**: Analogy (domain clarity), Random Input (short + few nouns), Constraint-Based (not triggered by signals but always a good default — actually, Constraint-Based isn't in any boost rule above, so it's not added here)
**Combined**: First Principles, Crazy 8s, Analogy, Random Input → 4
**Step 3 — Cap**: under 5, no drops
**Step 4 — Floor**: at 4, no floor fill

**Selection**: First Principles, Crazy 8s, Analogy, Random Input
**Rationale**:
- First Principles: a broad goal like "replace JIRA" carries many assumptions worth exposing
- Crazy 8s: fast variant generation for scope shapes (minimal replacement, full replacement, hybrid, etc.)
- Analogy: tracking systems have many cross-domain analogues (CRM, issue trackers, to-do apps)
- Random Input: short thought, needs stimulus

### Example 3

- **Classification**: `change-request`
- **Anchor**: `F-5678 Payment Processing` (`released`)
- **Thought**: *"add microchipping validation to pet sale flow — sellers at pet expos often skip this"*
- **Signals**: `has_risk_language = true` (validation, regression-sensitive), `has_domain_clarity = true`, `word_count = 14`, `noun_count = 4`

**Step 1 — Mandatory**: SCAMPER, Reverse, Six Hats
**Step 2 — Boosts**: Reverse (already mandatory — no-op), Analogy (domain clarity), Random Input (short + few nouns), Six Hats (already mandatory — no-op)
**Combined**: SCAMPER, Reverse, Six Hats, Analogy, Random Input → 5
**Step 3 — Cap**: at 5, no drops
**Step 4 — Floor**: not applied

**Selection**: SCAMPER, Reverse, Six Hats, Analogy, Random Input
**Rationale**:
- SCAMPER: mutate the existing validation flow (anchor = released feature)
- Reverse: what could go wrong with this CR? (released-entity regression is high-stakes)
- Six Hats: Black hat is especially valuable for locked-entity changes
- Analogy: pet retail domain has clear food-safety / pharma-compliance analogues
- Random Input: short thought, and the CR context benefits from breaking out of the obvious "add another validation step" reflex

## Presenting the selection

After applying the matrix, format the output for Phase 1 Step 3's user confirmation. Keep the reasons concise (1 line each):

> **For this brainstorm I'm dispatching these techniques in parallel:**
>
> 1. **SCAMPER** — the thought targets F-5678, mutation lenses surface transformation options
> 2. **Reverse Brainstorming** — released-entity change requires regression-risk exploration
> 3. **Six Thinking Hats** — Black hat especially, for locked-entity risk assessment
> 4. **Analogy** — pet retail domain has clear food-safety and pharma compliance analogues
> 5. **Random Input** — short thought benefits from stimulus to break out of the obvious
>
> Spawning 5 parallel subagents.

The rationale lines are generated from the matrix reasons, not hand-written — they should be formulaic and short.
