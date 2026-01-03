---
name: speclan:infer-from-codebase
description: Analyze codebase to generate or update SPECLAN specifications
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

Orchestrate feature generation by invoking `speclan:spec-generator` agent for each feature.

#### 3.1 Initialize Directory Structure

```bash
mkdir -p speclan/goals speclan/features speclan/templates
```

#### 3.2 Identify Main Features

Analyze codebase to identify **up to 7 main features** by examining:

1. **UI Components** - React/Vue/Angular components, page structures
2. **API Endpoints** - REST routes, GraphQL schemas, RPC handlers
3. **Data Models** - Database schemas, entity definitions, types
4. **Domain Models** - Service classes, repositories, business logic
5. **Documentation** - README files, architecture docs

**Output:** A list of feature descriptions:
```
1. [Feature Name]: [Brief description] (code hints: path/to/relevant/code)
2. [Feature Name]: [Brief description] (code hints: path/to/relevant/code)
...
```

#### 3.3 Initialize Todo List

After identifying main features, create the initial todo list using TodoWrite:

```
TodoWrite([
  { content: "Generate spec: [Feature1]", activeForm: "Generating spec: [Feature1]", status: "pending" },
  { content: "Generate spec: [Feature2]", activeForm: "Generating spec: [Feature2]", status: "pending" },
  { content: "Generate spec: [Feature3]", activeForm: "Generating spec: [Feature3]", status: "pending" },
  ...
  { content: "Post-process: Interlink specs", activeForm: "Interlinking specs", status: "pending" },
  { content: "Post-process: Assign goals", activeForm: "Assigning goals", status: "pending" }
])
```

**TodoWrite Rules (CRITICAL):**
- Exactly ONE todo must be `in_progress` at any time
- Mark todo `in_progress` BEFORE starting work on it
- Mark todo `completed` IMMEDIATELY after finishing
- Never batch completions - update after each task
- DO NOT RUN MULTIPLE AGENTS IN PARALLEL, DO IT SEQUENTIALLY ONE BY ONE

#### 3.4 Process Features with Todo Tracking

For each feature in the todo list, execute the recursive processing loop:

##### 3.4.1 Mark Current Feature In-Progress

Before processing a feature, update the todo list:
```
TodoWrite([
  { content: "Generate spec: Auth", status: "in_progress", activeForm: "Generating spec: Auth" },
  { content: "Generate spec: Dashboard", status: "pending", activeForm: "Generating spec: Dashboard" },
  ...
])
```

##### 3.4.2 Invoke spec-generator Agent

Use the `speclan:spec-generator` agent with this prompt format (NEVER Invoke more than one agent at a time):

```
Generate SPECLAN spec for feature:
- Name: [Feature Name]
- Description: [Brief description]
- Code hints: [Paths or patterns to explore]
- Parent ID: [F-### if subfeature, omit for top-level]
- Depth: [0-3, current nesting level]
```

**Track the current depth** (starts at 0 for main features, increments for each level of subfeatures).

##### 3.4.3 Parse Agent Output

The agent returns structured output with these sections:
- `## FEATURE_SPEC` - Feature markdown with frontmatter
- `## REQUIREMENTS` - One or more `### REQ_N` subsections
- `## SUBFEATURES` - Complexity assessment and subfeature descriptions

**Parse the SUBFEATURES section carefully:**

1. Extract `**Complexity Assessment:**` line → ATOMIC | MODERATE | COMPLEX
2. Extract `**Indicators Found:**` line → List of triggered indicators
3. If MODERATE or COMPLEX, parse each numbered subfeature block:
   - `**[Name]**` → Subfeature name (becomes slug)
   - `Description:` → Brief description for recursive call
   - `Code hints:` → Paths to pass to recursive agent call
   - `Expected requirements:` → What agent should look for
   - `Estimated complexity:` → Hint for further decomposition

##### 3.4.4 Generate IDs

**Use the `speclan-id-generator` skill** to generate unique, collision-free IDs for all entity types.

**Invoke the skill with prompts like:**
- "Use the speclan-id-generator skill to generate a feature ID"
- "Use the speclan-id-generator skill to generate 3 requirement IDs"
- "Use the speclan-id-generator skill to generate a goal ID"

**Entity types supported:** `goal`, `feature`, `requirement`, `change-request`, `scenario`, `acceptance-criterion`, `test`

**ID Formats:**
| Entity | Format | Range | Example |
|--------|--------|-------|---------|
| goal | G-### | 100-999 | G-142 |
| feature | F-### | 100-999 | F-847 |
| requirement | R-#### | 1000-9999 | R-3928 |
| change-request | CR-#### | 1000-9999 | CR-7291 |
| scenario | S-#### | 1000-9999 | S-4521 |
| acceptance-criterion | AC-#### | 1000-9999 | AC-2847 |
| test | T-#### | 1000-9999 | T-1029 |

