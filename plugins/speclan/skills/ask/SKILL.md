---
name: SPECLAN Ask
description: >-
  Answer questions about SPECLAN specifications with full context — relationships,
  hierarchy, status, and cross-references rather than just reading a single file.
  Use whenever someone asks about a feature, requirement, goal, change request,
  or references a SPECLAN entity ID (G-###, F-####, R-####, CR-####). Also use
  when users ask about project status, what's ready to implement, dependency
  chains, or want an overview of their spec hierarchy — even if they don't
  explicitly say "SPECLAN" or "spec". Any question that needs context from the
  speclan/ directory should route here.
version: 0.2.0
---

# SPECLAN Ask

Answer questions about SPECLAN specifications holistically. A spec rarely lives on its own — its ancestors, siblings, contributing goal, child entities, change requests, and implementation status all matter. The goal is to give the user a comprehensive, contextual answer — not just dump a single file.

## Core Principle: Context Over Content

Do not just read and parrot a single file. Instead, build a **contextual picture**:

1. **The entity itself** — frontmatter + body summary
2. **Upward** — parent feature, contributing goal(s)
3. **Downward** — child requirements, nested features
4. **Sideways** — sibling requirements/features at the same level
5. **Change history** — active change requests on this entity
6. **Status context** — what the status means for editability and next steps

## Workflow

### 1. Locate the Speclan Root

Use the detection script to find the speclan directory:

```bash
source "${CLAUDE_PLUGIN_ROOT}/skills/speclan-format/scripts/detect-speclan.sh"
```

If no speclan root is found, inform the user that no SPECLAN project was detected.

### 2. Identify What the User Is Asking About

Parse the user's question to determine:

- **By ID** — `F-0471`, `R-0311`, `G-001`, `CR-0012` → locate directly via query script
- **By name/slug** — "alien grid movement", "core gameplay" → search filenames and titles
- **By type** — "all features", "approved requirements" → use query with filters
- **By relationship** — "children of F-0471", "what contributes to G-001" → use parent filtering
- **By status** — "what's in development", "approved specs" → use status filtering

### 3. Gather the Entity

Use the query script for discovery:

```bash
"${CLAUDE_PLUGIN_ROOT}/skills/speclan-query/scripts/query.sh" \
  --type all --full "$SPECLAN_ROOT"
```

For targeted lookups, filter by type and optionally parent:

```bash
"${CLAUDE_PLUGIN_ROOT}/skills/speclan-query/scripts/query.sh" \
  --type feature --filter-status approved "$SPECLAN_ROOT"
```

Then read the entity's markdown file for full content.

### 4. Build Contextual Picture

For every entity found, gather its context using the **relationship exploration** procedure in `references/context-gathering.md`. This is the core of the skill — it turns a flat file read into a rich, interconnected answer.

### 5. Compose the Answer

Structure the response based on what the user asked:

#### Single Entity Question ("tell me about F-0471")

Present in this order:

1. **Identity** — ID, title, type, status, owner
2. **Status meaning** — editable/locked/frozen, what transitions are possible (consult `speclan-format` skill for lifecycle rules)
3. **Goal alignment** — which goal(s) this contributes to, with goal titles
4. **Parent context** — if requirement: the parent feature; if nested feature: the parent feature
5. **Body summary** — concise summary of the spec content (description, acceptance criteria, key points)
6. **Children** — list child requirements or sub-features with their statuses
7. **Siblings** — other entities at the same level (fellow requirements under same feature, fellow features under same goal)
8. **Change requests** — any active CRs on this entity or its children
9. **Cross-references** — any `tags` that connect to other entities, any mentions in other specs

#### Status/Filter Question ("what's approved", "show in-development features")

Present as a structured table:

| ID | Title | Type | Parent | Owner |
|----|-------|------|--------|-------|

Group by goal or parent feature for readability.

#### Relationship Question ("children of F-0471", "what contributes to G-001")

Present the relationship tree, showing status badges:

```
G-001 Core Game Experience [released]
  F-0471 Core Gameplay [in-development]
    R-0311 Lateral March Edge Reversal [approved]
    R-0312 Descent After Reversal [in-development]
    ...
```

### 6. Add Actionable Context

Based on status and relationships, suggest relevant next steps:

- **draft** entities → "Ready for review when content is complete"
- **approved** entities → "Ready for implementation. Use `/speclan:plan-manual` to create an implementation plan"
- **in-development** with all children done → "Consider moving to `under-test`"
- **Entity with active CRs** → "Has N pending change request(s) — review before proceeding"
- **Orphan entities** (no goal link) → "Not linked to any goal — consider adding goal alignment"

## Status Badge Reference

Use these inline badges for compact status display:

| Status | Badge |
|--------|-------|
| draft | `[draft]` |
| review | `[review]` |
| approved | `[approved]` |
| in-development | `[in-dev]` |
| under-test | `[testing]` |
| released | `[released]` |
| deprecated | `[deprecated]` |

## Important Boundaries

This skill is **read-only** — it answers questions but doesn't modify specs. If the user wants to change something, point them to the appropriate command or skill (e.g., `implement-manual` for implementation, or direct editing for draft-status specs). This separation matters because answering questions and making changes are different intents, and accidental modifications while exploring can be disruptive.

Extract entity IDs from filenames/dirnames rather than frontmatter — the filename pattern `{PREFIX}-{ID}-{slug}` is the authoritative source of truth across all SPECLAN tools.

The hierarchy flows Goal → Feature → Requirement, with features nesting under other features. Requirements are always leaf nodes. When locked entities (in-development, under-test, released) come up, mention that changes require a Change Request — this is often the most actionable piece of context for the user.

## Additional Resources

### Reference Files

- **`references/context-gathering.md`** — detailed procedure for building the contextual picture around any entity, including upward/downward/sideways/CR exploration steps

### Leveraged Skills

This skill builds on knowledge from:
- **`speclan-format`** (`${CLAUDE_PLUGIN_ROOT}/skills/speclan-format/SKILL.md`) — entity hierarchy, status lifecycle, field definitions, validation rules
- **`speclan-query`** (`${CLAUDE_PLUGIN_ROOT}/skills/speclan-query/SKILL.md`) — fast entity discovery and filtering via `scripts/query.sh`
