---
name: speclan:infer-from-codebase-v2
description: Analyze codebase to generate SPECLAN specifications using spec-map approach
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Bash(*/generate-id.sh *)
  - Glob
  - Grep
  - Task
  - TodoWrite
argument-hint: "<path> [--new|--update]"
---

# SPECLAN Infer Command V2

Analyze codebase to generate or update SPECLAN specifications using a persistent spec-map for progress tracking.

## Key Improvements Over V1

- **Persistent progress:** `spec-map.md` survives context loss - resume at any row
- **Clear phases:** Mapping → Generation → Linking
- **Focused agents:** Each agent has single responsibility
- **Visible plan:** User sees full feature tree before generation starts

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

### 3. Check for Existing spec-map.md (Resume Support)

Before starting, check if `speclan/spec-map.md` exists:

```bash
if [ -f "speclan/spec-map.md" ]; then
  echo "Found existing spec-map.md - resuming previous run"
fi
```

If spec-map.md exists:
- Skip Phase 1 (Mapping)
- Go directly to Phase 2 (Generation) or Phase 3 (Linking) based on progress

### 4. NEW-SPEC Mode

#### Phase 1: Mapping

**Goal:** Create complete feature tree in `speclan/spec-map.md` using 4 focused parallel explorations.

##### 4.1.1 Initialize Directory Structure

```bash
mkdir -p speclan/goals speclan/features speclan/templates
```

##### 4.1.2 Launch 7 Focused Mapping Agents (Parallel)

Run 7 instances of `speclan:spec-map-from-code` agent **in parallel**, each with a different focus:

**IMPORTANT:** Launch all 7 agents in a single message with multiple Task tool calls.
```
Agent 1 - UI Focus:
Map codebase for SPECLAN specification:
- Path: [Path to analyze]
- Speclan directory: speclan
- Focus: ui

Agent 2 - API Focus:
Map codebase for SPECLAN specification:
- Path: [Path to analyze]
- Speclan directory: speclan
- Focus: api

Agent 3 - Datamodel Focus:
Map codebase for SPECLAN specification:
- Path: [Path to analyze]
- Speclan directory: speclan
- Focus: datamodel

Agent 4-7 - Domain Focus identify the 3 main domain areas and for each run:
Map codebase for SPECLAN specification:
- Path: [Path to analyze]
- Speclan directory: speclan
- Focus: [domain area 1/2/3]
```

Each agent returns:
- `## SPEC_MAP` - Features found from its focused perspective
- `## EXPLORATION_SUMMARY` - Statistics including focus area

##### 4.1.3 Merge Agent Outputs
If agents failed, log errors infer from their output and continue with successful ones.
After all 7 agents complete, merge their outputs:

**Deduplication Strategy:**
1. Collect all features from all 7 agents (SPEC_MAP sections)
2. Group features by `code_hints` overlap (>50% path overlap = same feature)
3. For duplicates, keep the entry with:
   - More specific `code_hints` (more files listed)
   - More detailed `description`
   - Prefer the focus that matches the feature's primary layer
4. Assign new IDs to merged features to ensure uniqueness

**Merging Algorithm:**
```
all_features = []
for each agent_output:
    for each feature in agent_output.SPEC_MAP:
        if not overlaps_existing(feature, all_features):
            all_features.append(feature)
        else:
            merge_into_existing(feature, all_features)
```

##### 4.1.4 Write spec-map.md

Create `speclan/spec-map.md` with the merged feature list:

```markdown
# SPECLAN Spec Map

Generated: [ISO-8601 timestamp]
Source: [Path analyzed]
Mode: NEW-SPEC

[short-desctiption-how-to-process-this-file]

IMPORTANT: Generate specifications for the following features by invoking spec-generator-v2 agent for each feature but NEVER invoke multiple agents in parallel! NEVER do it without the agent, by your own! NEVER bulk Features together! If a feature creation fails, log the error and continue with the next one.
## Features

| specified | linked | ID | parent_id | filepath | title | description | code_hints |
|-----------|--------|-----|-----------|----------|-------|-------------|------------|
[All merged features from 4 focused explorations]

## Generation Log

[Will be updated as specs are generated]

## Mapping Summary

### Exploration Results by Focus
- UI focus: X features found
- API focus: Y features found
- Datamodel focus: Z features found
- Domain focus: W features found

### After Deduplication
- Unique features: N
- Duplicates merged: M
- Total features to generate: N
```

Report to user:
```
Phase 1 Complete: Mapped X features (Y root, Z subfeatures)

Focused Exploration Results:
  - UI layer:        A features
  - API layer:       B features
  - Datamodel layer: C features
  - Domain layer:    D features
  - Duplicates merged: E

spec-map.md created at speclan/spec-map.md

Review the spec-map and run the command again to continue to Phase 2.
Or continue now to generate specifications.
```