**The skill handles:**
- Random ID generation in correct range for each entity type
- Collision detection (checks filenames AND frontmatter)
- Session tracking (no duplicates when generating multiple IDs)
- Automatic retry (up to 100 attempts if collision detected)

##### 3.4.5 Create Feature Directory and File

1. Create slug from feature title (lowercase, hyphenated)
2. Create directory: `speclan/features/[parent-path/]F-###-slug/`
3. Create requirements directory: `speclan/features/.../F-###-slug/requirements/`
4. Write feature file with assigned ID and timestamps

**Replace placeholders in agent output:**
- `[TO_BE_ASSIGNED]` in `id:` → Generated F-### ID
- `[TO_BE_ASSIGNED]` in `created:` → Current ISO-8601 timestamp
- `[TO_BE_ASSIGNED]` in `updated:` → Current ISO-8601 timestamp

##### 3.4.6 Create Requirement Files

For each `### REQ_N` in agent output:
1. Generate unique R-#### ID
2. Create slug from requirement title
3. Write to `speclan/features/.../F-###-slug/requirements/R-####-slug.md`

**Replace placeholders:**
- `[TO_BE_ASSIGNED]` in `id:` → Generated R-#### ID
- `[TO_BE_ASSIGNED]` in `feature:` → Parent feature ID (F-###)
- Timestamps as above

##### 3.4.7 Mark Complete and Insert Subfeatures (CRITICAL)

After writing files, update the todo list based on complexity assessment:

**Step 1: Mark current feature as `completed`**

**Step 2: Check Complexity Assessment**

| Assessment | Action |
|------------|--------|
| **ATOMIC** | No subfeatures to insert, continue to next feature |
| **MODERATE** | Insert subfeatures (agent identified potential decomposition) |
| **COMPLEX** | **MUST** insert subfeatures (mandatory decomposition) |

**Step 3: If MODERATE or COMPLEX, insert subfeatures**

For each subfeature in the agent's output:
1. Extract: name, description, code hints
2. Calculate depth prefix based on current depth
3. Insert into todo list immediately after the completed parent
4. Store metadata for recursive call:
   - Parent feature ID (just assigned)
   - Parent feature path (for nested directory)
   - Code hints from agent
   - Depth + 1

**CRITICAL ENFORCEMENT:**
```
IF complexity_assessment in [MODERATE, COMPLEX]:
  IF subfeatures_list is empty:
    ERROR: Agent returned MODERATE/COMPLEX but no subfeatures
  ELSE:
    FOR EACH subfeature in subfeatures_list:
      INSERT into todo list
      STORE metadata for recursive processing
```

**Hierarchy prefix convention:**
- Depth 0 (root): No prefix
- Depth 1: `├─ ` prefix
- Depth 2: `│  ├─ ` prefix
- Depth 3: `│  │  ├─ ` prefix (max depth)

**Example after processing "Auth" (COMPLEX with 2 subfeatures):**
```
TodoWrite([
  { content: "Generate spec: Auth", status: "completed", activeForm: "Generating spec: Auth" },
  { content: "Generate spec: ├─ Login", status: "pending", activeForm: "Generating spec: Login" },
  { content: "Generate spec: ├─ Registration", status: "pending", activeForm: "Generating spec: Registration" },
  { content: "Generate spec: Dashboard", status: "pending", activeForm: "Generating spec: Dashboard" },
  { content: "Generate spec: API", status: "pending", activeForm: "Generating spec: API" },
  { content: "Post-process: Interlink specs", status: "pending", activeForm: "Interlinking specs" },
  { content: "Post-process: Assign goals", status: "pending", activeForm: "Assigning goals" }
])
```

**Metadata stored for "Login" subfeature:**
```
{
  name: "Login",
  description: "User login flow with credentials and session management",
  code_hints: ["src/auth/login/", "src/components/LoginForm.tsx"],
  parent_id: "F-142",
  parent_path: "speclan/features/F-142-auth/",
  depth: 1
}
```

##### 3.4.8 Process Subfeature (Recursive)
DO NOT RUN MULTIPLE AGENTS IN PARALLEL, DO IT SEQUENTIALLY ONE BY ONE

When processing a subfeature from the todo list:

1. Retrieve stored metadata (parent_id, parent_path, code_hints, depth)
2. Invoke spec-generator with:
   ```
   Generate SPECLAN spec for feature:
   - Name: [Subfeature Name]
   - Description: [Stored description]
   - Code hints: [Stored code_hints]
   - Parent ID: [Stored parent_id]
   - Depth: [Stored depth]
   ```
3. Create subfeature directory INSIDE parent: `[parent_path]/F-###-subfeature-slug/`
4. Continue normal processing (3.4.3 onwards)

##### 3.4.9 Continue Processing

Move to the next pending feature in the list and repeat from step 3.4.1.
DO NOT RUN MULTIPLE AGENTS IN PARALLEL, DO IT SEQUENTIALLY ONE BY ONE

**Stop recursion when:**
- Depth reaches 3 (max nesting level) - agent should return ATOMIC at depth 3
- Complexity assessment is ATOMIC
- All features in todo list are completed

**Depth limit enforcement:**
```
IF depth >= 3:
  IGNORE any subfeatures returned by agent
  TREAT feature as ATOMIC regardless of assessment
```

**Processing Login:**
```
[✓] Generate spec: Authentication
[→] Generate spec: ├─ Login
[ ] Generate spec: ├─ Registration
[ ] Generate spec: Dashboard
[ ] Generate spec: API
[ ] Post-process: Interlink specs
[ ] Post-process: Assign goals
```

**Login complete, 1 sub-subfeature found:**
```
[✓] Generate spec: Authentication
[✓] Generate spec: ├─ Login
[ ] Generate spec: │  ├─ OAuth
[ ] Generate spec: ├─ Registration
[ ] Generate spec: Dashboard
[ ] Generate spec: API
[ ] Post-process: Interlink specs
[ ] Post-process: Assign goals
```

**All features complete, post-processing:**
```
[✓] Generate spec: Authentication
[✓] Generate spec: ├─ Login
[✓] Generate spec: │  ├─ OAuth
[✓] Generate spec: ├─ Registration
[✓] Generate spec: Dashboard
[✓] Generate spec: API
[→] Post-process: Interlink specs
[ ] Post-process: Assign goals
```

### 4. UPDATE-SPEC Mode

Use the `speclan:spec-updater` agent to sync existing specs with codebase.

#### 4.1 Initialize Update Todos

Create initial todo list for update process:
```
TodoWrite([
  { content: "Compare specs → codebase", activeForm: "Comparing specs to codebase", status: "pending" },
  { content: "Compare codebase → specs", activeForm: "Comparing codebase to specs", status: "pending" },
  { content: "Execute updates", activeForm: "Executing updates", status: "pending" },
  { content: "Post-process: Interlink specs", activeForm: "Interlinking specs", status: "pending" },
  { content: "Post-process: Assign goals", activeForm: "Assigning goals", status: "pending" }
])
```

#### 4.2 Invoke spec-updater Agent

Tell the agent: "Synchronize SPECLAN specifications with codebase at [path]. Compare specs with code, identify changes needed, and update respecting status rules."

#### 4.3 Update Todos Based on Findings

After comparison phases, expand "Execute updates" with specific tasks:

```
TodoWrite([
  { content: "Compare specs → codebase", status: "completed", activeForm: "Comparing specs to codebase" },
  { content: "Compare codebase → specs", status: "completed", activeForm: "Comparing codebase to specs" },
  { content: "Update F-017: outdated description", status: "pending", activeForm: "Updating F-017" },
  { content: "Create F-142: User Authentication", status: "pending", activeForm: "Creating F-142" },
  { content: "Deprecate F-042: removed code", status: "pending", activeForm: "Deprecating F-042" },
  { content: "Create CR-0731 for F-089", status: "pending", activeForm: "Creating CR-0731" },
  { content: "Post-process: Interlink specs", status: "pending", activeForm: "Interlinking specs" },
  { content: "Post-process: Assign goals", status: "pending", activeForm: "Assigning goals" }
])
```

#### 4.4 Status Rules for Updates

Execute updates respecting status rules:
- `draft`/`review`/`approved` → Edit directly
- `in-development`/`under-test`/`released` → Create Change Request
- Never delete - only deprecate

### 5. Post-Processing (Both Modes)

After feature processing completes, perform final steps:

#### 5.1 Interlink Specs

Mark in-progress: `Post-process: Interlink specs`

Add relative markdown links between related specs:

```markdown
## Related
- [Parent Feature](../F-###-parent/F-###-parent.md)
- [Related Requirement](./requirements/R-####-related.md)
```

Mark completed when done.

#### 5.2 Assign Features to Goals

Mark in-progress: `Post-process: Assign goals`

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

Mark completed when done.

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
/speclan:infer-from-codebase src/ --new

# Force update mode
/speclan:infer-from-codebase . --update

# Analyze specific directory
/speclan:infer-from-codebase src/features/auth/
```
