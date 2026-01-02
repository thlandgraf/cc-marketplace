---
name: to-speckit
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
| F-001 | draft |
| F-002 | review |
| ... | ... |
```

### 3. Collect Feature Content

For each approved feature, gather:
- Feature description and user stories
- All linked requirements
- Scenarios and acceptance criteria
- Business rules

### 4. Generate Concatenated Specification

Create a combined specification document:

```markdown
# Specification Package for Speckit

Generated: [timestamp]
Source: SPECLAN specifications

---

## Feature: [F-XXX] [Title]

[Full feature content]

### Requirements

#### [R-XXXX] [Title]

[Requirement content with scenarios]

---

## Feature: [F-YYY] [Title]

[Next feature...]
```

### 5. Invoke Speckit

**Note:** This integration is TBD pending speckit API clarification.

Current approach:
1. Write concatenated spec to temporary file
2. Invoke `/speckit.specify` with the file
3. Or display spec for manual processing

```
Prepared specification package with [X] approved features.

## Included Features
- F-001: [Title]
- F-002: [Title]

## Specification Package
[Path to generated file]

To process with speckit:
  /speckit.specify [path-to-spec-package]
```

### 6. Handle Partial Selection

If user provides specific feature IDs:
- Only include specified features
- Verify each is approved (warn if not)
- Allow override with confirmation

```
/speclan:to-speckit F-001 F-003

Including specified features:
- F-001: approved ✓
- F-003: draft ⚠ (not approved)

Proceed with F-003 despite draft status? [y/N]
```

## Output Format

### Success
```
## Speckit Injection Ready

### Approved Features Included
| ID | Title | Requirements |
|----|-------|--------------|
| F-001 | Core Extension | 5 |
| F-002 | Live Updates | 3 |

### Generated Package
Location: /tmp/speclan-to-speckit-[timestamp].md
Size: [X] KB
Total Requirements: [Y]
Total Scenarios: [Z]

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

**TBD:** The exact integration with speckit is pending clarification:
- How `/speckit.specify` accepts input
- Required format for specification injection
- Expected output from speckit processing

For now, this command prepares specifications in a format suitable for manual speckit processing.
