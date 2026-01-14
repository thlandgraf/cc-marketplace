---
name: constitution:add
description: Add rules, best practices, or guidelines to the project constitution
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - WebSearch
  - AskUserQuestion
  - TodoWrite
argument-hint: "<topic or rule to add>"
---

# Constitution Add Command

Add a new rule, best practice, or guideline to the project's constitution file based on the provided argument.

## Workflow

### 1. Locate Constitution File

Search for existing constitution file:
```
constitution.md
doc/constitution.md
```

If no constitution exists, you will create one at `constitution.md`.

### 2. Analyze the Argument

Parse the ARGUMENT to determine:
- Is it a **technology/framework** (Angular, React, NestJS, etc.)?
- Is it a **practice/pattern** (use Prettier, prefer composition, etc.)?
- Is it a **constraint/rule** (no any types, max file size, etc.)?

### 3. Clarify Ambiguous Topics

For technologies and frameworks, use AskUserQuestion to clarify specifics:

**Examples of clarifying questions:**

| Topic | Clarifications Needed |
|-------|----------------------|
| Angular | Version (17+/16/legacy)? Template syntax (control flow/structural directives)? State (signals/rxjs/both)? |
| React | Version (18+/17)? Hooks vs class? State management (zustand/redux/context)? |
| Node.js | Runtime (node/bun/deno)? Module system (ESM/CJS)? |
| TypeScript | Strictness level? Target version? |
| CSS | Framework (Tailwind/CSS modules/styled-components)? |
| Testing | Framework (Jest/Vitest/Playwright)? Coverage requirements? |
| Database | ORM preference? Query style? |

### 4. Research Best Practices

For technologies or exotic topics, use WebSearch to find current best practices:
- Search for `"<topic> best practices 2024"` or `"<topic> coding standards"`
- Focus on official documentation recommendations
- Look for common anti-patterns to avoid

### 5. Compose Constitution Entry

Write a token-efficient entry following these principles:

**DO:**
- Use imperative voice: "Use X" not "You should use X"
- Be specific: "Use `const` over `let`" not "Prefer immutability"
- Include rationale briefly: "Use X (prevents Y)"
- Group related rules under headings

**DON'T:**
- Write prose or explanations
- Include examples unless critical
- Duplicate information
- Use filler words

**Entry format:**
```markdown
## <Category>

- <Rule 1>
- <Rule 2> (rationale)
- Prefer X over Y
- Avoid Z (causes issues with W)
```

### 6. Add to Constitution

If constitution exists:
- Read current content
- Identify appropriate section (or create new one)
- Use Edit tool to add the new entry

If constitution doesn't exist:
- Create new file with header and first entry:

```markdown
# Project Constitution

Guidelines and rules for LLM/coding agents working in this project.

## <Category>

- <Your new rule(s)>
```

### 7. Report Result

Output what was added:
```
Added to constitution.md:

## <Section>
- <Rule added>
- <Rule added>

Constitution size: ~X tokens (limit: 25,000)
```

## Token Efficiency Guidelines

The constitution must stay under 25,000 tokens. When adding entries:

- Count approximate tokens (rough: 1 token ≈ 4 chars)
- If approaching limit, suggest consolidating existing rules
- Prioritize actionable rules over explanatory content

## Examples

**Input:** `Angular`
**Action:** Ask about version, template flavor, state management, then research Angular best practices, add structured rules.

**Input:** `"always use async/await over .then()"`
**Action:** Add directly to Patterns section without clarification (rule is clear).

**Input:** `htmx`
**Action:** Research htmx best practices (exotic tech), ask about integration context, add rules.
