#!/usr/bin/env node
//
// SPECLAN Tree Consistency Checker
// Scans a speclan/ tree and reports every consistency violation with the rule
// broken, a plain-language explanation, and a fix hint.
//
// Usage: node check-tree.mjs [OPTIONS] [speclan-dir]
//
//   speclan-dir    Path to the speclan directory (default: auto-detect, else ./speclan)
//   --json         Emit a machine-readable JSON report instead of grouped text
//   --strict       Treat warnings as failures (exit 1 if any warnings)
//   -h, --help     Show usage
//
// Exit codes: 0 = clean (no errors; no warnings under --strict), 1 = issues / usage error.
//
// Zero external dependencies — Node built-ins only (matches query.mjs / detect-speclan.mjs).

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { basename, dirname, join, resolve, relative } from "node:path";

// ---------------------------------------------------------------------------
// Rule catalog: code -> { name, severity, why }
// (severity: "error" fails the run; "warn" only fails under --strict)
// ---------------------------------------------------------------------------
const RULES = {
  SPEC001: { name: "missing-frontmatter", severity: "error" },
  SPEC002: { name: "missing-required-field", severity: "error" },
  SPEC003: { name: "invalid-type", severity: "error" },
  SPEC004: { name: "invalid-status", severity: "error" },
  SPEC005: { name: "invalid-id-format", severity: "error" },
  SPEC006: { name: "id-filename-mismatch", severity: "error" },
  SPEC007: { name: "type-prefix-mismatch", severity: "error" },
  SPEC008: { name: "invalid-timestamp", severity: "error" },
  SPEC009: { name: "updated-before-created", severity: "error" },
  SPEC010: { name: "duplicate-id", severity: "error" },
  SPEC011: { name: "dir-file-name-mismatch", severity: "error" },
  SPEC012: { name: "misplaced-entity", severity: "error" },
  SPEC013: { name: "slug-title-mismatch", severity: "warn" },
  SPEC014: { name: "h1-title-mismatch", severity: "warn" },
  SPEC015: { name: "broken-reference", severity: "error" },
  SPEC016: { name: "parent-type-mismatch", severity: "error" },
  SPEC017: { name: "missing-entity-field", severity: "error" },
  SPEC018: { name: "broken-markdown-link", severity: "warn" },
  SPEC019: { name: "one-directional-link", severity: "warn" },
  SPEC020: { name: "stray-file", severity: "warn" },
  SPEC021: { name: "missing-entity-file", severity: "error" },
  SPEC022: { name: "feature-missing-goals", severity: "warn" },
};

// ID format regexes (verbatim from speclan-format/references/validation-rules.md).
// S-/AC-/T- types are DEPRECATED and intentionally absent.
const ID_PATTERNS = {
  goal: /^G-\d{3}$/,
  feature: /^F-\d{4}$/,
  requirement: /^R-\d{4}$/,
  changeRequest: /^CR-\d{4}$/,
  template: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};

const VALID_TYPES = ["goal", "feature", "requirement", "changeRequest", "template"];
// The tooling (generate-id.mjs KEBAB_ALIASES, query.mjs) accepts the kebab
// spelling for change requests, and it is the dominant on-disk convention.
const TYPE_ALIASES = { "change-request": "changeRequest" };
const normalizeType = (t) => (typeof t === "string" && TYPE_ALIASES[t]) || t;

// All entities — Change Requests included — use the same lifecycle. The legacy
// CR-specific statuses (pending/merged/closed) are retired; real CRs use
// draft/…/released like everything else.
const STANDARD_STATUS = [
  "draft", "review", "approved", "in-development", "under-test", "released", "deprecated",
];
// Retired CR-only statuses and their standard-lifecycle replacement (used by --fix).
const LEGACY_STATUS_MAP = { pending: "draft", merged: "under-test", closed: "deprecated" };

const TYPE_PREFIX = { goal: "G", feature: "F", requirement: "R", changeRequest: "CR" };
const PREFIX_TYPE = { G: "goal", F: "feature", R: "requirement", CR: "changeRequest" };

const CR_CHANGE_TYPES = ["enhancement", "bugfix", "breaking", "deprecation", "documentation"];

// Directories that never contain entities — skip wholesale.
const SKIP_DIRS = new Set(["artifacts", "templates", "_archived", ".local", "node_modules", ".git"]);

