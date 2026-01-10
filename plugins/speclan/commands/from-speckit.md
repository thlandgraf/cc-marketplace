---
name: from-speckit
description: Convert speckit specifications to SPECLAN format
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
argument-hint: "[speckit-directory]"
---

# SPECLAN From-Speckit Command

Convert speckit phase-based specifications to SPECLAN hierarchical format.

## Prerequisites

This command requires understanding of both formats:

**Speckit Format** (source):
- Located in `specs/` directory
- Numbered directories: `###-phase-name/`
- `spec.md` with bold markdown metadata
- User stories with priorities (P1-P4)
- Functional requirements (FR-###)
- Success criteria (SC-###)

**SPECLAN Format** (target):
- Located in `speclan/` directory
- Entity hierarchy: Goal → Feature → Requirement → Scenario → AC → Test
- YAML frontmatter with proper IDs (G-###, F-####, R-####, etc.)

## Instructions

### 1. Check Plugin Dependency

Verify speckit plugin is installed. If not:
```
Error: speckit plugin is not installed.

The /speclan:from-speckit command requires speckit for full functionality.
Install speckit plugin to enable this command.

Proceeding with manual conversion...
```

### 2. Locate Speckit Specs

Find speckit specifications:
- Default: `specs/` in project root
- Or use provided directory argument
- Look for numbered directories with `spec.md` files

### 3. Parse Speckit Format

For each `spec.md` file, extract:

**Metadata:**
- Feature Branch name
- Created date
- Status
- Input source

**Content:**
- User stories (with priorities)
- Functional requirements (FR-###)
- Success criteria (SC-###)
- Acceptance scenarios (Given/When/Then)
- Assumptions and constraints

### 4. Map to SPECLAN Entities

Convert speckit elements to SPECLAN:

| Speckit Element | SPECLAN Entity |
|-----------------|----------------|
| Feature Branch | Feature (F-####) |
| User Story | Feature description / User Story section |
| Functional Requirement (FR-###) | Requirement (R-####) |
| Acceptance Scenario | Scenario (S-####) |
| Success Criterion (SC-###) | AcceptanceCriterion (AC-####) |
| Priority (P1-P4) | Tags or status |

### 5. Generate SPECLAN Files

For each speckit spec:

1. Create Feature file:
   ```yaml
   ---
   id: F-XXX
   type: feature
   title: [from Feature Branch name]
   status: draft
   owner: [from metadata or default]
   created: [from speckit created date]
   updated: [current date]
   goals: []  # To be linked later
   ---
   ```

2. Create Requirement files for each FR:
   ```yaml
   ---
   id: R-XXXX
   type: requirement
   title: [from FR description]
   status: draft
   owner: [inherited]
   created: [current]
   updated: [current]
   feature: F-XXX
   scenarios: []
   ---
   ```

3. Create Scenario files for acceptance scenarios

### 6. Handle Phase Dependencies

Speckit phases build on each other (001 → 002 → 003...).

- Later phases may update earlier specs
- Create ChangeRequest entities for modifications
- Or update existing specs with new requirements

### 7. Preserve Traceability

Maintain links to source speckit files:
```markdown
## Source

Converted from speckit specification:
- **Source:** specs/001-phase1-core-extension/spec.md
- **Converted:** [date]
```

### 8. Output Summary

```
## Conversion Complete

Converted [X] speckit specifications to SPECLAN format.

### Created Entities
| Type | Count |
|------|-------|
| Features | X |
| Requirements | X |
| Scenarios | X |

### Files Created
- speclan/features/F-001-phase1-core-extension/F-001-phase1-core-extension.md
- speclan/features/F-001-.../requirements/R-0001-slug/R-0001-slug.md
- ...

### Next Steps
1. Review converted specifications
2. Link features to goals
3. Add missing acceptance criteria
4. Complete scenario coverage
```

## Incremental Conversion

If some specs already converted:
- Detect existing SPECLAN entities
- Skip already-converted speckit specs
- Only convert new or modified specs
- Update existing specs if speckit changed

## Error Handling

If speckit directory not found:
```
Error: No speckit specifications found.

Expected location: specs/
Expected format: ###-phase-name/spec.md

Verify speckit specs exist before running this command.
```
