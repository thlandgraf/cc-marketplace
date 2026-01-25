# Digital Dividend Plugin Marketplace

A Claude Code plugin marketplace by Digital Dividend.

## Plugins

### SPECLAN

Claude Code helper for the [SPECLAN](https://github.com/digital-dividend/speclan) VSCode extension - enabling teams to manage project specifications as interlinked markdown files.

#### Features

| Capability | Description |
|------------|-------------|
| **Impl → Spec** | Sync session work to SPECLAN specifications |
| **Speckit → Speclan** | Convert speckit specifications to SPECLAN format |
| **Speclan → Speckit** | Inject SPECLAN specs into speckit commands |
| **Speclan → Impl** | Implement from SPECLAN specifications using feature-dev |

#### Commands

| Command | Description |
|---------|-------------|
| `/speclan:status` | Check project setup, installed plugins, and spec statistics |
| `/speclan:sync-from-session` | Sync session work to SPECLAN specs - identifies implemented features |
| `/speclan:from-speckit` | Convert speckit specs to SPECLAN format |
| `/speclan:to-speckit` | Inject approved SPECLAN Features into speckit |
| `/speclan:implement` | Implement approved Features using feature-dev |

#### SPECLAN Format

SPECLAN manages specifications as markdown files with YAML frontmatter in a hierarchical directory:

```
speclan/
├── goals/           # G-### Strategic goals
├── features/        # F-### Feature tree (hierarchical)
├── requirements/    # R-#### Requirements
└── templates/       # Specification templates
```

#### Entity Hierarchy

```
Goal (G-###)
  └── Feature (F-###)  [tree structure]
        └── Requirement (R-####)
              └── Scenario (S-####)
                    └── AcceptanceCriterion (AC-####)
                          └── Test (T-####)
```

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

#### Todo Format

Tasks are stored as markdown files that move through directories:

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
| speclan | SPECLAN directory (`${PROJECT}/speclan/`) |
| constitution | Constitution file (`constitution.md`) - created automatically |
| todo | Todo directory (`todo/`) - created automatically |

### Optional Dependencies

- **speckit plugin** - Required for `/speclan:from-speckit` and `/speclan:to-speckit` commands
- **feature-dev plugin** - Required for `/speclan:implement` command

## Installation

### Add the Marketplace

```bash
claude marketplace add digital-dividend/speclan-plugin
```

### Install Plugins

```bash
# Install SPECLAN plugin
claude plugin install speclan

# Install Constitution plugin
claude plugin install constitution

# Install Todo plugin
claude plugin install todo
```

Or install directly from the repo:

```bash
claude plugin install github:digital-dividend/speclan-plugin/plugins/speclan
claude plugin install github:digital-dividend/speclan-plugin/plugins/constitution
claude plugin install github:digital-dividend/speclan-plugin/plugins/todo
```

## License

MIT
