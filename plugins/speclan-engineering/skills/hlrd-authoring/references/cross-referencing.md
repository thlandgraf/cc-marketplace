# Cross-Referencing — Canonical Rules

Shared across every `speclan-engineering` skill that creates or modifies SPECLAN entities (`hlrd-authoring`, `brainstorm`, `brainstorm-plus`). Whenever an entity is created or modified, a cross-referencing pass runs before the pipeline's summary phase. The rules in this document are **contracts**, not guidelines — coherence across the spec set depends on them.

## Rule 1 — Inline-only (non-negotiable)

**All cross-references between SPECLAN entities MUST be woven into the entity's existing prose — descriptions, bullet lists, scope items, user stories, acceptance criteria, tables. NEVER append a trailing "## References", "## Related", "## See Also", "## Links", or equivalent section.**

This is a hard contract enforced across all commands in this plugin:

| Allowed | Forbidden |
|---|---|
| Inline link inside an `Overview` paragraph | A `## References` section at the end of the file |
| Inline link inside a scope bullet | A `## Related` section at the end of the file |
| Inline link inside an acceptance criterion | A `## See Also` section anywhere |
| Inline link inside a user story | A `## Links` section anywhere |
| Link inside a table cell | A standalone list of links with no surrounding prose |

If a pipeline produces an entity that has a trailing "References" section, that is a **bug** in the pipeline and must be fixed before the pipeline reports success. The cross-referencing phase is the enforcement point.

## Rule 2 — Never reference by bare ID in prose (non-negotiable)

**When referring to another SPECLAN entity in body prose, NEVER write the bare ID. Always use a relative markdown link.** The ID alone is unhelpful to a reader who has to scroll/search to resolve it; a link lets them follow the reference with one click and carries the entity title as context.

### Forbidden patterns in body prose

| ❌ Wrong | ✅ Correct |
|---|---|
| `See Spec F-4711 for details.` | `See [Shop Management](../F-4711-shop-management/F-4711-shop-management.md) for details.` |
| `This extends F-1234 (Authentication).` | `This extends [Authentication](../../F-1234-authentication/F-1234-authentication.md).` |
| `Related: G-001, G-042` | *(rewrite inline into the prose where each goal is mentioned)* |
| `(see R-0042)` | `(see [Lockout Policy](../R-0042-lockout-policy/R-0042-lockout-policy.md))` |
| `modifies F-5678` | `modifies [Payment Processing](../F-5678-payment-processing/F-5678-payment-processing.md)` |

### What counts as a "bare ID"

A bare ID is any token matching `G-\d{3}`, `F-\d{4}`, `R-\d{4}`, or `CR-\d{4}` that appears **in body prose outside a markdown link wrapper**. Specifically:

- **Inside the link target `(...)`** — **OK**. IDs appear naturally in the path (`(../F-4711-shop-management/F-4711-shop-management.md)`) because SPECLAN files are named with their ID prefix. This is expected and correct.
- **Inside the link visible text `[...]`** — **the visible text MUST be the entity's `title` field, verbatim**. Write `[Shop Management](...)`, NOT `[F-4711 Shop Management](...)` and NOT `[F-4711](...)`. See "Link label rule" below for the full contract.
- **Outside any link wrapper** — forbidden. Even `(F-4711)` in parentheses is a bare ID.

### Link label rule

The visible text of a markdown link to another SPECLAN entity MUST be the target entity's **`title` field from its frontmatter, verbatim** — nothing more, nothing less.

| ❌ Wrong | ✅ Correct |
|---|---|
| `[F-4711 Shop Management](../F-4711-shop-management/F-4711-shop-management.md)` | `[Shop Management](../F-4711-shop-management/F-4711-shop-management.md)` |
| `[F-4711](../F-4711-shop-management/F-4711-shop-management.md)` | `[Shop Management](../F-4711-shop-management/F-4711-shop-management.md)` |
| `[G-001 Online Marketplace](../../goals/G-001-online-marketplace.md)` | `[Online Marketplace](../../goals/G-001-online-marketplace.md)` |
| `[F-4711 — Shop Management (v2)](...)` | `[Shop Management](...)` |

