---
name: speclan:to-speckit
description: Inject approved SPECLAN Features into speckit for specification processing
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Skill
argument-hint: "[feature-ids...]"
---

# SPECLAN To-Speckit Command

Inject approved SPECLAN Features into speckit commands for specification processing.

## Prerequisites

This command requires:
- **speckit plugin** - Must be installed for `/speckit.specify` command

## Instructions

### 1. Check Plugin Dependency

Verify speckit plugin is installed:

```bash
# Check if speckit commands are available
```

If not installed:
```
Error: speckit plugin is not installed.

The /speclan:to-speckit command requires speckit to be installed.

Install speckit plugin:
  [installation instructions]

This command injects SPECLAN specifications into speckit's /speckit.specify command.
```

### 2. Find Approved Features

Query SPECLAN directory for features with `status: approved`:

```bash
# Search for approved features in YAML frontmatter
grep -r "^status: approved" speclan/features/ -l
```

If no approved features found:
```
No approved features found.

To approve a feature for specification:
1. Edit the feature file
2. Change status from 'draft' to 'approved'
3. Run /speclan:to-speckit again

Current feature statuses:
| Feature | Status |
|---------|--------|
| F-1001 | draft |
| F-1002 | review |
| ... | ... |
```

### 3. Collect Feature Content

For each approved feature, gather:
- Feature description and user stories
- All linked requirements
- Business rules

### 4. Generate Concatenated Specification

Create a combined specification document:

```markdown
# Specification Package for Speckit

Generated: [timestamp]
Source: SPECLAN specifications

---

## Feature: [F-XXXX] [Title]

[Full feature content]

### Requirements

#### [R-XXXX] [Title]

[Requirement content]

---

## Feature: [F-YYYY] [Title]

[Next feature...]
```

### 5. Write Specification Package

Write the concatenated specification to a temporary file:

```bash
# Write to timestamped file
PACKAGE_PATH="/tmp/speclan-to-speckit-$(date +%Y%m%d-%H%M%S).md"
```

Display the result:
```
Prepared specification package with [X] approved features.

## Included Features
- F-1001: [Title]
- F-1002: [Title]

## Specification Package
Written to: [PACKAGE_PATH]

To process with speckit:
  /speckit.specify [PACKAGE_PATH]
```

### 6. Handle Partial Selection

If user provides specific feature IDs:
- Only include specified features
- Verify each is approved (warn if not)
- Allow override with confirmation

```
/speclan:to-speckit F-1001 F-1003

Including specified features:
- F-1001: approved ✓
- F-1003: draft ⚠ (not approved)

Proceed with F-1003 despite draft status? [y/N]
```

## Output Format

### Success
```
## Speckit Injection Ready

### Approved Features Included
| ID | Title | Requirements |
|----|-------|--------------|
| F-1001 | Core Extension | 5 |
| F-1002 | Live Updates | 3 |

### Generated Package
Location: /tmp/speclan-to-speckit-[timestamp].md
Size: [X] KB
Total Requirements: [Y]

### Next Step
Run: /speckit.specify /tmp/speclan-to-speckit-[timestamp].md
```

### No Features Ready
```
No features ready for speckit processing.

Feature Status Summary:
| Status | Count |
|--------|-------|
| draft | 5 |
| review | 2 |
| approved | 0 |

Approve features by updating their status to 'approved' in YAML frontmatter.
```

## Integration Notes

This command generates a specification package file. The user invokes `/speckit.specify` separately with the generated file path to process the specifications through speckit.