#### Phase 2: Generation

**Goal:** Generate spec for each feature in spec-map.md

##### 4.2.1 Initialize Todo List

Create todo list from spec-map.md entries:

```
TodoWrite([
  { content: "Invoke spec-generator-v2 agent to generate spec: [Feature1 Title]", activeForm: "Generating: [Feature1]", status: "pending" },
  { content: "Invoke spec-generator-v2 agent to generate spec: [Feature2 Title]", activeForm: "Generating: [Feature2]", status: "pending" },
  ...
  { content: "Phase 3: Link specifications", activeForm: "Linking specs", status: "pending" },
  { content: "Phase 4: Assign goals", activeForm: "Assigning goals", status: "pending" },
  { content: "Cleanup and summary", activeForm: "Finishing up", status: "pending" }
])
```
IMPORTANT: It is important to mention "Invoke spec-generator-v2 agent" in each todo content for clarity.

**TodoWrite Rules (CRITICAL):**
- Exactly ONE todo must be `in_progress` at any time
- Mark todo `in_progress` BEFORE starting work on it
- Mark todo `completed` IMMEDIATELY after finishing
- DO NOT RUN MULTIPLE AGENTS IN PARALLEL - process sequentially

##### 4.2.2 Process Each Feature

For each row in spec-map.md where `specified` is `[ ]`:

1. **Mark todo in_progress**

2. **Create directory structure:**
   ```bash
   # Extract directory from filepath
   FEATURE_DIR=$(dirname [filepath])
   mkdir -p "$FEATURE_DIR"
   mkdir -p "$FEATURE_DIR/requirements"
   ```

3. **Invoke spec-generator-v2 agent:**
   ```
   Generate SPECLAN spec for feature:
   - ID: [ID from row]
   - Title: [title from row]
   - Description: [description from row]
   - Code hints: [code_hints from row]
   - Parent ID: [parent_id from row, or empty]
   - Filepath: [filepath from row]
   ```

4. **Parse agent output:**

   The agent returns structured markdown with clear section markers:

   ```
   ## FEATURE_SPEC
   [feature frontmatter and content]

   ## REQUIREMENTS
   ### REQ_1
   [requirement 1 frontmatter and content]
   ### REQ_2
   [requirement 2 frontmatter and content]

   ## GENERATION_SUMMARY
   [metadata - discard]
   ```

   **Parsing steps:**
   - Extract everything from `## FEATURE_SPEC` up to `## REQUIREMENTS` as feature content
   - Split `## REQUIREMENTS` section by `### REQ_` pattern
   - Each requirement block includes its `---` frontmatter and markdown content
   - Count requirements for ID generation
   - Discard `## GENERATION_SUMMARY` (metadata only)

5. **Generate requirement IDs:**

   ```bash
   # Generate N requirement IDs (N = number of REQ_ blocks found)
   REQ_IDS=$(generate-id.sh requirement N ./speclan)
   # Returns one ID per line: R-1234, R-5678, etc.
   ```

6. **Replace placeholders and write files:**

   **IMPORTANT:** Replace placeholders field-by-field, not with global search-replace.

   **Feature file:**
   - Find the line starting with `created:` and replace `'[TO_BE_ASSIGNED]'` → Current ISO-8601 timestamp
   - Find the line starting with `updated:` and replace `'[TO_BE_ASSIGNED]'` → Current ISO-8601 timestamp
   - Write to `[filepath]`

   **Requirement files (for each REQ_N):**
   - Find the line starting with `id:` and replace `[TO_BE_ASSIGNED]` → Next R-#### ID from generated list
   - Find the line starting with `created:` and replace `'[TO_BE_ASSIGNED]'` → Current ISO-8601 timestamp
   - Find the line starting with `updated:` and replace `'[TO_BE_ASSIGNED]'` → Current ISO-8601 timestamp
   - Create slug from requirement title (lowercase, hyphens, e.g., "Email Validation" → "email-validation")
   - Write to `[feature_dir]/requirements/R-####-slug.md`

7. **Update spec-map.md:**
   Change `| [ ] |` to `| [x] |` for the `specified` column of this row.

8. **Add to Generation Log:**
   ```markdown
   ## Generation Log

   - [timestamp] F-### [Title]: Created with X requirements
   ```

9. **Mark todo completed**

10. **Move to next row**

##### 4.2.3 Generation Complete

When all rows have `[x]` in `specified` column:
```
Phase 2 Complete: Generated X feature specs with Y total requirements
```

#### Phase 3: Linking

**Goal:** Add cross-references between related specs

##### 4.3.1 Mark Phase 3 In-Progress

Update todo: "Phase 3: Link specifications" → `in_progress`

##### 4.3.2 Process Each Feature for Linking

For each row in spec-map.md where `linked` is `[ ]`:

1. **Read the spec file**

