#!/usr/bin/env node
// Detect SPECLAN directory in a project
//
// Usage: node detect-speclan.mjs [start_directory]
//   Prints the speclan directory path to stdout, exits 1 if not found.
//
// Shell usage: SPECLAN_ROOT=$(node detect-speclan.mjs)

import { statSync } from "node:fs";
import { resolve, join, dirname } from "node:path";

function isDir(path) {
  // statSync follows symlinks, so a repo-root "speclan" symlink
  // pointing into a spec submodule like .specs/speclan works too.
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function detectSpeclan(startDir) {
  let current;
  try {
    current = resolve(startDir);
  } catch {
    return null;
  }
  if (!isDir(current)) return null;

  // Common speclan directory names. Entries may be symlinks — isDir follows
  // them, so both plain and spec-submodule layouts work.
  const speclanDirs = ["speclan", "specs/speclan", ".speclan", ".specs/speclan"];

  // Search from start directory up to root
  while (true) {
    for (const dir of speclanDirs) {
      const candidate = join(current, dir);
      // Confirm via core entity directories. A speclan dir always has
      // features/ and/or goals/ at the top level; requirements/ never
      // appears there (requirements nest under features), and young
      // projects may not have goals/ yet — so one core marker suffices.
      if (
        isDir(candidate) &&
        (isDir(join(candidate, "features")) || isDir(join(candidate, "goals")))
      ) {
        return candidate;
      }
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

const result = detectSpeclan(process.argv[2] || ".");
if (result) {
  process.stdout.write(`${result}\n`);
} else {
  process.stderr.write("No SPECLAN directory found\n");
  process.exit(1);
}