const ISO_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
const USAGE = `Usage: check-tree.mjs [OPTIONS] [speclan-dir]

Check a SPECLAN tree for consistency: structure, frontmatter, ID uniqueness,
naming, placement, and reference integrity. Reports each issue with the rule
broken, an explanation, and a fix hint.

Options:
  --json         Emit a JSON report instead of grouped text
  --strict       Treat warnings as failures (exit 1 on any warning)
  --fix          Auto-fix safe, unambiguous issues in place (see below), then
                 report what was fixed and what remains
  -h, --help     Show this help

Auto-fixable (frontmatter-only, reversible via git):
  SPEC004  invalid-status            migrate a retired legacy status
                                     (pending->draft, merged->under-test, closed->deprecated)
  SPEC006  id-filename-mismatch      set frontmatter id to the filename ID
  SPEC008  invalid-timestamp         reformat a parseable date to canonical ISO
  SPEC009  updated-before-created    clamp updated to created

Arguments:
  speclan-dir    Path to the speclan directory (default: auto-detect, else ./speclan)

Exit codes: 0 = clean (after any fixes), 1 = issues remain or usage error.
`;

function parseArgs(argv) {
  const opts = { json: false, strict: false, fix: false, dir: "" };
  for (const arg of argv) {
    if (arg === "--json") opts.json = true;
    else if (arg === "--strict") opts.strict = true;
    else if (arg === "--fix") opts.fix = true;
    else if (arg === "-h" || arg === "--help") {
      process.stdout.write(USAGE);
      process.exit(0);
    } else if (arg.startsWith("-")) {
      process.stderr.write(`ERROR: Unknown option: ${arg}\n\n${USAGE}`);
      process.exit(1);
    } else if (!opts.dir) {
      opts.dir = arg;
    } else {
      process.stderr.write("ERROR: Multiple speclan-dir arguments provided\n\n" + USAGE);
      process.exit(1);
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// speclan root detection (mirrors detect-speclan.mjs)
// ---------------------------------------------------------------------------
function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function detectSpeclan(startDir) {
  let current = resolve(startDir);
  const names = ["speclan", "specs/speclan", ".speclan", ".specs/speclan"];
  while (true) {
    for (const n of names) {
      const c = join(current, n);
      if (isDir(c) && (isDir(join(c, "features")) || isDir(join(c, "goals")))) return c;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Frontmatter parser (line-based, no YAML dep). Handles scalars, block arrays,
// inline arrays, and block scalars (|, >). Good enough for SPECLAN frontmatter.
// ---------------------------------------------------------------------------
function stripQuotes(s) {
  const t = s.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.endsWith('"')) || (t[0] === "'" && t.endsWith("'")))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") return { ok: false, data: {}, keys: new Set(), body: content };

  const data = {};
  const keys = new Set();
  let i = 1;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line === "---") {
      i++;
      break;
    }
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) continue;

    const m = line.match(/^([A-Za-z0-9_]+):\s?(.*)$/);
    if (!m) continue; // stray line inside frontmatter — ignore
    const key = m[1];
    const val = m[2] === undefined ? "" : m[2];
    keys.add(key);

    if (val === "") {
      // Possible block array (following "  - item" lines) or genuinely empty.
      const items = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        const im = lines[j].match(/^\s*-\s+(.*)$/);
        if (im) {
          items.push(stripQuotes(im[1]));
          continue;
        }
        break;
      }
      data[key] = items.length ? items : "";
      if (items.length) i = j - 1;
      continue;
    }

    if (/^[|>][-+]?$/.test(val)) {
      // Block scalar — collect indented / blank lines.
      const buf = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        if (/^\s+/.test(lines[j]) || /^\s*$/.test(lines[j])) buf.push(lines[j].trim());
        else break;
      }
      data[key] = buf.join("\n").trim();
      i = j - 1;
      continue;
    }

    const inline = val.match(/^\[(.*)\]$/);
    if (inline) {
      data[key] = inline[1]
        .split(",")
        .map((s) => stripQuotes(s))
        .filter((s) => s !== "");
      continue;
    }

    data[key] = stripQuotes(val);
  }

  return { ok: true, data, keys, body: lines.slice(i).join("\n") };
}

// ---------------------------------------------------------------------------
// Tree walk & collection
// ---------------------------------------------------------------------------
// name (no extension) -> { type, id } or null. Classification by prefix only;
// strict format is validated separately (SPEC005).
function classify(name) {
  const m = name.match(/^(CR|G|F|R)-(\d+)/);
  if (!m) return null;
  return { type: PREFIX_TYPE[m[1]], id: `${m[1]}-${m[2]}` };
}

