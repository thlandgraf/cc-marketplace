# Entity Content Rules — Goals, Features, Requirements

Body templates, HLRD-specific style rules, and merge rules for modifying existing entities.

## Scope of this document

This file **only** covers what's HLRD-pipeline-specific:

- Body templates (the markdown text the pipeline writes into each file)
- Style rules for HLRD-sourced content
- Merge rules for `action: modify`

Everything **structural** lives in the `speclan-format` skill, which is the canonical source:

- Directory layout (`speclan/goals/` vs `speclan/features/F-####-slug/...`)
- Filename conventions (`{ID}-{slug}.md`, directory-name-must-match-file rules)
- Frontmatter field definitions and required fields
- Status lifecycle and editability
- Template discovery procedure
- Bidirectional linking field names

If a frontmatter example below conflicts with `speclan-format`, **`speclan-format` wins** — treat this document's examples as illustrative of the defaults (owner, status, etc.), not the authoritative field list.

## Owner field resolution

Every entity this plugin creates or modifies sets the `owner` frontmatter field to the **current git user name**, not a hardcoded string like "HLRD Import" or "Brainstorm". The owner should reflect the human accountable for the spec, and the git user name is the best available signal for that in a CLI context.

### Resolution procedure

At the **start** of any pipeline run that creates or modifies specs, resolve the owner value **once** and cache it in pipeline state under `owner_value`. Every subsequent entity creation in the same run uses the cached value — don't re-run the resolution per entity.

1. **Primary**: run `git config user.name` via `Bash` in the project directory. If the output is a non-empty string, use it as `owner_value`.
2. **Fallback 1**: if step 1 is empty or errors, run `git config --global user.name`. If non-empty, use it.
3. **Fallback 2**: if step 2 is also empty, read the `$USER` environment variable.
4. **Last resort**: if all three are empty, use `AskUserQuestion` to prompt the user:
   > No git user name is configured. What name should I use as the `owner` for the specs I'm about to create?
   - Accept free-text response
   - Offer option `Cancel the pipeline` so the user can set up git and restart

The resolved value becomes `owner_value` for the pipeline. Record it in the initial status message so the user knows what will be stamped on every spec they're about to create (e.g., *"Creating specs as owner: Alex Rivera"*).

### Why cache once per pipeline

- **Consistency**: every spec from one pipeline run should have the same `owner`. Re-resolving per entity risks subtle inconsistencies if the git config changes mid-run.
- **Cost**: running `git config` 20 times for a 20-entity HLRD import is pointless overhead.
- **Auditability**: the owner reflects who ran the pipeline, not who happened to be configured at each individual spec's moment of creation.

### What "owner" means, and what it does NOT mean

- **Means**: the human accountable for the spec at the moment of creation. Typically the person running the CLI session.
- **Does NOT mean**: the long-term maintainer, the domain expert, or the approver. Those are separate concerns — if a project needs them, they belong in dedicated frontmatter fields (`maintainer`, `approver`) managed by `speclan-format`, not overloaded onto `owner`.

### When the frontmatter examples below show `owner: <git user.name>`

Every frontmatter example in this document uses the placeholder `<git user.name>` in the `owner` field. Replace it with the resolved `owner_value` at write time. Do NOT copy the literal string `<git user.name>` into an actual spec file.

## Universal body rules — coherence enforcement

Every body template in this document follows two non-negotiable rules that the cross-referencing phase validates and enforces. See `references/cross-referencing.md` for the full canonical contract; the summary below is the author-facing version that applies while writing body content.

### Rule 1 — No "References" section

Every body template **omits** a trailing `## Related`, `## References`, `## See Also`, or `## Links` section by design. Cross-references between entities are woven **inline** into the existing prose (overviews, scope bullets, user stories, acceptance criteria) — never collected at the end of the file.

- Do NOT add a "Related" / "References" / "See Also" / "Links" H2 section to any goal, feature, requirement, or change request.
- Do NOT add a trailing bullet list of links with no surrounding prose.
- If you find yourself wanting to list related entities at the bottom of a file, stop — the cross-referencing phase weaves those links into the prose where the concepts are mentioned. That's the right place.

### Rule 2 — Never reference another entity by bare ID in body prose

When body prose mentions another SPECLAN entity, **always use a relative markdown link**, never the bare ID:

