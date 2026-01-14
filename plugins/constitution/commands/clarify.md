---
name: constitution:clarify
description: Clarify or refine existing constitution rules based on user input
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - TodoWrite
argument-hint: "<clarification or refinement>"
---

# Constitution Clarify Command

Interpret user clarification to improve, refine, or correct existing constitution rules.

## Workflow

### 1. Locate Constitution File

Search for constitution file:
```
constitution.md
doc/constitution.md
```

If no constitution exists, report:
```
No constitution found. Use /constitution:add to create one first.
```

### 2. Read Current Constitution

Load the entire constitution content to understand:
- Current sections and structure
- Existing rules that might relate to the clarification
- Overall context and patterns

### 3. Interpret the Clarification

Parse the ARGUMENT to understand the user's intent:

| Intent Type | Example | Action |
|-------------|---------|--------|
| **Refinement** | "prefer functional components over class components" | Add specificity to existing React rules |
| **Correction** | "actually we use Vitest not Jest" | Replace incorrect rule with correct one |
| **Exception** | "except in the legacy module" | Add exception clause to existing rule |
| **Emphasis** | "this is critical for security" | Elevate rule priority or add warning |
| **Removal** | "we no longer use Redux" | Remove outdated rules |
| **Merge** | "combine the testing rules" | Consolidate related rules |

### 4. Find Related Rules

Search the constitution for rules that relate to the clarification:
- Look for keyword matches
- Check for thematic connections
- Identify potential conflicts

### 5. Apply the Clarification

Use Edit tool to update the constitution:

**For refinements/additions:**
```markdown
# Before
- Use React hooks

# After
- Use React hooks
- Prefer functional components over class components
```

**For corrections:**
```markdown
# Before
- Use Jest for testing

# After
- Use Vitest for testing
```

**For exceptions:**
```markdown
# Before
- Use TypeScript strict mode

# After
- Use TypeScript strict mode (except legacy/ directory)
```

**For removals:**
Simply delete the outdated rule(s).

### 6. Show Changes

Output what changed:

```
## Constitution Updated

**Clarification applied:** <user's clarification>

### Changes Made

**Section:** <section name>

```diff
- <old rule>
+ <new rule>
```

Or for additions:
```diff
+ <new rule added>
```

**Reason:** <brief explanation of why this change was made>

---

Constitution size: ~X tokens (limit: 25,000)
```

## Handling Ambiguous Clarifications

If the clarification is unclear or could apply multiple ways:

1. Show the possible interpretations
2. Ask which interpretation is correct
3. Apply once confirmed

Example:
```
The clarification "prefer composition" could mean:

1. Add to React section: "Prefer composition over inheritance for components"
2. Add to General section: "Prefer composition over inheritance in all code"
3. Add to Testing section: "Prefer composition for test utilities"

Which interpretation is correct?
```

## Token Budget Awareness

When clarifying:
- Check if changes increase token count significantly
- If approaching 25,000 tokens, suggest consolidation
- Prefer making rules more concise when possible

## Examples

**Input:** `"we use tabs not spaces"`
**Action:** Find indentation rule, update to specify tabs.

**Input:** `"ignore the API layer for now"`
**Action:** Add exception to relevant rules excluding api/ directory.

**Input:** `"TypeScript 5.3 specifically"`
**Action:** Update TypeScript rules to specify version 5.3.

**Input:** `"merge all the naming conventions into one section"`
**Action:** Consolidate scattered naming rules into unified section.
