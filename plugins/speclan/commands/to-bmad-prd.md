---
name: speclan:to-bmad-prd
description: Generate a BMAD-standard PRD directly from approved SPECLAN specifications (standalone converter, no BMAD skills required)
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Skill
argument-hint: "[feature-ids...]"
---

# SPECLAN To-BMAD-PRD Command

Generate a BMAD-standard PRD (Product Requirements Document) directly from approved SPECLAN specifications using a standalone converter. This approach does NOT require BMAD skills to be installed — it builds the PRD using SPECLAN's own mapping rules.

For the BMAD-native approach (richer output, requires BMAD skills), use `/speclan:to-bmad` instead.

## Prerequisites

This command requires:
- **BMAD-METHOD installed** in the project (`_bmad/` directory)
- **Approved SPECLAN specifications** to convert

## Instructions

### 1. Check BMAD Installation

Verify BMAD is installed by checking for the `_bmad/` directory:

```bash
ls _bmad/ 2>/dev/null
```

If `_bmad/` does not exist:
```
Error: BMAD-METHOD is not installed in this project.

Install BMAD first: npx bmad-method install

The /speclan:to-bmad-prd command generates a BMAD-compatible PRD
that integrates with BMAD's validation and editing workflows.
```

Ensure the output directory exists (create if missing):
```bash
mkdir -p _bmad-output/planning-artifacts
```

Also read the BMAD config for project metadata:
```bash
cat _bmad/bmm/config.yaml 2>/dev/null
```

### 2. Check for Existing PRD

Look for an existing PRD in the output directory using Glob:

- Glob pattern: `_bmad-output/planning-artifacts/**/[Pp][Rr][Dd]*.md`

If a PRD exists, warn the user:
```
Warning: Existing PRD found at _bmad-output/planning-artifacts/PRD.md

Options:
1. Overwrite the existing PRD
2. Write to a different path
3. Cancel

What would you like to do?
```

Wait for user confirmation before proceeding.

### 3. Find Approved Features

Query SPECLAN directory for features with `status: approved`:

```bash
QUERY_SCRIPT="${CLAUDE_PLUGIN_ROOT}/skills/speclan-query/scripts/query.sh"
bash "$QUERY_SCRIPT" --type feature --filter-status approved --full <speclan-dir>
```

**Note:** The speclan-dir is a **positional argument** (last argument), NOT a named flag.

**If specific feature IDs provided as arguments:**
- Only include specified features
- Verify each is approved (warn if not)
- Allow override with confirmation:
```
/speclan:to-bmad-prd F-1001 F-1003

Including specified features:
- F-1001: approved [checkmark]
- F-1003: draft [warning] (not approved)

Proceed with F-1003 despite draft status? [y/N]
```

**If no approved features found:**
```
No approved features found for PRD generation.

To approve features for export:
1. Review features: change status from 'draft'/'review' to 'approved'
2. Run /speclan:to-bmad-prd again

Current feature statuses:
| Feature | Status |
|---------|--------|
| F-1001 | draft |
| F-1002 | review |
| ... | ... |
```

### 4. Collect SPECLAN Content

For each approved feature (or specified features), gather the full specification tree:

**4a. Read vision and mission:**
- Read `speclan/vision.md` (if it exists)
- Read `speclan/mission.md` (if it exists)

**4b. Read Goals:**
- Find all goals that reference the included features via `contributors` field
- Extract goal titles, success indicators, and measurable outcomes

**4c. Read Parent Features:**
- Read each approved parent feature's full content
- Note scope tags (`scope-mvp`, `scope-growth`, `scope-vision`) for phased development
- Note `nfr` tag for Non-Functional Requirements categorization

**4d. Read Child Features:**
- For each parent feature, find child feature directories
- Read child feature content (user stories, scope)

**4e. Read Requirements:**
- For each feature (parent or child), read all requirements
- Extract titles, descriptions, acceptance criteria
- Note the parent feature for FR grouping

### 5. Determine Project Context

Extract context for PRD metadata:

```bash
# Get project name from BMAD config if available
PROJECT_NAME=$(grep "project_name:" _bmad/bmm/config.yaml 2>/dev/null | sed 's/project_name: *//' | tr -d '"'"'")

# Get author
AUTHOR=$(git config user.name)

# Get date
DATE=$(date +%Y-%m-%d)
```

If project name not found in BMAD config, derive from the repository name or ask the user.

