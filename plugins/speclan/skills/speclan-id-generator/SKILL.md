---
name: SPECLAN ID Generator
description: This skill should be used when the user needs to generate IDs for SPECLAN entities, asks to "generate an ID", "new feature ID", "unique requirement ID", "create a collision-free ID", or when any command or agent needs to assign IDs to new SPECLAN entities.
version: 0.2.0
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
# Extract IDs array with jq
node "$SCRIPT" --type feature --count 3 --speclan-root "$SPECLAN_DIR" | jq -r '.data.ids[]'
# F-1847
# F-2934
# F-5621
```

### End-Biased Generation (--parent)

When `--parent` is specified, the generator:

1. Finds the parent entity on disk by scanning the speclan directory
2. Reads existing sibling entities in the parent's directory
3. Finds the highest sibling ID numerically
4. Generates new IDs biased to come **after** that highest sibling (within a 500-ID window)
5. Falls back to random generation if the window is exhausted

**Valid parent relationships:**
- `--type feature --parent F-XXXX` → child feature under parent feature
- `--type requirement --parent F-XXXX` → requirement under feature
- `--type changeRequest --parent F-XXXX` → CR under feature
- `--type changeRequest --parent R-XXXX` → CR under requirement
- `--type changeRequest --parent G-XXX` → CR under goal

**Important:** The parent entity must exist on disk before using `--parent`. For hierarchical creation (like from-speckit conversion), write parent files first, then generate child IDs.

## Fallback: generate-id.sh (Bash)

If Node.js is not available, use the bash script:

```
${CLAUDE_PLUGIN_ROOT}/skills/speclan-id-generator/scripts/generate-id.sh
```

```bash
./generate-id.sh <entity-type> [count] [speclan-dir]
```

**Output:** Plain text, one ID per line. No `--parent` support.

See `references/inline-algorithm.md` for an inline bash algorithm when neither script is available.

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
