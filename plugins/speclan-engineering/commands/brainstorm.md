---
name: speclan-engineering:brainstorm
description: Interactive brainstorming session that transforms a rough thought into SPECLAN specifications through grounding, exploration, and guided spec-shaping driven by AskUserQuestion
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Skill
argument-hint: "[rough thought or idea]"
---

# SPECLAN Brainstorm Command

Explicit entry point for the `speclan-engineering:brainstorm` skill. Starts a conversational session that grounds a rough idea in the existing project, explores it interactively, and — when the user is ready — crafts SPECLAN entities (goals, features, requirements, or change requests).

## Invocation

```
/speclan-engineering:brainstorm what if we added team roles
/speclan-engineering:brainstorm expand F-1234 scope to mobile
/speclan-engineering:brainstorm                                 # prompts interactively
```

## Procedure

1. **Verify the `speclan` plugin is available.** This command depends on the `speclan-format`, `speclan-id-generator`, and `speclan-query` skills. If they cannot be loaded, stop immediately and tell the user to run `/plugin install speclan@digital-dividend-marketplace`.

2. **Load the brainstorm skill** at `${CLAUDE_PLUGIN_ROOT}/skills/brainstorm/SKILL.md`.

3. **Pass `$ARGUMENTS` through verbatim** as the rough thought. If empty, the skill handles the interactive prompt.

4. **Follow the skill's loop end-to-end**, streaming synthesis back to the user between rounds so they can steer or cut the session short.
