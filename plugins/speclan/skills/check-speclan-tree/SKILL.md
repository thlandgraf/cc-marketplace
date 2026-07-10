---
name: check-speclan-tree
description: >-
  This skill should be used when the user asks to "check the speclan tree",
  "validate specs", "lint speclan", "verify spec consistency", "audit the
  speclan directory", "find broken spec links", "check for duplicate IDs",
  "check ID format", "find misplaced requirements", or otherwise wants a
  SPECLAN tree checked for structural, frontmatter, ID-uniqueness, naming,
  placement, and reference-integrity problems. Runs a Node.js checker that
  reports each issue with the rule broken, an explanation, and a fix hint.
version: 0.2.0
---

# SPECLAN Tree Checker

Scans a `speclan/` tree and reports every consistency violation — file
structure, YAML frontmatter, ID format & uniqueness, directory/naming rules,
entity placement, and cross-reference integrity. Each issue names the **rule
broken**, explains it in one line, and gives a **fix hint**.

The heavy lifting is a zero-dependency Node.js script (`check-tree.mjs`) — no
`jq`/`js-yaml`/external tools. It is the primary agent path; there is no GUI.

## Run (agent path)

### Script location

```
${CLAUDE_PLUGIN_ROOT}/skills/check-speclan-tree/scripts/check-tree.mjs
```

### Command line

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/check-speclan-tree/scripts/check-tree.mjs" [OPTIONS] [speclan-dir]
```

**Options:**
- `--json` — machine-readable report instead of grouped text
- `--strict` — treat warnings as failures (exit 1 on any warning)
- `--fix` — auto-fix safe, unambiguous issues in place, then report what was
  fixed and what remains (see [Auto-fix](#auto-fix--fix))
- `-h, --help` — usage

**Arguments:**
- `speclan-dir` — path to the speclan directory. If omitted, the script
  auto-detects it (walks up looking for `speclan/`, `specs/speclan/`, …), else
  falls back to `./speclan`.

**Exit codes:** `0` = clean (no errors; and no warnings under `--strict`),
`1` = issues found or usage error.

### Example — a clean tree

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/check-speclan-tree/scripts/check-tree.mjs" speclan
```

```
✓ No issues found — checked 4 entities.
```

### Example — a tree with problems (grouped text, default)

```
speclan/features/F-2000-mismatch-dir/F-2000-wrong-name.md
  ✖ SPEC011 dir-file-name-mismatch  directory "F-2000-mismatch-dir/" contains "F-2000-wrong-name.md" — directory name and entity filename must match
      hint: rename the file to "F-2000-mismatch-dir.md" (or rename the directory to "F-2000-wrong-name/")

speclan/features/F-4000-dup-a/F-4000-dup-a.md
  ✖ SPEC010 duplicate-id  ID F-4000 is used by 2 entities: features/F-4000-dup-a, features/F-4000-dup-b
      hint: IDs must be unique across the whole tree — regenerate one with the speclan-id-generator skill

speclan/features/F-6000-many-issues/F-6000-many-issues.md
  ✖ SPEC005 invalid-id-format  id "F-50" does not match the feature format /^F-\d{4}$/
      hint: use F-#### (zero-padded)
  ✖ SPEC006 id-filename-mismatch  frontmatter id "F-6999" ≠ filename id "F-6000"
      hint: the filename is the source of truth — set id: F-6000, or rename the file/dir to match "F-6999"
  ⚠ SPEC014 h1-title-mismatch  body does not start with an H1 heading matching the title "Many Issues"
      hint: make the first non-empty body line "# Many Issues"

Summary: 11 errors, 2 warnings across 8 files (8 checked)  →  FAIL
```

