---
name: speclan:sync
description: Sync SPECLAN specs from session work - identifies implemented features and updates specs
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - TodoWrite
argument-hint: "[--dry-run] [hints...]"
---

# SPECLAN Sync from Session

Analyze the current session to identify implemented features and sync them to SPECLAN specifications.

## Core Philosophy: Implementation Reveals Specification Gaps

**Specifications written before implementation are incomplete by nature.** Real implementation work exposes:

- **Missing requirements** - Edge cases, error handling, validation rules discovered during coding
- **Implicit assumptions** - Behaviors that were obvious to implement but never documented
- **Integration points** - Dependencies and interactions only visible when building
- **User experience details** - UI flows, feedback mechanisms, accessibility considerations

**This command treats implementation as the source of truth.** When code does something useful that isn't in the spec, the spec is incomplete - not the code.

### When to Add Requirements

Add new requirements when implementation reveals:

| Implementation Pattern | Likely Missing Requirement |
|------------------------|---------------------------|
| Error handling/validation | Input validation rules, error messages |
| Retry logic, timeouts | Reliability/resilience requirements |
| Caching, optimization | Performance requirements |
| Logging, metrics | Observability requirements |
| Permission checks | Authorization requirements |
| Edge case handling | Boundary condition requirements |
| Default values | Configuration/defaults requirements |
| User feedback (toasts, spinners) | UX feedback requirements |

## Instructions

### 1. Parse Arguments

**Flags:**
- `--dry-run` - Show what would be created/updated without making changes

**User Hints (optional free-form text):**
After flags, the user may provide guidance to help focus the analysis:

```
/speclan:sync focus on the auth changes, don't miss the token refresh logic
/speclan:sync --dry-run look at src/api/ folder, we added new endpoints
/speclan:sync important: the rate limiting feature, also check the middleware
```

**Hint Categories:**
| Hint Type | Keywords | Purpose |
|-----------|----------|---------|
| Focus areas | "focus on", "look at", "check" | Direct attention to specific code/features |
| Must-include | "don't miss", "important", "make sure" | Ensure specific items are captured |
| Exclusions | "ignore", "skip", "not relevant" | Avoid false positives |
| Context | "we added", "new feature", "bugfix for" | Clarify intent of changes |

### 2. Process User Hints

If hints provided, extract and categorize:

```yaml
user_guidance:
  focus_areas:
    - "auth changes"
    - "src/api/ folder"
  must_include:
    - "token refresh logic"
    - "rate limiting feature"
  exclusions: []
  context:
    - "new endpoints added"
    - "middleware changes"
```

Use this guidance to:
1. **Prioritize** - Analyze focus areas first and more thoroughly
2. **Validate** - Cross-check must-include items are captured in results
3. **Filter** - Skip excluded areas during analysis
4. **Interpret** - Use context to better understand change intent

### 3. Load Skill Knowledge

Apply the `Sync Specs from Session` skill for detailed workflow guidance.

### 3. Analyze Session Context

Review the conversation history to identify implementation work:

#### 3.1 Scan for Code Changes

Look for evidence of implementation:
- **File writes/edits**: Write and Edit tool usage
- **New functions/classes**: Code patterns added
- **API endpoints**: Routes, handlers, controllers
- **Data models**: Schema changes, type definitions
- **Tests added**: Test files created or modified

#### 3.2 Extract Feature Candidates

For each identified change, determine:
- **Title**: Descriptive name for the feature
- **Description**: What it does and why
- **Code paths**: Files involved
- **Type**: new feature, enhancement, or bugfix

#### 3.3 Infer Requirements from Implementation

**Critical step:** Analyze implemented code to discover undocumented requirements:

```
For each code change, ask:
1. What user-visible behavior does this enable?
2. What edge cases does this handle?
3. What validation/error handling was added?
4. What performance/reliability concerns does this address?
5. What dependencies or integrations does this require?
```

**Example inference:**
```
Code: if (retries > 3) throw new Error('Max retries exceeded')
Inferred requirement: "System shall retry failed operations up to 3 times before failing"

Code: toast.success('Changes saved')
Inferred requirement: "System shall provide visual feedback when changes are saved"

Code: if (!user.hasPermission('admin')) return 403
Inferred requirement: "Only administrators can access this functionality"
```

#### 3.4 Group Related Changes

Consolidate related changes:
- Multiple files for one feature = single feature entry
- Independent changes = separate feature entries

### 4. Detect Speclan Directory

```bash
# Find speclan directory
if [ -d "speclan/features" ]; then
  echo "Found: speclan/"
elif [ -d "specs/speclan/features" ]; then
  echo "Found: specs/speclan/"
else
  echo "No speclan directory found"
fi
```

If no speclan directory exists, ask user if they want to initialize one.

### 5. Index Existing Specs

If speclan exists, use the SPECLAN Query skill to build an index:

```bash
# List all features with full metadata (JSON output)
"${PLUGIN_ROOT}/skills/speclan-query/scripts/query.sh" --type feature --full speclan

# List requirements for a specific feature
"${PLUGIN_ROOT}/skills/speclan-query/scripts/query.sh" --type requirement --parent F-1234 --full speclan

# Filter by status (e.g., find editable features)
"${PLUGIN_ROOT}/skills/speclan-query/scripts/query.sh" --type feature --filter-status draft --full speclan
```

**Output format (JSON):**
```json
[
  {"id":"F-1234","slug":"my-feature","type":"feature","path":"speclan/features/F-1234-my-feature/F-1234-my-feature.md","title":"My Feature","status":"draft"}
]
```

