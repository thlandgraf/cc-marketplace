# Digital Dividend Plugin Marketplace

Claude Code plugins for specification-driven development, project governance, and task management.

## Plugins

### SPECLAN


Claude Code helper for the [SPECLAN](https://marketplace.visualstudio.com/items?itemName=DigitalDividend.speclan-vscode-extension) VSCode extension - manage project specifications as interlinked markdown files.

![Speclan](plugin-banner.gif)

#### Capabilities

| Flow | Description |
|------|-------------|
| **Impl → Spec** | Sync session work to SPECLAN specifications |
| **Spec → Impl** | Implement approved features using feature-dev |
| **Speckit → Speclan** | Convert speckit specifications to SPECLAN format |
| **Speclan → Speckit** | Inject approved SPECLAN specs into speckit commands |

#### Commands

| Command | Description |
|---------|-------------|
| `/speclan:status` | Check project setup, installed plugins, and spec statistics |
| `/speclan:sync` | Sync session work to SPECLAN specs - identifies implemented features |
| `/speclan:implement` | Implement approved Features using feature-dev |
| `/speclan:from-speckit` | Convert speckit specs to SPECLAN format |
| `/speclan:to-speckit` | Inject approved SPECLAN Features into speckit |

#### Agents

| Agent | Description |
|-------|-------------|
| `feature-verifier` | Deep 5-layer verification of feature implementation against specs |
| `requirement-verifier` | Verify individual requirements are satisfied by code |
| `implementation-order` | Analyze feature dependencies and determine optimal build order |
| `spec-converter` | Bidirectional conversion between speckit and SPECLAN formats |

#### Skills

| Skill | Description |
|-------|-------------|
| `speclan-format` | Foundational knowledge for all speclan/ file operations |
| `speclan-query` | Query specs by type, status, or parent relationship (JSON output) |
| `speclan-id-generator` | Collision-free random ID generation for SPECLAN entities |
| `sync-from-session` | Workflow for capturing session work as SPECLAN specs |

#### Hooks

| Event | Behavior |
|-------|----------|
| `SessionStart` | Detects speclan/ directory, counts specs, checks plugin dependencies |
| `PreToolUse` (Read/Write/Edit) | Auto-injects SPECLAN format knowledge when accessing spec files |
| `PreToolUse` (Write/Edit) | Guards locked specs - blocks direct edits to in-development/released/deprecated entities |

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
| **feature-dev plugin** | `/speclan:implement` |
| **speckit plugin** | `/speclan:from-speckit`, `/speclan:to-speckit` |

## License

MIT