### 6. Generate BMAD PRD

Construct the PRD document following BMAD's standard structure. The generated PRD must be compatible with `/bmad-bmm-validate-prd` and `/bmad-bmm-edit-prd` workflows.

#### SPECLAN Traceability Links

All generated PRD sections include markdown links back to source SPECLAN files (relative to project root). This creates bidirectional traceability for downstream BMAD workflows:

- **FR/NFR lines** → link to the source requirement file (`R-####`)
- **Capability area / NFR category headers** → link to the parent feature file (`F-####`)
- **Product Scope feature bullets** → link to the feature file
- **User Journey prose** → link features on first mention
- **Project-type section prose** → link requirements inline

Link format: `([R-####](speclan/features/F-####-name/.../R-####-name/R-####-name.md))`

#### PRD Structure

```markdown
---
stepsCompleted: [generated-from-speclan]
inputDocuments: [speclan-specifications]
workflowType: 'prd'
date: '{DATE}'
lastEdited: '{DATE}'
classification:
  projectType: {PROJECT_TYPE}  # from BMAD config, omit if unknown
  domain: {DOMAIN}             # from BMAD config, omit if unknown
  complexity: {COMPLEXITY}     # from BMAD config, omit if unknown
---

# Product Requirements Document - {PROJECT_NAME}

**Author:** {AUTHOR}
**Date:** {DATE}
```

**Frontmatter rules:**
- Always include `date` and `lastEdited` in frontmatter for downstream tooling. Both are set to the generation date.
- Include `classification` fields when available from `_bmad/bmm/config.yaml`
- If BMAD config has no classification, omit the `classification` block entirely rather than using placeholders

#### Section 1: Executive Summary

Source: `speclan/vision.md` + `speclan/mission.md` + top-level feature overview.

```markdown
## Executive Summary

{Content from vision.md, reformulated as executive summary prose.
Describe the product, who it's for, what problem it solves, and the proposed approach.
If vision.md is missing, synthesize from the feature set.}

### What Makes This Special

{Key differentiators derived from vision.md or unique aspects of the feature set.
What sets this product apart from alternatives.}
```

Keep this section concise and high-impact. Zero fluff.

#### Section 2: Success Criteria

Source: Goals (`G-###`). Map each Goal to the appropriate success category based on the Goal's `source:` field or content.

**Category mapping from Goal `source:` field:**
- `source: "bmad:success-criteria:user"` → `### User Success`
- `source: "bmad:success-criteria:business"` → `### Business Success`
- `source: "bmad:success-criteria:technical"` → `### Technical Success`
- `source: "bmad:success-criteria:measurable-outcomes"` → `### Measurable Outcomes`
- No source or ambiguous → classify by content (user-facing outcomes, business metrics, technical quality)

```markdown
## Success Criteria

### User Success
{Goals focused on user outcomes. Each as a measurable statement.}

### Business Success
{Goals focused on business metrics. Each as a measurable statement.}

### Technical Success
{Goals focused on technical quality. Each as a measurable statement.}

### Measurable Outcomes
{Consolidated list of UNIQUE specific, measurable targets with clear metrics.
Format as numbered items. Use table format when metrics have clear
Target + Measurement columns.}
```

**Only include subsections that have goals.** If no Business Success goals exist, omit that subsection.

**Measurable Outcomes deduplication:** Items in Measurable Outcomes must NOT duplicate items already stated in User/Business/Technical Success subsections. If a measurable target is already listed under a specific category (e.g., "30fps sustained" in Technical Success), do NOT repeat it in Measurable Outcomes. Measurable Outcomes should consolidate targets that span categories or add metrics not covered by the category subsections.

If no Goals exist, synthesize success criteria from the feature set scope and descriptions.

#### Section 3: Product Scope

Source: Features organized by scope tags + vision.md for rationale.

BMAD PRDs have rich scope sections — not just bare bullet lists. Generate a scope section with context and rationale.

```markdown
## Product Scope

### MVP Feature Set (Phase 1)

{One-paragraph rationale: what defines the MVP boundary and why.
Synthesize from vision.md + the feature set. E.g., "The minimum feature set
that delivers [core value from vision]. If [domain boundary], MVP doesn't need it."}

{Features tagged scope-mvp, listed with brief descriptions.
Format: bullet list with linked feature title — one-line summary from feature overview.
E.g., - [Core Gameplay](speclan/features/F-0471-core-gameplay/F-0471-core-gameplay.md) — alien grid, cannon, shooting, scoring
Each bullet should convey WHY this feature is MVP-essential, not just WHAT it does.}

### Post-MVP Features (Phase 2)
{Features tagged scope-growth. If none, omit this subsection entirely.}

### Vision (Phase 3)
{Features tagged scope-vision. If none, omit this subsection entirely.}
```

