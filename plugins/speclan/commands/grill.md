---
name: speclan:grill
description: Grill the user on SPECLAN specs — relentless one-question-at-a-time interview that reduces ambiguities, clarifies contradictions, and closes definition gaps before approval
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Skill
  - AskUserQuestion
argument-hint: "[entity-id e.g. F-1049, or topic] [--language <lang>]"
---

# SPECLAN Grill Command

Explicit entry point for the `SPECLAN Grill` skill. Load the skill and run a grilling session on the target spec(s).

## Invocation

```
/speclan:grill F-1049
/speclan:grill R-2046
/speclan:grill export pipeline
/speclan:grill F-1049 --language de
/speclan:grill --language french
/speclan:grill
```

## Procedure

1. Detect the speclan root using `source "${CLAUDE_PLUGIN_ROOT}/skills/speclan-format/scripts/detect-speclan.sh"` — this sets `$SPECLAN_ROOT`
2. Load the grill skill (`${CLAUDE_PLUGIN_ROOT}/skills/grill/SKILL.md`)
3. Parse the arguments:
   - `--language <lang>` (language code or name) → conduct the whole interview in that language; spec files are still written in English (see the skill's Session Language section). When omitted, reuse the language last set via `--language` (or requested in conversation) earlier in this session; otherwise default to English
   - An entity ID (`G-###`, `F-####`, `R-####`) → grill that entity and its children
   - A topic string → locate the matching spec by exploring `$SPECLAN_ROOT`, confirm with the user
   - Empty target → prefer the topic already being worked on in this session; otherwise offer specs in `draft`/`review` status
4. Follow the skill's workflow: one question at a time with a recommended answer, and after each resolved finding ask whether to apply it to the spec or note it for the summary