### JSON report (for tooling / CI)

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/check-speclan-tree/scripts/check-tree.mjs" --json speclan
```

```json
{
  "ok": false,
  "summary": { "errors": 11, "warnings": 2, "filesChecked": 8, "entityCount": 9 },
  "issues": [
    {
      "rule": "SPEC011",
      "name": "dir-file-name-mismatch",
      "severity": "error",
      "file": "speclan/features/F-2000-mismatch-dir/F-2000-wrong-name.md",
      "message": "directory \"F-2000-mismatch-dir/\" contains \"F-2000-wrong-name.md\" — directory name and entity filename must match",
      "hint": "rename the file to \"F-2000-mismatch-dir.md\" (or rename the directory to \"F-2000-wrong-name/\")"
    }
  ]
}
```

Extract just the failing rules:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/check-speclan-tree/scripts/check-tree.mjs" --json speclan \
  | grep -oE '"rule": "[^"]+"' | sort | uniq -c | sort -rn
```

### Gate warnings too

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/check-speclan-tree/scripts/check-tree.mjs" --strict speclan
```

### Auto-fix (`--fix`)

Rewrites the safe, unambiguous issues **in place** (frontmatter only — no file
moves, no body edits), then reports what was fixed and what still needs a human.
Changes are reversible via `git diff` / `git checkout`.

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/check-speclan-tree/scripts/check-tree.mjs" --fix speclan
```

```
speclan/features/F-6000-many-issues/F-6000-many-issues.md
  ✔ SPEC006 id-filename-mismatch (fixed)  frontmatter id "F-6999" ≠ filename id "F-6000"
  ✔ SPEC009 updated-before-created (fixed)  updated (2026-04-01) is earlier than created (2026-05-01)
  ✖ SPEC002 missing-required-field  required field "owner" is missing or empty
      hint: add "owner:" to the frontmatter with a non-empty value

Fixed 2 issues. Summary: 9 errors, 2 warnings remaining across 8 files (8 checked)  →  FAIL
```

**What `--fix` repairs** (only these — everything else needs judgment and is left as a reported issue):

| Rule | Fix applied |
|------|-------------|
| SPEC004 invalid-status | Migrate a retired legacy status: `pending` → `draft`, `merged` → `under-test`, `closed` → `deprecated`. Other invalid statuses are left reported. |
| SPEC006 id-filename-mismatch | Set frontmatter `id` to the filename ID (the filename is authoritative) |
| SPEC008 invalid-timestamp | Reformat to canonical ISO **only** for numeric-but-malformed dates (`2026/01/05` → `2026-01-05`, `2026-01-06 09:30` → `2026-01-06T09:30:00Z`). Uses string manipulation only — never shifts the calendar day. Free-form dates (e.g. `January 6, 2026`) are left untouched and still reported. |
| SPEC009 updated-before-created | Clamp `updated` to `created` |

`--fix` is idempotent (a second run fixes nothing) and combines with `--json`
(each fixed issue gets `"fixed": true`; the summary gains a `fixed` count). It
exits `0` only if no issues remain after fixing.

## What it checks

Each issue carries a stable `SPEC###` code. **Errors** fail the run; **warnings**
only fail under `--strict`.

