#!/usr/bin/env node
// Guard SPECLAN specs from invalid modifications
//
// Two guards:
// 1. Invalid status: Blocks setting status to any value not in the valid SPECLAN lifecycle
//    Applies to ALL files under speclan/ (features, requirements, change requests)
// 2. Locked specs: Blocks Write/Edit on Features and Requirements with locked status
//    (deprecated, in-development, under-test, released)

import { readFileSync, existsSync } from "node:fs";
import { basename, dirname } from "node:path";

const VALID_STATUSES = new Set([
  "draft",
  "review",
  "approved",
  "in-development",
  "under-test",
  "released",
  "deprecated",
]);

function deny(systemMessage) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { permissionDecision: "deny" },
      systemMessage,
    }) + "\n"
  );
  process.exit(0);
}

// Read hook input from stdin
let toolName = "";
let toolInput = {};
try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  toolName = input?.tool_name ?? "";
  toolInput = input?.tool_input ?? {};
} catch {
  process.exit(0);
}
const filePath = toolInput.file_path ?? toolInput.path ?? "";

// Only check files under PROJECTROOT/speclan/
const projectDir = process.env.CLAUDE_PROJECT_DIR || ".";
const speclanRoot = `${projectDir}/speclan/`;
if (!filePath.startsWith(speclanRoot)) {
  process.exit(0);
}

// --- Guard 1: Invalid status values ---
// Extract the new content being written
let newContent = "";
if (toolName === "Edit") {
  newContent = toolInput.new_string ?? "";
} else if (toolName === "Write") {
  newContent = toolInput.content ?? "";
}

// Check if the edit introduces a status: field with an invalid value
if (newContent) {
  const statusLine = newContent.split("\n").find((l) => l.startsWith("status:"));
  if (statusLine) {
    const newStatus = statusLine
      .slice("status:".length)
      .replace(/^[ ]*/, "")
      .replace(/^["']|["']$/g, "")
      .replace(/[ \t]+$/, "");
    if (newStatus && !VALID_STATUSES.has(newStatus)) {
      deny(
        `BLOCKED: '${newStatus}' is not a valid SPECLAN status. Valid statuses: draft, review, approved, in-development, under-test, released, deprecated. Do NOT change spec statuses during review — they remain as-is.`
      );
    }
  }
}

// --- Guard 2: Locked spec statuses ---
// Only check Feature and Requirement files (F-####-*.md or R-####-*.md)
const base = basename(filePath);
if (!/^(F|R)-[0-9]+-.*\.md$/.test(base)) {
  process.exit(0);
}

// New files are always OK
if (!existsSync(filePath)) {
  process.exit(0);
}

// Extract status from YAML frontmatter
let status = "";
try {
  const content = readFileSync(filePath, "utf8");
  let inFm = false;
  for (const line of content.split("\n")) {
    if (line === "---") {
      if (inFm) break;
      inFm = true;
      continue;
    }
    if (inFm && line.startsWith("status:")) {
      status = line
        .slice("status:".length)
        .replace(/^[ ]*/, "")
        .replace(/["']/g, "")
        .replace(/[ \t]+$/, "");
      break;
    }
  }
} catch {
  process.exit(0);
}

// Check locked statuses
const entityId = base.match(/^(F|R)-[0-9]+/)?.[0] ?? "unknown";
const entityDir = dirname(filePath);

if (status === "deprecated") {
  deny(
    `BLOCKED: ${entityId} is deprecated and must not be modified. Deprecated specs are frozen and cannot be changed or receive Change Requests.`
  );
}
if (["in-development", "under-test", "released"].includes(status)) {
  deny(
    `BLOCKED: ${entityId} has status '${status}' and cannot be directly modified. Create a Change Request (CR-####) in ${entityDir}/change-requests/ instead. Use the speclan-id-generator skill to generate a CR ID.`
  );
}
process.exit(0);