**When all features are MVP (no growth/vision tags):**
```markdown
### MVP Feature Set (Phase 1)

{Rationale paragraph as above.}

{Full feature list.}

> Note: All approved features are scoped to MVP. No phased post-MVP or vision features defined.
```

**Do NOT generate empty phase subsections** — only include phases that have features.

**Out of Scope subsection:** Scan feature "Out of Scope" sections and synthesize an explicit `### Out of Scope` subsection. This prevents scope creep and helps BMAD downstream agents understand boundaries.

```markdown
### Out of Scope

{Consolidated list of explicitly excluded capabilities from feature Out of Scope sections.
Group by theme. Only include items that are meaningful exclusions, not obvious ones.}
```

If no features have "Out of Scope" sections, synthesize from the scope boundary (e.g., "Features not in the 1978 original are out of scope for MVP") or omit with a note: `> No explicit out-of-scope items defined. Use /bmad-bmm-edit-prd to add scope boundaries.`

#### Section 4: User Journeys

Source: Synthesized from `vision.md`, `mission.md`, feature user stories, feature scope sections, and requirement acceptance criteria.

Generate **multiple distinct journeys** (typically 3-4) covering different user interaction patterns. BMAD PRDs use rich, narrative-style journeys — not thin bullet lists.

**Journey archetypes to generate (when supported by the feature set):**

1. **Primary Success Path** — First-time user experience from discovery through core workflow to satisfying outcome. Opening Scene → Rising Action → Climax → Resolution.
2. **Return/Retention Journey** — Experienced user returning for depth, mastery, or repeated value. Shows features that reward return usage.
3. **Edge Case/Resilience Journey** — User encountering error conditions, degraded environments, or boundary situations. Shows robustness features (error handling, graceful degradation, recovery).
4. **Social/Sharing Journey** (if applicable) — User sharing or collaborating. Shows viral, distribution, or team features.

**How to synthesize journeys from SPECLAN data:**
- **Vision + Mission** → establish the user persona and emotional arc
- **Feature user stories** (As a... I want... So that...) → individual interactions to weave into narrative
- **Feature scope sections** → what's in/out determines journey boundaries
- **Requirement acceptance criteria** (Given/When/Then) → concrete interaction details
- **NFR features** → edge case and resilience journey material (terminal hygiene, graceful degradation, cross-platform)
- **Goal success indicators** → define what "success" looks like in each journey

```markdown
## User Journeys

### Journey 1: {Persona}'s {Scenario} ({Archetype})

{Rich narrative prose with named persona. BMAD's story structure:}

**Opening Scene:** {Context, motivation, entry point. Set the stage.}

**Rising Action:** {Core interactions, building engagement. Reference specific capabilities with SPECLAN links where a feature is first mentioned, e.g., "the [shields](speclan/features/F-0384-destructible-shields/F-0384-destructible-shields.md) erode under fire".}

**Climax:** {Peak moment — achievement, tension, or challenge.}

**Resolution:** {Outcome, satisfaction, next action. Emotional takeaway.}

**Reveals:** {Comma-separated list of capabilities exercised by this journey.}

### Journey 2: {Persona}'s {Scenario} ({Archetype})
{...}

### Journey 3: {Persona}'s {Scenario} ({Archetype})
{...}

### Journey Requirements Summary

| Journey | Key Capabilities Revealed |
|---------|--------------------------|
| {Journey 1 name} | {Feature areas touched, with SPECLAN links to key features} |
| {Journey 2 name} | {Feature areas touched} |
| {Journey 3 name} | {Feature areas touched} |
```

**Quality bar:** Each journey should be 100-200 words of vivid narrative prose. The persona should have a name and context. Journeys should collectively cover all major feature areas. If SPECLAN data is too thin for rich narratives, generate shorter journeys and note this for the user to refine with `/bmad-bmm-edit-prd`.

#### Section 5: Functional Requirements

Source: Requirements (`R-####`) from non-NFR features, grouped by their parent Feature (= Capability Area).

