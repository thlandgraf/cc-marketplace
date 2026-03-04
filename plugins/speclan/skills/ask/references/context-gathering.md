# Context Gathering Procedure

When answering questions about any SPECLAN entity, build a complete contextual picture by following these exploration steps. The goal is to never answer with just a single file — always situate the entity in its hierarchy, relationships, and lifecycle.

## Step 1: Read the Entity

Read the full markdown file. Extract from frontmatter:
- `id`, `type`, `title`, `status`, `owner`, `created`, `updated`
- `goals` array (features), `feature` field (requirements), `contributors` array (goals)
- `parentId` / `parentType` (change requests)
- `tags` (if present — can link to other entities or concepts)

## Step 2: Explore Upward (Ancestors)

### For a Requirement (R-####)
1. The requirement lives under `features/F-####-slug/.../requirements/R-####-slug/R-####-slug.md`
2. Walk up the directory path — each `F-####-slug/` directory IS a parent feature
3. Read each ancestor feature file to understand the chain:
   - Immediate parent feature (the `F-####-slug/` that contains `requirements/`)
   - Grandparent features (any `F-####-slug/` directories above)
   - Top-level feature (the first `F-####-slug/` under `features/`)
4. Read the `goals` array from the top-level feature to find contributing goals
5. Read those goal files for strategic context

### For a Feature (F-####)
1. Check if nested: `features/F-####-parent/F-####-child/`
2. Walk up to find parent features
3. Read top-level feature's `goals` array, then read goal files

### For a Change Request (CR-####)
1. Read `parentId` and `parentType` from frontmatter
2. Read the parent entity (feature or requirement)
3. Then follow the parent's upward chain as above

### For a Goal (G-###)
1. Goals are top of hierarchy — no upward exploration needed
2. Read the `contributors` array to understand which features serve this goal

## Step 3: Explore Downward (Children)

### For a Goal (G-###)
1. Read `contributors` array for feature IDs
2. Use query script with `--parent G-###` to find all contributing features
3. For each top-level contributing feature, list its child features and requirements

### For a Feature (F-####)
1. List subdirectories of the feature's directory:
   - `F-####-slug/` subdirectories = child features
   - `requirements/R-####-slug/` = child requirements
   - `change-requests/CR-####-slug.md` = change requests on this feature
2. Read each child's frontmatter for title and status
3. For a quick count, use query script: `--type all --parent F-####`

### For a Requirement (R-####)
1. Requirements are leaf entities — no child features or requirements
2. Check for change requests: `R-####-slug/change-requests/CR-####-slug.md`

## Step 4: Explore Sideways (Siblings)

### For a Requirement
1. Go to the parent feature's `requirements/` directory
2. List all `R-####-slug/` directories at the same level
3. Read each sibling's title and status for context

### For a Feature (nested)
1. Go to the parent feature's directory
2. List all `F-####-slug/` subdirectories at the same level
3. Read each sibling's title and status

### For a Feature (top-level)
1. If the feature has `goals`, find other features contributing to the same goals
2. These are strategic siblings — they share the same business objective

## Step 5: Check Change Requests

For any entity, check for active change requests:

1. Look for `change-requests/` directory inside the entity's directory
2. Read each CR file's frontmatter: `status`, `changeType`, `description`
3. Filter out `_archived/` CRs
4. Highlight CRs with `status: pending` or `status: approved` — these affect the entity's future

Active CR statuses that matter:
- `pending` / `draft` / `review` — proposed changes, not yet actionable
- `approved` — approved change, should be implemented
- `in-development` / `under-test` — change in progress

## Step 6: Assess Status Context

Map the entity's status to its implications:

| Status | Editable? | Implications |
|--------|-----------|-------------|
| `draft` | Yes | Work in progress, not ready for review |
| `review` | Yes | Under review, may be sent back to draft |
| `approved` | Yes | Ready for implementation, can still be edited |
| `in-development` | Locked (CR required) | Being implemented, changes need a CR |
| `under-test` | Locked (CR required) | Implementation done, testing in progress |
| `released` | Locked (CR required) | Shipped, production use |
| `deprecated` | Frozen | End of life, no changes possible |

Cross-reference with children:
- If parent is `released` but has `approved` children → there's planned work remaining
- If all children are `released` but parent is `in-development` → parent status may be stale
- If entity has `approved` CRs → changes are planned

## Step 7: Check for Mission/Vision Context

If the question relates to strategic alignment or "why does this exist":
1. Check for `mission.md` in the speclan root
2. Read the mission to connect the entity to the project's purpose
3. Show how Goal → Feature → Requirement traces back to the mission

## Depth Guidelines

Not every question requires full depth. Calibrate based on the question:

| Question Type | Depth |
|---------------|-------|
| "What is R-0311?" | Entity + parent feature + goal + status + siblings |
| "Tell me about F-0089" | Entity + goals + children summary + active CRs |
| "What contributes to G-593?" | Goal + all contributor features + their statuses |
| "What's approved?" | Query all approved, group by parent, show counts |
| "Children of F-0089" | Direct children with status, one level deep |
| "Status of the tree views feature" | Feature + all descendants' statuses as tree |
| "What's blocking F-0792?" | Feature + unapproved/in-dev children + active CRs |

## Output Format: Entity Tree Visualization

When showing hierarchical relationships, use indented tree format with status badges:

```
G-593 Deliver Intuitive VS Code Specification Management [draft]
  F-0089 VS Code Extension [released]
    F-0792 Tree Views [released]
      F-2760 Goals Tree [released]
      F-2844 Features Tree [released]
      R-xxxx Some Requirement [approved]
    F-1380 View Panels [in-dev]
      ...
```

This gives the user an instant visual map of where things stand.

## Output Format: Single Entity Context Card

For focused questions about a single entity:

```
## R-0311 Lateral March Edge Reversal [approved]

**Type:** Requirement | **Owner:** tl@digital-dividend.de | **Updated:** 2026-02-19

**Hierarchy:**
  G-869 Deliver AI-Powered Specification Authoring
    → F-0471 Core Gameplay
      → F-0492 Alien Grid Movement
        → **R-0311 Lateral March Edge Reversal** ← you are here

**Description:** [concise summary of spec content]

**Siblings** (other requirements under F-0492):
- R-0312 Descent After Reversal [in-development]
- R-0315 Speed Increase Per Wave [approved]

**Change Requests:** None active

**Status Notes:** Approved and ready for implementation. Parent feature F-0492 is in-development.
```
