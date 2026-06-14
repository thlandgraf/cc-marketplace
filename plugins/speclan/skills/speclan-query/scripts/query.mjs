#!/usr/bin/env node
//
// SPECLAN Query Script
// Query SPECLAN entities with flexible filtering and JSON output
//
// Usage: node query.mjs [OPTIONS] [speclan-dir]
//
// Entity naming: {G|F|R|CR|S|AC|T}-{ID}-{slug}
// The filename/dirname is the source of truth for ID and slug.
//
// Exit codes: 0 = success, 1 = error

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { basename, join } from "node:path";

const DEFAULT_SPECLAN_DIR = "./speclan";

const USAGE = `Usage: query.mjs [OPTIONS] [speclan-dir]

Query SPECLAN entities with flexible filtering and JSON output.

Options:
  -t, --type TYPE              Entity type to query (required)
                               Values: goal, feature, requirement, change-request, all
  -s, --filter-status STATUS   Filter by status (reads frontmatter)
                               Values: draft, review, approved, in-development,
                                       under-test, released, deprecated
  -i, --filter-id ID           Filter by entity ID (e.g., F-1234, R-5678)
  -p, --parent ID              Filter by parent ID (e.g., F-1234)
  -f, --full                   Include title and status in output (reads frontmatter)
  -h, --help                   Show this help

Arguments:
  speclan-dir                  Path to speclan directory (default: ./speclan)

Output:
  JSON array of entities to stdout

Examples:
  query.mjs --type feature
  query.mjs --type feature --full
  query.mjs --type feature --filter-status approved
  query.mjs --type requirement --parent F-1049
  query.mjs --type feature --filter-id F-1234 --full
  query.mjs --type all ./speclan
`;

function usage() {
  process.stdout.write(USAGE);
  process.exit(1);
}

// Options
let entityType = "";
let filterStatus = "";
let filterId = "";
let parentId = "";
let fullMode = false;
let speclanDir = "";

function parseArgs(argv) {
  const needsValue = (flag, value) => {
    if (value === undefined || value.startsWith("-")) {
      process.stderr.write(`ERROR: ${flag} requires an argument\n`);
      usage();
    }
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-t":
      case "--type":
        entityType = needsValue(arg, argv[++i]);
        break;
      case "-s":
      case "--filter-status":
        filterStatus = needsValue(arg, argv[++i]);
        break;
      case "-i":
      case "--filter-id":
        filterId = needsValue(arg, argv[++i]);
        break;
      case "-p":
      case "--parent":
        parentId = needsValue(arg, argv[++i]);
        break;
      case "-f":
      case "--full":
        fullMode = true;
        break;
      case "-h":
      case "--help":
        usage();
        break;
      default:
        if (arg.startsWith("-")) {
          process.stderr.write(`ERROR: Unknown option: ${arg}\n`);
          usage();
        }
        if (speclanDir) {
          process.stderr.write("ERROR: Multiple speclan-dir arguments provided\n");
          usage();
        }
        speclanDir = arg;
    }
  }

  if (!speclanDir) speclanDir = DEFAULT_SPECLAN_DIR;

  if (!entityType) {
    process.stderr.write("ERROR: --type is required\n");
    usage();
  }
}

// Entity type -> { pattern, subdir }
const ENTITY_CONFIG = {
  goal: { pattern: "G-*.md", subdir: "goals" },
  feature: { pattern: "F-*.md", subdir: "features" },
  requirement: { pattern: "R-*.md", subdir: "features" },
  "change-request": { pattern: "CR-*.md", subdir: "." },
};

// "G-*.md" style glob: prefix before "*", suffix after it
function matchesPattern(name, pattern) {
  const star = pattern.indexOf("*");
  if (star === -1) return name === pattern;
  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(star + 1);
  return (
    name.length >= prefix.length + suffix.length &&
    name.startsWith(prefix) &&
    name.endsWith(suffix)
  );
}

// Recursively collect files matching pattern (follows symlinked directories)
function findFiles(dir, pattern) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    let isDir = entry.isDirectory();
    let isFile = entry.isFile();
    if (entry.isSymbolicLink()) {
      try {
        const st = statSync(path);
        isDir = st.isDirectory();
        isFile = st.isFile();
      } catch {
        continue;
      }
    }
    if (isDir) {
      results.push(...findFiles(path, pattern));
    } else if (isFile && matchesPattern(entry.name, pattern)) {
      results.push(path);
    }
  }
  return results;
}

