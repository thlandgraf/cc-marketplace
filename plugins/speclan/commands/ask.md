---
name: speclan:ask
description: Ask about any SPECLAN entity — get holistic context with hierarchy, relationships, status, and change requests
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
argument-hint: "<entity-id or question>"
---

# SPECLAN Ask Command

Explicit entry point for the `speclan:ask` skill. Load the skill and answer the user's question.

## Invocation

```
/speclan:ask F-0471
/speclan:ask what's approved
/speclan:ask children of G-001
/speclan:ask status of the tree views feature
```

## Procedure

1. Load the `speclan:ask` skill (`${CLAUDE_PLUGIN_ROOT}/skills/ask/SKILL.md`)
2. Use the argument as the user's question
3. Follow the skill's workflow to build a contextual answer