2. **Build related links:**

   **For features with parent_id:**
   - Link to parent feature

   **For features with children (other rows have this ID as parent_id):**
   - Link to child features

   **For features with requirements:**
   - Link to requirement files in the requirements/ subdirectory

3. **Add Related section to spec file:**
   ```markdown
   ## Related

   ### Parent Feature
   - [Parent Title](../F-###-parent/F-###-parent.md)

   ### Child Features
   - [Child 1 Title](./F-###-child1/F-###-child1.md)
   - [Child 2 Title](./F-###-child2/F-###-child2.md)

   ### Requirements
   - [Requirement 1](./requirements/R-####-slug.md)
   - [Requirement 2](./requirements/R-####-slug.md)
   ```

4. **Update spec-map.md:**
   Change `| [ ] |` to `| [x] |` for the `linked` column.

##### 4.3.3 Linking Complete

Mark todo completed.
```
Phase 3 Complete: Linked X specifications
```

#### Phase 4: Assign Goals

##### 4.4.1 Mark Phase 4 In-Progress

Update todo: "Phase 4: Assign goals" → `in_progress`

##### 4.4.2 Create or Update Goals

1. Check for existing goals in `speclan/goals/`
2. If no goals exist, create default goal based on project analysis
3. For each root feature, determine goal assignments
4. Update feature frontmatter with `goals: [G-###]`
5. Update goal frontmatter with `contributors: [F-###, ...]`

##### 4.4.3 Goals Complete

Mark todo completed.

#### Phase 5: Cleanup

##### 4.5.1 Mark Cleanup In-Progress

Update todo: "Cleanup and summary" → `in_progress`

##### 4.5.2 Remove spec-map.md
IMPORTANT: Only remove after all specs are generated and linked, so check the file one last time.
```bash
rm speclan/spec-map.md
```

##### 4.5.3 Generate Summary Report

```markdown
## SPECLAN Generation Complete

### Mapping Summary (4 Focused Explorations)
| Focus | Features Found |
|-------|----------------|
| UI layer | X |
| API layer | Y |
| Datamodel layer | Z |
| Domain layer | W |
| **After deduplication** | **N unique** |

### Created Specifications
- Features: X (Y root, Z subfeatures)
- Requirements: W total

### File Structure
speclan/
├── goals/
│   └── G-###-goal.md
├── features/
│   ├── F-###-feature-one/
│   │   ├── F-###-feature-one.md
│   │   ├── requirements/
│   │   │   └── R-####-req.md
│   │   └── F-###-subfeature/
│   │       └── F-###-subfeature.md
│   └── ...

### Next Steps
- Review generated specs for accuracy
- Add detailed scenarios and acceptance criteria
- Run /speclan:status to verify structure
```

##### 4.5.4 Mark Complete

Mark todo completed. All todos should now be completed.

### 5. UPDATE-SPEC Mode

Use the `speclan:spec-updater` agent to sync existing specs with codebase.

#### 5.1 Check for Existing spec-map.md

If resuming, skip to appropriate phase.

#### 5.2 Create Update spec-map.md

Invoke spec-map-from-code to identify:
- New features in code not in specs
- Features in specs not in code (candidates for deprecation)
- Features that may need updates

Create spec-map.md with additional columns:
```
| specified | linked | action | ID | parent_id | filepath | title | description | code_hints |
```

Where `action` is one of:
- `create` - New feature to create
- `update` - Existing feature to update
- `deprecate` - Feature to mark deprecated
- `skip` - No changes needed

#### 5.3 Process Updates

For each row based on action:
- `create` → Same as NEW-SPEC generation
- `update` → Invoke spec-updater agent, respecting status rules
- `deprecate` → Update status to deprecated (if allowed)
- `skip` → Just mark as done

#### 5.4 Status Rules for Updates

- `draft`/`review`/`approved` → Edit directly
- `in-development`/`under-test`/`released` → Create Change Request
- Never delete - only deprecate

### 6. Error Handling

#### 6.1 Agent Failure

If an agent fails:
1. Log error to spec-map.md Generation Log
2. Mark row with error indicator: `| [!] |`
3. Continue to next row
4. Report errors in summary

#### 6.2 Partial Completion

If interrupted:
1. spec-map.md preserves progress
2. Re-running command resumes from last incomplete row
3. Already-completed rows are skipped

### 7. Tips

- Use `--new` to regenerate specs even if some exist
- Use `--update` to force sync mode on sparse directories
- Check spec-map.md to see planned features before generation
- If generation seems wrong, edit spec-map.md and re-run

## Examples

```bash
# Auto-detect mode for entire project
/speclan:infer-from-codebase-v2 .

# Force new spec generation
/speclan:infer-from-codebase-v2 src/ --new

# Force update mode
/speclan:infer-from-codebase-v2 . --update

# Analyze specific directory
/speclan:infer-from-codebase-v2 src/features/auth/
```