function safeReaddir(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function entryKind(dir, ent) {
  let d = ent.isDirectory();
  let f = ent.isFile();
  if (ent.isSymbolicLink()) {
    try {
      const st = statSync(join(dir, ent.name));
      d = st.isDirectory();
      f = st.isFile();
    } catch {
      return { dir: false, file: false };
    }
  }
  return { dir: d, file: f };
}

// Recursively collect directories and markdown files (skip SKIP_DIRS / dotdirs).
function collect(dir, acc) {
  for (const ent of safeReaddir(dir)) {
    const { dir: isD, file: isF } = entryKind(dir, ent);
    const full = join(dir, ent.name);
    if (isD) {
      if (SKIP_DIRS.has(ent.name) || ent.name.startsWith(".")) continue;
      acc.dirs.push(full);
      collect(full, acc);
    } else if (isF && ent.name.endsWith(".md")) {
      acc.files.push(full);
    }
  }
}

// ---------------------------------------------------------------------------
// Main checking
// ---------------------------------------------------------------------------
function run(root) {
  const displayBase = dirname(root); // so paths render as "speclan/features/..."
  const rel = (p) => relative(displayBase, p);

  const issues = [];
  const add = (code, file, message, hint, extra = {}) => {
    issues.push({
      rule: code,
      name: RULES[code].name,
      severity: RULES[code].severity,
      file: rel(file),
      message,
      hint,
      ...extra,
    });
  };

  const acc = { dirs: [], files: [] };
  collect(root, acc);

  // --- Resolve entities ---------------------------------------------------
  // Directory-based entities: dirs named like an entity, anywhere in the tree.
  const entities = []; // { type, idName, slug, dir, file (or null), rootRel }
  const entityFiles = new Set(); // absolute paths that are entity .md files

  for (const d of acc.dirs) {
    const base = basename(d);
    const c = classify(base);
    if (!c) continue; // ordinary dir (requirements/, change-requests/, feature-body dirs handled elsewhere)
    // Only F/R/G are directory-based; CR/template are flat.
    if (c.type === "changeRequest" || c.type === "template") continue;

    const slug = base.slice(c.id.length + 1); // after "F-1049-"
    const expected = join(d, `${base}.md`);
    const directMds = safeReaddir(d)
      .filter((e) => entryKind(d, e).file && e.name.endsWith(".md"))
      .map((e) => e.name);

    let file = null;
    if (existsSync(expected)) {
      file = expected;
    } else {
      const sameId = directMds.find((n) => {
        const cc = classify(basename(n, ".md"));
        return cc && cc.id === c.id;
      });
      if (sameId) {
        file = join(d, sameId);
        add(
          "SPEC011",
          file,
          `directory "${base}/" contains "${sameId}" — directory name and entity filename must match`,
          `rename the file to "${base}.md" (or rename the directory to "${basename(sameId, ".md")}/")`
        );
      } else {
        add(
          "SPEC021",
          d,
          `entity directory "${base}/" has no matching "${base}.md" file`,
          `create ${base}/${base}.md with valid frontmatter, or remove the empty directory`
        );
      }
    }
    if (file) entityFiles.add(file);
    entities.push({ type: c.type, idName: c.id, slug, dir: d, file, rootRel: relative(root, d) });
  }

  // Flat entities: goal files directly in goals/, and CR files in change-requests/.
  for (const f of acc.files) {
    const base = basename(f, ".md");
    const c = classify(base);
    if (!c) continue;
    const parent = basename(dirname(f));
    const slug = base.slice(c.id.length + 1);

    if (c.type === "goal" && parent === "goals") {
      entityFiles.add(f);
      entities.push({ type: "goal", idName: c.id, slug, dir: dirname(f), file: f, rootRel: relative(root, f) });
    } else if (c.type === "changeRequest") {
      entityFiles.add(f);
      entities.push({
        type: "changeRequest",
        idName: c.id,
        slug,
        dir: dirname(f),
        file: f,
        rootRel: relative(root, f),
      });
    }
  }

  // --- Stray files (SPEC020): .md under entity subtrees that are not entity
  //     files and not a known non-entity doc.
  const ROOT_DOCS = new Set(["mission.md", "vision.md", "AGENTS.md", "CLAUDE.md", "README.md"]);
  for (const f of acc.files) {
    if (entityFiles.has(f)) continue;
    const segs = relative(root, f).split("/");
    const inEntitySubtree =
      segs[0] === "features" || segs[0] === "goals" || segs.includes("change-requests");
    if (!inEntitySubtree) continue; // root docs, etc.
    if (ROOT_DOCS.has(basename(f))) continue;
    const c = classify(basename(f, ".md"));
    // A directory-based entity's own file was already claimed; anything left that
    // classifies is a misnamed/duplicate entity file, anything else is a stray doc.
    add(
      "SPEC020",
      f,
      c
        ? `"${basename(f)}" is inside an entity directory but is not that entity's file`
        : `"${basename(f)}" is not a recognized SPECLAN entity file`,
      c
        ? `move it to its own ${c.type} directory, or delete it if obsolete`
        : `entity files must be named <ID>-<slug>.md (G/F/R/CR); move docs under artifacts/ or delete`
    );
  }

  // --- ID uniqueness (SPEC010) -------------------------------------------
  const byId = new Map(); // idName -> [entities]
  for (const e of entities) {
    if (!byId.has(e.idName)) byId.set(e.idName, []);
    byId.get(e.idName).push(e);
  }
  for (const [id, list] of byId) {
    if (list.length > 1) {
      for (const e of list) {
        add(
          "SPEC010",
          e.file || e.dir,
          `ID ${id} is used by ${list.length} entities: ${list.map((x) => x.rootRel).join(", ")}`,
          `IDs must be unique across the whole tree — regenerate one with the speclan-id-generator skill`
        );
      }
    }
  }

  // Index for reference resolution (first entity wins on dup).
  const idIndex = new Map();
  for (const e of entities) if (!idIndex.has(e.idName)) idIndex.set(e.idName, e);

  // --- Placement (SPEC012) -----------------------------------------------
  for (const e of entities) {
    const segs = e.rootRel.split("/");
    if (e.type === "goal") {
      if (segs[0] !== "goals") {
        add("SPEC012", e.file || e.dir, `goal ${e.idName} is not under goals/`, `move it to goals/${basename(e.rootRel)}`);
      }
    } else if (e.type === "feature") {
      const parent = segs[segs.length - 2];
      if (segs[0] !== "features") {
        add("SPEC012", e.file || e.dir, `feature ${e.idName} is not under features/`, `move the feature directory under features/ (nested inside its parent feature if it is a child)`);
      } else if (parent === "requirements" || parent === "change-requests") {
        add("SPEC012", e.file || e.dir, `feature ${e.idName} is nested inside "${parent}/", which only holds ${parent === "requirements" ? "requirements" : "change requests"}`, `child features live directly inside the parent feature directory, not under ${parent}/`);
      }
    } else if (e.type === "requirement") {
      const parent = segs[segs.length - 2];
      if (parent !== "requirements") {
        add("SPEC012", e.file || e.dir, `requirement ${e.idName} is not inside a requirements/ directory (found under "${parent}/")`, `move it to <parent-feature>/requirements/${basename(e.rootRel)}`);
      }
    } else if (e.type === "changeRequest") {
      if (!segs.includes("change-requests")) {
        add("SPEC012", e.file || e.dir, `change request ${e.idName} is not inside a change-requests/ directory`, `move it to <parent-entity>/change-requests/`);
      }
    }
  }

  // --- Per-entity content checks -----------------------------------------
  let filesChecked = 0;
  for (const e of entities) {
    if (!e.file) continue; // SPEC021 already reported
    filesChecked++;
    let content;
    try {
      content = readFileSync(e.file, "utf8");
    } catch {
      continue;
    }
    const fm = parseFrontmatter(content);
    if (!fm.ok) {
      add("SPEC001", e.file, `file does not start with a YAML frontmatter block (--- ... ---)`, `add frontmatter with at least id, type, title, status, owner, created, updated`);
      continue;
    }
    const d = fm.data;

    // Effective type: declared (normalized) if valid, else derived from filename prefix.
    const declaredType = typeof d.type === "string" ? d.type : "";
    const declaredNorm = normalizeType(declaredType);
    const effType = VALID_TYPES.includes(declaredNorm) ? declaredNorm : e.type;

    // SPEC002 — required common fields present & non-empty.
    const required = ["id", "type", "title", "status", "owner", "created", "updated"];
    for (const key of required) {
      const v = d[key];
      const empty = v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
      if (empty) {
        add("SPEC002", e.file, `required field "${key}" is missing or empty`, `add "${key}:" to the frontmatter with a non-empty value`);
      }
    }

    // SPEC003 — type value valid (accepting the change-request alias).
    if (d.type !== undefined && d.type !== "" && !VALID_TYPES.includes(declaredNorm)) {
      add("SPEC003", e.file, `type "${d.type}" is not a valid SPECLAN type`, `set type to one of: ${VALID_TYPES.join(", ")} (or "change-request")`);
    }

    // SPEC005 — id format matches (effective) type.
    if (typeof d.id === "string" && d.id !== "") {
      const pat = ID_PATTERNS[effType];
      if (pat && !pat.test(d.id)) {
        add("SPEC005", e.file, `id "${d.id}" does not match the ${effType} format ${pat}`, `use ${TYPE_PREFIX[effType]}-${effType === "goal" ? "###" : "####"} (zero-padded)`);
      }
    }

    // SPEC006 — frontmatter id matches filename id.
    if (typeof d.id === "string" && d.id !== "" && d.id !== e.idName) {
      add("SPEC006", e.file, `frontmatter id "${d.id}" ≠ filename id "${e.idName}"`, `the filename is the source of truth — set id: ${e.idName}, or rename the file/dir to match "${d.id}"`, {
        fix: { path: e.file, field: "id", value: e.idName, quote: false },
      });
    }

    // SPEC007 — declared type prefix matches id prefix.
    if (VALID_TYPES.includes(declaredNorm) && TYPE_PREFIX[declaredNorm]) {
      const expectPrefix = TYPE_PREFIX[declaredNorm];
      const idPrefix = e.idName.split("-")[0];
      if (idPrefix !== expectPrefix) {
        add("SPEC007", e.file, `type "${d.type}" expects id prefix "${expectPrefix}-" but id is "${e.idName}"`, `fix either type or id so they agree`);
      }
    }

    // SPEC004 — status valid (same lifecycle for every entity type). A retired
    // legacy status (pending/merged/closed) is auto-fixable via its mapping.
    if (typeof d.status === "string" && d.status !== "" && !STANDARD_STATUS.includes(d.status)) {
      const mapped = LEGACY_STATUS_MAP[d.status];
      add(
        "SPEC004",
        e.file,
        `status "${d.status}" is not a valid SPECLAN status`,
        mapped ? `retired status — map "${d.status}" → "${mapped}"` : `use one of: ${STANDARD_STATUS.join(", ")}`,
        mapped ? { fix: { path: e.file, field: "status", value: mapped, quote: false } } : {}
      );
    }

    // SPEC008 / SPEC009 — timestamps.
    const created = typeof d.created === "string" ? d.created : "";
    const updated = typeof d.updated === "string" ? d.updated : "";
    const validDate = (v) => v !== "" && ISO_RE.test(v) && !Number.isNaN(Date.parse(v));
    for (const field of ["created", "updated"]) {
      const v = field === "created" ? created : updated;
      if (v !== "" && !validDate(v)) {
        const canon = canonicalDate(v); // parseable but non-canonical → fixable
        add(
          "SPEC008",
          e.file,
          `${field} "${v}" is not a valid ISO-8601 date/timestamp`,
          `use e.g. "2025-12-29" or "2025-12-29T09:53:49.355Z"`,
          canon ? { fix: { path: e.file, field, value: canon, quote: true } } : {}
        );
      }
    }
    // Compare by calendar day when either value is date-only, so a date-only
    // "updated" on the same day as a timestamped "created" is not a false hit.
    if (validDate(created) && validDate(updated) && created.slice(0, 10) !== updated.slice(0, 10) && Date.parse(updated) < Date.parse(created)) {
      add("SPEC009", e.file, `updated (${updated}) is earlier than created (${created})`, `set updated to the current time (must be ≥ created)`, {
        fix: { path: e.file, field: "updated", value: created, quote: true },
      });
    }

    // SPEC013 — slug matches kebab(title): truncation-aware and stopword-tolerant
    // (slugs may drop of/and/for and truncate the tail) (warn).
    if (typeof d.title === "string" && d.title !== "" && e.slug) {
      if (!slugMatchesTitle(e.slug, d.title)) {
        add("SPEC013", e.file, `filename slug "${e.slug}" does not match the title "${d.title}" (expected "${kebab(d.title)}" or a truncation of it)`, `rename the file/dir slug to match the title, or update the title`);
      }
    }

    // SPEC014 — body H1 matches title (warn).
    if (typeof d.title === "string" && d.title !== "") {
      const firstLine = fm.body.split(/\r?\n/).find((l) => l.trim() !== "");
      if (firstLine === undefined || !/^#\s+/.test(firstLine)) {
        add("SPEC014", e.file, `body does not start with an H1 heading matching the title "${d.title}"`, `make the first non-empty body line "# ${d.title}"`);
      } else {
        const h1 = firstLine.replace(/^#\s+/, "").trim();
        if (h1 !== d.title) {
          add("SPEC014", e.file, `body H1 "${h1}" ≠ frontmatter title "${d.title}"`, `change the H1 to "# ${d.title}" (or update the title field)`);
        }
      }
    }

    // Entity-specific field checks. Calibrated against the real trees: the
    // parent of a requirement/sub-feature/CR is expressed STRUCTURALLY (by
    // directory nesting), so `feature:` on requirements is optional, and
    // `goals` on features is inconsistently applied — hence a warning, not an
    // error. CR narrative lives in the body, so `description`/`changes` are not
    // required frontmatter. Only the load-bearing CR pointers are required.
    if (effType === "feature") {
      const g = d.goals;
      if (g === undefined || (Array.isArray(g) ? g.length === 0 : g === "")) {
        add("SPEC022", e.file, `feature ${e.idName} has no "goals" — features should link the goal(s) they contribute to`, `add "goals:" listing at least one G-### (sub-features may inherit via their parent)`);
      }
    } else if (effType === "changeRequest") {
      for (const key of ["parentId", "parentType", "changeType"]) {
        const v = d[key];
        if (v === undefined || v === "") {
          add("SPEC017", e.file, `change request ${e.idName} is missing required field "${key}"`, `add "${key}:" to the CR frontmatter`);
        }
      }
      if (typeof d.changeType === "string" && d.changeType !== "" && !CR_CHANGE_TYPES.includes(d.changeType)) {
        add("SPEC004", e.file, `changeType "${d.changeType}" is invalid`, `use one of: ${CR_CHANGE_TYPES.join(", ")}`);
      }
    }

    // Stash parsed data for cross-entity checks.
    e.fm = d;
    e.body = fm.body;
  }

  // --- Cross-entity reference checks -------------------------------------
  const asArray = (v) => (Array.isArray(v) ? v : v === undefined || v === "" ? [] : [v]);

  for (const e of entities) {
    if (!e.fm) continue;
    const d = e.fm;

    if (e.type === "feature") {
      for (const gid of asArray(d.goals)) {
        const t = idIndex.get(gid);
        if (!t) add("SPEC015", e.file, `feature ${e.idName} references goal ${gid}, which does not exist`, `create the goal or fix the reference`);
        else if (t.type !== "goal") add("SPEC015", e.file, `feature ${e.idName} lists ${gid} under "goals" but ${gid} is a ${t.type}`, `only goals belong in "goals:"`);
      }
      for (const rid of asArray(d.requirements)) {
        const t = idIndex.get(rid);
        if (!t) add("SPEC015", e.file, `feature ${e.idName} references requirement ${rid}, which does not exist`, `create the requirement or fix the reference`);
        else if (t.type === "requirement" && t.fm && t.fm.feature && t.fm.feature !== e.idName) {
          add("SPEC019", e.file, `feature ${e.idName} lists requirement ${rid}, but ${rid}.feature = "${t.fm.feature}"`, `make the back-reference agree (requirement.feature should be ${e.idName})`);
        }
      }
    } else if (e.type === "requirement") {
      // `feature:` is optional (the structural parent directory is the source
      // of truth). When present it must resolve and agree with that parent.
      const fid = d.feature;
      if (fid && fid !== "") {
        const t = idIndex.get(fid);
        if (!t) add("SPEC015", e.file, `requirement ${e.idName} references feature ${fid}, which does not exist`, `fix the "feature:" reference or remove it (the parent directory is authoritative)`);
        else if (t.type !== "feature") add("SPEC015", e.file, `requirement ${e.idName}.feature points at ${fid}, which is a ${t.type}`, `"feature:" must reference a Feature (F-####)`);
        else {
          const sp = structuralParentFeature(e.rootRel);
          if (sp && sp !== fid) {
            add("SPEC019", e.file, `requirement ${e.idName} declares feature "${fid}" but is nested under feature "${sp}"`, `set feature: ${sp} to match the directory, or move the requirement`);
          }
        }
      }
    } else if (e.type === "goal") {
      for (const fid of asArray(d.contributors)) {
        const t = idIndex.get(fid);
        if (!t) add("SPEC015", e.file, `goal ${e.idName} lists contributor ${fid}, which does not exist`, `fix the reference or remove it from "contributors"`);
        else if (t.type !== "feature") add("SPEC015", e.file, `goal ${e.idName} lists ${fid} as a contributor but it is a ${t.type}`, `"contributors" must be Features (F-####)`);
        else if (t.fm && asArray(t.fm.goals).length > 0 && !asArray(t.fm.goals).includes(e.idName)) {
          // Only when the feature HAS goals but omits this one — a feature with
          // no goals at all is already covered by SPEC022.
          add("SPEC019", e.file, `goal ${e.idName} lists feature ${fid} as contributor, but ${fid}.goals does not include ${e.idName}`, `add ${e.idName} to ${fid}'s "goals" (links are bidirectional)`);
        }
      }
    } else if (e.type === "changeRequest") {
      const pid = d.parentId;
      if (pid && pid !== "") {
        const t = idIndex.get(pid);
        if (!t) add("SPEC015", e.file, `change request ${e.idName} references parentId ${pid}, which does not exist`, `fix "parentId" to an existing entity`);
        else if (typeof d.parentType === "string" && d.parentType !== "" && t.type !== d.parentType) {
          add("SPEC016", e.file, `CR ${e.idName} declares parentType "${d.parentType}" but ${pid} is a ${t.type}`, `set parentType: ${t.type}`);
        }
      }
    }

    // SPEC018 — relative markdown links resolve (warn).
    if (typeof e.body === "string") {
      const seen = new Set();
      const re = /\]\(([^)]+?\.md)(#[^)]*)?\)/g;
      let mm;
      while ((mm = re.exec(e.body)) !== null) {
        const target = mm[1];
        if (/^(https?:|mailto:|\/)/i.test(target)) continue;
        if (seen.has(target)) continue;
        seen.add(target);
        const abs = resolve(dirname(e.file), target);
        if (!existsSync(abs)) {
          add("SPEC018", e.file, `markdown link target "${target}" does not resolve to a file`, `fix the relative path (links point to the .md file, e.g. ../goals/G-###-slug.md)`);
        }
      }
    }
  }

  return { issues, filesChecked, entityCount: entities.length };
}

// Canonical ISO form of a non-ISO date, using ONLY string manipulation — never
// Date parsing — so we can't shift the calendar day across a timezone. Handles
// the common "wrong separators / space instead of T / missing zone" typos.
// Ambiguous free-form dates (e.g. "January 6, 2026") return null and are left
// as reported errors rather than silently rewritten to a different day.
function canonicalDate(v) {
  const s = String(v).trim();
  const pad = (x) => String(x).padStart(2, "0");
  // Date only: YYYY-M-D or YYYY/M/D
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  // Datetime: date + (space|T) + HH:MM(:SS)?(.sss)? with optional trailing Z.
  // No timezone offset is applied — a naive value is declared UTC (same wall clock).
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(\.\d+)?Z?$/);
  if (m) {
    const [, y, mo, d, h, mi, se, ms] = m;
    return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${mi}:${se ? pad(se) : "00"}${ms || ""}Z`;
  }
  return null;
}

// Replace the value of a scalar field within the frontmatter block. Returns the
// new content, or null if there is no frontmatter or the field line is absent
// (we never insert a missing field — that would be a guess).
function setFrontmatterScalar(content, field, value, quote) {
  const nl = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") return null;
  const rendered = quote ? `'${value}'` : `${value}`;
  const re = new RegExp(`^${field}:\\s`);
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") break;
    if (re.test(lines[i]) || lines[i] === `${field}:`) {
      lines[i] = `${field}: ${rendered}`;
      return lines.join(nl);
    }
  }
  return null;
}

// Apply all attached fixes, grouped by file (one read/write per file). Marks
// each applied issue with issue.fixed = true. Returns the number fixed.
function applyFixes(issues) {
  const byPath = new Map();
  for (const i of issues) {
    if (!i.fix) continue;
    if (!byPath.has(i.fix.path)) byPath.set(i.fix.path, []);
    byPath.get(i.fix.path).push(i);
  }
  let fixed = 0;
  for (const [path, list] of byPath) {
    let content;
    try {
      content = readFileSync(path, "utf8");
    } catch {
      continue;
    }
    const applied = [];
    for (const i of list) {
      const next = setFrontmatterScalar(content, i.fix.field, i.fix.value, i.fix.quote);
      if (next !== null && next !== content) {
        content = next;
        applied.push(i);
      }
    }
    if (applied.length) {
      try {
        writeFileSync(path, content);
        for (const i of applied) {
          i.fixed = true;
          fixed++;
        }
      } catch {
        /* leave issues unmarked if the write fails */
      }
    }
  }
  return fixed;
}

// Nearest ancestor feature directory of a requirement (from its root-relative
// path). "features/F-a/.../requirements/R-b" -> "F-a" (the last F before the R).
function structuralParentFeature(rootRel) {
  const segs = rootRel.split("/");
  for (let i = segs.length - 2; i >= 0; i--) {
    const c = classify(segs[i]);
    if (c && c.type === "feature") return c.id;
  }
  return null;
}

function kebab(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Slugs are generated from the title but may drop stopwords and truncate the
// tail. Accept the slug if its tokens are a prefix of the title tokens (with or
// without stopwords), allowing the final slug token to be a prefix (truncation).
const SLUG_STOPWORDS = new Set(["of", "and", "for", "the", "a", "an", "to", "in", "on", "from", "with", "by", "or", "at"]);

function isTokenPrefix(slugTokens, titleTokens) {
  if (slugTokens.length === 0 || slugTokens.length > titleTokens.length) return false;
  for (let i = 0; i < slugTokens.length; i++) {
    const last = i === slugTokens.length - 1;
    if (slugTokens[i] === titleTokens[i]) continue;
    if (last && titleTokens[i].startsWith(slugTokens[i])) continue; // truncated tail token
    return false;
  }
  return true;
}

function slugMatchesTitle(slug, title) {
  const k = kebab(title);
  if (slug === k || k.startsWith(slug)) return true; // exact or whole-string truncation
  const titleTokens = k.split("-").filter(Boolean);
  const slugTokens = slug.split("-").filter(Boolean);
  if (isTokenPrefix(slugTokens, titleTokens)) return true;
  return isTokenPrefix(slugTokens, titleTokens.filter((w) => !SLUG_STOPWORDS.has(w)));
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------
function reportText(result, strict) {
  const { issues, filesChecked } = result;
  const remaining = issues.filter((i) => !i.fixed);
  const errors = remaining.filter((i) => i.severity === "error").length;
  const warnings = remaining.filter((i) => i.severity === "warn").length;
  const fixedCount = issues.filter((i) => i.fixed).length;

  const out = [];
  if (issues.length === 0) {
    out.push(`✓ No issues found — checked ${filesChecked} entit${filesChecked === 1 ? "y" : "ies"}.`);
    process.stdout.write(out.join("\n") + "\n");
    return { errors, warnings };
  }

  // Group by file; within a file: remaining errors, remaining warnings, then fixed.
  const rank = (i) => (i.fixed ? 2 : i.severity === "error" ? 0 : 1);
  const byFile = new Map();
  for (const i of issues) {
    if (!byFile.has(i.file)) byFile.set(i.file, []);
    byFile.get(i.file).push(i);
  }
  for (const file of [...byFile.keys()].sort()) {
    out.push(file);
    const list = byFile.get(file).sort((a, b) => (rank(a) === rank(b) ? a.rule.localeCompare(b.rule) : rank(a) - rank(b)));
    for (const i of list) {
      const icon = i.fixed ? "✔" : i.severity === "error" ? "✖" : "⚠";
      const tag = i.fixed ? " (fixed)" : "";
      out.push(`  ${icon} ${i.rule} ${i.name}${tag}  ${i.message}`);
      if (!i.fixed) out.push(`      hint: ${i.hint}`);
    }
    out.push("");
  }

  const verdict = errors > 0 || (strict && warnings > 0) ? "FAIL" : "PASS";
  const prefix = fixedCount ? `Fixed ${fixedCount} issue${fixedCount === 1 ? "" : "s"}. ` : "";
  out.push(
    `${prefix}Summary: ${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}${fixedCount ? " remaining" : ""} across ${byFile.size} file${byFile.size === 1 ? "" : "s"} (${filesChecked} checked)  →  ${verdict}`
  );
  process.stdout.write(out.join("\n") + "\n");
  return { errors, warnings };
}

function reportJson(result, strict) {
  const { issues, filesChecked, entityCount } = result;
  const errors = issues.filter((i) => !i.fixed && i.severity === "error").length;
  const warnings = issues.filter((i) => !i.fixed && i.severity === "warn").length;
  const fixed = issues.filter((i) => i.fixed).length;
  const ok = errors === 0 && (!strict || warnings === 0);
  // Drop the internal `fix` descriptor from the emitted issues.
  const clean = issues.map(({ fix, ...rest }) => rest);
  process.stdout.write(
    JSON.stringify({ ok, summary: { errors, warnings, fixed, filesChecked, entityCount }, issues: clean }, null, 2) + "\n"
  );
  return { errors, warnings };
}

// ---------------------------------------------------------------------------
function main() {
  const opts = parseArgs(process.argv.slice(2));

  let root = opts.dir ? resolve(opts.dir) : detectSpeclan(process.cwd()) || resolve("speclan");
  if (!isDir(root)) {
    process.stderr.write(`ERROR: SPECLAN directory not found: ${root}\n`);
    process.exit(1);
  }

  const result = run(root);
  if (opts.fix) applyFixes(result.issues);
  const { errors, warnings } = opts.json
    ? reportJson(result, opts.strict)
    : reportText(result, opts.strict);

  const fail = errors > 0 || (opts.strict && warnings > 0);
  process.exit(fail ? 1 : 0);
}

main();
