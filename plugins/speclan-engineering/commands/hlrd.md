---
name: speclan-engineering:hlrd
description: Interactive HLRD (High-Level Requirements Document) import — transforms an unstructured requirements document into speclan vision, mission, goals, features, and requirements through a multi-phase wizard with AskUserQuestion-driven clarifications
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Skill
argument-hint: "[path-to-hlrd.md | inline HLRD text]"
---

# HLRD Import Command

Explicit entry point for the `speclan-engineering:hlrd-authoring` skill. Runs the HLRD pipeline for this project: vision/mission extraction → planning → goals/features creation (or modification) → requirements generation → cross-referencing.

## Invocation

```
/speclan-engineering:hlrd ./docs/PRD.md
/speclan-engineering:hlrd "# Product Requirements..."
/speclan-engineering:hlrd                             # prompts interactively
```

## Procedure

1. **Verify the `speclan` plugin is available.** This command depends on the `speclan-format`, `speclan-id-generator`, and `speclan-query` skills. If they cannot be loaded, stop immediately and tell the user to run `/plugin install speclan@digital-dividend-marketplace` before retrying.

2. **Load the authoring skill** at `${CLAUDE_PLUGIN_ROOT}/skills/hlrd-authoring/SKILL.md`.

3. **Pass `$ARGUMENTS` through verbatim** — the skill owns input resolution (file path detection, inline text handling, or interactive prompting when the argument is empty).

4. **Follow the skill's pipeline end-to-end**, streaming progress to the user as each phase advances and each entity is created or modified.
