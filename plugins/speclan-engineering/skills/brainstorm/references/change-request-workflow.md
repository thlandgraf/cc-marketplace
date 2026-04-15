# Change Request Workflow

How to file a Change Request (`CR-####`) when a brainstorm session concludes that a **locked** entity should be modified. Locked statuses — `in-development`, `under-test`, `released`, `deprecated` — cannot be edited directly; the only legal modification is a CR filed adjacent to the target.

## When this applies

Apply the CR workflow whenever Phase 2's edit-vs-CR rule flips an `action: modify` to `action: changeRequest` because the target is in a locked status. The user doesn't choose — the lifecycle decides.

If the target is in an editable status (`draft`, `review`, `approved`), you should be editing the target directly and this document is **not** what you need — see the merge rules in `../../hlrd-authoring/references/entity-content.md`.

## The golden rule

**Never edit the locked entity directly, even "just a bit", even to add a comment, even in frontmatter.** Every modification to a locked entity goes through a CR. The CR is the sole record of the proposed change until it's approved and merged.

## CR directory location

CRs live in a `change-requests/` directory **adjacent** to the entity they target. Defer to `speclan-format` for the canonical layout — it's authoritative. For quick reference:

- **CR against a goal:** CR file goes under `speclan/goals/change-requests/` (goals are flat files, so CRs live at the goals-level directory).
- **CR against a feature:** `speclan/features/F-####-slug/change-requests/`
- **CR against a child feature:** `speclan/features/F-####-parent/F-####-child/change-requests/`
- **CR against a requirement:** `speclan/features/F-####/requirements/R-####-slug/change-requests/`
- **Root-level CRs** (rare): `speclan/change-requests/`

**You do not compute these paths yourself.** Delegate to `speclan-format`'s "Creating New Specifications" procedure, which owns directory layout. This document describes the CR-specific parts of the procedure that `speclan-format` doesn't explicitly walk.

## CR filename

Flat file (no directory wrapper — unlike features and requirements): `CR-####-kebab-slug.md`.

Slug is derived from a short description of the change, same rules as other entity slugs (delegated to `speclan-format`).

## ID generation

Delegate to the `speclan-id-generator` skill with `--type changeRequest`:

```bash
node "$SCRIPT" --type changeRequest --speclan-root speclan | jq -r '.data.ids[0]'
```

Request the ID fresh for each CR — don't batch unless the brainstorm is filing multiple CRs in the same session, in which case batch with `--count N` to reduce collision-check overhead.

## Frontmatter

The canonical CR frontmatter schema is defined in `speclan-format`'s `references/entity-fields.md`. For brainstorm, fill these fields:

```yaml
---
id: CR-####                         # from speclan-id-generator
type: changeRequest
title: <short change title>         # 3–8 words describing the proposed change
status: pending                     # always `pending` for new CRs from brainstorm
owner: <git user.name>              # the cached owner_value resolved in Phase 0 — see entity-content.md "Owner field resolution"
created: <ISO-8601 timestamp>
updated: <ISO-8601 timestamp>
parentId: <locked-entity-id>        # e.g., F-5678 or R-0042
parentType: <locked-entity-type>    # feature | requirement | goal
changeType: <enhancement | bugfix | breaking | deprecation | documentation>
description: <one-sentence summary of the change>
changes: |
  <2–4 paragraph narrative of what changes, why, and the expected impact.
   This is a multiline YAML string — indentation matters.>
---
```

**Field notes:**

- **`status: pending`** is the correct starting state for a brainstorm-initiated CR. Never set `draft` or later — the lifecycle is `pending → draft → review → approved → in-development → under-test → merged | closed`.
- **`changeType`** is constrained to the five values above. Pick the narrowest match:
  - `enhancement` — adds capability (most common for brainstorm output)
  - `bugfix` — corrects a defect
  - `breaking` — breaks existing contracts (use sparingly; flag to user explicitly)
  - `deprecation` — marks for removal
  - `documentation` — clarifies existing spec without changing behavior
- **`parentType`** must match the actual type of `parentId`. Validate before writing — a CR with `parentId: F-5678` and `parentType: requirement` is invalid and `speclan-format`'s validation rules will reject it.
- **`description`** is a one-sentence summary; **`changes`** is the full narrative. Don't duplicate content across them.

## Body template

```markdown
# <CR Title>

## Summary

<2–3 sentences restating the change in plain language. This is the first thing a reviewer reads — make it count.>

## Rationale

<Why is this change needed? What gap does it close, what problem does it solve, what does the current locked entity fail to handle? Cite the brainstorm context if helpful.>

## Proposed Changes

<Bulleted list of concrete changes to the target entity. Use the same vocabulary the target uses — if the target has an "Acceptance Criteria" section, your changes reference that section by name.>

- <change 1>
- <change 2>
- <change 3>

## Impact

<What downstream entities or users does this affect? Any tests or flows that would need updating? Any risk of regression?>

## Open Questions

<Any open points the reviewer should decide. Leave empty if the CR is fully specified.>
```

### Style rules

- **Don't repeat the target's content.** The CR describes *changes*, not the full new state. Reviewers read the CR alongside the locked target, so restating the target's text is noise.
- **Be specific about what changes.** "Improve validation" is not a change — "Add microchipping check to the pre-sale validation step in R-0001's acceptance criterion #3" is a change.
- **Cite the brainstorm when helpful.** If the CR came from a conversation that surfaced a specific edge case, mention it: *"Discovered during brainstorm: sellers at pet expos frequently have untracked microchip status."*
- **Never pre-approve.** A CR from brainstorm is always `pending` — approving is a separate human step.

## Bidirectional linking

A CR does **not** require frontmatter edits on the locked target (that would be a direct edit, which is forbidden). The CR's `parentId` field is the only link, and the target entity is linked to its CRs structurally via the `change-requests/` subdirectory — `speclan-format` handles discovery.

If the target has a dedicated "Change Requests" section in its body, **do not edit it** to add the new CR. Leave that for the approval / merge workflow. During brainstorm, the CR file's existence is the entire record.

## Reporting to the user

After filing each CR, report in this format:

> **Change Request filed:** `CR-####` (`<changeType>`) against `<parentType> <parentId>` (`<parentId>` is `<status>`, locked) → `speclan/...../CR-####-slug.md`

Example:

> **Change Request filed:** `CR-0001` (`enhancement`) against `feature F-5678` (`F-5678` is `released`, locked) → `speclan/features/F-5678-payments/change-requests/CR-0001-add-microchip-validation.md`

This makes it obvious to the user that (a) the target wasn't touched, (b) a CR was created, and (c) the CR is in `pending` status awaiting review.

## Common mistakes

1. **Editing the locked target to add a "see CR-####" comment.** Don't. The CR's existence in the adjacent `change-requests/` directory is enough. Any edit to the locked target, however small, violates the lifecycle contract.
2. **Using `status: draft` for a new CR.** New CRs are always `pending`. `draft` is the next transition, decided by a human reviewer.
3. **Filing multiple CRs for one logical change.** If the brainstorm concludes that a feature needs three changes that are all part of the same logical shift, file **one** CR with a multi-item "Proposed Changes" section. Split only when the changes are independently reviewable.
4. **Computing the CR directory path manually.** Defer to `speclan-format`. Every time you write out a directory path in this skill, you're risking drift from the canonical layout.
5. **Forgetting `parentType`.** `parentId: F-5678` alone is not enough — validation requires the matching `parentType: feature`.
