# Plan File Format Reference

The plan file is a **pure data checklist** — an ordered hierarchy of features, requirements, and change requests with markdown links to their spec files. It contains NO operational prompts. The `implement-manual` skill carries the procedural knowledge for implementation.

Every plan file begins with:

```markdown
# Manual Implementation Plan
```

## Checkbox States

The `implement-manual` skill transitions checkboxes through these states:

| Checkbox | State | Meaning |
|----------|-------|---------|
| `[ ]` | Pending | Not yet started |
| `[~]` | In development | Implementation in progress |
| `[?]` | In review | Implementation finished, awaiting review |
| `[x]` | Done | Reviewed and accepted |

## Pre-Checking Logic

When the plan is created, items are included based on their spec status and relationship to approved items:

| Spec Status | Plan Checkbox | Included When |
|---|---|---|
| `approved` | `[ ]` | Always — ready for implementation |
| `in-development` | `[x]` | Only as ancestor of an approved item |
| `under-test` | `[x]` | Only as ancestor of an approved item |
| `released` | `[x]` | Only as ancestor of an approved item |

Non-approved items without approved descendants are **excluded** from the plan. This keeps the plan focused on actionable work.

## Structure — Three Levels

| Level | Indent | Entity | Checkbox |
|---|---|---|---|
| 1 | None | Feature | `- [ ] [F-XXXX] Title` |
| 2 | 2 spaces | Requirement | `  - [ ] [R-XXXX] Title` |
| 2 | 2 spaces | Change Request (on feature) | `  - [ ] [CR-XXXX] Title — CHANGE REQUEST: ...` |
| 3 | 4 spaces | Change Request (on requirement) | `    - [ ] [CR-XXXX] Title — CHANGE REQUEST: ...` |

Change requests that target a feature directly sit at level 2 (same as requirements). Change requests that target a requirement sit at level 3 (nested under the requirement).

## Element Format

### Feature (Level 1)

```markdown
- [ ] [F-XXXX] Feature Title
  - [F-XXXX](speclan/features/F-XXXX-feature-slug/F-XXXX-feature-slug.md)
```

### Requirement (Level 2)

```markdown
  - [ ] [R-XXXX] Requirement Title
    - [R-XXXX](speclan/features/F-XXXX-.../requirements/R-XXXX-req-slug/R-XXXX-req-slug.md)
```

### Change Request on Feature (Level 2)

```markdown
  - [ ] [CR-XXXX] CR Title — CHANGE REQUEST: find and alter existing implementation
    - [CR-XXXX](speclan/features/F-XXXX-.../change-requests/CR-XXXX-cr-slug.md)
```

### Change Request on Requirement (Level 3)

```markdown
    - [ ] [CR-XXXX] CR Title — CHANGE REQUEST: find and alter existing implementation
      - [CR-XXXX](speclan/features/F-XXXX-.../requirements/R-XXXX-.../change-requests/CR-XXXX-cr-slug.md)
```

## Formatting Rules

- **Feature checkbox**: Top-level, no indent: `- [ ] [F-XXXX] Title`
- **Feature link**: Indented 2 spaces: `  - [F-XXXX](path)`
- **Requirement checkbox**: Indented 2 spaces: `  - [ ] [R-XXXX] Title`
- **Requirement link**: Indented 4 spaces: `    - [R-XXXX](path)`
- **CR on feature checkbox**: Indented 2 spaces: `  - [ ] [CR-XXXX] Title — CHANGE REQUEST: ...`
- **CR on feature link**: Indented 4 spaces: `    - [CR-XXXX](path)`
- **CR on requirement checkbox**: Indented 4 spaces: `    - [ ] [CR-XXXX] Title — CHANGE REQUEST: ...`
- **CR on requirement link**: Indented 6 spaces: `      - [CR-XXXX](path)`
- **Blank lines**: NO blank lines between items. The list is compact.

## Paths

All paths are relative to the project root. Do NOT use `./` prefix.

## Change Request Annotation

Every change request checkbox line MUST include the inline annotation:

```
— CHANGE REQUEST: find and alter existing implementation
```

This signals to the implementing agent that the work modifies existing code rather than building from scratch.

## Concrete Example

This example shows the exact output format with all three levels and pre-checking:

````markdown
# Manual Implementation Plan

- [ ] [F-0297] SVG Dependency Graph Rendering
  - [F-0297](speclan/features/F-0297-svg-dependency-graph-rendering/F-0297-svg-dependency-graph-rendering.md)
  - [ ] [R-0266] Bottom-Up Layered Layout
    - [R-0266](speclan/features/F-0297-svg-dependency-graph-rendering/requirements/R-0266-bottom-up-layered-layout/R-0266-bottom-up-layered-layout.md)
  - [ ] [R-0340] Pill-Shaped Dependency Labels
    - [R-0340](speclan/features/F-0297-svg-dependency-graph-rendering/requirements/R-0340-pill-shaped-dependency-labels/R-0340-pill-shaped-dependency-labels.md)
  - [ ] [R-0754] Directional Arrow Connections
    - [R-0754](speclan/features/F-0297-svg-dependency-graph-rendering/requirements/R-0754-directional-arrow-connections/R-0754-directional-arrow-connections.md)
  - [ ] [R-1106] Dynamic Size Reduction by Depth
    - [R-1106](speclan/features/F-0297-svg-dependency-graph-rendering/requirements/R-1106-dynamic-size-reduction-by-depth/R-1106-dynamic-size-reduction-by-depth.md)
  - [ ] [R-1496] Hover Tooltips with HTML Details
    - [R-1496](speclan/features/F-0297-svg-dependency-graph-rendering/requirements/R-1496-hover-tooltips-with-html-details/R-1496-hover-tooltips-with-html-details.md)
  - [ ] [R-1635] Standalone TypeScript Package Delivery
    - [R-1635](speclan/features/F-0297-svg-dependency-graph-rendering/requirements/R-1635-standalone-typescript-package-delivery/R-1635-standalone-typescript-package-delivery.md)
- [x] [F-1200] Pet Health Tracking
  - [F-1200](speclan/features/F-1200-pet-health-tracking/F-1200-pet-health-tracking.md)
  - [x] [R-0500] Alert System
    - [R-0500](speclan/features/F-1200-pet-health-tracking/requirements/R-0500-alert-system/R-0500-alert-system.md)
    - [ ] [CR-0088] Adjust Alert Threshold — CHANGE REQUEST: find and alter existing implementation
      - [CR-0088](speclan/features/F-1200-pet-health-tracking/requirements/R-0500-alert-system/change-requests/CR-0088-adjust-alert-threshold.md)
  - [ ] [CR-0042] Fix Dashboard Rendering — CHANGE REQUEST: find and alter existing implementation
    - [CR-0042](speclan/features/F-1200-pet-health-tracking/change-requests/CR-0042-fix-dashboard-rendering.md)
````

In this example:
- **F-0297** is fully `approved` — all children are `[ ]` pending
- **F-1200** is `in-development` — included as `[x]` because it is an ancestor of CR-0088 and CR-0042
- **R-0500** is `in-development` — included as `[x]` because it is the parent of CR-0088
- **R-0400** (Health Dashboard, also `in-development`) is **excluded** — it has no approved descendants
- **CR-0088** targets requirement R-0500 (level 3)
- **CR-0042** targets feature F-1200 directly (level 2)
