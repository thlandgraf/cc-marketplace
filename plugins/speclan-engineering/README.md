# speclan-engineering

Companion plugin to [`speclan`](../speclan) for **authoring** SPECLAN specifications interactively with Claude Code instead of editing markdown by hand.

Where `speclan` helps you *work with* existing specs (query, implement, review, convert), `speclan-engineering` helps you *craft* new ones: elicit requirements, structure user stories, draft acceptance criteria, and produce well-formed Goals, Features, Requirements, and Change Requests that conform to the SPECLAN format.

## Dependency

This plugin **requires** the `speclan` plugin to be installed. It reuses speclan's format, ID generation, and query skills, and operates on the same `speclan/` directory structure.

Install both from the `digital-dividend-marketplace`:

```
/plugin install speclan@digital-dividend-marketplace
/plugin install speclan-engineering@digital-dividend-marketplace
```

A `SessionStart` hook warns if `speclan-engineering` is installed without `speclan`.

## Status

**Scaffold only.** Commands, skills, and agents will be added in subsequent iterations. See the empty `commands/`, `skills/`, and `agents/` directories.

## Structure

```
speclan-engineering/
├── .claude-plugin/
│   └── plugin.json
├── commands/              # (to be added)
├── skills/                # (to be added)
├── agents/                # (to be added)
├── hooks/
│   ├── hooks.json
│   └── scripts/
│       └── check-speclan-dependency.sh
└── README.md
```