| Code | Severity | Rule |
|------|----------|------|
| SPEC001 | error | File has no `--- … ---` YAML frontmatter block |
| SPEC002 | error | Missing/empty required field (`id, type, title, status, owner, created, updated`) |
| SPEC003 | error | `type` not one of `goal, feature, requirement, changeRequest, template` (accepts the `change-request` alias) |
| SPEC004 | error | `status` not in the lifecycle `draft, review, approved, in-development, under-test, released, deprecated` (same set for all entities incl. CRs); or invalid CR `changeType` |
| SPEC005 | error | `id` fails its format: `G-###` (3 digits), `F/R-####`, `CR-####` (4 digits), Template = UUID v4 |
| SPEC006 | error | Frontmatter `id` ≠ ID parsed from the filename (filename is the source of truth) |
| SPEC007 | error | Declared `type` prefix ≠ id prefix (e.g. `type: goal` with an `F-` id) |
| SPEC008 | error | `created`/`updated` not valid ISO-8601 |
| SPEC009 | error | `updated` is an earlier calendar day than `created` |
| SPEC010 | error | Duplicate ID across the whole tree |
| SPEC011 | error | Directory-based entity: directory name ≠ contained `.md` filename |
| SPEC012 | error | Misplaced entity (requirement not under `requirements/`, CR not under `change-requests/`, goal not in `goals/`, child feature under the wrong folder) |
| SPEC021 | error | Entity directory has no matching `.md` file (empty/missing entity file) |
| SPEC015 | error | Broken reference: `goals`/`feature`/`parentId`/`contributors` points at a non-existent ID (or wrong type) |
| SPEC016 | error | CR `parentType` ≠ the actual type of `parentId`'s target |
| SPEC017 | error | CR missing a required field (`parentId, parentType, changeType`) |
| SPEC013 | warn | Filename slug ≠ kebab-case of `title` (truncation- and stopword-tolerant) |
| SPEC014 | warn | Body's first non-empty line is not `# {title}` (H1 must match the title, no prose before it) |
| SPEC018 | warn | Relative `[…](../x.md)` link in the body doesn't resolve on disk |
| SPEC019 | warn | One-directional link (e.g. goal lists a feature as contributor but the feature's `goals` omits it) |
| SPEC020 | warn | Stray `.md` inside an entity subtree that isn't a valid entity file |
| SPEC022 | warn | Feature has no `goals` (sub-features may inherit via their parent) |

**SPEC004** (legacy statuses only), **SPEC006, SPEC008, SPEC009** can be repaired automatically with `--fix`.

**Skipped** (not scanned): `templates/`, `artifacts/`, `_archived/`, `.local/`,
dot-directories, and root docs (`mission.md`, `vision.md`, `AGENTS.md`,
`CLAUDE.md`, `README.md`).

## Gotchas

These are calibrated against real speclan trees — the checker deliberately does
**not** flag them:

- **Truncated slugs are fine.** `F-3683-security-and-authenticati/` matching its
  own `.md` is valid even though the slug is cut mid-word; SPEC011 only fires on
  a true dir≠file mismatch, and SPEC013 treats the slug as a prefix of the title.
- **`type: change-request`** (kebab) is accepted alongside `changeRequest` — it
  is the dominant on-disk spelling and a documented tooling alias.
- **A requirement's parent is structural.** `feature:` in requirement
  frontmatter is optional (the `…/F-####/requirements/` directory is
  authoritative). When present, it must resolve and agree with that directory
  (else a SPEC019 warning), but its absence is never an error.
- **CR narrative lives in the body**, so `description`/`changes` are *not*
  required frontmatter — only `parentId`, `parentType`, `changeType` are.
- **Date-only vs timestamp on the same day** (`updated: 2026-05-21` after
  `created: 2026-05-21T08:…Z`) is not a SPEC009 hit — comparison is by calendar
  day when either value is date-only.

Warnings can be voluminous on a large, evolving tree (slug/title drift, missing
`goals`). That is expected — filter by `severity: "error"` in `--json` mode, or
run without `--strict` to keep the exit code driven by errors only.

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `ERROR: SPECLAN directory not found` | Pass the path explicitly: `check-tree.mjs path/to/speclan`. Auto-detect needs a `speclan/` (or `specs/speclan/`, `.speclan/`) with a `features/` or `goals/` child at or above the cwd. |
| Exit 1 but only warnings listed | You passed `--strict`. Drop it to let errors alone drive the exit code. |
| A real entity is reported `SPEC020 stray-file` | Its filename doesn't match `<ID>-<slug>.md` (G/F/R/CR), or it sits loose inside an entity directory. Rename it or move it under `artifacts/`. |
| `SPEC021` on a directory you expected to be an entity | The directory has no `<dirname>.md` inside it — create the entity file or remove the empty directory. |

## Related skills

- **`speclan-format`** — the authoritative rule definitions this checker enforces.
- **`speclan-id-generator`** — regenerate a colliding or malformed ID.
- **`speclan-query`** — list/filter entities (this checker reuses the same
  filename-is-truth and tree-walk conventions).
