---
name: Sync Specs from Session
description: This skill should be used when the user asks to "sync specs", "update specs from work", "record what we did", "add to speclan", "document implemented features", or wants to capture session work as SPECLAN specifications. Analyzes conversation context to identify implemented features and syncs with speclan directory.
version: 0.1.0
---

# Sync Specs from Session

Analyze the current session context to identify implemented features, compare with existing SPECLAN specifications, and create or update specs based on user confirmation.

## Core Principle: Implementation-Agnostic Specs

**SPECS MUST NEVER CONTAIN IMPLEMENTATION OR ARCHITECTURE DETAILS.** This skill analyzes code changes internally to understand WHAT was built, but specs describe only user-facing capabilities and business value. Never include file paths, code references, library names, technical approaches, architectural decisions, design patterns, or any implementation-specific information in generated specs.

## When to Use

- After completing implementation work and wanting to document it
- When user asks to sync or update specs based on recent work
- To capture newly implemented functionality in SPECLAN format

## Workflow Overview

```
1. Analyze Session → 2. Scan Speclan → 3. Compare & Diff → 4. Ask User → 5. Apply Changes
```

## Step 1: Analyze Session Context

Review the conversation history to identify:

### 1.1 Code Changes Made (Internal Analysis)

Look for patterns indicating implementation (for internal matching only - these details are NOT included in specs):
- Files created or modified (Write/Edit tool usage)
- Functions, classes, or components added
- API endpoints implemented
- Database schema changes
- Configuration updates

**Purpose:** Use these implementation signals to identify WHAT was built, then translate into user-facing capability descriptions for specs.

### 1.2 Extract Feature Information

For each identified change, extract:

```yaml
feature_candidate:
  title: "<descriptive name>"
  description: "<what it does for users and why it matters>"
  _code_paths: ["<files involved>"]  # INTERNAL USE ONLY - for matching, never included in specs
  type: "new" | "enhancement" | "bugfix"
  scope: "feature" | "requirement" | "both"
```

**Note:** `_code_paths` is used internally to match session work to existing specs. It is NEVER written to spec files.

### 1.3 Categorize Changes

Group related changes into logical features:
- Multiple file changes for one feature = single feature
- Independent changes = separate features
- Small fixes to existing features = requirement updates

## Step 2: Scan Speclan Directory

### 2.1 Detect Speclan Location

```bash
# Check common locations
if [ -d "speclan" ]; then
  SPECLAN_DIR="speclan"
elif [ -d "specs/speclan" ]; then
  SPECLAN_DIR="specs/speclan"
else
  # No speclan directory - all features are new
  SPECLAN_DIR=""
fi
```

### 2.2 Index Existing Specs

If speclan directory exists, build an index:

```bash
# List all features
find "$SPECLAN_DIR/features" -name "F-*.md" -type f 2>/dev/null

# Extract titles and paths
for f in $(find "$SPECLAN_DIR/features" -name "F-*.md" -type f); do
  id=$(grep "^id:" "$f" | head -1 | cut -d: -f2 | tr -d ' ')
  title=$(grep "^title:" "$f" | head -1 | cut -d: -f2-)
  echo "$id|$title|$f"
done
```

### 2.3 Build Existing Spec Map

Create a mapping of:
- Feature ID → Title → File path (spec file location, not code)
- Feature ID → Status (for edit rules)
- Feature ID → Key capabilities (for semantic matching)

**Note:** Use titles and capability descriptions for matching, not code paths. Well-formed specs should not contain implementation or architecture references.

## Step 3: Compare and Generate Diff

### 3.1 Match Session Work to Existing Specs

For each feature candidate from session:

1. **Title similarity check**: Compare with existing feature titles
2. **Capability overlap**: Check if the described functionality matches existing features
3. **Description similarity**: Semantic comparison of purpose and user-facing behavior

**Note:** Matching is based on functional capabilities and user outcomes, not on code paths, implementation details, or architectural decisions.

### 3.2 Classify Each Change

| Session Feature | Existing Spec | Classification |
|-----------------|---------------|----------------|
| New capability | No match | **CREATE** new feature |
| Related capability | Match found, status editable | **UPDATE** existing feature |
| Related capability | Match found, status locked | **CHANGE_REQUEST** needed |
| Enhancement | Partial match | **ADD_REQUIREMENT** to feature |

### 3.3 Prepare Change Summary

Build a structured summary:

