---
name: speclan:plan-manual
description: Create a manual implementation plan from approved SPECLAN specifications
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
---

# SPECLAN Plan Manual Command

Generate a checklist-based implementation plan from approved features, requirements, and change requests.

## Instructions

**CRITICAL: Follow these steps in exact order. Do NOT skip ahead or explore the speclan directory manually.**

### Step 1: Query for approved specs FIRST

Before doing anything else, run the query script to check if approved specs exist:

```bash
SPECLAN_DIR="${1:-./speclan}"
QUERY="${CLAUDE_PLUGIN_ROOT}/skills/speclan-query/scripts/query.sh"

APPROVED_FEATURES=$("$QUERY" --type feature --filter-status approved --full "$SPECLAN_DIR")
APPROVED_REQS=$("$QUERY" --type requirement --filter-status approved --full "$SPECLAN_DIR")
APPROVED_CRS=$("$QUERY" --type change-request --filter-status approved --full "$SPECLAN_DIR")

echo "=== Approved Features ==="
echo "$APPROVED_FEATURES"
echo "=== Approved Requirements ==="
echo "$APPROVED_REQS"
echo "=== Approved Change Requests ==="
echo "$APPROVED_CRS"
```

### Step 2: Stop if nothing is approved

If all three JSON arrays are empty (`[]`), report and STOP:

```
No approved specifications found in speclan/.

To approve specs for implementation, set their status to "approved":
  status: approved
```

**Do NOT proceed further. Do NOT launch agents, create files, or explore the speclan directory.**

### Step 3: Create the plan file

Only if Step 1 returned non-empty results, apply the `plan-manual` skill to create the plan file.

**The plan file MUST be written to this exact path:**

```
{SPECLAN_DIR}/.local/plans/{slug}.{YYYY-MM-DDTHH-MM}.plan.md
```

Create the directory first: `mkdir -p "{SPECLAN_DIR}/.local/plans"`

**Do NOT write the plan file anywhere else. Do NOT name it PLAN.md or any other name.**

The plan-manual skill defines the exact file format — follow it precisely.

## Arguments

- `[path]` - Optional path to speclan directory (default: `./speclan`)