**Why**: the ID is already carried by the link's path (`F-4711-shop-management.md`), so repeating it in the visible text duplicates information and clutters the prose. The visible text is what the reader SEES — it should read as natural prose, not as a database record. `"uses the Shop Management feature for inventory lookups"` reads cleanly; `"uses the F-4711 Shop Management feature for inventory lookups"` reads like a changelog entry.

**Exception**: none. The title field is the authoritative human-facing name of the entity — if the title is ambiguous or duplicated across entities, fix the titles, don't prefix them with IDs to disambiguate.

When the cross-referencing phase validates a file and finds a link whose visible text contains anything beyond the target entity's exact title, it's a violation — rewrite the label to the bare title.

### Where IDs ARE allowed

This rule applies to **body prose only**. IDs are legitimate and expected in:

- **YAML frontmatter fields** — `goals: [G-001, G-042]`, `feature: F-1234`, `parentId: F-5678`. These are data, not prose.
- **Code blocks** — example snippets illustrating field values.
- **Filenames and paths inside link targets** — `[label](../F-4711-slug/F-4711-slug.md)` is correct; the ID in the path is part of the link, not the prose.

Everything outside these three contexts must use a markdown link, not a bare ID.

### Why this rule matters

A bare ID in prose is a **dangling reference**: it names an entity without letting the reader find it. The reader has to guess the file path, use grep, or check the TreeView. That friction compounds across a spec set and erodes coherence — readers stop following references and the network of related entities collapses to a flat collection.

A markdown link solves all three problems: the reader can follow the reference with one click, the link text provides the entity's title as context, and the path is self-documenting when the link is viewed in source form.

## Why inline links

Cross-references are most useful when they appear in context, at the moment the reader encounters a term that needs elaboration, rather than as a footer the reader has to scroll to and decode. A reader who encounters the word "validation" in a feature description and can click straight to the validation feature is following a thought. A reader who has to scroll to "## Related" and figure out which link in the list maps to the word they were reading is performing a lookup. These are different cognitive tasks, and spec documentation should support the first.

Inline links also survive refactoring better: when someone edits a paragraph and drops an unused concept, the associated link goes with it. A "## Related" section at the bottom of a file rots invisibly because it's never touched during prose edits.

### Correct transformation

```markdown
# Before

This feature manages the shopping cart, allowing users to add products and proceed
to checkout. It validates cart contents before payment processing.

# After (CORRECT — inline)

This feature manages the shopping cart, allowing users to add products from the
[Product Catalog](../F-1100-catalog/F-1100-catalog.md) and proceed to
[Checkout](../F-1200-checkout/F-1200-checkout.md). It validates cart contents using
[Input Validation](../F-1300-validation/F-1300-validation.md) before
[Payment Processing](../F-1400-payments/F-1400-payments.md).
```

The prose reads the same; the links live where the concepts appear.

### Incorrect transformation (do NOT do this)

```markdown
# WRONG — References section appended

This feature manages the shopping cart, allowing users to add products and proceed
to checkout. It validates cart contents before payment processing.

## Related

- [Product Catalog](../F-1100-catalog/F-1100-catalog.md)
- [Checkout](../F-1200-checkout/F-1200-checkout.md)
- [Input Validation](../F-1300-validation/F-1300-validation.md)
- [Payment Processing](../F-1400-payments/F-1400-payments.md)
```

Even though the link targets are identical, this pattern is **forbidden**. Delete the `## Related` section and weave each link into the prose.

## What to link

Link entities that have a **functional or semantic relationship**:

- Features that **depend on** each other — e.g. "Checkout" depends on "Cart".
- Features that **share concepts** — e.g. "User Profile" and "User Settings".
- Requirements that reference functionality in other features — e.g. a shopping requirement mentioning "authenticated users" links to the auth feature.
- Technical dependencies expressed in plain language — e.g. "API Client" used by "Data Sync".
- Goals → the features that contribute to them (when writing into goal bodies).

