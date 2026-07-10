#!/usr/bin/env node
//
// Smoke driver for the speclan-id-generator CLI (generate-id.mjs).
//
// It spawns the generator against a throwaway speclan tree and checks:
//   - --help exits 0
//   - --type {goal,feature,requirement} return correctly-formatted IDs (exit 0)
//   - an invalid --type errors with ok:false (exit 1)
//   - the END-BIASED GAP is uniform in [MIN, MAX] — defaults to 5..95 — by
//     sampling a --count batch and measuring the gap between consecutive IDs.
//     This is the regression check for the gap change.
//
// Usage:
//   node driver.mjs                 # uses the sibling generate-id.mjs, expects 5..95
//   node driver.mjs --min 5 --max 95
//   GENERATOR=/path/to/generate-id.mjs node driver.mjs
//
// Exit codes: 0 = all checks passed, 1 = a check failed.

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// generate-id.mjs lives at <plugin>/skills/speclan-id-generator/scripts/, and
// this driver at <plugin>/.claude/skills/run-speclan-id-generator/.
const GENERATOR =
  process.env.GENERATOR ||
  resolve(HERE, "../../../skills/speclan-id-generator/scripts/generate-id.mjs");

function arg(flag, dflt) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const MIN = Number(arg("--min", "5"));
const MAX = Number(arg("--max", "95"));

let failures = 0;
const ok = (name) => console.log(`  ✓ ${name}`);
const bad = (name, detail) => {
  failures++;
  console.log(`  ✗ ${name}\n      ${detail}`);
};

// Run the generator; returns { status, stdout, stderr }. Never throws.
function gen(args) {
  try {
    const stdout = execFileSync("node", [GENERATOR, ...args], { encoding: "utf8" });
    return { status: 0, stdout, stderr: "" };
  } catch (e) {
    return { status: e.status ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

// A throwaway speclan tree seeded with one low-numbered feature so the batch
// has an anchor to grow from without running into the 9999 ceiling.
function makeTree(seedFeatureId) {
  const root = mkdtempSync(join(tmpdir(), "speclan-idgen-"));
  const dir = join(root, "speclan", "features", `${seedFeatureId}-seed`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${seedFeatureId}-seed.md`),
    `---\nid: ${seedFeatureId}\ntype: feature\ntitle: Seed\nstatus: draft\nowner: t\ncreated: '2026-01-01'\nupdated: '2026-01-02'\ngoals:\n  - G-100\n---\n\n# Seed\n`
  );
  return { root, speclan: join(root, "speclan") };
}

console.log(`generator: ${GENERATOR}`);
console.log(`expecting gap range: [${MIN}, ${MAX}]\n`);

// --- Smoke checks --------------------------------------------------------
{
  const r = gen(["--help"]);
  r.status === 0 && /usage/i.test(r.stdout)
    ? ok("--help exits 0")
    : bad("--help exits 0", `status=${r.status}`);
}

const tree = makeTree("F-0100");
try {
  for (const [type, re] of [
    ["goal", /^G-\d{3}$/],
    ["feature", /^F-\d{4}$/],
    ["requirement", /^R-\d{4}$/],
  ]) {
    const r = gen(["--type", type, "--speclan-root", tree.speclan, "--raw"]);
    const id = r.stdout.trim().split("\n").pop();
    r.status === 0 && re.test(id)
      ? ok(`--type ${type} -> ${id}`)
      : bad(`--type ${type}`, `status=${r.status} out=${JSON.stringify(r.stdout)}`);
  }

  {
    const r = gen(["--type", "banana", "--speclan-root", tree.speclan]);
    r.status === 1 && /ok"?\s*:\s*false|INVALID_TYPE/.test(r.stdout)
      ? ok("invalid --type errors (exit 1, ok:false)")
      : bad("invalid --type errors", `status=${r.status} out=${r.stdout}`);
  }

  // --- Overflow -> random fallback --------------------------------------
  // Seed an anchor so high that any gap (>=5) overshoots F-9999, forcing the
  // "completely random, in-range, unique" fallback. Under the OLD sequential
  // tail-scan this could only ever return the slot just above the anchor;
  // drawing something well below it proves the random fallback is active.
  {
    const t2 = makeTree("F-9998");
    try {
      const r = gen(["--type", "feature", "--count", "5", "--raw", "--speclan-root", t2.speclan]);
      const ids = r.stdout.trim().split("\n").map((s) => s.trim()).filter((s) => /^F-\d{4}$/.test(s));
      const nums = ids.map((s) => Number(s.slice(2)));
      const uniq = new Set(nums).size === nums.length;
      const inRange = nums.every((n) => n >= 0 && n <= 9999 && n !== 9998);
      const drewLow = nums.some((n) => n < 9000); // impossible under sequential tail-fill
      r.status === 0 && ids.length === 5 && uniq && inRange && drewLow
        ? ok(`overflow near F-9998 -> random unique in-range [${ids.join(", ")}]`)
        : bad("overflow -> random", `status=${r.status} ids=${JSON.stringify(ids)} uniq=${uniq} inRange=${inRange} drewLow=${drewLow}`);
    } finally {
      rmSync(t2.root, { recursive: true, force: true });
    }
  }

  // --- Gap distribution check (the regression test) ----------------------
  const COUNT = 100; // worst case 100 + 95*100 = 9600 < 9999, never overflows
  const r = gen(["--type", "feature", "--count", String(COUNT), "--raw", "--speclan-root", tree.speclan]);
  const nums = r.stdout
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^F-\d{4}$/.test(l))
    .map((l) => Number(l.slice(2)));

  if (nums.length !== COUNT) {
    bad("gap sampling", `expected ${COUNT} ids, got ${nums.length}: ${r.stdout}`);
  } else {
    // Gap of the first id above the seed anchor (100), then between consecutive ids.
    const gaps = [];
    let prev = 100;
    for (const n of nums) {
      gaps.push(n - prev);
      prev = n;
    }
    const lo = Math.min(...gaps);
    const hi = Math.max(...gaps);
    gaps.every((g) => g >= MIN && g <= MAX)
      ? ok(`all ${gaps.length} gaps within [${MIN}, ${MAX}] (observed ${lo}..${hi})`)
      : bad("gaps within range", `observed ${lo}..${hi}, out of [${MIN}, ${MAX}]`);

    // Prove the new upper bound is actually in effect: with 100 samples the old
    // 5..15 range could never produce a gap above 15.
    hi > 15
      ? ok(`spread exceeds the old 5..15 range (max gap ${hi})`)
      : bad("range widened", `max gap only ${hi} — change may not have taken effect`);

    const avg = (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1);
    console.log(`\n  gap stats: min=${lo} max=${hi} mean=${avg} (n=${gaps.length})`);
  }
} finally {
  rmSync(tree.root, { recursive: true, force: true });
}

console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