// Parse filename to extract ID and slug
// /path/to/F-1234-my-feature.md -> { id: "F-1234", slug: "my-feature" }
function parseFilename(file) {
  const name = basename(file, ".md");
  let m = name.match(/^([A-Z]+-[0-9]+)-(.+)$/);
  if (m) return { id: m[1], slug: m[2] };
  m = name.match(/^([A-Z]+-[0-9]+)$/);
  if (m) return { id: m[1], slug: "" };
  return null;
}

// Extract a field value from YAML frontmatter (between --- delimiters)
function getFrontmatterField(file, field) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    return "";
  }
  let inFm = false;
  for (const line of content.split("\n")) {
    if (line === "---") {
      if (inFm) break;
      inFm = true;
      continue;
    }
    if (inFm && line.startsWith(`${field}:`)) {
      return line
        .slice(field.length + 1)
        .replace(/^[ ]*/, "")
        .replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

// Check if entity has specific parent
// Checks: file path (structural parent), feature, requirement, parentId, goals array
function hasParent(file, pid) {
  if (file.includes(`/${pid}-`)) return true;

  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    return false;
  }
  const lines = content.split("\n");
  const direct = [
    `feature: ${pid}`,
    `feature: "${pid}"`,
    `requirement: ${pid}`,
    `requirement: "${pid}"`,
    `parentId: ${pid}`,
    `parentId: "${pid}"`,
    `  - ${pid}`,
    `  - "${pid}"`,
  ];
  return lines.some((line) => direct.includes(line));
}

// Build a JSON entry for an entity (key order: id, slug, type, path, title, status)
function buildEntry(id, slug, etype, path, title, status) {
  const entry = { id, slug, type: etype, path };
  if (title) entry.title = title;
  if (status) entry.status = status;
  return entry;
}

// Query a single entity type, returning an array of entries
function querySingleType(etype, sdir) {
  const config = ENTITY_CONFIG[etype];
  if (!config) {
    process.stderr.write(`ERROR: Invalid entity type: ${etype}\n`);
    process.stderr.write(
      "Valid types: goal, feature, requirement, change-request, all\n"
    );
    process.exit(1);
  }

  const searchPath = config.subdir === "." ? sdir : join(sdir, config.subdir);
  if (!existsSync(searchPath)) return [];

  const files = findFiles(searchPath, config.pattern).sort();
  const needsFrontmatter = fullMode || filterStatus !== "" || parentId !== "";
  const entries = [];

  for (const file of files) {
    // Skip template and archived files
    if (file.includes("/templates/") || file.includes("/_archived/")) continue;

    const parsed = parseFilename(file);
    if (!parsed) continue;
    const { id, slug } = parsed;

    // Apply ID filter (fast, before frontmatter reads)
    if (filterId && id !== filterId) continue;

    let title = "";
    let status = "";
    if (needsFrontmatter) {
      status = getFrontmatterField(file, "status");

      if (filterStatus && status !== filterStatus) continue;
      if (parentId && !hasParent(file, parentId)) continue;
      if (fullMode) title = getFrontmatterField(file, "title");
    }

    entries.push(buildEntry(id, slug, etype, file, title, status));
  }

  return entries;
}

function queryEntities(etype, sdir) {
  if (etype === "all") {
    const types = ["goal", "feature", "requirement", "change-request"];
    return types.flatMap((t) => querySingleType(t, sdir));
  }
  return querySingleType(etype, sdir);
}

function main() {
  parseArgs(process.argv.slice(2));

  if (!existsSync(speclanDir) || !statSync(speclanDir).isDirectory()) {
    process.stderr.write(`ERROR: Speclan directory not found: ${speclanDir}\n`);
    process.exit(1);
  }

  const entries = queryEntities(entityType, speclanDir);

  // JSON array, one compact entry per line (grep-friendly)
  if (entries.length === 0) {
    process.stdout.write("[]\n");
    return;
  }
  const lines = entries.map((e) => `  ${JSON.stringify(e)}`);
  process.stdout.write(`[\n${lines.join(",\n")}\n]\n`);
}

main();
