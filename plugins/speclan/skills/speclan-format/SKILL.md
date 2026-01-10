---
name: SPECLAN Format
description: This skill should be used when the user works with SPECLAN specification files, asks to "create a spec", "write a requirement", "add a feature", "update specification", mentions "speclan directory", "YAML frontmatter for specs", "spec hierarchy", or needs guidance on SPECLAN file format, entity types (Goal, Feature, Requirement, Scenario, AcceptanceCriterion, Test), ID conventions (G-###, F-####, R-####), or specification writing best practices.
version: 0.1.0
---

# SPECLAN Format Knowledge

SPECLAN (Specification as a Living Language) manages project specifications as interlinked markdown files with YAML frontmatter in a hierarchical directory structure.

## Directory Structure

SPECLAN specifications live in `${PROJECT}/speclan/`:

```
speclan/
├── goals/                    # G-### Business goals (flat)
├── features/                 # F-#### Feature hierarchy
│   └── F-1049-pet-management/
│       ├── F-1049-pet-management.md      # Feature file matches directory
│       ├── requirements/                  # Requirements as directories
│       │   ├── R-2046-health-check/
│       │   │   ├── R-2046-health-check.md
│       │   │   ├── change-requests/       # CRs for this requirement
│       │   │   └── scenarios/             # Scenarios for this requirement
│       │   └── R-3272-status-tracking/
│       │       └── R-3272-status-tracking.md
│       ├── change-requests/               # CRs for this feature
│       │   └── CR-0731-add-feature.md
│       └── F-1200-pet-health/             # Child feature (nested)
│           └── F-1200-pet-health.md
├── templates/                # Templates (UUID in frontmatter, slug filename)
│   ├── features/
│   ├── requirements/
│   ├── scenarios/
│   ├── acceptance-criteria/
│   └── tests/
└── change-requests/          # Root-level change requests
```

**Key structural rules:**
- **Features and Requirements use directory-based storage** - directory name must match contained markdown filename
- Requirements are nested inside their parent feature's `requirements/` directory as subdirectories
- Child features are subdirectories of parent features
- Change requests live in `change-requests/` adjacent to the entity they modify (features OR requirements)

## Entity Hierarchy

```
Goal (G-###)
  └── Feature (F-####)  [forms hierarchical tree via directories]
        └── Requirement (R-####)
              └── Scenario (S-####)
                    └── AcceptanceCriterion (AC-####)
                          └── Test (T-####)
```

Additional entities:
- **Template** (UUID v4) - Reusable spec templates
- **ChangeRequest** (CR-####) - Modifications to released entities

## ID Format Conventions

| Entity | Format | Example | Storage Location |
|--------|--------|---------|------------------|
| Goal | `G-###` | G-292 | `goals/` (flat files) |
| Feature | `F-####` | F-1049 | `features/` (hierarchical directories) |
| Requirement | `R-####` | R-2046 | `features/{feature}/requirements/` (directories) |
| Scenario | `S-####` | S-0001 | `requirements/{requirement}/scenarios/` (directories) |
| AcceptanceCriterion | `AC-####` | AC-0001 | *Not yet implemented* |
| Test | `T-####` | T-0001 | *Not yet implemented* |
| ChangeRequest | `CR-####` | CR-0731 | `{entity}/change-requests/` (flat files) |
| Template | UUID v4 | bf5cb38b-... | `templates/{type}/` (flat files) |

**ID Generation:** All numeric IDs are **randomly generated** with collision detection (not sequential). Always check existing IDs before creating new ones.

**ID-Based Ordering:** IDs determine artifact priority/order numerically:
- **Lower IDs = Higher priority** (processed/displayed first)
- **Higher IDs = Lower priority** (processed/displayed later)
- Example: F-1049 has higher priority than F-2847
- This ordering applies within the same entity type (features sorted among features, requirements among requirements, etc.)

## File Naming Convention

Files follow pattern: `<ID>-kebab-case-title.md`

Examples:
- `G-292-comprehensive-pet-retail-operations.md` (flat file in goals/)
- `F-1049-pet-management/F-1049-pet-management.md` (directory-based)
- `R-2046-health-check/R-2046-health-check.md` (directory-based)

**Directory-based entities** (Features, Requirements, Scenarios):
- Directory name **must match** the contained markdown filename
- Example: `F-1049-pet-management/F-1049-pet-management.md`
- Example: `R-2046-health-check/R-2046-health-check.md`

Template filenames use **kebab-case slugs** (UUID stored in frontmatter only):
- `basic-feature.md`
- `functional-requirement.md`

## Markdown File Format

Every spec file has YAML frontmatter followed by markdown content:

```markdown
---
id: F-1049
type: feature
title: Pet Management
status: draft
owner: Store Manager
created: "2025-12-29T09:53:49.355Z"
updated: "2025-12-29T10:31:04.445Z"
goals:
  - G-292
  - G-087
---

# Pet Management

## Overview
Brief description of what this feature does and why it exists.

## User Story
As a **Store Manager**, I want **comprehensive tools** so that **I can track pets**.

## Scope
- Pet Tracking
- Status Management
- Health Records
```

## Common YAML Frontmatter Fields

**All entities share:**
```yaml
id: <entity-id>           # Required
type: <entity-type>       # Required: goal|feature|requirement|scenario|acceptanceCriterion|test|template|changeRequest
title: <string>           # Required
status: <status>          # Required: draft|review|approved|in-development|under-test|released|deprecated
owner: <string>           # Required
created: <ISO-8601>       # Required
updated: <ISO-8601>       # Required
tags: [<string>, ...]     # Optional
```

**Entity-specific fields** - See `references/entity-fields.md` for complete reference.

## Status Lifecycle

Entities follow a 7-stage lifecycle:

```
draft → review → approved → in-development → under-test → released → deprecated
```

| Status | Editable | Description |
|--------|----------|-------------|
| `draft` | Yes | Initial creation, work in progress |
| `review` | Yes | Ready for review |
| `approved` | Yes | Approved, ready for development |
| `in-development` | **No** | Currently being implemented |
| `under-test` | **No** | Implementation complete, testing |
| `released` | **No** | Deployed to production |
| `deprecated` | **No** | No longer active (terminal state) |

**Read-only statuses:** Entities in `in-development`, `under-test`, `released`, or `deprecated` are locked. Direct edits are not allowed - changes require a **Change Request** (`CR-####`).

## Linking Between Specs

### YAML Frontmatter References

```yaml
# Goal references features
contributors:
  - F-1049
  - F-2247

# Feature references goals
goals:
  - G-292
  - G-087

# Requirement references parent feature
feature: F-1009

# Requirement references scenarios
scenarios:
  - S-0001
  - S-0002
```

### Markdown Cross-References

Use relative paths in markdown content:

```markdown
## Related
### Goals
- [Animal Welfare Compliance](../goals/G-087-animal-welfare-compliance.md)

### Features
- [Pet Status Lifecycle](../F-1807-pet-status-lifecycle/F-1807-pet-status-lifecycle.md)
```

## Working with SPECLAN Files

### Detecting SPECLAN Directory

To find the speclan directory in a project:

1. Check common locations: `speclan/`, `specs/speclan/`
2. Look for characteristic subdirectories: `goals/`, `features/`, `requirements/`
3. Verify markdown files with SPECLAN YAML frontmatter

### Reading Specifications

When reading a spec file:
1. Parse YAML frontmatter for metadata
2. Extract entity relationships from frontmatter fields
3. Parse markdown content for documentation

### Creating New Specifications

To create a new spec:

1. **Check for user templates FIRST:**
   ```
   speclan/templates/<entity-type>/
   ```
   - `speclan/templates/features/` for feature templates
   - `speclan/templates/requirements/` for requirement templates
   - `speclan/templates/scenarios/` for scenario templates

   Read available templates and choose the best fit. Templates contain the user's preferred structure.

2. **Generate a unique ID:**
   - IDs are **randomly generated** (not sequential)
   - Goals: 3-digit (e.g., G-249)
   - Features/Requirements/Scenarios/etc.: 4-digit (e.g., F-1049, R-2046)
   - **Always check for collisions** before using:
     ```bash
     # Check existing Feature IDs
     find speclan/features -type d -name 'F-*' | grep -oE 'F-[0-9]+' | sort -u
     # Check existing Requirement IDs
     find speclan/features -type d -name 'R-*' | grep -oE 'R-[0-9]+' | sort -u
     ```

3. **Create file in correct location:**

   **For Goals:** `speclan/goals/G-###-slug.md` (flat file)

   **For Features:** Create directory AND file with matching name:
   ```
   speclan/features/F-####-slug/F-####-slug.md
   ```

   **For Requirements:** Create directory inside parent feature's `requirements/`:
   ```
   speclan/features/F-####-parent/requirements/R-####-slug/R-####-slug.md
   ```

   **For Child Features:** Nest inside parent feature directory:
   ```
   speclan/features/F-####-parent/F-####-child/F-####-child.md
   ```

   **For Scenarios:** Nest inside parent requirement directory:
   ```
   speclan/features/.../requirements/R-####-parent/scenarios/S-####-slug/S-####-slug.md
   ```

4. **Write frontmatter and content:**
   - Use template if found, otherwise use default structure
   - Set all required fields (id, type, title, status, owner, created, updated)
   - For requirements, set `feature: F-####` to link to parent

5. **Update related entities** to establish bidirectional links

### Updating Specifications

When modifying a spec:
1. Update the `updated` timestamp
2. Maintain bidirectional links (if adding feature to goal, add goal to feature)
3. Follow status transition rules

## Writing Guidelines

For guidance on writing effective specifications, consult `references/writing-guide.md`.

Key principles:
- Write user-focused, implementation-agnostic specifications
- Include clear acceptance criteria
- Maintain traceability between entities
- Use consistent terminology

## Additional Resources

### Reference Files

- **`references/entity-fields.md`** - Complete YAML field reference for all entity types
- **`references/writing-guide.md`** - Best practices for writing specifications

### Utility Scripts

- **`scripts/detect-speclan.sh`** - Detect speclan directory in a project
