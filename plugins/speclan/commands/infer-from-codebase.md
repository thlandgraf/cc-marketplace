---
name: speclan:infer-from-codebase
description: Analyze codebase to generate or update SPECLAN specifications
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - TodoWrite
argument-hint: "<path> [--new|--update]"
---

# SPECLAN Infer Command

Analyze codebase to generate new SPECLAN specifications or update existing ones.

## Instructions

### 1. Parse Arguments

**Required:** Path to file or directory to analyze (defaults to project root if not provided)

**Flags:**
- `--new` - Force NEW-SPEC mode (generate from scratch)
- `--update` - Force UPDATE-SPEC mode (sync with existing specs)
- (none) - Auto-detect based on speclan/ directory state

### 2. Detect Mode

If no flag provided, check the `speclan/` directory:

```bash
# Count existing features
FEATURE_COUNT=$(find speclan/features -maxdepth 1 -type d 2>/dev/null | wc -l)
```

**Mode Selection:**
- `speclan/` missing OR ≤2 features → **NEW-SPEC mode**
- `speclan/` exists with >2 features → **UPDATE-SPEC mode**

Report detected mode to user:
```
Detected mode: NEW-SPEC (speclan/ directory is sparse)
```
or
```
Detected mode: UPDATE-SPEC (found X existing features)
```

### 3. NEW-SPEC Mode

Use the `spec-generator` agent to create specifications from scratch.

**Process:**
1. Analyze codebase structure:
   - UI components (React/Vue/Angular)
   - API endpoints (REST/GraphQL)
   - Data models (schemas, entities)
   - Domain models (services, repositories)
   - Documentation (`*.md` files)

2. Identify up to 7 main features

3. For each main feature invoke `spec-generator` agent in parallel:
   - Create feature directory + file
   - Identify sub-features
   - Create requirements
   - Recurse for sub-features (max 3 levels)

4. All specs created with `status: draft`

**Invoke agent:**
```
Use the spec-generator agent to analyze [path] and generate SPECLAN specifications.
```

### 4. UPDATE-SPEC Mode

Use the `spec-updater` agent to synchronize specifications with codebase.

**Process:**
1. Compare specs → codebase:
   - Find specs without matching code (deprecation candidates)
   - Find specs with outdated descriptions

2. Compare codebase → specs:
   - Find code without matching specs (new feature candidates)
   - Find code changes requiring spec updates

3. Create todos for all identified changes

4. Execute todos respecting status rules:
   - `draft`/`review`/`approved` → Edit directly, reset to `draft`
   - `in-development`/`under-test`/`released` → Create Change Request
   - Never delete specs - only deprecate

**Invoke agent:**
```
Use the spec-updater agent to synchronize [path] with existing SPECLAN specifications.
```

### 5. Post-Processing (Both Modes)

After agent completes, perform final steps:

#### 5.1 Interlink Specs

Add relative markdown links between related specs:

```markdown
## Related
- [Parent Feature](../F-###-parent/F-###-parent.md)
- [Related Requirement](./requirements/R-####-related.md)
```

#### 5.2 Assign Features to Goals

For each new feature without goal assignments:
1. Read existing goals in `speclan/goals/`
2. Determine which goals the feature contributes to
3. Update feature frontmatter:
   ```yaml
   goals:
     - G-###
     - G-###
   ```
4. Update goal's contributors list:
   ```yaml
   contributors:
     - F-###
   ```

### 6. Report Summary

**For NEW-SPEC mode:**
```
## SPECLAN Generation Complete

### Created Specifications
- X features (Y with sub-features)
- Z requirements

### File Structure
speclan/
├── features/
│   ├── F-###-feature-one/
│   │   ├── F-###-feature-one.md
│   │   └── requirements/
│   │       └── R-####-req.md
│   └── ...

### Next Steps
- Review generated specs for accuracy
- Create goals and assign features
- Add detailed scenarios and acceptance criteria
- Run /speclan:status to verify structure
```

**For UPDATE-SPEC mode:**
```
## SPECLAN Update Complete

### Changes Made
| Type | Count | Details |
|------|-------|---------|
| Updated | X | Specs with outdated content |
| Created | Y | New specs for unspecified code |
| Deprecated | Z | Specs for removed functionality |
| Change Requests | W | For locked specs |

### Pending Change Requests
- CR-#### for F-### (reason)
- CR-#### for R-#### (reason)

### Next Steps
- Review and approve change requests
- Verify deprecated specs
- Run /speclan:status to verify structure
```

## Tips

- Use `--new` to regenerate specs even if some exist
- Use `--update` to force sync mode on sparse directories
- Analyze test files to understand expected behaviors
- Check API documentation for endpoint specifications
- Review README files for feature descriptions

## Examples

```bash
# Auto-detect mode for entire project
/speclan:infer-from-codebase .

# Force new spec generation
/speclan:infer src/ --new

# Force update mode
/speclan:infer-from-codebase . --update

# Analyze specific directory
/speclan:infer-from-codebase src/features/auth/
```
