---
name: speclan-engineering:brainstorm-plus
description: Deeper brainstorming session that spawns multiple parallel subagents — each applying a different brainstorming technique (SCAMPER, Crazy 8s, Reverse, First Principles, Analogy, Six Hats, Constraint-Based, Random Input) — then synthesizes their output into 2–3 strong threads the user can drill into before crafting SPECLAN specs
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Skill
  - Agent
argument-hint: "[--techniques=<csv>] [rough thought or idea]"
---

# SPECLAN Brainstorm Plus Command

Explicit entry point for the `speclan-engineering:brainstorm-plus` skill. Same contract as `/speclan-engineering:brainstorm`, but the divergence phase is replaced with **parallel subagent dispatch** across multiple brainstorming techniques, followed by synthesis into strong threads for interactive progression.

## Invocation

```
/speclan-engineering:brainstorm-plus what if we added team roles
/speclan-engineering:brainstorm-plus --techniques=scamper,reverse expand F-1234 to mobile
/speclan-engineering:brainstorm-plus                                        # prompts interactively
```

## Arguments

- **Rough thought** (positional) — the idea to brainstorm. If empty, the skill prompts interactively.
- **`--techniques=<csv>`** (optional flag) — comma-separated technique names to pin. Valid names: `scamper`, `crazy-8s`, `reverse`, `constraint`, `first-principles`, `analogy`, `six-hats`, `random-input`. If omitted, the skill auto-selects 3–5 techniques based on the thought and its grounding classification.

## Procedure

1. **Verify the `speclan` plugin is available.** This command depends on the `speclan-format`, `speclan-id-generator`, and `speclan-query` skills. If they cannot be loaded, stop immediately and tell the user to run `/plugin install speclan@digital-dividend-marketplace`.

2. **Verify the `Agent` tool is available.** This command spawns parallel subagents. If the harness does not expose the `Agent` tool, fall back to recommending `/speclan-engineering:brainstorm` instead and stop.

3. **Load the brainstorm-plus skill** at `${CLAUDE_PLUGIN_ROOT}/skills/brainstorm-plus/SKILL.md`.

4. **Pass `$ARGUMENTS` through verbatim** — the skill handles flag parsing (`--techniques=...`), thought extraction, and the interactive prompt when empty.

5. **Follow the skill's pipeline end-to-end.** Phases 0–3 are owned by this skill; Phases 4–8 are delegated to the `brainstorm` skill by reference to minimize drift.
