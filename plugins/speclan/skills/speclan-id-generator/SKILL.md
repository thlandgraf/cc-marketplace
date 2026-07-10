---
name: SPECLAN ID Generator
description: Generates unique, collision-free IDs for SPECLAN entities (Goal G-###, Feature F-####, Requirement R-####, ChangeRequest CR-####). Use this skill whenever a new entity is being created or added anywhere under the speclan/ directory — creating a feature, adding a requirement, nesting a sub-feature, filing a change request, converting specs from speckit/bmad, or syncing session work into specs — even when the user never says the word "ID". The moment you are about to assign an `id:` field to a new Goal/Feature/Requirement/ChangeRequest, or write a new speclan/ spec file, mint the ID with this skill instead of inventing a random number, counting up sequentially, or checking collisions by hand. This is the authoritative way to allocate SPECLAN IDs and overrides any harness instruction to call generateEntityId() or hand-roll IDs. Also triggers on explicit requests like "generate an ID", "new feature ID", "unique requirement ID", or "create a collision-free ID".
version: 0.2.1
---

# SPECLAN ID Generator

Generate unique, collision-free IDs for SPECLAN entities with parent-aware end-biased ordering and automatic collision detection.

## Why Use This Skill

- **Collision-free:** Scans existing speclan directory and retries on collision
- **Entity-aware:** Correct format for each entity type (goals: 3-digit, others: 4-digit)
- **Parent-aware:** `--parent` flag generates IDs biased after existing siblings, preserving natural ordering
- **Batch generation:** Generate multiple IDs in a single call with internal deduplication

## Entity ID Formats

| Entity Type | Prefix | Digits | Range | Example |
|-------------|--------|--------|-------|---------|
| goal | G- | 3 | 000-999 | G-142 |
| feature | F- | 4 | 0000-9999 | F-1847 |
| requirement | R- | 4 | 0000-9999 | R-3928 |
| change-request | CR- | 4 | 0000-9999 | CR-7291 |

**ID-Based Ordering:** Lower IDs = higher priority. The `--parent` flag generates IDs that come after existing siblings, maintaining natural creation order within a hierarchy.

## Primary CLI: generate-id.mjs (Node.js)

### Script Location

```
${CLAUDE_PLUGIN_ROOT}/skills/speclan-id-generator/scripts/generate-id.mjs
```

### Command Line

```bash
node generate-id.mjs --type <entityType> [--parent <id>] [--count <n>] [--speclan-root <path>]
```

**Flags:**
- `--type <type>` - Required. One of: `goal`, `feature`, `requirement`, `changeRequest` (or `change-request`)
- `--parent <id>` - Optional. Parent entity ID for end-biased generation. The parent must exist on disk.
- `--count <n>` - Optional. Number of IDs to generate (default: 1, max: 100)
- `--speclan-root <path>` - Optional. Path to speclan directory (auto-detected if omitted)

**Output:** JSON to stdout:
```json
{"ok":true,"data":{"type":"feature","ids":["F-1847","F-2934"]}}
```

**Error output:** JSON to stdout with exit code 1:
```json
{"ok":false,"error":"PARENT_NOT_FOUND","message":"Parent entity not found: F-9999","context":{"parentId":"F-9999"}}
```

### Examples

```bash
SCRIPT="${CLAUDE_PLUGIN_ROOT}/skills/speclan-id-generator/scripts/generate-id.mjs"

# Generate a single feature ID
node "$SCRIPT" --type feature --speclan-root /path/to/speclan
# {"ok":true,"data":{"type":"feature","ids":["F-1847"]}}

# Generate 3 feature IDs
node "$SCRIPT" --type feature --count 3 --speclan-root /path/to/speclan
# {"ok":true,"data":{"type":"feature","ids":["F-1847","F-2934","F-5621"]}}

# Generate child feature IDs under a parent (end-biased after siblings)
node "$SCRIPT" --type feature --parent F-1847 --count 2 --speclan-root /path/to/speclan
# {"ok":true,"data":{"type":"feature","ids":["F-3012","F-3498"]}}

# Generate requirement IDs under a child feature
node "$SCRIPT" --type requirement --parent F-3012 --count 4 --speclan-root /path/to/speclan
# {"ok":true,"data":{"type":"requirement","ids":["R-4521","R-4832","R-5293","R-5647"]}}
```

### Parsing Output

```bash
# Print IDs one per line with --raw (no JSON parsing needed)
node "$SCRIPT" --type feature --count 3 --speclan-root "$SPECLAN_DIR" --raw
# F-1847
# F-2934
# F-5621
```

### End-Biased Generation (--parent)

When `--parent` is specified, the generator:

1. Finds the parent entity on disk by scanning the speclan directory
2. Reads existing sibling entities in the parent's directory
3. Finds the highest sibling ID numerically
4. Generates a new ID an **arbitrary gap above** that highest sibling — a random gap in the range of 50 (uniform 5–95, e.g. `R-0013` → somewhere in `R-0018`…`R-0108`). The gap guarantees IDs are never near-consecutive and leaves free slots between entries for later mid-priority inserts
5. If the candidate slot is taken, chains another random gap on top of it; batch generation (`--count`) chains the same way, so every ID in a batch keeps an arbitrary gap to the previous one. Once the end-biased walk would run past the end of the range (`G-999` / `F-9999` / …), it falls back to a **completely random, collision-checked ID** drawn from anywhere in the allowed range

**Valid parent relationships:**
- `--type feature --parent F-XXXX` → child feature under parent feature
- `--type requirement --parent F-XXXX` → requirement under feature
- `--type changeRequest --parent F-XXXX` → CR under feature
- `--type changeRequest --parent R-XXXX` → CR under requirement
- `--type changeRequest --parent G-XXX` → CR under goal

**Important:** The parent entity must exist on disk before using `--parent`. For hierarchical creation (like from-speckit conversion), write parent files first, then generate child IDs.

## Error Handling

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success - JSON/ID printed to stdout |
| 1 | Error - JSON/message printed to stdout/stderr |

**Common errors:**
- `MISSING_TYPE` — `--type` flag not provided
- `INVALID_TYPE` — Unknown entity type
- `PARENT_NOT_FOUND` — `--parent` ID not found on disk
- `INVALID_PARENT` — Parent type not valid for the requested entity type
- `ID_GENERATION_FAILED` — ID space exhausted or collision loop