```markdown
## Functional Requirements

{N} functional requirements across {M} capability areas. Each traces to MVP capabilities and user journeys above.

### {Parent Feature Title} ([F-####](speclan/features/F-####-name/F-####-name.md))

- **FR1:** {Actor} can {capability} ([R-####](speclan/features/.../requirements/R-####-name/R-####-name.md))
- **FR2:** {Next requirement} ([R-####](speclan/...))
- **FR3:** ...

### {Next Parent Feature Title} ([F-####](speclan/features/...))
- **FR4:** ... ([R-####](speclan/...))
- **FR5:** ... ([R-####](speclan/...))
```

**Preamble line:** Include a count summary (e.g., "55 functional requirements across 9 capability areas.") before the first capability area heading. This helps reviewers quickly assess density.

**FR formatting rules (BMAD standard):**
- Format: `**FR#:** [Actor] can [capability] [context/constraint if needed] ([R-####](speclan/path/to/requirement.md))`
- **SPECLAN traceability link:** Each FR line ends with a markdown link to the source SPECLAN requirement file. The link path is relative to project root. Capability area headers link to the parent feature file.
- **Implementation-agnostic: describe WHAT, not HOW.** Use the exact language from the SPECLAN requirement. Do NOT introduce technology names, tool names, or implementation details that are not present in the SPECLAN source. **Preserve** examples and specifics that already exist in the SPECLAN source (e.g., if the spec says "package runner (e.g., npx)", keep the example). Only prevent **adding** new implementation details not in the source. If it says "local file", do NOT specify "JSON file" unless the source says so.
- Each FR is testable and specific
- Number FRs sequentially across all capability areas (FR1, FR2, ... FRN)
- Group by capability area (parent feature), not by technology layer

**NFR features (tagged `nfr`) go to Non-Functional Requirements section, not here.**

**Capability area balancing:** When a parent feature has many requirements (roughly >15 FRs), the capability area becomes hard to review. If the parent feature has child features, split the capability area into sub-areas using child feature titles as `### Sub-Area` headings under the parent `### Area` heading. This creates a natural grouping like:

```markdown
### Core Gameplay ([F-0471](speclan/features/F-0471-core-gameplay/F-0471-core-gameplay.md))

#### Alien Grid & Rendering ([F-0492](speclan/features/.../F-0492-alien-grid-movement/F-0492-alien-grid-movement.md))
- **FR1:** ... ([R-####](speclan/...))
- **FR2:** ... ([R-####](speclan/...))

#### Player Controls & Movement ([F-0159](speclan/features/.../F-0159-player-cannon-movement/F-0159-player-cannon-movement.md))
- **FR3:** ... ([R-####](speclan/...))
```

Only split when there are child features to use as natural grouping boundaries. Do not artificially split a flat feature.

#### Section 6: Non-Functional Requirements

Source: Features/Requirements tagged `nfr`.

```markdown
## Non-Functional Requirements

{N} non-functional requirements across {M} categories.{Optional: note omitted categories, e.g., "Security, scalability, and integration are intentionally omitted — they don't apply to [reason]."}

### {NFR Category Title} ([F-####](speclan/features/F-####-name/F-####-name.md))

- **NFR1:** {Specific, measurable criterion with measurement method} ([R-####](speclan/...))
- **NFR2:** {Next criterion} ([R-####](speclan/...))

### {Next NFR Category Title} ([F-####](speclan/...))

- **NFR3:** ... ([R-####](speclan/...))
```

**NFR formatting rules (BMAD standard):**
- Format: `**NFR#:** [measurable criterion] ([R-####](speclan/path/to/requirement.md))` — use `NFR#:` prefix with sequential numbering across all categories (NFR1, NFR2, ... NFRN)
- **SPECLAN traceability link:** Each NFR line ends with a markdown link to the source SPECLAN requirement file. NFR category headers link to the parent NFR feature file.
- Each NFR must be specific, measurable, and include a measurement method or threshold
- Number sequentially across all NFR categories (not restarting per category)
- Use the SPECLAN requirement's language — do NOT introduce implementation details

Only include NFR categories that have actual requirements. Common BMAD categories:
- Performance
- Security
- Scalability
- Cross-Platform Compatibility
- Robustness
- Usability
- Accessibility

If no NFR-tagged features exist, omit this section entirely rather than generating placeholder content.