| ❌ Wrong | ✅ Correct |
|---|---|
| `Extends F-1234 to support team roles.` | `Extends [Authentication](../../F-1234-authentication/F-1234-authentication.md) to support team roles.` |
| `See R-0042 for lockout policy.` | `See [Lockout Policy](../R-0042-lockout-policy/R-0042-lockout-policy.md) for the policy.` |
| `Contributes to G-001 and G-042.` | `Contributes to the [Online Marketplace](../../goals/G-001-online-marketplace.md) and [Partner Self-Service](../../goals/G-042-partner-self-service.md) goals.` |

This applies to **all body prose** — overviews, scope bullets, user stories, acceptance criteria, change-request narratives, scope-out lines.

### Rule 2a — Link labels are the target's title, verbatim

The visible text of a markdown link to another SPECLAN entity MUST be the target entity's `title` field from its frontmatter, nothing more. **Never prepend the ID to the title** as a label.

| ❌ Wrong (ID in label) | ✅ Correct (title only) |
|---|---|
| `[F-1234 Authentication](../../F-1234-authentication/F-1234-authentication.md)` | `[Authentication](../../F-1234-authentication/F-1234-authentication.md)` |
| `[G-001 Online Marketplace](../../goals/G-001-online-marketplace.md)` | `[Online Marketplace](../../goals/G-001-online-marketplace.md)` |
| `[R-0042 Lockout Policy](../R-0042-lockout-policy/R-0042-lockout-policy.md)` | `[Lockout Policy](../R-0042-lockout-policy/R-0042-lockout-policy.md)` |
| `[F-1234](../../F-1234-authentication/F-1234-authentication.md)` | `[Authentication](../../F-1234-authentication/F-1234-authentication.md)` |

The ID is already carried by the link's path (`F-1234-authentication.md`), so repeating it in the visible text duplicates information and clutters the prose. Prose like *"uses the Authentication feature for team roles"* reads naturally; *"uses the F-1234 Authentication feature for team roles"* reads like a changelog.

**Where IDs ARE allowed**:
- YAML **frontmatter fields** — `goals: [G-001]`, `feature: F-1234`, `parentId: F-5678`. These are data, not prose.
- **Code blocks** — example snippets illustrating field values.
- **Link target paths** — `[Authentication](../../F-1234-authentication/F-1234-authentication.md)`. The ID in the filename is part of the path, not the visible text.

The cross-referencing phase validates Rules 1, 2, and 2a after creation and rewrites any violations it finds. But **the cleanest path is to follow the rules during initial body writing** — every body template in this document is designed to make compliance the natural option.

## Goal

### Frontmatter

```yaml
---
id: G-###
type: goal
title: <3–6 word business objective>
status: draft
owner: <git user.name>    # resolved once at pipeline start — see "Owner field resolution" above
created: <ISO-8601 timestamp>
updated: <ISO-8601 timestamp>
contributors: []          # populated in Phase 3 (cross-referencing)
tags: []
---
```

### Body template

```markdown
# <Goal Title>

## Overview

<2–3 paragraphs covering what this goal is and why it matters to the business. Focus on user outcomes and business value. No implementation details.>

## Scope

### In Scope

- <bullet 1>
- <bullet 2>

### Out of Scope

- <bullet 1>
- <bullet 2>

## Success Indicators

Qualitative outcomes that signal this goal has been achieved:

- <outcome 1>
- <outcome 2>
- <outcome 3>
```

### Style rules

- Title is a business objective phrased as a state of the world, not a task ("Enable Partner Self-Service", not "Build a partner portal").
- No tech stack names, no implementation specifics.
- Success indicators are **qualitative** and user-facing — leave measurable KPIs for goals with explicit metrics in the HLRD.

## Feature

### Frontmatter

```yaml
---
id: F-####
type: feature
title: <capability name>
status: draft
owner: <git user.name>    # resolved once at pipeline start — see "Owner field resolution" above
created: <ISO-8601 timestamp>
updated: <ISO-8601 timestamp>
goals:                    # goals this feature contributes to; populated via cross-ref phase
  - G-###
leaf: <true|false>        # true if no child features
tags: []
---
```

### Body template

