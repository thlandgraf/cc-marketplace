---
name: speclan:from-bmad
description: Convert BMAD-METHOD planning artifacts to SPECLAN format
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
argument-hint: "[bmad-output-directory]"
---

# SPECLAN From-BMAD Command

Convert BMAD-METHOD planning artifacts (PRD, Epics, Architecture) to SPECLAN hierarchical format.

## Prerequisites

This command requires understanding of both formats:

**BMAD Format** (source):
- Planning artifacts in `_bmad-output/planning-artifacts/`
- PRD with Functional Requirements grouped by Capability Area (`FR#: [Actor] can [capability]`)
- Optional: Epics document with User Stories and BDD Acceptance Criteria
- Optional: Architecture Decision Document with NFRs
- YAML frontmatter with `workflowType`, `stepsCompleted`, `inputDocuments`

**SPECLAN Format** (target):
- Located in `speclan/` directory
- Entity hierarchy: Goal -> Feature -> Child Feature -> Requirement
- YAML frontmatter with proper IDs (G-###, F-####, R-####)
- Directory-based storage with `change-requests/` subdirectories

## Instructions

### 1. Check BMAD Installation

Verify BMAD is installed and has planning artifacts:

```bash
# Check for BMAD installation directory and config
ls _bmad/bmm/config.yaml 2>/dev/null
# Check for planning artifacts output
ls _bmad-output/planning-artifacts/ 2>/dev/null
```

If `_bmad/` does not exist:
```
Error: No BMAD installation found.

Expected: _bmad/ directory with bmm/config.yaml

Install BMAD first: npx bmad-method install
Then create planning artifacts using BMAD workflows.
```

If `_bmad/` exists but `_bmad-output/planning-artifacts/` does not:
```
Error: No BMAD planning artifacts found.

Expected: _bmad-output/planning-artifacts/ with PRD.md

Create planning artifacts using BMAD workflows:
  /bmad-bmm-create-prd
```

### 2. Locate BMAD Artifacts

Locate BMAD planning artifacts in order of priority. Use Glob to find them:

- **Primary:** PRD document — glob `_bmad-output/planning-artifacts/**/[Pp][Rr][Dd]*.md`
- **Secondary:** Epics document — glob `_bmad-output/planning-artifacts/**/[Ee]pic*.md`
- **Tertiary:** Architecture document — glob `_bmad-output/planning-artifacts/**/[Aa]rchitect*.md`

If argument provided, use that directory instead of `_bmad-output/planning-artifacts/`.

**PRD is required.** If no PRD found:
```
Error: No PRD document found in BMAD planning artifacts.

Expected: _bmad-output/planning-artifacts/PRD.md (or similar)

Create a PRD first using BMAD:
  /bmad-bmm-create-prd
```

### 3. Parse BMAD PRD

Read the PRD document and extract structured content:

**3a. Detect BMAD PRD format:**
- Check for `## Functional Requirements` section
- Check for `FR` pattern lines (e.g., `FR1:`, `FR2:`, `- FR1:`)
- Check for YAML frontmatter with `workflowType: 'prd'`

**3b. Extract Executive Summary:**
- Find `## Executive Summary` section
- Extract product vision, target users, problem statement
- Find `### What Makes This Special` subsection if present
- This becomes `vision.md` and `mission.md` content

**3c. Extract Success Criteria:**
- Find `## Success Criteria` section
- Parse whatever `###` subsections exist — common ones include `### User Success`, `### Business Success`, `### Technical Success`, `### Measurable Outcomes`, but not all PRDs have every subsection. Parse all found subsections.
- `### Measurable Outcomes` may use either bullet list or table format (`| Metric | Target | Timeframe |`). Parse both formats.
- Each subsection with measurable outcomes becomes a Goal. If a subsection is absent, skip it — do not synthesize missing categories.

**3d. Extract Product Scope:**
- BMAD PRDs may contain **both** `## Product Scope` (brief feature list by phase) and `## Project Scoping & Phased Development` (detailed phased breakdown with descriptions). Check for both sections.
- If both exist, prefer `## Project Scoping & Phased Development` as the authoritative source — it typically contains richer phase descriptions and feature groupings. Use `## Product Scope` only as a fallback.
- Parse MVP, Growth, Vision phase boundaries from `### MVP (Phase 1)` / `### Post-MVP (Phase 2)` / `### Vision (Phase 3)` subsections (or similar heading patterns).
- Extract feature lists per phase for scope tagging

**3e. Extract Functional Requirements:**
- Find `## Functional Requirements` section
- Parse capability area headers (`### Capability Area Name`)
- Extract individual FRs within each area
- FR format: `FR#: [Actor] can [capability] [context/constraint]` or `- FR#: description`
- Each capability area becomes a Parent Feature
- Each FR becomes a Requirement under its capability area's Feature
- **Detect developer-infrastructure FRs:** FRs where the actor is "Project" or "Build system" (not "System", "Player", or "User") typically describe developer tooling — code organization, linting, test coverage, type checking, naming conventions, architectural boundaries. These are NOT user-facing capabilities. Flag them for reclassification as NFRs under a "Code Quality" category (see step 6).

**3f. Extract Non-Functional Requirements:**
- Find `## Non-Functional Requirements` section
- Parse category headers: `### Performance`, `### Security`, `### Scalability`, `### Accessibility`, `### Integration`
- Each NFR category with requirements becomes a Feature tagged `nfr`
- Individual NFR items become Requirements

**3g. Extract User Journeys (optional):**
- Find `## User Journeys` section
- Parse journey narratives per user type
- Store as context in parent feature descriptions

**3h. Extract Project-Type Requirements:**
- Grep the PRD for project-type-specific sections: `## CLI Tool Requirements`, `## Web App Requirements`, `## API Requirements`, `## Mobile App Requirements`.
- These sections contain additional requirements specific to the project type (e.g., CLI command structure, terminal compatibility, responsive design needs).
- **When a project-type section is found, it MUST produce a dedicated parent feature** (e.g., "CLI Tool Constraints", "Web App Constraints") tagged with the project type (e.g., `cli-tool`) and `scope-mvp`. This feature uses flat structure (requirements directly under parent, `requirements:` field required).
- Parse individual requirements from the section. Each testable requirement becomes a SPECLAN requirement under the project-type parent feature.
- If the section contains only design guidelines (not individually testable), store the entire section as the parent feature's body content — but still create the parent feature as a container.
- **Do NOT silently skip this step.** If a project-type section exists in the PRD but produces zero entities, report it in the output summary as a warning.

### 4. Parse BMAD Epics (if available)

If an epics document is found:

**4a. Parse FR Coverage Map (authoritative FR-to-Epic mapping):**
- Find `### FR Coverage Map` section in the epics document. This section maps each FR to its Epic, e.g.:
  ```
  - FR1: Epic 2 — Alien grid rendering
  - FR2: Epic 3 — Player movement system
  ```
- Parse every line matching pattern `FR\d+:\s+Epic\s+(\d+)` to build an FR-to-Epic lookup table.
- **This is the authoritative source** for which FRs belong to which Epic. Do NOT rely on name-matching between PRD capability area headers and epic titles — they frequently cross boundaries (e.g., an FR under "Game Rendering" in the PRD may be mapped to "Epic 5: Physics System" in the coverage map).
- If no FR Coverage Map section exists, fall back to name-matching between capability areas and epic titles.

**4b. Parse Requirements Inventory (optional):**
- Find `### Requirements Inventory` or `## Requirements Inventory` section.
- This section lists all requirement types: `#### Functional Requirements (FR)`, `#### Non-Functional Requirements (NFR)`, `#### Additional Requirements (AR)`, `#### UX Requirements (UX)`.
- Use this as a cross-reference to verify all requirements are captured.

**4c. Extract Epic structure:**
- Parse `## Epic N: Title` sections
- Extract epic goal descriptions
- Parse `### Story N.M: Title` subsections

**4d. Extract User Stories:**
- Parse story format: `As a [user_type], I want [capability], So that [value_benefit]`
- Extract BDD Acceptance Criteria: `Given/When/Then/And` blocks

**4e. Extract Additional Requirements (AR# and UX#):**
- Find `### Additional Requirements` section within the epics document.
- Parse `#### Architecture-Derived (AR)` subsection for AR# entries (e.g., `AR1: Description`).
- Parse `#### UX-Derived (UX)` subsection for UX# entries (e.g., `UX1: Description`).
- These requirements are **not present in the PRD** — they are generated during epic breakdown and represent architecture-driven and UX-driven additions.
- Each AR# and UX# becomes a SPECLAN Requirement. Assign them to the most relevant parent feature based on their description context. If an AR/UX entry references a specific epic, use the FR Coverage Map logic to place it under that epic's feature.
- Strip AR#/UX# prefixes just like FR# prefixes — SPECLAN entities have their own identity.

**4f. Merge with PRD data:**
- Use the **FR Coverage Map** (from step 4a) to assign each FR to its Epic. Each Epic becomes a Parent Feature; FRs assigned to that Epic become Requirements under it.
- If the FR Coverage Map assigns FRs from multiple PRD capability areas to the same Epic, merge them — the Epic grouping takes precedence over PRD capability area grouping when epics are available.
- Epic stories become Child Features under the matching Parent Feature.
- Story acceptance criteria become Requirement acceptance criteria.
- If an epic has no PRD match (e.g., infrastructure-only epic), create a new Parent Feature from the epic.
- FRs not covered by the FR Coverage Map become Requirements under their original PRD capability area feature.

### 5. Parse BMAD Architecture (if available)

If an architecture document is found:

**5a. Extract additional NFRs:**
- Parse `## Core Architectural Decisions` for decision-derived requirements
- Parse NFR-related sections for measurable criteria not in the PRD

**5b. Extract project context:**
- Note technology stack and patterns for tag context (do NOT embed implementation details in specs)

### 6. Map to SPECLAN Entities

Build the entity tree before generating files:

**Parent Features** (from PRD Capability Areas + Epic alignment):
- One parent feature per capability area
- Title from capability area header (cleaned, no "Capability Area" prefix)
- Tags: `scope-mvp`, `scope-growth`, or `scope-vision` based on Product Scope section
- If epics provide richer structure, prefer epic-derived titles

**Child Features** (from Epic Stories, if epics available):
- One child feature per story within an epic
- User story format preserved in body
- Tags inherit from parent + story-specific priority if present

**Requirements** (from individual FRs, AR#s, and UX#s):
- One requirement per FR, AR, or UX entry
- Title: descriptive language from FR/AR/UX (strip all prefixes: `FR#:`, `AR#:`, `UX#:`, strip actor prefix for title)
- Body: full text plus acceptance criteria if available
- Acceptance criteria in Given/When/Then checkbox format

**NFR Features** (from Non-Functional Requirements):
- One parent feature per NFR category, tagged `nfr`
- NFR features are **flat** -- requirements are placed directly under the parent feature (no child features)
- The parent feature MUST include a `requirements:` field listing all requirement IDs
- **Deduplication with functional requirements:** When an NFR describes the same behavior as an existing functional requirement (e.g., "clean terminal exit" appears as both FR53 and NFR7), the NFR requirement body should cross-reference the functional requirement rather than duplicating acceptance criteria. Use: `Enforces quality attribute for the behavior specified in R-XXXX.` followed by the NFR-specific measurable threshold (e.g., "under all exit conditions including SIGTERM, SIGINT, and uncaught exceptions").

**Developer-Infrastructure FR Reclassification:**
- FRs flagged in step 3e as developer-infrastructure (actor is "Project" or "Build system") MUST be reclassified as NFRs under a **"Code Quality"** parent feature tagged `nfr`.
- Common patterns to reclassify: code organization standards, linting/formatting enforcement, type checking, test coverage requirements, naming conventions, architectural boundary enforcement, build configuration, module system configuration.
- These describe project quality attributes, not user-testable capabilities. In a PRD they would be NFRs; in SPECLAN they belong under an NFR feature.
- When reclassifying, rewrite the requirement title to describe a measurable quality attribute (e.g., "Enforce code linting standards" → "Zero linting violations in continuous integration").

**CRITICAL RULES:**

1. **DO NOT add back-references.** No `## Source` sections linking to BMAD files.

2. **All generated entities get `status: review`** -- converted specs need review, not initial drafts.

3. **Every file body MUST start with `# Title`** -- H1 heading matching the frontmatter `title` field. No content before it. Subsequent sections use `## Heading` (H2) and below.

4. **Directory and file names must be clean** -- Names must match pattern `{PREFIX}-{digits}-{kebab-slug}`. No curly braces, spaces, quotes, or other special characters.

5. **DO NOT carry over BMAD identifiers** into SPECLAN specs. No FR1, FR2, NFR-1, Epic 1, Story 1.2 references. SPECLAN entities have their own identity. Describe requirements in plain language.

6. **DO NOT create template directories.** The command generates `goals/` and `features/` trees only.

7. **Requirements use directory-based storage** -- Each requirement is a directory containing its .md file: `requirements/R-ZZZZ-slug/R-ZZZZ-slug.md`. NEVER store requirements as flat files.

8. **IDs MUST be globally unique** -- Generate -> write -> generate -> write, one batch at a time. The ID generator detects collisions only against files already on disk.

9. **Implementation-agnostic specs** -- Strip technology names, architecture patterns, file paths, library references, and design decisions. SPECLAN specs describe WHAT, never HOW. This applies to ALL entities including goals, success indicators, acceptance criteria, feature Key Entities sections, and NFR requirement bodies.

   **Generalization principle:** The categories and examples below are representative, not exhaustive. Any term describing HOW the system is built internally — data structures, code organization, architecture decisions, internal protocols, design patterns, timing mechanisms — rather than WHAT the user experiences or WHAT quality is achieved must be rewritten to capability language.

   - **Strip technology names**: specific runtimes, frameworks, build tools, test frameworks, linters, libraries, specific file paths. Replace with generic terms: "target runtime version", "type-safe language", "package manager".
   - **Strip architecture patterns**: `state machine`, `event bus`, `game loop`, `immutable state`, `pure function`, `side effects`, `data model(s)`, `emit and subscribe`, and any similar terms describing internal system structure or code organization.
   - **Strip implementation verbs**: "implement X" → just "X"; "define [internal structure]" → "represent [entities] with [attributes]"; "manage [internal mechanism]" → describe the user-visible outcome.
   - **Strip data format specifics**: `JSON file`, `YAML file`, `SQLite` → "local file", "persistent storage".
   - **Strip implementation-specific conventions**: Do not dictate coding conventions (e.g., `kebab-case`, `PascalCase`). Describe the quality attribute instead: "all identifiers follow a consistent, documented naming scheme".
   - **Replace with capability language** — examples:
     - "state machine" → "manage transitions between [phases/states]"
     - "event bus" / "emit and subscribe" → "trigger [action] in response to [events]"
     - "immutable state" / "pure function" → "consistent [state] across [cycles]" or "independently testable with no external dependencies"
     - "data model(s)" → "represent [entities] with [attributes]"
   - **Code Quality NFRs are not exempt**: Architecture language in Code Quality requirements must also be rewritten to describe the quality outcome, not the implementation technique.
   - **Allowed**: Domain-specific standards that ARE the requirement (e.g., "ANSI colors", "Unicode block elements", "UTF-8", "raw mode", "cursor") — these describe WHAT, not HOW

10. **No empty child features** -- Every child feature MUST have at least one requirement. If a BMAD story has no FRs/ARs/UXs assigned via the FR Coverage Map, either: (a) decompose the story's scope items into individual requirements, or (b) merge the story into a sibling child feature. Never create a child feature with `requirements: []`.

### 7. Identify Feature Groupings

Before generating files, finalize the feature hierarchy:

**If only PRD available (no epics):**
- Each capability area = one Parent Feature
- All FRs within a capability area become direct Requirements (flat, no child features)
- Parent feature MUST include `requirements:` field listing all requirement IDs
- NFR categories = additional Parent Features tagged `nfr` (flat, with `requirements:` field)
- Project-type features (from step 3h) = additional Parent Features (flat, with `requirements:` field)

**If PRD + Epics available:**
- Use FR Coverage Map to determine Parent Feature grouping: each Epic = one Parent Feature, with FRs assigned per the coverage map (NOT per PRD capability area)
- Stories within the epic = Child Features under the parent
- FRs assigned to that epic (via coverage map) = Requirements distributed among child features or directly under the parent
- AR# and UX# additional requirements = Requirements assigned to the most relevant parent feature
- FRs not in the coverage map = Requirements under their original PRD capability area feature
- NFR categories = additional Parent Features tagged `nfr` (flat structure — requirements directly under parent, no child features, `requirements:` field required)
- Project-type features (from step 3h) = additional Parent Features (flat structure, `requirements:` field required)

**Flat vs. hierarchical:** Any parent feature without child features (NFR, project-type, PRD-only capability areas) MUST include a `requirements:` field in its frontmatter. This ensures requirements are discoverable by metadata, not just filesystem traversal.

### 8. Generate Entity IDs (Phased)

Generate IDs using the speclan-id-generator JS CLI. IDs are generated **in phases** because `--parent` requires the parent entity to exist on disk.

```bash
SCRIPT="${CLAUDE_PLUGIN_ROOT}/skills/speclan-id-generator/scripts/generate-id.mjs"
```

**Phase A -- Parent feature IDs** (no `--parent`, generated in two batches for sort ordering):

**A1 — FR features first (lower IDs):**
```bash
# Generate IDs for user-facing (non-NFR, non-project-type) parent features FIRST
node "$SCRIPT" --type feature --count <num-capability-area-features> --speclan-root <speclan-dir>
# Output: {"ok":true,"data":{"type":"feature","ids":["F-1234","F-5678",...]}}
```
Parse IDs with `jq -r '.data.ids[]'`. Write FR parent feature files to disk immediately.

**A2 — NFR + project-type features second (higher IDs):**
```bash
# Generate IDs for NFR and project-type parent features AFTER FR features are on disk
node "$SCRIPT" --type feature --count <num-nfr+project-type-features> --speclan-root <speclan-dir>
```
Write NFR/project-type parent feature files to disk immediately.

**Why two batches:** The ID generator assigns sequential IDs from the next available range. By generating FR features first, they get lower IDs. NFR features get higher IDs. This means `ls` and sort-by-ID naturally show user-facing features before quality attributes — matching how users think about specifications.

**Phase B -- Child feature IDs** (with `--parent`, after parent files exist):
```bash
# For each parent feature that has epic stories:
node "$SCRIPT" --type feature --parent F-1234 --count <num-stories> --speclan-root <speclan-dir>
```
Write child feature files to disk immediately after each parent's children are generated.

**Phase C -- Requirement IDs** (with `--parent`, **one feature at a time**):
```bash
# For EACH feature (parent or child) that has requirements:
#   1. Generate requirement IDs for this feature
node "$SCRIPT" --type requirement --parent F-YYYY --count <num-reqs> --speclan-root <speclan-dir>
#   2. Write all requirement files for this feature to disk
#   3. THEN move to the next feature
```
**CRITICAL: Generate and write requirements one feature at a time.** The ID generator detects collisions only against files already on disk.

**Phase D -- Goal IDs** (after all features exist):
```bash
node "$SCRIPT" --type goal --count <num-goals> --speclan-root <speclan-dir>
```

**IMPORTANT:** The pattern at every level is: **generate IDs -> write files to disk -> generate next batch**. Never batch ID generation across multiple parents without writing intermediate results.

### 9. Determine Owner

Get the git identity for the `owner` field on all generated entities:

```bash
OWNER=$(git config user.name)
```

If git user.name is not set, prompt the user for an owner value. Never leave `owner` empty.

### 10. Generate SPECLAN Files

Write files **top-down**: all parent features first (Phase A IDs), then child features (Phase B IDs), then requirements (Phase C IDs). Each level must be on disk before generating the next level's IDs with `--parent`.

#### Parent Feature (one per Capability Area / NFR Category)

```yaml
---
id: F-XXXX
type: feature
title: [from capability area header, cleaned]
status: review
owner: [OWNER from git config]
created: [current date]
updated: [current date]
goals: []  # Updated in Goal Creation step
tags: [scope-mvp]  # or scope-growth, scope-vision based on PRD scope section
source: "bmad:epic-N"  # or "bmad:capability-area-slug" if no epics
---
```

For NFR features (flat structure — requirements directly under parent, no child features):
```yaml
tags: [nfr, scope-mvp]
requirements: [R-XXXX, R-XXXX, ...]  # REQUIRED for NFR features — lists all direct requirements
```

**Directory layout:**

```
speclan/features/F-XXXX-slug/
├── F-XXXX-slug.md              <- parent feature file
├── F-YYYY-child-1/             <- child feature (sibling of parent .md)
│   ├── F-YYYY-child-1.md
│   └── requirements/
│       └── R-ZZZZ-req/
│           └── R-ZZZZ-req.md
└── F-YYYY-child-2/             <- another child feature
    └── ...
```

**IMPORTANT: Child feature directories are SIBLINGS of the parent .md file, NOT nested inside a subdirectory named after the parent.**

**Body content:** Must start with `# Title`. Then: Overview (from PRD context), Scope (In/Out), Key Entities, Success Criteria (as checkboxes).

#### Child Feature (one per Epic Story, if epics available)

```yaml
---
id: F-YYYY
type: feature
title: [from story title, descriptive]
status: review
owner: [OWNER from git config]
created: [current date]
updated: [current date]
goals: []  # Updated in Goal Creation step
requirements: [R-XXXX, R-XXXX, ...]
tags: [scope-mvp]
source: "bmad:story-N.M"  # e.g., "bmad:story-3.2"
---
```

**Directory:** `speclan/features/F-XXXX-parent/F-YYYY-child/`
**Body content:** Must start with `# Title`. Then: User Story (As a... I want... so that...), Scope, Business Context.

#### Requirement (one per FR)

```yaml
---
id: R-ZZZZ
type: requirement
title: [descriptive title from FR -- no FR numbers, no actor prefix]
status: review
owner: [OWNER from git config]
created: [current date]
updated: [current date]
feature: F-YYYY
source: "bmad:FR23"  # or "bmad:AR5", "bmad:UX3" for additional requirements
---
```

**Directory:** Under parent or child feature: `requirements/R-ZZZZ-slug/R-ZZZZ-slug.md`

Requirements use **directory-based storage** (directory name matches file name):
```
CORRECT:  requirements/R-ZZZZ-slug/R-ZZZZ-slug.md
WRONG:    requirements/R-ZZZZ-slug.md  <- flat file, NEVER do this
```

**Body content:** Must start with `# Title`. Then: Description (plain language, implementation-agnostic), Acceptance Criteria (Given/When/Then checkboxes). If the original BMAD FR had acceptance criteria or the matching epic story had BDD criteria, convert them to:

```markdown
## Acceptance Criteria

- [ ] **Given** [precondition]; **When** [action]; **Then** [expected outcome]
```

**CRITICAL: Single-line format.** Each acceptance criterion MUST be a single `- [ ]` line with Given/When/Then separated by semicolons. Multi-line format breaks markdown checkbox rendering — the When/Then become orphaned paragraphs outside the checkbox.

### 11. Create Goals

After all features and requirements are generated, analyze the full set of features and synthesize Goals from PRD Success Criteria:

1. **Map Success Criteria to Goals:**
   - `### User Success` subsection -> one Goal focused on user outcomes
   - `### Business Success` subsection -> one Goal focused on business metrics
   - `### Technical Success` subsection -> one Goal focused on technical quality
   - If subsections have distinct measurable outcomes, create separate Goals per outcome cluster

2. **Create one Goal per theme:**

```yaml
---
id: G-XXX
type: goal
title: [from success criteria theme]
status: review
owner: [OWNER from git config]
created: [current date]
updated: [current date]
contributors:
  - F-XXXX
  - F-YYYY
source: "bmad:success-criteria:user"  # or :business, :technical
---
```

Body content: Must start with `# Title`. Then: Overview (what this goal achieves and why), Success Indicators (measurable outcomes from PRD success criteria), Contributing Features (linked list).

3. **Assign contributing features** -- Map each parent feature to the Goal(s) it most contributes to. Each parent feature should have at least one Goal. A feature can contribute to multiple Goals.

4. **Update feature `goals:` arrays** -- Set `goals: [G-XXX]` on each parent feature and propagate to its children.

5. **Create `speclan/goals/` directory** and write goal files as flat files: `G-XXX-slug.md`.

### 12. Create Vision and Mission

After the full specification tree is generated (features, requirements, AND goals), create Vision and Mission files.

**Vision** (`speclan/vision.md`):
```markdown
# Vision

[From PRD Executive Summary vision statement. One paragraph: the aspirational future state the product enables. Forward-looking, inspirational. Implementation-agnostic.]
```

**Mission** (`speclan/mission.md`):
```markdown
# Mission

[From PRD Executive Summary problem/solution statement. One paragraph: what the product does, for whom, and how it delivers value. Present-tense, concrete. Implementation-agnostic.]
```

### 13. Cross-Link Entities

After the full specification tree exists on disk, scan all generated files and insert inline relative markdown links wherever one spec's prose mentions functionality defined in another spec.

**Step 1 — Goal contributing-features links (mandatory):**

Goal files have a `contributors:` frontmatter field listing feature IDs. For each goal, generate a "Contributing Features" section in the body with **mandatory links** to every contributing feature. Do NOT rely on text matching for these — generate them directly from the `contributors` array:

```markdown
## Contributing Features

- [Core Gameplay](../features/F-0471-core-gameplay/F-0471-core-gameplay.md) — alien grid, player controls, scoring
- [Audio Engine](../features/F-0180-audio-engine/F-0180-audio-engine.md) — synthesized march bassline and effects
```

Every feature ID in `contributors` MUST have a working markdown link. Since goals live in `speclan/goals/`, the path is always `../features/F-XXXX-slug/F-XXXX-slug.md`.

**Step 2 — Build entity index:**

Collect all generated entities into a lookup table:

```
{ title (lowercase) → relative file path from speclan/ }
{ slug keywords → relative file path from speclan/ }
```

For each entity, index:
- Full title (e.g., "Destructible Shields")
- Significant title fragments (e.g., "shield erosion", "alien grid", "march bassline")
- Slug keywords from the directory name (e.g., `F-0384-destructible-shields` → "destructible shields", "shields")
- Do NOT index generic words ("Core", "System", "Management")

**Step 3 — Scan and link:**

For each generated `.md` file (except goals — already handled in step 1), scan the **body content only** (below the closing `---` of frontmatter):
- Match mentions of other entities' titles or key phrases (case-insensitive)
- Replace the **first occurrence** in each file with a relative markdown link
- Compute the relative path from the current file's directory to the target file

**Priority scan sections** (most likely to contain cross-references):
1. **Out of Scope** — explicitly names what other features handle
2. **Overview / Business Context** — often references related capabilities
3. **In Scope** — may mention adjacent feature boundaries
4. **Success Criteria** — may reference related quality attributes
5. **Acceptance Criteria in requirements** — may reference related features

Example — in `F-0024-core-gameplay.md`:
```markdown
# Before:
- Shield rendering and erosion (covered by Destructible Shields)

# After:
- Shield rendering and erosion (covered by [Destructible Shields](../F-0414-destructible-shields/F-0414-destructible-shields.md))
```

**Rules:**
- **First mention only** — link the first occurrence per target per file, not every mention
- **No self-links** — never link an entity to its own file
- **Body only** — never modify frontmatter or the `# Title` H1 heading
- **Don't nest links** — skip text already inside a markdown link `[...](...)`
- **Relative paths from the file's own directory** — compute the correct `../` depth from the linking file to the target file. Child features need `../../F-XXXX-sibling/...`. Never use paths relative to `speclan/` root — always relative to the file doing the linking.
- **Parent ↔ child links** — parent feature bodies that mention child features should link to them, and vice versa
- **Cross-feature links** — Out of Scope, Overview, Business Context, and In Scope sections are all prime link targets
- **Scan ALL files** — do not skip any generated file. Every parent feature, child feature, and requirement must be scanned. Partial cross-linking (linking only a few features) defeats the purpose.

**Step 4 — Verify:**
- Spot-check 3-5 files to confirm links resolve correctly
- **Verify goal links** — open each goal file and confirm EVERY contributor has a working markdown link starting with `../features/`
- **Verify cross-feature links** — confirm at least half of parent features have at least one cross-link to another feature
- Confirm no links appear inside frontmatter
- Confirm no self-links

### 14. Output Summary

```
## Conversion Complete

Converted BMAD planning artifacts to SPECLAN hierarchical format.

### Source Documents
- PRD: [path]
- Epics: [path or "not found"]
- Architecture: [path or "not found"]

### Created Entities
| Type | Count |
|------|-------|
| Goals | X |
| Parent Features | Y |
| Child Features | Z |
| Requirements | W |

### Structure
speclan/
├── vision.md
├── mission.md
├── goals/
│   └── G-XXX-strategic-theme.md
└── features/
    └── F-XXXX-capability-area/
        ├── F-XXXX-capability-area.md
        ├── F-YYYY-story-1/
        │   ├── F-YYYY-story-1.md
        │   └── requirements/
        │       └── R-ZZZZ-description/
        │           └── R-ZZZZ-description.md
        └── F-YYYY-story-2/
            └── ...

### Next Steps
1. Review converted specifications: check entity titles and descriptions
2. Review goal groupings and adjust if needed
3. Adjust feature hierarchy if needed
4. Approve specs ready for development: change status to `approved`

### View Your Specs
Install the SPECLAN VS Code extension for the best viewing experience:
https://marketplace.visualstudio.com/items?itemName=DigitalDividend.speclan-vscode-extension

More info: https://speclan.net
```

## Re-Import (Incremental Conversion)

When `speclan/features/` already contains entities, the command operates in **re-import mode**. Re-import respects the SPECLAN status lifecycle — editable specs are updated in place, locked specs get change requests.

### Step 1: Build Provenance Index

Grep `speclan/` for entities with `source: "bmad:` in their YAML frontmatter. Build a lookup table:

```
{ source-identifier → file-path, current-status }
```

For example:
```
bmad:FR23 → speclan/features/F-1234-rendering/requirements/R-5678-grid-display/R-5678-grid-display.md, status: in-development
bmad:epic-3 → speclan/features/F-1234-rendering/F-1234-rendering.md, status: review
```

If no `source:` fields are found but entities exist, warn the user that provenance tracking is not available and ask whether to proceed with a full re-import (skip/overwrite) or cancel.

### Step 2: Match and Decide

For each incoming BMAD element, look up its source identifier in the provenance index:

| Existing Status | Action |
|---|---|
| **Not found** | Create new entity (normal first-run flow with `source:` field) |
| `draft` / `review` / `approved` | **Update in place** — overwrite body content, update `updated:` timestamp. Preserve `id`, `status`, `owner`, `created`. |
| `in-development` / `under-test` / `released` | **Create Change Request** — generate a `CR-####` in the entity's `change-requests/` directory with `changeType: enhancement`, `description` summarizing what changed, and `changes` containing the updated content. |
| `deprecated` | **Skip** — log a warning, do not touch the entity. |

**Change Request generation for locked entities:**

```yaml
---
id: CR-XXXX
type: changeRequest
title: "Re-import update: [brief description of change]"
status: pending
owner: [OWNER from git config]
created: [current date]
updated: [current date]
parentId: [locked entity ID, e.g., R-5678]
parentType: [requirement or feature]
changeType: enhancement
description: "Updated content from BMAD re-import. Source: [bmad identifier]"
changes: |
  [Full updated content from the BMAD source, ready to be applied
  when the change request is approved and merged.]
---
```

Generate CR IDs using the speclan-id-generator:
```bash
node "$SCRIPT" --type change-request --count 1 --speclan-root <speclan-dir>
```

### Step 3: Detect Orphans

After processing all incoming BMAD elements, check for SPECLAN entities with `source: "bmad:*"` that were NOT matched by any incoming element. These are **orphans** — entities that existed in the previous BMAD version but are no longer present.

List orphans for user attention:
```
### Orphaned Entities (removed from BMAD source)
| Entity | Source | Status | Path |
|--------|--------|--------|------|
| R-5678 | bmad:FR42 | review | speclan/features/.../R-5678-slug.md |

These entities have source references to BMAD elements that no longer exist.
Options: keep as-is, deprecate, or delete manually.
```

Do NOT auto-delete orphans.

### Step 4: Re-Import Summary

Include re-import statistics in the output summary:

```
### Re-Import Stats
| Action | Count |
|--------|-------|
| Created (new) | X |
| Updated (editable) | Y |
| Change Requests (locked) | Z |
| Skipped (deprecated) | W |
| Orphaned (removed from source) | V |
```

## Error Handling

If PRD has no Functional Requirements section:
```
Error: PRD does not contain a Functional Requirements section.

Expected: ## Functional Requirements
With subsections: ### Capability Area Name
And FR lines: FR1: [Actor] can [capability]

The PRD may be incomplete. Create or complete the PRD using:
  /bmad-bmm-create-prd
  /bmad-bmm-edit-prd
```

If PRD format is unrecognized:
```
Warning: PRD format does not match BMAD standard.

Missing: [list of missing sections]
Found: [list of found sections]

Attempting best-effort conversion from available content...
```