#### Section 7: Project-Type Requirements (conditional)

Source: BMAD config `classification.projectType` from `_bmad/bmm/config.yaml` + SPECLAN features/requirements that describe project-type constraints.

```bash
PROJECT_TYPE=$(yq -r '.classification.projectType // empty' _bmad/bmm/config.yaml 2>/dev/null)
```

If a project type is detected, generate the appropriate section:

| projectType | PRD Section |
|---|---|
| `cli` or `cli_tool` | `## CLI Tool Requirements` |
| `web` | `## Web App Requirements` |
| `api` | `## API Requirements` |
| `mobile` | `## Mobile App Requirements` |

Look for SPECLAN features whose titles or tags suggest project-type constraints (e.g., features tagged `cli-tool`, `cli-constraints`, `web-constraints`, or features with titles like "CLI Tool Constraints").

**When a project-type feature is found, generate a RICH section — not just FR lines.** BMAD's project-type sections contain narrative context, interaction models, and compatibility details that downstream agents (architect, PM) rely on. Read the feature's body content (Overview, Scope, Success Criteria) and its requirements to reconstruct:

**For CLI projects (`## CLI Tool Requirements`):**
```markdown
## CLI Tool Requirements

{Opening paragraph from feature overview: what kind of CLI tool this is,
how it differs from typical CLIs (e.g., full-screen interactive vs pipeline tool).}

### Command Structure
{Reconstruct from requirements: flags, options, subcommands (or lack thereof).
Show the command usage pattern.}

### {Interaction Model}
{From feature scope and requirements: input handling, output format,
terminal takeover behavior, restoration requirements.}

### {Data/State} (if applicable)
{From requirements mentioning persistence, storage, or state management.
Describe format, location patterns, error handling.}

### {Platform Compatibility} (if applicable)
{From cross-platform features/requirements: supported platforms,
known limitations. Use table format when multiple platforms listed.}
```

**For Web/API/Mobile projects, follow a similar pattern:**
- Web: responsive design, browser compatibility, progressive enhancement, accessibility
- API: endpoint structure, authentication, versioning, rate limits
- Mobile: platform support, offline behavior, push notifications, native integration

**Subsection headings are derived from the feature's actual content** — use what the SPECLAN data supports. If the feature only has a thin Overview and 3-4 requirements, generate a shorter section with just the context paragraph and FRs. Do NOT fabricate subsections without source data.

**FRs in project-type sections use the same `FR#:` sequential numbering** continuing from the Functional Requirements section. Each FR line includes a SPECLAN traceability link, same as in the Functional Requirements section. Inline prose references to requirements or features should also include SPECLAN links (e.g., "supports `--no-audio` ([R-0474](speclan/...))").

If no project-type features exist but the project type is known, add a placeholder note:

```markdown
## {Project Type} Requirements

> Project type detected from BMAD config. No project-type-specific constraints defined in SPECLAN.
> Use /bmad-bmm-edit-prd to add project-type requirements.
```

If no project type is configured, omit this section entirely.

### 7. Write PRD File

Write the generated PRD:

```bash
PRD_PATH="_bmad-output/planning-artifacts/PRD.md"
```

Or use user-specified path if provided.

### 8. Quality Check Pass

After writing, scan the generated PRD for common quality issues before presenting the summary.

**8a. FR/NFR Implementation Leak Detection:**

**Generalization principle:** The categories below are representative, not exhaustive. Any term describing HOW the system is built internally — data structures, code organization, architecture decisions, design patterns, timing mechanisms — rather than WHAT the user experiences or WHAT quality is achieved should be flagged and rewritten.

Scan all generated FR and NFR lines for implementation terms. Flag and rewrite any matches:

| Pattern category | Examples | Rewrite direction |
|---|---|---|
| Architecture patterns | `state machine`, `event bus`, `game loop`, `immutable state` | Describe the capability: "manage transitions", "trigger [action] in response to [events]" |
| Code patterns | `pure function`, `side effects`, `emit and subscribe` | Describe the quality: "independently testable", "consistent behavior" |
| Data structures | `data model(s)`, internal representations | Describe the entities: "represent [things] with [attributes]" |
| Implementation verbs | `implement [X]`, `define [structure]` | Drop the verb or describe the outcome |
| Data formats | `JSON file`, `YAML file`, `SQLite` | Use "local file", "persistent storage" |
| Internal timing | `tick`, `frame buffer`, `render pass` | Use observable measurements: time thresholds, "without visible [artifact]" |