```yaml
# NOTE: _code_paths are INTERNAL ONLY for matching - never written to specs
changes:
  create:
    - title: "User Authentication"
      description: "Secure login with automatic session refresh"
      _code_paths: ["src/auth/", "src/middleware/auth.ts"]  # internal matching only

  update:
    - id: "F-1142"
      title: "Pet Management"
      changes: "Added bulk import capability for pet records"
      _code_paths: ["src/pets/import.ts"]  # internal matching only

  change_requests:
    - parent_id: "F-1089"
      title: "Add Export Feature"
      reason: "Feature is in-development status"

  requirements:
    - feature_id: "F-1142"
      title: "Validate CSV format on import"
      _code_paths: ["src/pets/validators/csv.ts"]  # internal matching only
```

## Step 4: Ask User for Confirmation

Present the identified changes to the user using AskUserQuestion or direct prompting.

### 4.1 Summary Format

```markdown
## Identified Changes from Session

Based on our session, I identified the following potential spec updates:

### New Features to Create
1. **User Authentication** - Secure login with automatic session refresh

### Existing Features to Update
1. **F-1142 Pet Management** - Add bulk import capability for pet records
   - Current status: draft (editable)

### Change Requests Needed
1. **F-1089 Data Export** - Feature is locked (in-development)
   - Proposed: Add export option for user data

### New Requirements
1. For **F-1142**: Validate file format on import
```

**IMPORTANT:** Descriptions shown to users must be implementation and architecture agnostic. Focus on WHAT the feature does for users, not HOW it's implemented or structured (no mention of JWT, CSV, file paths, libraries, design patterns, architectural decisions, etc.).

### 4.2 Ask for User Selection

Use AskUserQuestion to let user choose:

```yaml
questions:
  - question: "Which changes would you like to apply to specs?"
    header: "Apply"
    multiSelect: true
    options:
      - label: "Create: User Authentication"
        description: "New feature for secure login with session refresh"
      - label: "Update: F-1142 Pet Management"
        description: "Add bulk import capability to existing feature"
      - label: "CR for F-1089: Data Export"
        description: "Create change request for locked feature"
      - label: "Requirement for F-1142"
        description: "Add file format validation requirement"
```

### 4.3 Handle User Response

- **Selected items**: Proceed to create/update
- **"Other" response**: User may provide custom instructions
- **No selection**: Skip spec updates

## Step 5: Apply Changes

### 5.1 Generate IDs

For new entities, generate collision-free IDs:

```bash
# Use the ID generator skill/script
FEATURE_ID=$(./skills/speclan-id-generator/scripts/generate-id.sh feature "$SPECLAN_DIR")
REQ_ID=$(./skills/speclan-id-generator/scripts/generate-id.sh requirement "$SPECLAN_DIR")
```

### 5.2 Create New Features

For each new feature:

1. **Create directory structure:**
   ```bash
   mkdir -p "$SPECLAN_DIR/features/F-####-slug"
   mkdir -p "$SPECLAN_DIR/features/F-####-slug/requirements"
   ```

2. **Write feature file** with YAML frontmatter:
   ```yaml
   ---
   id: F-####
   type: feature
   title: <Title>
   status: under-test
   owner: <from session or "Developer">
   created: "<ISO-8601>"
   updated: "<ISO-8601>"
   goals: []
   ---

   # <Title>

   ## Overview
   <Description from session analysis - focus on WHAT and WHY, not HOW>

   ## Scope
   <Bullet points of functionality - user-facing capabilities, not code details>
   ```

**CRITICAL: Specs must be 100% implementation and architecture agnostic.**

DO NOT include any of the following in specs:

**Implementation Details:**
- File paths, directory names, or code locations
- Class names, function names, or variable names
- Library names, framework references, or technology choices (e.g., "JWT", "Redis", "PostgreSQL")
- API endpoint paths or route definitions
- Database table/column names or schema details
- Code fragments, snippets, or pseudocode
- Configuration file references
- Technical implementation approaches

**Architecture Details:**
- Design patterns used (e.g., "MVC", "event-driven", "microservices", "singleton")
- System architecture decisions (e.g., "monolith vs microservices", "serverless")
- Component relationships or dependencies (e.g., "service A calls service B")
- Data flow or sequence diagrams
- Infrastructure choices (e.g., "deployed on AWS Lambda", "uses message queue")
- Caching strategies, scaling approaches, or performance optimizations
- Internal module boundaries or layering decisions
- Protocol choices (e.g., "REST", "GraphQL", "WebSocket")