Use this to:
1. Find features that match session work
2. Determine if features are editable or locked
3. Identify where to add new requirements

### 6. Compare and Classify Changes

For each feature candidate from session analysis:

| Match Result | Classification | Action |
|--------------|----------------|--------|
| No match in speclan | CREATE | New feature spec |
| Matches existing, status editable | UPDATE | Modify existing spec |
| Matches existing, status locked | CHANGE_REQUEST | Create CR |
| Implementation detail of existing feature | ADD_REQUIREMENT | New requirement |

**Editable statuses:** draft, review, approved
**Locked statuses:** in-development, under-test, released, deprecated

#### 6.1 Prioritize Requirement Discovery

**Most syncs should produce new requirements, not just feature updates.**

When analyzing implementation against existing specs:

1. **Read the existing feature spec thoroughly**
2. **Compare each implemented behavior against documented scope**
3. **For each undocumented behavior, create a requirement**

```
Existing spec says: "Users can save their preferences"
Implementation adds: retry logic, validation, success toast, error handling

→ Add requirements:
  - R-####: "Preference saves shall retry up to 3 times on failure"
  - R-####: "Invalid preference values shall show validation error"
  - R-####: "Successful save shall display confirmation message"
  - R-####: "Failed save shall display actionable error message"
```

**Rule of thumb:** If you wrote more than 20 lines of code for a feature, there's probably at least one missing requirement.

### 7. Present Changes to User

Show identified changes and ask for confirmation:

```markdown
## Session Analysis Results

Based on this session, I identified:

### New Features (CREATE)
1. **[Title]** - [Description]

### Updates to Existing Features (UPDATE)
1. **[F-####] [Title]** - [What changed]
   - Status: [status] (editable)

### Change Requests Needed (LOCKED)
1. **[F-####] [Title]** - Cannot edit directly
   - Status: [status] (locked)
   - Proposed change: [description]

### New Requirements
1. For **[F-####]**: [Requirement title]
```

Use AskUserQuestion:

```yaml
questions:
  - question: "Which changes should I apply to SPECLAN specs?"
    header: "Apply"
    multiSelect: true
    options:
      - label: "Create: [Feature Title]"
        description: "New feature spec"
      - label: "Update: F-#### [Title]"
        description: "Add [change] to existing feature"
      # ... additional options
```

### 8. Handle Dry Run

If `--dry-run` flag provided:
- Show all changes that would be made
- Do NOT write any files
- Report: "Dry run complete. No changes made."

### 9. Apply Selected Changes

For each user-selected change:

#### 9.1 Create New Features

1. Generate feature ID and get owner:
   ```bash
   # Use ID generator skill
   FEATURE_ID=$("${PLUGIN_ROOT}/skills/speclan-id-generator/scripts/generate-id.sh" feature speclan)

   # Get owner from git config
   OWNER=$(git config --get user.email)
   ```

2. Create directory and file:
   ```bash
   SLUG=$(echo "[title]" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')
   mkdir -p "speclan/features/${FEATURE_ID}-${SLUG}/requirements"
   ```

3. Write feature spec with frontmatter:
   ```yaml
   ---
   id: [FEATURE_ID]
   type: feature
   title: [Title]
   status: under-test
   owner: [OWNER from git config --get user.email]
   created: "[ISO-8601]"
   updated: "[ISO-8601]"
   goals: []
   ---

   # [Title]

   ## Overview
   [Description - focus on WHAT and WHY, not HOW]

   ## Scope
   - [User-facing functionality points]
   ```

**IMPORTANT:** Specs must be implementation-agnostic. Do NOT include:
- Code paths, file names, or technical locations
- Implementation details or internal architecture
- Code fragments or snippets

Focus on WHAT the feature does for users, not HOW it's built.

#### 9.2 Update Existing Features

1. Read current feature file
2. Update relevant sections (scope, implementation notes)
3. Update `updated` timestamp
4. Write file back

#### 9.3 Create Change Requests

For locked features or requirements:

1. Generate CR ID:
   ```bash
   CR_ID=$("${PLUGIN_ROOT}/skills/speclan-id-generator/scripts/generate-id.sh" change-request speclan)
   ```

2. Create CR in entity's change-requests directory:
   ```bash
   # For features:
   mkdir -p "speclan/features/[feature-dir]/change-requests"

   # For requirements:
   mkdir -p "speclan/features/.../requirements/[requirement-dir]/change-requests"
   ```

3. Write CR file with proper frontmatter (parentType: feature or requirement)

#### 9.4 Create New Requirements

1. Generate requirement ID
2. Create requirement directory:
   ```bash
   mkdir -p "speclan/features/[feature-dir]/requirements/R-####-slug"
   ```
3. Write requirement file to directory:
   ```
   speclan/features/[feature-dir]/requirements/R-####-slug/R-####-slug.md
   ```
4. Update parent feature's `updated` timestamp

### 10. Report Results

```markdown
## Sync Complete

### Created
- F-#### [Title] → speclan/features/F-####-slug/
- R-#### [Title] → speclan/features/F-####/requirements/R-####-slug/

### Updated
- F-#### [Title] - added [changes]

### Change Requests
- CR-#### for F-#### → speclan/features/F-####/change-requests/
- CR-#### for R-#### → speclan/.../requirements/R-####/change-requests/

### Skipped
- [Any items user didn't select]

### Next Steps
- Review created specs for accuracy
- Assign goals to new features
- Process pending change requests
- Run /speclan:status to verify structure
```

## Examples

```bash
# Sync session work to specs
/speclan:sync

# Preview without making changes
/speclan:sync --dry-run
```