**8b. Developer-Infrastructure FR Detection:**

Scan FR actors — any FR where the actor is "Project" or "Build system" should have been placed in NFRs (Code Quality). If found in FRs, warn in the output summary.

**8c. NFR Measurement Method Check:**

Scan all generated NFR lines. Each NFR must contain at least one of three acceptable measurement forms:

1. **Numeric threshold**: a concrete number with units (e.g., `< 33ms`, `< 500ms`, `> 80%`, `under 1MB`)
2. **Verification method**: an explicit how-to-verify clause (e.g., `verified by screenshot comparison on each platform`, `as measured by profiler trace`)
3. **Concrete test protocol**: a specific test scenario with pass/fail criteria (e.g., `play-tester completing first wave without instructions`)

Flag NFRs that lack ALL three forms. Common violations:
- "perceptible" / "imperceptible" — needs a threshold or verification method
- "consistent" — needs a definition of what consistency means + how to verify
- "non-blocking" — architecture term, replace with a time threshold (e.g., `< 500ms`)
- "current and LTS versions" — specify the runtime name and version policy (e.g., `Node.js current and active LTS releases`)
- Subjective terms without test protocol (e.g., "without reading documentation" needs `verified by play-tester completing X without Y`)

Report flagged NFRs in the summary for user attention.

**8d. Prose Section Leak Detection:**

Scan prose sections (Executive Summary, Product Scope bullets, "What Makes This Special") for architecture pattern terms from the 8a detection table. These sections are synthesized from SPECLAN feature body content, which may carry through implementation language that was stripped from FRs but not from overviews.

Common patterns in prose:
- "event-driven architecture" → "game-event-triggered" or "responsive to game events"
- "state machine architecture" → "phase management" or "structured transitions"
- "immutable data flow" → "consistent data handling"

When detected, rewrite the prose phrase to use capability language. Unlike FR/NFR violations (which block quality), prose violations are low-severity — report in the summary as "prose polish" items but do not block the output.

### 9. Output Summary

```
## PRD Generation Complete

Generated BMAD-standard PRD from SPECLAN specifications.

### Source
| Type | Count |
|------|-------|
| Goals | X |
| Features | Y |
| Requirements | Z |

### Generated PRD
Location: _bmad-output/planning-artifacts/PRD.md
Sections: Executive Summary, Success Criteria, Product Scope, User Journeys, Functional Requirements, Non-Functional Requirements
Total FRs: N
Total NFRs: M

### Next Steps (using BMAD workflows)
1. **Validate:** /bmad-bmm-validate-prd — Run BMAD's 13-step PRD validation
2. **Refine:** /bmad-bmm-edit-prd — Interactively refine with PM agent
3. **Continue pipeline:** /bmad-bmm-create-architecture — Generate architecture from the PRD
4. **Epic breakdown:** /bmad-bmm-create-epics-and-stories — Break PRD into implementable epics
```

### 10. Handle Edge Cases

**Features without requirements:**
- Include the feature as a capability area header
- Add a comment: `<!-- No FRs generated: feature has no linked requirements -->`
- Note in summary for user attention

**Requirements without acceptance criteria:**
- Generate FR line from requirement title/description
- Note in summary that acceptance criteria are missing

**No vision.md or mission.md:**
- Synthesize Executive Summary from feature descriptions
- Note: "Executive Summary synthesized from feature set. Refine with /bmad-bmm-edit-prd."

**Mixed scope and unscoped features:**
- Scoped features go to their respective phase
- Unscoped features default to MVP with a note

## Integration Notes

This command generates a BMAD-compatible PRD artifact. The PRD is designed to work with BMAD's downstream workflows:

- **Validation** (`/bmad-bmm-validate-prd`): Checks format, density, measurability, traceability, implementation leakage, domain compliance, completeness
- **Editing** (`/bmad-bmm-edit-prd`): Interactive refinement with PM agent (John)
- **Architecture** (`/bmad-bmm-create-architecture`): Architect agent (Winston) derives technical decisions from the PRD
- **Epics** (`/bmad-bmm-create-epics-and-stories`): PM agent breaks PRD into implementable stories

The BMAD pipeline unlocked by a valid PRD:
```
PRD -> Architecture -> Epics & Stories -> Sprint Planning -> Implementation
```
