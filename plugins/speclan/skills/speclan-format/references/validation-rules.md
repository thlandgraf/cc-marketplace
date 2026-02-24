# SPECLAN Validation Rules

When creating or updating SPECLAN entities, enforce these validation rules to ensure structure compliance.

## Required YAML Frontmatter Fields

All entities MUST have these fields present and non-empty:

| Field | Validation |
|-------|------------|
| `id` | Must match entity-specific ID format (see below) |
| `type` | Must be one of: `goal`, `feature`, `requirement`, `template`, `changeRequest` |
| `title` | Non-empty string |
| `status` | Must be valid status value for entity type |
| `owner` | Non-empty string (role, person, or team) |
| `created` | Valid ISO-8601 timestamp |
| `updated` | Valid ISO-8601 timestamp, must be >= `created` |

## ID Format Validation

Each entity type has a strict ID format:

| Entity | Regex Pattern | Valid Examples | Invalid Examples |
|--------|---------------|----------------|------------------|
| Goal | `^G-\d{3}$` | G-142, G-999 | G-42, G-1234, G-ABC |
| Feature | `^F-\d{4}$` | F-1049, F-9999 | F-049, F-12345, f-1234 |
| Requirement | `^R-\d{4}$` | R-2046, R-1000 | R-046, R-99999 |
| ChangeRequest | `^CR-\d{4}$` | CR-0731, CR-9999 | CR-01, CR-12345 |
| Template | UUID v4 | `bf5cb38b-7417-...` | Any non-UUID |

**Validation regex (JavaScript):**
```javascript
const ID_PATTERNS = {
  goal: /^G-\d{3}$/,
  feature: /^F-\d{4}$/,
  requirement: /^R-\d{4}$/,
  changeRequest: /^CR-\d{4}$/,
  template: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
};
```

## Directory and File Naming Enforcement

**Directory-based entities** (Feature, Requirement):

1. Directory name MUST match the markdown filename inside
2. Format: `<ID>-<kebab-case-title>/`
3. Contained file: `<ID>-<kebab-case-title>.md`

**Validation rules:**
```
# Valid
F-1049-pet-management/F-1049-pet-management.md    ✓
R-2046-health-check/R-2046-health-check.md        ✓

# Invalid
F-1049-pet-management/F-1049.md                   ✗ (filename mismatch)
F-1049/F-1049-pet-management.md                   ✗ (directory name incomplete)
f-1049-pet-management/F-1049-pet-management.md    ✗ (case mismatch)
```

**Flat-file entities** (Goal, ChangeRequest):

1. File format: `<ID>-<kebab-case-title>.md`
2. Placed directly in parent directory (no subdirectory)

## Parent-Child Relationship Validation

Entities must correctly reference their parents:

| Entity | Required Parent Field | Parent Type | Validation |
|--------|----------------------|-------------|------------|
| Feature | `goals` (array) | Goal | Each ID must exist as `G-###` in `speclan/goals/` |
| Requirement | `feature` (string) | Feature | Must be valid `F-####` that exists |
| ChangeRequest | `parentId` + `parentType` | Feature/Requirement | Parent must exist and parentType must match |

**Directory placement validation:**
- Requirements MUST be in `features/<parent-feature>/requirements/`
- Child features MUST be in `features/<parent-feature>/`
- ChangeRequests MUST be in `<parent-entity>/change-requests/`

## Status Lifecycle Rules

### Valid Status Values

**Standard entities** (Goal, Feature, Requirement):
```
draft | review | approved | in-development | under-test | released | deprecated
```

**ChangeRequest entities:**
```
pending | draft | review | approved | in-development | under-test | merged | closed
```

### Editability Rules

| Status | Direct Edit Allowed | Change Request Required |
|--------|--------------------|-----------------------|
| `draft` | Yes | No |
| `review` | Yes | No |
| `approved` | Yes | No |
| `in-development` | **No** | **Yes** |
| `under-test` | **No** | **Yes** |
| `released` | **No** | **Yes** |
| `deprecated` | **No** | **Never (frozen)** |

**CRITICAL:** Before modifying any entity, check its status:

```bash
# Extract status from frontmatter
status=$(grep "^status:" "$file" | head -1 | cut -d: -f2 | tr -d ' ')

# Check if read-only
case "$status" in
  in-development|under-test|released|deprecated)
    echo "Entity is read-only. Change Request required."
    ;;
  *)
    echo "Entity is editable."
    ;;
esac
```

### When Change Requests Are Required

A ChangeRequest (`CR-####`) MUST be created when:

1. **Entity is in read-only status** (`in-development`, `under-test`, `released`, `deprecated`)
2. **Proposing breaking changes** to any entity regardless of status
3. **Deprecating an entity** (status change to `deprecated`)
4. **Requesting feature removal** or significant scope reduction

**ChangeRequest workflow:**
```
1. Create CR in <entity>/change-requests/
2. CR status: pending → draft → review → approved → in-development → merged
3. When merged, apply changes to parent entity
4. Update parent entity's `updated` timestamp
```

## Status Transition Rules

Valid status transitions (forward progression):

```
draft → review → approved → in-development → under-test → released → deprecated
```

**Special transitions:**
- `review → draft` (rejection/revision)
- `approved → draft` (re-planning)
- Any status → `deprecated` (via Change Request if read-only)

**Invalid transitions:**
- `released → in-development` (regression - use Change Request instead)
- `deprecated → any` (terminal state)

## Entity-Specific Field Validation

### Goal (`G-###`)

| Field | Required | Validation |
|-------|----------|------------|
| `contributors` | No | Array of valid `F-####` IDs |

### Feature (`F-####`)

| Field | Required | Validation |
|-------|----------|------------|
| `goals` | Yes | Non-empty array of valid `G-###` IDs |
| `requirements` | No | Array of valid `R-####` IDs |
| `bundlePath` | No | Valid relative path string |

### Requirement (`R-####`)

| Field | Required | Validation |
|-------|----------|------------|
| `feature` | Yes | Valid `F-####` ID that exists |

### ChangeRequest (`CR-####`)

| Field | Required | Validation |
|-------|----------|------------|
| `parentId` | Yes | Valid entity ID (F-####, R-####, etc.) |
| `parentType` | Yes | `feature`, `requirement` |
| `changeType` | Yes | `enhancement`, `bugfix`, `breaking`, `deprecation`, `documentation` |
| `description` | Yes | Non-empty string |
| `changes` | Yes | Non-empty string (detailed narrative) |

## Validation Checklist

Before creating/updating any SPECLAN entity, verify:

- [ ] ID format matches entity type regex
- [ ] All required fields present and non-empty
- [ ] `type` field matches expected entity type
- [ ] `status` is valid for entity type
- [ ] Parent references (if any) point to existing entities
- [ ] File/directory naming matches convention
- [ ] File placed in correct directory location
- [ ] If entity is read-only, Change Request exists
- [ ] `updated` timestamp is current ISO-8601
- [ ] Bidirectional links maintained (e.g., feature lists requirement, requirement references feature)