## What NOT to link

The SPECLAN tree view surfaces these relationships automatically — duplicating them as inline links creates noise:

- **Parent/child feature hierarchy** — the TreeView shows it.
- **Sibling features** — the TreeView shows it.
- **Direct parent feature of a requirement** — the TreeView shows it.
- **The entity itself** — never link an entity to its own file.

## Relative path rules

All links must be **relative** to the file they're written into. Absolute paths or links with the `speclan/` prefix break when the project is moved.

Path patterns by direction:

| From → To                          | Pattern                                                        |
|------------------------------------|----------------------------------------------------------------|
| Feature → Goal                     | `../../goals/G-###-slug.md`                                    |
| Feature → sibling Feature          | `../F-####-other/F-####-other.md`                              |
| Feature → child Feature            | `./F-####-child/F-####-child.md`                               |
| Feature → parent Feature           | `../F-####-parent.md` (same dir level)                         |
| Requirement → parent Feature       | `../../F-####-feature.md`                                      |
| Requirement → sibling Requirement  | `../R-####-other/R-####-other.md`                              |
| Requirement → distant Feature      | `../../../F-####-other/F-####-other.md`                        |
| Goal → Feature                     | `../features/F-####-feature/F-####-feature.md`                 |

**Preserve the `{ID}-{slug}.md` filename format** in the link. Never link to a directory — always to the file inside.

Compute the relative path mechanically: count the depth of the source file from `speclan/`, go up that many levels, then descend to the target. A quick sanity check before writing: the link path should never contain `speclan/` literally.

## Discovery strategy

For each entity processed:

1. **Glob existing entities.** `Glob speclan/goals/G-*.md`, `Glob speclan/features/**/F-*.md`, `Glob speclan/features/**/requirements/**/R-*.md`.
2. **Read their frontmatter titles and IDs.** Build a lightweight in-memory index: `{ id, title, path }` for each.
3. **Scan the source entity's body for domain nouns.** For each noun, check if any indexed entity's title shares semantic overlap.
4. **Add inline links** where matches are found. Use `Edit` with narrow replacements so the diff is tractable.

Prefer **high-confidence matches** over breadth. A missed link is cheaper than a wrong one — a wrong link suggests a relationship that doesn't exist and misleads readers.

## Goal contributions (features only)

In addition to inline links, each feature should be registered as a contributor to the goals it advances. This is a **bidirectional edit**:

1. **Feature side**: ensure the feature's frontmatter `goals:` list contains the goal ID.
   ```yaml
   goals:
     - G-001
     - G-042
   ```
2. **Goal side**: ensure the goal's frontmatter `contributors:` list contains the feature ID.
   ```yaml
   contributors:
     - F-1100
     - F-1200
   ```

Both edits must succeed or neither should be applied — use `Edit` for each, and if one fails, revert the other by a reverse `Edit`. The `speclan-format` skill has the authoritative field names; defer to it if they ever diverge from this document.

### How to decide a feature contributes to a goal

For each (feature, goal) pair:

- **Purpose alignment**: does the feature's "Overview" directly advance the goal's "Overview"?
- **Success criteria overlap**: does the feature enable any of the goal's "Success Indicators"?
- **Domain match**: does the feature operate in the goal's domain rather than adjacent to it?

Require at least two of three for a positive match. Features typically contribute to 0–3 goals; a feature linked to every goal is almost certainly overlinked.

### Skip for non-features

Goal contributions apply **only** to features. Skip this step for goals and requirements — they don't have a `goals:` field.

## Processing order

Process entities in this order so the discovery index is complete at each step:

1. **All features** — goal contributions + inline links to other features and requirements.
2. **All requirements** — inline links to related features. Requirements don't get goal contributions.
3. **All goals** — inline links to contributing features (the `contributors:` field is already populated by step 1 but the body prose may benefit from inline links too).

Each entity is processed **once per pipeline run**. Don't loop back — if cross-referencing surfaces a missed match, accept it and let the user fix it manually or run a later dedicated cross-reference pass.

## Enforcement validation

