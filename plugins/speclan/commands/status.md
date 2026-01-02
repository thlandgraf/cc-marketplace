---
name: status
description: Check SPECLAN project setup, installed plugins, and specification statistics
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
argument-hint: "[path]"
---

# SPECLAN Status Command

Display comprehensive status information about the SPECLAN project.

## Instructions

When invoked, perform these checks and display results in table format:

### 1. Detect SPECLAN Directory

Search for speclan directory starting from provided path or current working directory:
- Check common locations: `speclan/`, `specs/speclan/`, `.speclan/`
- Verify characteristic subdirectories: `goals/`, `features/`, `requirements/`

If not found, display error with setup instructions.

### 2. Check Plugin Dependencies

Check if optional plugins are installed:
- **speckit** - Required for `/speclan:from-speckit` and `/speclan:to-speckit`
- **feature-dev** - Required for `/speclan:implement`

Display installation status for each.

### 3. Count Specifications by Type

Count spec files in each category:

| Entity | Directory | Pattern |
|--------|-----------|---------|
| Goals | `goals/` | `G-*.md` |
| Features | `features/` | `F-*.md` (recursive) |
| Requirements | `requirements/` or within features | `R-*.md` |
| Scenarios | within requirements | `S-*.md` |
| Acceptance Criteria | within scenarios | `AC-*.md` |
| Tests | within criteria | `T-*.md` |
| Templates | `templates/` | `*.md` |

### 4. Analyze Status Distribution

Parse YAML frontmatter to count specs by status:
- draft
- review
- approved
- in-development
- under-test
- released
- deprecated

### 5. Check Coverage

Calculate coverage metrics:
- Features with at least one requirement
- Requirements with at least one scenario
- Approved features ready for implementation

### 6. Display Results

Present as formatted tables:

```
## SPECLAN Project Status

**Directory:** /path/to/speclan

### Specification Counts
| Entity | Count |
|--------|-------|
| Goals | X |
| Features | X |
| ... | ... |

### Status Distribution
| Status | Count |
|--------|-------|
| approved | X |
| draft | X |
| ... | ... |

### Plugin Dependencies
| Plugin | Status | Required For |
|--------|--------|--------------|
| speckit | Installed/Missing | from-speckit, to-speckit |
| feature-dev | Installed/Missing | implement |

### Coverage
| Metric | Value |
|--------|-------|
| Features with requirements | X% |
| Requirements with scenarios | X% |
| Approved features | X |
```

## Error Handling

If SPECLAN directory not found:
```
Error: No SPECLAN directory found in this project.

To set up SPECLAN, create:
  speclan/
  ├── goals/
  ├── features/
  └── requirements/
```

If plugin missing and user tries dependent command, show:
```
Error: [plugin] plugin is not installed.

Install with: [installation instructions]
```
