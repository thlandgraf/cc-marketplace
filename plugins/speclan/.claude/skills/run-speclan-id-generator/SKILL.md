---
name: run-speclan-id-generator
description: >-
  Run, smoke-test, and verify the speclan-id-generator CLI (generate-id.mjs) —
  the tool that mints SPECLAN entity IDs (G-###, F-/R-/CR-####). Use when asked
  to "run the id generator", "test generate-id", "verify the ID gap", "check ID
  generation", or after changing the end-biased gap constants or the
  overflow/random fallback.
version: 0.1.0
---

# Run: speclan-id-generator

`generate-id.mjs` is a zero-dependency Node CLI that mints collision-free
SPECLAN IDs. It has no GUI — the driver is a **CLI smoke script** that spawns the
generator against a throwaway `speclan/` tree and asserts its output, exit codes,
and the **end-biased gap distribution** (the regression check for gap changes).

Paths below are relative to the plugin root (`plugins/speclan/`).

## Prerequisites

Node only (developed against v23):

```bash
node --version
```

## Run (agent path)

```bash
node .claude/skills/run-speclan-id-generator/driver.mjs
```

Verified output (this exits `0` on success, `1` on any failed check):

```
  ✓ --help exits 0
  ✓ --type goal -> G-070
  ✓ --type feature -> F-0167
  ✓ --type requirement -> R-0090
  ✓ invalid --type errors (exit 1, ok:false)
  ✓ overflow near F-9998 -> random unique in-range [F-6650, F-0694, F-9477, F-4241, F-2920]
  ✓ all 100 gaps within [5, 95] (observed 5..95)
  ✓ spread exceeds the old 5..15 range (max gap 95)

  gap stats: min=5 max=95 mean=51.5 (n=100)

PASS — 0 failure(s)
```

What the driver checks:
- **Smoke:** `--help`, and that `--type goal|feature|requirement` return correctly
  formatted IDs; an invalid `--type` errors with `ok:false` / exit 1.
- **Gap distribution (regression):** seeds a low anchor, generates a `--count 100`
  batch, and asserts every consecutive gap is within `[MIN, MAX]` (default 5..95)
  and that the max observed gap exceeds 15 (proving the widened range is live).
- **Overflow → random fallback:** seeds `F-9998` so any gap overshoots `F-9999`,
  then asserts the returned IDs are random, unique, in range, and include a value
  well below the anchor (impossible under the old sequential tail-fill).

To check a different expected range (e.g. after another gap change), pass bounds:

```bash
node .claude/skills/run-speclan-id-generator/driver.mjs --min 5 --max 95
```

Point it at a different copy of the generator (e.g. the codex port) via env var:

```bash
GENERATOR=/path/to/generate-id.mjs node .claude/skills/run-speclan-id-generator/driver.mjs
```

## Direct invocation

Run the generator itself against any `speclan/` tree:

```bash
# format check / usage
node skills/speclan-id-generator/scripts/generate-id.mjs --help   # exits 0

# one feature ID (JSON envelope)
node skills/speclan-id-generator/scripts/generate-id.mjs --type feature --speclan-root <speclan-dir>
# -> {"ok":true,"data":{"type":"feature","ids":["F-0106"]}}

# batch of requirement IDs under a parent (raw, one per line)
node skills/speclan-id-generator/scripts/generate-id.mjs --type requirement --parent F-0100 --count 5 --raw --speclan-root <speclan-dir>
# -> R-0033 / R-0092 / R-0117 / R-0138 / R-0232   (gaps all within 5..95)
```

## The gap / overflow rule (what the driver guards)

In `skills/speclan-id-generator/scripts/generate-id.mjs`:

- `MIN_ID_GAP = 5`, `MAX_ID_GAP = 95` — each new ID sits a uniform random
  `[5, 95]` above the highest existing sibling (`generateEndBiasedId`).
- When that walk would exceed the range (`G-999` / `F-9999` / …), it returns
  `null` and `generateRandomNumericId` falls back to a **completely random,
  collision-checked** ID drawn from anywhere in `[0, maxValue]`.

Changing the gap = edit those two constants; changing the overflow behavior =
edit `generateEndBiasedId`. Re-run the driver to confirm.

## Gotchas

- **`--speclan-root` is effectively required** off-cwd: without it the generator
  auto-detects a `speclan/` by walking up from `$PWD` and errors
  (`SPECLAN_ROOT_NOT_FOUND`) if there isn't one. The driver always passes it.
- **The batch (`--count`) chains** — each generated ID becomes the anchor for the
  next — so to sample gaps you read consecutive diffs, not repeated single runs.
  The driver seeds a *low* anchor (`F-0100`) and caps `--count` at 100 so the
  worst case (`100 + 95×100 = 9600`) never hits the 9999 ceiling mid-sample.
- **Randomness is real** — IDs differ every run. Assertions check bounds and
  invariants, never exact values.
- **`generate-id.mjs` is a vendored bundle** (built from an external
  `apps/speclan-cli` monorepo, header comments intact). Editing the constants
  here changes runtime behavior, but the upstream source should be updated too or
  a rebuild will revert it.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `SPECLAN_ROOT_NOT_FOUND` | Pass `--speclan-root <dir>` pointing at a tree with `features/` or `goals/`. |
| Driver: `range widened` check fails (`max gap only 15`) | The `MAX_ID_GAP` edit didn't take effect (wrong copy, or `GENERATOR` points elsewhere). |
| Driver: `overflow -> random` fails | `generateEndBiasedId` is still doing the sequential tail-scan instead of returning `null`. |
