# Digital Dividend Plugin Marketplace

Claude Code plugins for specification-driven development, project governance, and task management.

This repo is intended to be cloned and customized to fit your software development process. Fork it, adjust the plugins to match your workflows, and use it as a starting point rather than a fixed dependency.

## Plugins

### SPECLAN


Claude Code helper for the [SPECLAN](https://marketplace.visualstudio.com/items?itemName=DigitalDividend.speclan-vscode-extension) VSCode extension - manage project specifications as interlinked markdown files.

![Speclan](plugin-banner.gif)

> **Using BMAD?** See the [BMAD Integration Guide](BMAD.md) for a full walkthrough of the round-trip workflow between BMAD and SPECLAN.

#### Capabilities

| Flow | Description |
|------|-------------|
| **Ask** | Query specs with full context — hierarchy, relationships, status |
| **Impl → Spec** | Sync session work to SPECLAN specifications |
| **Spec → Impl** | Plan, implement, and review approved specs (manual three-phase workflow) |
| **BMAD → Speclan** | Convert BMAD planning artifacts (PRD, Epics) to SPECLAN format |
| **Speclan → BMAD** | Generate BMAD-standard PRD from approved specs (two approaches: BMAD-native or standalone converter) |
| **Speckit → Speclan** | Convert speckit specifications to SPECLAN format |
| **Speclan → Speckit** | Inject approved SPECLAN specs into speckit commands |

#### Commands

| Command | Description |
|---------|-------------|
| `/speclan:ask` | Ask about any SPECLAN entity — get holistic context with hierarchy, relationships, and status |
| `/speclan:status` | Check project setup, installed plugins, and spec statistics |
| `/speclan:sync` | Sync session work to SPECLAN specs - identifies implemented features |
| `/speclan:plan-manual` | Create a manual implementation plan from approved specs |
| `/speclan:implement-manual` | Implement the next pending item from a manual plan |
| `/speclan:review-manual` | Review all in-review items, verify spec compliance and code quality |
| `/speclan:from-bmad` | Convert BMAD planning artifacts (PRD, Epics, Architecture) to SPECLAN format |
| `/speclan:to-bmad` | Generate BMAD-standard PRD using BMAD's native PRD creation workflow |
| `/speclan:to-bmad-prd` | Generate BMAD-standard PRD using standalone converter (no BMAD skills required) |
| `/speclan:from-speckit` | Convert speckit specs to SPECLAN format |
| `/speclan:to-speckit` | Inject approved SPECLAN Features into speckit |

#### Agents

| Agent | Description |
|-------|-------------|
| `feature-verifier` | Deep 5-layer verification of feature implementation against specs |
| `requirement-verifier` | Verify individual requirements are satisfied by code |
| `implementation-order` | Analyze feature dependencies and determine optimal build order |
| `bmad-converter` | Bidirectional conversion between BMAD-METHOD and SPECLAN formats |
| `speckit-converter` | Bidirectional conversion between speckit and SPECLAN formats |
| `code-hygiene-reviewer` | Review code structure, naming, duplication, dead code, type safety |
| `architecture-reviewer` | Review design patterns, SOLID principles, coupling, module boundaries |

#### Skills

| Skill | Description |
|-------|-------------|
| `speclan-format` | Foundational knowledge for all speclan/ file operations |
| `speclan-query` | Query specs by type, status, or parent relationship (JSON output) |
| `speclan-id-generator` | Collision-free random ID generation for SPECLAN entities |
| `ask` | Answer spec questions with full context — hierarchy, relationships, status |
| `sync-from-session` | Workflow for capturing session work as SPECLAN specs |
| `plan-manual` | Create manual implementation plans from approved specs |
| `implement-manual` | Implement next item from a manual plan (plan → implement → review) |
| `review-manual` | Review all in-review items, verify spec compliance and code quality |

#### Hooks

| Event | Behavior |
|-------|----------|
| `SessionStart` | Detects speclan/ directory, counts specs, checks plugin dependencies |
| `PreToolUse` (Write/Edit) | Guards locked specs - blocks direct edits to in-development/released/deprecated entities, rejects invalid status values |

#### Manual Implementation Flow

Three-phase workflow for implementing approved specs with human oversight at each stage:

```
/speclan:plan-manual → /speclan:implement-manual → /speclan:review-manual
```

**1. Plan** — `/speclan:plan-manual` queries all approved specs and generates a plan file at `speclan/.local/plans/`. The plan is a pure-data checklist with checkbox states tracking progress. Only approved items and their ancestor chain are included.

**2. Implement** — `/speclan:implement-manual` picks up the plan file and implements the next `[ ]` item. Run repeatedly — each invocation implements one feature (with all its requirements) or one individual item. Checkboxes transition: `[ ]` → `[~]` → `[?]`.

**3. Review** — `/speclan:review-manual` reviews ALL `[?]` items at once, verifying spec compliance (acceptance criteria) and code quality (hygiene + architecture subagents). On acceptance, checkboxes transition `[?]` → `[x]`.

```
Plan file checkboxes:  [ ] pending → [~] in-dev → [?] in-review → [x] done
Spec statuses:         approved → in-development → under-test (unchanged by review)
```

Spec files are read-only during review — status transitions to `released` happen after human testing.

#### Entity Hierarchy

```
Goal (G-###)
  └── Feature (F-####)  [tree structure, directory-based]
        └── Requirement (R-####)  [directory-based, acceptance criteria inline]
```

Plus: ChangeRequest (CR-####) for modifying locked entities, Template (UUID) for spec scaffolding.

#### Directory Structure

```
speclan/
├── goals/           # G-### Strategic goals (flat files)
├── features/        # F-#### Feature tree (hierarchical directories)
│   └── F-1234-my-feature/
│       ├── F-1234-my-feature.md
│       ├── requirements/
│       │   └── R-5678-some-req/
│       └── change-requests/
├── requirements/    # R-#### Top-level requirements
└── templates/       # Specification templates
```

#### Status Lifecycle

```
draft → review → approved → in-development → under-test → released → deprecated
```

Specs in `draft`, `review`, `approved` are directly editable. Locked statuses (`in-development`, `under-test`, `released`) require a Change Request. `deprecated` is permanently frozen.

---

### Constitution

Manage project constitution files - rules, best practices, patterns, and guardrails for LLM/coding agents.

#### Commands

| Command | Description |
|---------|-------------|
| `/constitution:check` | Check code or session work for constitution violations |
| `/constitution:add` | Add rules, best practices, or guidelines to the constitution |
| `/constitution:clarify` | Clarify or refine existing constitution rules |

#### Skills

| Skill | Description |
|-------|-------------|
| `constitution-format` | Foundational knowledge for constitution file structure and conventions |

---

### Todo

Filesystem-based task management with git integration - track tasks through open/wip/done lifecycle.

#### Commands

| Command | Description |
|---------|-------------|
| `/todo:add` | Create a new task in the todo system |
| `/todo:start` | Start working on a task - move to wip, create branch, assign |
| `/todo:update` | Log implementation progress - auto-detect work from git diff |
| `/todo:done` | Mark a task as complete - move to done, finalize log |

#### Skills

| Skill | Description |
|-------|-------------|
| `todo-format` | Foundational knowledge for todo file structure and lifecycle |

#### Hooks

| Event | Behavior |
|-------|----------|
| `SessionStart` | Detects todo/ directory and provides task context |
| `PreToolUse` (Read/Write/Edit) | Auto-injects todo format knowledge when accessing task files |

#### Directory Structure

```
todo/
├── open/    # Pending tasks
├── wip/     # Work in progress
└── done/    # Completed tasks
```

---

## Requirements

- Claude Code CLI

### Plugin-Specific Requirements

| Plugin | Requires |
|--------|----------|
| speclan | SPECLAN directory (`speclan/`) |
| constitution | Constitution file (`constitution.md`) - created automatically |
| todo | Todo directory (`todo/`) - created automatically |

### Optional Dependencies

| Dependency | Required By |
|------------|-------------|
| **BMAD-METHOD** | `/speclan:from-bmad`, `/speclan:to-bmad`, `/speclan:to-bmad-prd` |
| **speckit plugin** | `/speclan:from-speckit`, `/speclan:to-speckit` |

## License

MIT
