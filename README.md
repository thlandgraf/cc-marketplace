# Digital Dividend Plugin Marketplace

A Claude Code plugin marketplace by Digital Dividend.

## Plugins

### SPECLAN

Claude Code helper for the [SPECLAN](https://github.com/digital-dividend/speclan) VSCode extension - enabling teams to manage project specifications as interlinked markdown files.

#### Features

| Capability | Description |
|------------|-------------|
| **Impl → Spec** | Infer SPECLAN specifications from existing implementation code |
| **Speckit → Speclan** | Convert speckit specifications to SPECLAN format |
| **Speclan → Speckit** | Inject SPECLAN specs into speckit commands |
| **Speclan → Impl** | Implement from SPECLAN specifications using feature-dev |

## Requirements

- Claude Code CLI
- A project with SPECLAN directory (`${PROJECT}/speclan/`)

### Optional Dependencies

- **speckit plugin** - Required for `/speclan:from-speckit` and `/speclan:to-speckit` commands
- **feature-dev plugin** - Required for `/speclan:implement` command

## Installation

### Add the Marketplace

```bash
claude marketplace add digital-dividend/speclan-plugin
```

### Install the SPECLAN Plugin

```bash
claude plugin install speclan
```

Or install directly from the repo:

```bash
claude plugin install github:digital-dividend/speclan-plugin/plugins/speclan
```

#### Commands

| Command | Description |
|---------|-------------|
| `/speclan:status` | Check project setup, installed plugins, and spec statistics |
| `/speclan:infer` | Analyze code to generate/update/explain specifications |
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

### Entity Hierarchy

```
Goal (G-###)
  └── Feature (F-###)  [tree structure]
        └── Requirement (R-####)
              └── Scenario (S-####)
                    └── AcceptanceCriterion (AC-####)
                          └── Test (T-####)
```

## License

MIT
