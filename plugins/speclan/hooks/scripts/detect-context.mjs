#!/usr/bin/env node
// SPECLAN Context Detection Hook
// Runs at session start to detect speclan directory and installed plugins
//
// Outputs context information for Claude and persists environment variables
//
// Minimal error handling - hooks must not fail on "not found" conditions

import {
  readdirSync,
  readFileSync,
  statSync,
  appendFileSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import { homedir } from "node:os";

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || ".";

// --- Detection helpers ---

function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function detectSpeclanDir(dir) {
  // Entries may be symlinks (e.g. repo-root "speclan" -> .specs/speclan
  // in a spec-submodule layout) — isDir follows symlinks.
  const speclanDirs = ["speclan", "specs/speclan", ".speclan", ".specs/speclan"];

  for (const name of speclanDirs) {
    const candidate = join(dir, name);
    // features/ and/or goals/ confirm a speclan dir; requirements/
    // never appears top-level and goals/ may not exist yet.
    if (
      isDir(candidate) &&
      (isDir(join(candidate, "features")) || isDir(join(candidate, "goals")))
    ) {
      return candidate;
    }
  }
  return null;
}

function checkPluginInstalled(pluginName) {
  const pluginDirs = [
    join(homedir(), ".claude", "plugins"),
    join(homedir(), ".claude-plugins"),
    ".claude-plugins",
  ];
  return pluginDirs.some((pdir) => isDir(join(pdir, pluginName)));
}

// Recursively collect regular files under dir (follows symlinked directories)
function walkFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    let isDirectory = entry.isDirectory();
    let isFile = entry.isFile();
    if (entry.isSymbolicLink()) {
      try {
        const st = statSync(path);
        isDirectory = st.isDirectory();
        isFile = st.isFile();
      } catch {
        continue;
      }
    }
    if (isDirectory) results.push(...walkFiles(path));
    else if (isFile) results.push(path);
  }
  return results;
}

function countByStatus(speclanDir, status) {
  // Count lines starting with "status: <status>" across all spec files
  let count = 0;
  for (const file of walkFiles(speclanDir)) {
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const line of content.split("\n")) {
      if (line.startsWith(`status: ${status}`)) count++;
    }
  }
  return count;
}

// --- Main detection ---

const outputLines = [];
const envLines = [];

// Detect SPECLAN directory by walking up from the project directory
let speclanDir = null;
let current = resolve(PROJECT_DIR);
while (true) {
  const found = detectSpeclanDir(current);
  if (found) {
    speclanDir = found;
    break;
  }
  const parent = dirname(current);
  if (parent === current) break;
  current = parent;
}

if (speclanDir) {
  // Persist to environment
  envLines.push(`export SPECLAN_DIR="${speclanDir}"`);

  // Count by status
  const draft = countByStatus(speclanDir, "draft");
  const review = countByStatus(speclanDir, "review");
  const approved = countByStatus(speclanDir, "approved");

  outputLines.push(
    `SPECLAN Project (${draft} draft, ${review} review, ${approved} approved)`
  );

  // Check if rules file is installed
  const rulesFound = [
    join(PROJECT_DIR, ".claude", "rules"),
    join(current, ".claude", "rules"),
  ].some((rulesDir) => {
    let entries;
    try {
      entries = readdirSync(rulesDir);
    } catch {
      return false;
    }
    return entries.some((n) => n.startsWith("speclan") && n.endsWith(".md"));
  });
  if (!rulesFound) {
    outputLines.push(
      "WARN: No .claude/rules/speclan.md found. Add a path-restricted rules file for SPECLAN format guidance."
    );
  }

  envLines.push(`export SPECLAN_DRAFT_COUNT="${draft}"`);
  envLines.push(`export SPECLAN_REVIEW_COUNT="${review}"`);
  envLines.push(`export SPECLAN_APPROVED_COUNT="${approved}"`);

  // Check optional plugin dependencies
  envLines.push(
    `export SPECLAN_HAS_SPECKIT="${checkPluginInstalled("speckit")}"`
  );
  envLines.push(
    `export SPECLAN_HAS_FEATURE_DEV="${checkPluginInstalled("feature-dev")}"`
  );

  // Check for BMAD-METHOD installation
  if (isDir(join(PROJECT_DIR, "_bmad")) && isDir(join(PROJECT_DIR, "_bmad", "bmm"))) {
    envLines.push(`export SPECLAN_HAS_BMAD="true"`);
    // Check for existing BMAD planning artifacts
    const artifactsDir = join(PROJECT_DIR, "_bmad-output", "planning-artifacts");
    const hasPrd =
      isDir(artifactsDir) &&
      walkFiles(artifactsDir).some((f) => {
        const name = f.split("/").pop().toLowerCase();
        return name.startsWith("prd") && name.endsWith(".md");
      });
    envLines.push(`export SPECLAN_BMAD_HAS_PRD="${hasPrd}"`);
  } else {
    envLines.push(`export SPECLAN_HAS_BMAD="false"`);
    envLines.push(`export SPECLAN_BMAD_HAS_PRD="false"`);
  }
}

// Persist environment variables if CLAUDE_ENV_FILE is available
if (process.env.CLAUDE_ENV_FILE && envLines.length > 0) {
  try {
    appendFileSync(process.env.CLAUDE_ENV_FILE, envLines.join("\n") + "\n");
  } catch {
    // Hooks must not fail on env persistence problems
  }
}

// Output context for Claude as systemMessage JSON
if (outputLines.length > 0) {
  process.stdout.write(
    JSON.stringify(
      {
        continue: true,
        suppressOutput: false,
        systemMessage: outputLines.join("\n"),
      },
      null,
      2
    ) + "\n"
  );
} else {
  process.stdout.write(
    JSON.stringify({ continue: true, suppressOutput: true }, null, 2) + "\n"
  );
}