Before reporting the cross-referencing phase as successful, every entity file touched in this pipeline run must be validated against **both** rules.

### Check A — Forbidden sections (Rule 1)

For each entity file, `Grep` for these header patterns (case-insensitive): `^## Related`, `^## References`, `^## See Also`, `^## Links`, and any other trailing "link-list" heading.

If any forbidden section is found, it's a **pipeline bug**. Stop the phase, report the offending file and section, and either:

- Rewrite the file to weave each link into the prose (preferred), OR
- Surface to the user via `AskUserQuestion`: `Rewrite inline now`, `Skip this file (leave the violation)`, `Cancel the pipeline`.

### Check B — Bare IDs in prose, and ID-contaminated link labels (Rule 2)

For each entity file, scan the body (everything after the closing `---` of the YAML frontmatter) for **two** classes of violation:

**B.1 — Bare IDs outside any link wrapper**

1. Use `Grep` to find every occurrence of `\b(G-\d{3}|F-\d{4}|R-\d{4}|CR-\d{4})\b` in the body.
2. For each match, inspect the surrounding context to determine whether the ID is inside a markdown link wrapper:
   - **Inside the link target `(...path...)`** — OK (e.g. `[Shop Management](../F-4711-shop-management/F-4711-shop-management.md)`). IDs in paths are expected because filenames use the ID prefix.
   - **Inside the link visible text `[...]`** — see B.2 below; this is a *different* violation class.
   - **Outside any link wrapper** — **violation**. Record the file, line, and the bare ID.
3. For each B.1 violation, rewrite as a relative markdown link using the target entity's `title` field as the visible text and the path resolved from the discovery index built earlier in this phase. Fall back to `AskUserQuestion` only if the target entity cannot be located on disk.

**B.2 — ID prefixes inside link labels**

1. Use `Grep` with a multiline-aware pattern to find link labels that contain IDs: `\[[^\]]*(G-\d{3}|F-\d{4}|R-\d{4}|CR-\d{4})[^\]]*\]\(`.
2. For each match, compare the visible text to the target entity's `title` field (look up the target by parsing the link path, then reading the target file's frontmatter).
3. If the visible text is anything other than the exact title — e.g. `[F-4711 Shop Management]`, `[F-4711]`, `[Shop Management (v2)]`, `[F-4711 — Shop]` — it's a **violation**. Record the file, line, and the bad label.
4. For each B.2 violation, rewrite the visible text to be the target entity's exact title, leaving the path unchanged. `[F-4711 Shop Management](../F-4711-shop-management/F-4711-shop-management.md)` → `[Shop Management](../F-4711-shop-management/F-4711-shop-management.md)`.

Pure-regex detection is brittle for overlapping brackets and nested markdown. When in doubt, read the surrounding line and judge — a few false positives are cheaper than missing a real violation.

### Skipping violations

Skipping any violation (Check A or Check B) is allowed only with explicit user consent via `AskUserQuestion`. The default is to fix.

Both validation checks are the main reason the cross-referencing phase exists as a separate step from creation: creation may produce intermediate states — a draft body that mentions another entity by ID in passing, a templated section with a placeholder — that need this enforcement pass to normalize before the entity is considered complete.

## Report

After the cross-referencing phase completes, report to the summary:

- `N inline links added` — total new links across all entities
- `M goal contributions registered` — count of (feature, goal) pairs added
- `V forbidden sections detected and rewritten` — how many files needed Rule 1 enforcement
- `B1 bare-ID references rewritten to markdown links` — how many bare-ID-in-prose violations were fixed
- `B2 ID-contaminated link labels rewritten` — how many `[F-#### Title](...)` / `[F-####](...)` labels were shortened to `[Title](...)`
- `K failures` — any `Edit` operations that failed, listed with entity + reason

Cross-reference **failures** (link additions that errored out) should not stop the pipeline — a missed link is a minor defect that can be fixed in a follow-up pass. But **rule violations** (Check A and Check B) DO stop the phase and require resolution, because they indicate structural coherence problems that compound over time.