```markdown
# <Feature Title>

## Overview

<1–2 paragraphs describing what this feature does and where it sits in the product.>

## User Story

As a **<user type>**, I want **<capability>** so that **<benefit>**.

## Scope

- <in-scope bullet 1>
- <in-scope bullet 2>
- <in-scope bullet 3>

## Out of Scope

- <explicitly excluded concern>
```

### Style rules

- Title is a capability name, not a user action ("Shop Lifecycle Management", not "Create and delete shops").
- Exactly one user story per feature. If the HLRD implies multiple user stories, either pick the dominant one or split into sub-features.
- `leaf` is `true` when the feature has no child features. Features with children can still have requirements — both leaf and non-leaf features can carry requirements. `leaf: true` is common.

## Requirement

### Frontmatter

```yaml
---
id: R-####
type: requirement
title: <specific requirement name>
status: draft
owner: <git user.name>    # resolved once at pipeline start — see "Owner field resolution" above
created: <ISO-8601 timestamp>
updated: <ISO-8601 timestamp>
feature: F-####           # parent feature ID — required
tags: []
---
```

### Body template

```markdown
# <Requirement Title>

## Description

<Detailed requirement statement — what the system must do. Keep it atomic and testable.>

## Acceptance Criteria

- [ ] Given <precondition>, when <action>, then <outcome>
- [ ] Given <precondition>, when <action>, then <outcome>
- [ ] Given <precondition>, when <action>, then <outcome>
```

### Style rules

- **Acceptance criteria use GFM task list checkboxes** (`- [ ]`) so they're trackable across tools that render markdown.
- Each bullet uses Given/When/Then phrasing. If the HLRD uses different phrasing, translate — don't copy-paste.
- **Atomic**: the requirement tests one thing. If you find yourself writing "and also", split.
- **Testable**: clear pass/fail criteria. Vague "should be user-friendly" requirements are not acceptable.
- **Traceable**: every requirement must be clearly derivable from HLRD content or the parent feature's description. If you can't draw that line, the requirement shouldn't exist.
- Aim for 1–3 requirements for simple features, 3–5 for moderate, 5–7 for complex. Prefer fewer high-quality requirements over many vague ones.
- Skip generation entirely if a feature already has ≥7 requirements — the existing ones likely cover the scope.

## Merge rules for `action: modify`

When the plan marks an entity with `action: modify` and the target is in an **editable** status (`draft`, `review`, `approved`), apply these rules:

### Immutable fields — never change

- `id`
- `type`
- `status` (and **never** downgrade to a prior status)
- `owner`
- `created`
- Existing `tags` (you may add new tags, never remove)

### Mutable with care

- **`updated`**: set to the current ISO-8601 timestamp.
- **Description**: expand if the HLRD adds detail. Do not overwrite — append or integrate.
- **User story (features)**: update only if the HLRD introduces a new user type or benefit that isn't reflected. When expanding, keep the existing story as primary and append a note about the new context rather than replacing.
- **Acceptance criteria (requirements)**: append new criteria. Never delete existing ones.
- **Success criteria (goals)**: append; preserve original indicators.
- **Scope sections**: append to "In Scope" when HLRD adds items; move items to "Out of Scope" only if the HLRD explicitly excludes them.
- **Cross-references** and inline markdown links: preserve as-is. Phase 3 may add more, but never removes.

### Never modify locked statuses

Entities in `in-development`, `under-test`, `released`, or `deprecated` are locked. If the plan proposes modifying one:

1. Surface a warning in the pipeline log.
2. Classify the action as `locked-status` failure.
3. Do not edit the file.
4. Note in the summary: "<entity> is in <status> status — use a Change Request (CR) to propose changes." (CR creation is out of scope for v0.1 of this pipeline.)

### Use `Edit`, not `Write`

For modifications, use the `Edit` tool with narrow `old_string`/`new_string` replacements so the diff is small and human-reviewable. A full `Write` rewrite would obscure what actually changed and risk clobbering content the plan didn't intend to touch.

## Templates

Template discovery is handled by the `speclan-format` skill's "Creating New Specifications" procedure — it looks for user templates in `speclan/templates/<entity-type>/` and picks the best match before falling back to defaults.

When a user template is applied, **prefer its body structure** over the body templates in this document. User templates reflect the project's conventions and may include sections (e.g., "Compliance", "Dependencies") the HLRD defaults omit. Fill the user template with HLRD-derived content, keeping the style rules above as guidance for how to phrase each section.
