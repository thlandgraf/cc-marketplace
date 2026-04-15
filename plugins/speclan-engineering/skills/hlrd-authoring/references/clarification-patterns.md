# Clarification Patterns — Multi-choice → AskUserQuestion

The reference VSCode wizard emits clarifications as structured JSON arrays, rendered by a webview as multi-choice forms with an "Other (specify)" escape hatch. In Claude Code, we use `AskUserQuestion` instead. This doc explains how to translate between them without losing the discipline the reference imposes.

## Core translation

The reference clarification shape:

```json
{
  "id": "auth-method",
  "type": "multi-choice",
  "introText": "The requirements mention authentication but don't specify the method. Which should be implemented?",
  "choices": [
    { "id": "username-password", "label": "Traditional username/password login" },
    { "id": "oauth2",            "label": "OAuth2/SSO integration (Google, Microsoft, etc.)" },
    { "id": "both",              "label": "Both username/password and OAuth2" },
    { "id": "other",             "label": "Other (specify)", "isOther": true }
  ]
}
```

maps to one `AskUserQuestion` call with:

- **question**: the `introText` field, lightly rephrased as a direct question if needed.
- **options** (1–4): one per `choice`, in the same order.
- **"Other" escape hatch**: the `AskUserQuestion` tool supports a per-question "Let me answer in my own words" affordance; lean on that. Do NOT manually append an "Other" option — the tool handles it.

Because `AskUserQuestion` supports ≤4 options per question, if the reference would have emitted 5+ choices, drop the weakest one rather than consuming the "Other" slot.

## One question per call

The reference allows up to 5 clarifications per round. `AskUserQuestion` supports up to 4 questions per call (when batched), but batching multi-choice questions in one call is harder for the user to read and harder for you to thread the answers back into the plan.

**Send one `AskUserQuestion` per clarification, sequentially.** It keeps the interaction focused and lets you fold each answer into the plan before deciding whether the next clarification is still relevant. (Sometimes the first answer resolves an ambiguity that would have prompted the second.)

## Round structure

The reference caps clarifications at **2 rounds × 5 questions = 10 max**, with a further recommendation to target 2–5 per HLRD.

This skill applies a **hard cap of 8 total clarifications** across both rounds. The extra headroom from the reference's 10 is rarely useful — past 8 questions, users either abandon the flow or answer carelessly.

### Round 1

Ask clarifications that emerge during the initial exploration of existing specs + draft plan. After the draft plan exists:

1. Scan for ambiguities per the guidelines below.
2. For each genuine ambiguity, ask one `AskUserQuestion`.
3. Fold the answer into the plan before the next question.
4. Stop after 5 questions OR when the plan has no remaining ambiguities, whichever comes first.

### Round 2

After round 1, re-examine the plan. If new ambiguities emerged from the integration of round 1 answers (e.g., "the user picked OAuth2 — now we need to know which provider"), ask them in round 2.

Round 2 has a budget of `8 - (questions asked in round 1)`. If round 1 used 5, round 2 can ask at most 3.

If after round 2 ambiguities remain, **make a reasonable judgment call and proceed**. The user can iterate via change requests later.

## When to ask

Only ask clarifications for things that would **change the entity structure**:

| Ask when... | Example |
|-------------|---------|
| Scope of a feature is ambiguous | "Does 'user management' include team roles?" |
| Multiple reasonable interpretations | "Is 'notifications' email only, or email + push + in-app?" |
| Parent/child relationships unclear | "Is 'shopping cart' a child of 'checkout', or peer?" |
| Priority/importance unstated and affects hierarchy | "Is 'analytics' a top-level goal or a supporting feature?" |
| Document mixes concerns | "Are 'reporting' and 'exports' one feature or two?" |

## When NOT to ask

Never ask about:

- **Implementation details** — languages, frameworks, databases, hosting. These are out of scope for specifications.
- **Styling / UI specifics** — colors, fonts, layouts — unless the HLRD explicitly treats them as requirements.
- **Edge cases that can be reasonably inferred** — "what if the user has no email address" when the HLRD clearly assumes every user has one.
- **Things the user already answered** — once an answer is in hand, don't ask a rephrased version of the same question.

## Question-writing rules

- **Intro text is 1–2 sentences.** Point at the specific ambiguity; don't recap the HLRD.
- **Choice labels are clear and actionable.** Avoid vague "yes/no/maybe" — state concrete consequences.
- **Limit choices to 2–4 meaningful options.** If there are 5+ genuinely distinct options, the question is probably too broad — split into two narrower questions instead.
- **Never use "Other" as a stall.** If the real answer isn't in the options, rewrite the options.

### Good example

> **Question:** The HLRD mentions user authentication but doesn't specify the method. Which should the first release support?
>
> 1. Username/password login only
> 2. OAuth2/SSO (Google, Microsoft) only
> 3. Both username/password and OAuth2
>
> (Plus the tool's "Let me answer in my own words" escape hatch.)

### Bad example — too broad

> **Question:** How should users log in?
>
> 1. Password
> 2. Social
> 3. SSO
> 4. Magic link
>
> (The options collapse different concepts — OAuth is SSO, magic link is passwordless, etc. — and the question hides the real decision behind surface labels. Split into "first-release auth method" and "password vs. passwordless" if both matter.)

## Folding answers back

After each answer, **silently update the plan** before the next question. Don't echo the answer back to the user — they know what they said. Do surface it implicitly by making the plan summary at the end of planning reflect the choice.

If the user picks the tool's "in my own words" option and the free text is incompatible with the plan, politely rephrase and ask a follow-up — but count the follow-up against the 8-question cap.