DO include:
- User-facing capabilities and behaviors
- Business value and purpose
- Functional requirements (what the system does)
- User stories and acceptance criteria
- Expected outcomes from user perspective

**Example - WRONG:** "JWT-based authentication with refresh tokens stored in Redis"
**Example - RIGHT:** "Secure login that keeps users signed in across sessions"

**Example - WRONG:** "Validates CSV format using the FileValidator class in src/validators/"
**Example - RIGHT:** "Validates uploaded files meet the required format before processing"

**Example - WRONG:** "Uses event-driven architecture with message queues for async processing"
**Example - RIGHT:** "Processes large imports without blocking the user interface"

**Example - WRONG:** "Implements repository pattern with PostgreSQL for data persistence"
**Example - RIGHT:** "Stores and retrieves user data reliably"

### 5.3 Update Existing Features

For features with editable status (draft, review, approved):

1. **Read current file**
2. **Update relevant sections:**
   - Add new scope items (user-facing capabilities only)
   - Update description if needed (keep implementation-agnostic)
   - Add acceptance criteria if applicable
3. **Update `updated` timestamp**
4. **Write file back**

**Remember:** Never add implementation details, architecture decisions, code references, or technical approaches to existing specs.

### 5.4 Create Change Requests

For locked entities (features or requirements in-development, under-test, released):

1. **Generate CR ID:**
   ```bash
   CR_ID=$(./skills/speclan-id-generator/scripts/generate-id.sh change-request "$SPECLAN_DIR")
   ```

2. **Create CR file:**
   ```yaml
   ---
   id: CR-####
   type: changeRequest
   title: <Change title>
   status: pending
   owner: Developer
   created: "<ISO-8601>"
   updated: "<ISO-8601>"
   parentId: <F-#### or R-####>
   parentType: <feature or requirement>
   changeType: enhancement
   description: <Brief description - user-facing, no implementation details>
   changes: |
     <Detailed change narrative - describe WHAT changes for users, not HOW it's implemented>
   ---
   ```

   **Note:** Change request descriptions must also be implementation and architecture agnostic. Describe the user-facing change, not the technical approach or architectural decisions.

3. **Place in correct location (adjacent to target entity):**
   ```
   # For features:
   speclan/features/F-####-slug/change-requests/CR-####-slug.md

   # For requirements:
   speclan/features/.../requirements/R-####-slug/change-requests/CR-####-slug.md
   ```

### 5.5 Create New Requirements

For requirements under existing features:

1. **Generate requirement ID**
2. **Create requirement directory structure:**
   ```bash
   mkdir -p "speclan/features/F-####-parent/requirements/R-####-slug"
   ```
3. **Write requirement file:**
   ```
   speclan/features/F-####-parent/requirements/R-####-slug/R-####-slug.md
   ```
4. **Update parent feature's `updated` timestamp**

## Step 6: Report Results

After applying changes, report:

```markdown
## Spec Sync Complete

### Created
- F-#### User Authentication (speclan/features/F-####-user-authentication/)
- R-#### CSV Validation (speclan/features/F-1142-pet-management/requirements/R-####-csv-validation/)

### Updated
- F-1142 Pet Management - added bulk import scope

### Change Requests Created
- CR-#### for F-1089 Data Export (speclan/features/F-1089-.../change-requests/)
- CR-#### for R-#### (speclan/.../requirements/R-####-.../change-requests/)

### Next Steps
- Review created specs for accuracy
- Assign goals to new features
- Process pending change requests
```

## Edge Cases

### No Speclan Directory

If speclan/ doesn't exist:
1. Ask user if they want to initialize it
2. If yes, create basic structure:
   ```bash
   mkdir -p speclan/goals speclan/features speclan/templates
   ```
3. Proceed with creating new features

### No Identifiable Features

If session has no clear feature work:
- Report: "No significant feature implementations detected in this session"
- Offer to manually describe what to document

### Ambiguous Matches

When a session feature could match multiple existing specs:
- Present options to user
- Let them choose the correct match or create new

## Integration with Other Skills

### SPECLAN Format
Reference for proper file structure and frontmatter fields.

### SPECLAN ID Generator
Use for collision-free ID generation.

### Spec Converter
If user also has speckit, consider syncing there too.
