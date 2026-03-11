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
/speclan:ask where do we set specs status
```

## Scope Constraint

When invoked via this command, **all exploration stays within the project's `speclan/` directory**. Do not search application source code, configuration files, or any files outside `$SPECLAN_ROOT`. Every answer comes from spec files (frontmatter and markdown bodies), the SPECLAN format rules, and the status lifecycle — not from grepping the broader codebase.

When the user asks questions like "where do we set status" or "how does X work", they are asking about the spec ecosystem — answer from the spec data and SPECLAN conventions, not from implementation code.

## Procedure

1. Detect the speclan root using `source "${CLAUDE_PLUGIN_ROOT}/skills/speclan-format/scripts/detect-speclan.sh"` — this sets `$SPECLAN_ROOT`
2. Load the `speclan:ask` skill (`${CLAUDE_PLUGIN_ROOT}/skills/ask/SKILL.md`)
3. Use the argument as the user's question
4. Follow the skill's workflow, restricting all file reads, Glob, and Grep to paths within `$SPECLAN_ROOT`
