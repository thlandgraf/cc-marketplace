#!/usr/bin/env node
import { createRequire as __createRequire } from "module"; const require = __createRequire(import.meta.url);

// apps/speclan-cli/src/generate-id/index.ts
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";

// libs/util/dist/lib/id.js
import { randomUUID } from "node:crypto";

// libs/util/dist/lib/result.js
function ok(value) {
  return { ok: true, value };
}
function err(error) {
  return { ok: false, error };
}

// libs/util/dist/lib/id.js
var ID_PATTERNS = {
  goal: /^G-\d{3}$/,
  feature: /^F-\d{4}$/,
  requirement: /^R-\d{4}$/,
  scenario: /^S-\d{4}$/,
  acceptanceCriterion: /^AC-\d{4}$/,
  test: /^T-\d{4}$/,
  template: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  changeRequest: /^CR-\d{4}$/
};
var ID_FORMAT_REGISTRY = {
  goal: { prefix: "G-", digits: 3, maxValue: 999, pattern: ID_PATTERNS.goal },
  feature: { prefix: "F-", digits: 4, maxValue: 9999, pattern: ID_PATTERNS.feature },
  requirement: { prefix: "R-", digits: 4, maxValue: 9999, pattern: ID_PATTERNS.requirement },
  scenario: { prefix: "S-", digits: 4, maxValue: 9999, pattern: ID_PATTERNS.scenario },
  acceptanceCriterion: { prefix: "AC-", digits: 4, maxValue: 9999, pattern: ID_PATTERNS.acceptanceCriterion },
  test: { prefix: "T-", digits: 4, maxValue: 9999, pattern: ID_PATTERNS.test },
  changeRequest: { prefix: "CR-", digits: 4, maxValue: 9999, pattern: ID_PATTERNS.changeRequest }
};
var MAX_GENERATION_ATTEMPTS = 1e3;
var END_BIAS_WINDOW_SIZE = 500;
function generateEndBiasedId(lastSiblingId, maxValue, existingIds, digits) {
  let windowStart = lastSiblingId !== null ? lastSiblingId + 1 : 0;
  while (windowStart <= maxValue) {
    const windowEnd = Math.min(windowStart + END_BIAS_WINDOW_SIZE - 1, maxValue);
    const available = [];
    for (let candidate = windowStart; candidate <= windowEnd; candidate++) {
      const idStr = String(candidate).padStart(digits, "0");
      if (!existingIds.has(idStr)) {
        available.push(candidate);
      }
    }
    if (available.length > 0) {
      const chosen = available[Math.floor(Math.random() * available.length)];
      return String(chosen).padStart(digits, "0");
    }
    windowStart = windowEnd + 1;
  }
  return null;
}
function generateRandomNumericId(config, existingIds, context) {
  const { digits, maxValue } = config;
  const maxPossible = maxValue + 1;
  if (existingIds.size >= maxPossible) {
    return null;
  }
  if (context !== void 0) {
    const endBiasedResult = generateEndBiasedId(context.lastSiblingId ?? null, maxValue, existingIds, digits);
    if (endBiasedResult !== null) {
      return endBiasedResult;
    }
  }
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const uuid = randomUUID().replace(/-/g, "");
    const num = parseInt(uuid.slice(-8), 16) % maxPossible;
    const id = String(num).padStart(digits, "0");
    if (!existingIds.has(id)) {
      return id;
    }
  }
  return null;
}
function generateGoalId(existingIds, context) {
  const config = ID_FORMAT_REGISTRY.goal;
  const numericExisting = new Set([...existingIds].map((id) => id.slice(config.prefix.length)));
  const numericPart = generateRandomNumericId(config, numericExisting, context);
  if (numericPart === null) {
    return err({
      code: "EXHAUSTED",
      message: `All ${config.maxValue + 1} Goal IDs are in use`,
      entityType: "goal",
      attempts: MAX_GENERATION_ATTEMPTS
    });
  }
  return ok(`${config.prefix}${numericPart}`);
}
function generateFeatureId(existingIds, context) {
  const config = ID_FORMAT_REGISTRY.feature;
  const numericExisting = new Set([...existingIds].map((id) => id.slice(config.prefix.length)));
  const numericPart = generateRandomNumericId(config, numericExisting, context);
  if (numericPart === null) {
    return err({
      code: "EXHAUSTED",
      message: `All ${config.maxValue + 1} Feature IDs are in use`,
      entityType: "feature",
      attempts: MAX_GENERATION_ATTEMPTS
    });
  }
  return ok(`${config.prefix}${numericPart}`);
}
function generateRequirementId(existingIds, context) {
  const config = ID_FORMAT_REGISTRY.requirement;
  const numericExisting = new Set([...existingIds].map((id) => id.slice(config.prefix.length)));
  const numericPart = generateRandomNumericId(config, numericExisting, context);
  if (numericPart === null) {
    return err({
      code: "EXHAUSTED",
      message: `All ${config.maxValue + 1} Requirement IDs are in use`,
      entityType: "requirement",
      attempts: MAX_GENERATION_ATTEMPTS
    });
  }
  return ok(`${config.prefix}${numericPart}`);
}
function generateRandomChangeRequestId(existingIds, context) {
  const config = ID_FORMAT_REGISTRY.changeRequest;
  const numericExisting = new Set([...existingIds].map((id) => id.slice(config.prefix.length)));
  const numericPart = generateRandomNumericId(config, numericExisting, context);
  if (numericPart === null) {
    return err({
      code: "EXHAUSTED",
      message: `All ${config.maxValue + 1} Change Request IDs are in use`,
      entityType: "changeRequest",
      attempts: MAX_GENERATION_ATTEMPTS
    });
  }
  return ok(`${config.prefix}${numericPart}`);
}

// libs/util/dist/lib/logger.js
var LogLevel = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4
};
var LOG_LEVEL_NAMES = {
  [LogLevel.TRACE]: "TRACE",
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR"
};

// apps/speclan-cli/src/shared/output.ts
function success(data) {
  return { ok: true, data };
}
function fail(error, message, context) {
  return context ? { ok: false, error, message, context } : { ok: false, error, message };
}
function output(result) {
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(result.ok ? 0 : 1);
}

// apps/speclan-cli/src/generate-id/index.ts
var SUPPORTED_TYPES = {
  goal: "Goal (G-###)",
  feature: "Feature (F-####)",
  requirement: "Requirement (R-####)",
  changeRequest: "Change Request (CR-####)"
};
var KEBAB_ALIASES = {
  "change-request": "changeRequest"
};
var PARENT_CONFIG = {
  feature: { validParentTypes: ["feature"], siblingSubdir: null, siblingPattern: /^(F-\d{4})-/ },
  requirement: { validParentTypes: ["feature"], siblingSubdir: "requirements", siblingPattern: /^(R-\d{4})-/ },
  changeRequest: {
    validParentTypes: ["feature", "requirement", "goal"],
    siblingSubdir: "change-requests",
    siblingPattern: /^(CR-\d{4})-/
  }
};
function getFlag(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) {
    return void 0;
  }
  return args[idx + 1];
}
function resolveEntityType(raw) {
  const lower = raw.toLowerCase();
  if (lower in SUPPORTED_TYPES) {
    return lower;
  }
  if (lower in KEBAB_ALIASES) {
    return KEBAB_ALIASES[lower];
  }
  for (const key of Object.keys(SUPPORTED_TYPES)) {
    if (key.toLowerCase() === lower) {
      return key;
    }
  }
  return void 0;
}
function findSpeclanRoot(startDir) {
  let dir = resolve(startDir);
  const root = resolve("/");
  while (dir !== root) {
    const candidate = join(dir, "speclan");
    if (existsSync(candidate) && (existsSync(join(candidate, "goals")) || existsSync(join(candidate, "features")))) {
      return candidate;
    }
    const parent = resolve(dir, "..");
    if (parent === dir)
      break;
    dir = parent;
  }
  return void 0;
}
async function safeReaddir(dir) {
  if (!existsSync(dir))
    return [];
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}
async function scanSpecDirectory(speclanRoot) {
  const entities = [];
  for (const entry of await safeReaddir(join(speclanRoot, "goals"))) {
    const match = entry.name.match(/^(G-\d{3})-/);
    if (match) {
      const goalDir = join(speclanRoot, "goals", entry.name);
      entities.push({
        id: match[1],
        type: "goal",
        absolutePath: entry.isDirectory() ? join(goalDir, `${entry.name}.md`) : goalDir
      });
    }
  }
  async function scanFeatureDir(dir) {
    for (const entry of await safeReaddir(dir)) {
      if (!entry.isDirectory())
        continue;
      const match = entry.name.match(/^(F-\d{4})-/);
      if (!match)
        continue;
      const featureDir = join(dir, entry.name);
      entities.push({
        id: match[1],
        type: "feature",
        absolutePath: join(featureDir, `${entry.name}.md`)
      });
      await scanFeatureDir(featureDir);
      for (const reqEntry of await safeReaddir(join(featureDir, "requirements"))) {
        if (!reqEntry.isDirectory())
          continue;
        const reqMatch = reqEntry.name.match(/^(R-\d{4})-/);
        if (reqMatch) {
          entities.push({
            id: reqMatch[1],
            type: "requirement",
            absolutePath: join(featureDir, "requirements", reqEntry.name, `${reqEntry.name}.md`)
          });
          await scanCRDir(join(featureDir, "requirements", reqEntry.name));
        }
      }
      await scanCRDir(featureDir);
    }
  }
  async function scanCRDir(parentDir) {
    for (const entry of await safeReaddir(join(parentDir, "change-requests"))) {
      const match = entry.name.match(/^(CR-\d{4})-/);
      if (match) {
        const crPath = join(parentDir, "change-requests", entry.name);
        entities.push({
          id: match[1],
          type: "changeRequest",
          absolutePath: entry.isDirectory() ? join(crPath, `${entry.name}.md`) : crPath
        });
      }
    }
  }
  await scanFeatureDir(join(speclanRoot, "features"));
  return entities;
}
function generateId(entityType, entities, context) {
  switch (entityType) {
    case "goal": {
      const existing = new Set(entities.filter((e) => e.type === "goal").map((e) => e.id));
      const result = generateGoalId(existing, context);
      return result.ok ? result.value : void 0;
    }
    case "feature": {
      const existing = new Set(entities.filter((e) => e.type === "feature").map((e) => e.id));
      const result = generateFeatureId(existing, context);
      return result.ok ? result.value : void 0;
    }
    case "requirement": {
      const existing = new Set(entities.filter((e) => e.type === "requirement").map((e) => e.id));
      const result = generateRequirementId(existing, context);
      return result.ok ? result.value : void 0;
    }
    case "changeRequest": {
      const existing = new Set(entities.filter((e) => e.type === "changeRequest").map((e) => e.id));
      const result = generateRandomChangeRequestId(existing, context);
      return result.ok ? result.value : void 0;
    }
    default:
      return void 0;
  }
}
function buildGenerationContext(siblingIds, prefix) {
  let maxId;
  for (const id of siblingIds) {
    if (id.startsWith(prefix)) {
      const num = parseInt(id.slice(prefix.length), 10);
      if (!isNaN(num) && (maxId === void 0 || num > maxId)) {
        maxId = num;
      }
    }
  }
  return { lastSiblingId: maxId };
}
var TYPE_PREFIX = {
  goal: "G-",
  feature: "F-",
  requirement: "R-",
  changeRequest: "CR-"
};
async function scanSiblingIds(directory, pattern) {
  const ids = [];
  for (const entry of await safeReaddir(directory)) {
    if (entry.isDirectory()) {
      const match = entry.name.match(pattern);
      if (match) {
        ids.push(match[1]);
      }
    }
  }
  return ids;
}
function printHelp() {
  return output(
    success({
      name: "generate-id",
      version: "0.1.0",
      usage: "node generate-id.js --type <entityType> [options]",
      description: "Generate unique SPECLAN entity IDs",
      options: [
        "--type <type>        Entity type (required)",
        "--parent <id>        Parent entity ID for end-biased generation (optional)",
        "--count <n>          Number of IDs to generate (default: 1)",
        "--speclan-root <path> Override speclan directory location",
        "--help               Show this help message"
      ],
      supportedTypes: Object.entries(SUPPORTED_TYPES).map(([key, desc]) => `${key}: ${desc}`)
    })
  );
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help")) {
    printHelp();
  }
  const rawType = getFlag(args, "--type");
  if (!rawType) {
    output(
      fail("MISSING_TYPE", "The --type parameter is required", {
        usage: "node generate-id.js --type <entityType>",
        supportedTypes: Object.keys(SUPPORTED_TYPES)
      })
    );
  }
  const entityType = resolveEntityType(rawType);
  if (!entityType) {
    output(
      fail("INVALID_TYPE", `Unknown entity type: ${rawType}`, {
        provided: rawType,
        supportedTypes: Object.keys(SUPPORTED_TYPES),
        kebabAliases: Object.keys(KEBAB_ALIASES)
      })
    );
  }
  const rawCount = getFlag(args, "--count");
  const count = rawCount ? parseInt(rawCount, 10) : 1;
  if (isNaN(count) || count < 1 || count > 100) {
    output(
      fail("INVALID_COUNT", `Invalid count: ${rawCount}. Must be an integer between 1 and 100`, {
        provided: rawCount
      })
    );
  }
  const explicitRoot = getFlag(args, "--speclan-root");
  const speclanRoot = explicitRoot ? resolve(explicitRoot) : findSpeclanRoot(process.cwd());
  if (!speclanRoot) {
    output(
      fail(
        "SPECLAN_ROOT_NOT_FOUND",
        "Could not find speclan directory. Use --speclan-root to specify the path.",
        { searchedFrom: process.cwd() }
      )
    );
  }
  const parentId = getFlag(args, "--parent");
  const entities = await scanSpecDirectory(speclanRoot);
  let context;
  if (parentId) {
    const config = PARENT_CONFIG[entityType];
    if (!config) {
      output(
        fail("INVALID_PARENT", `Entity type '${entityType}' does not support --parent`, {
          type: entityType,
          parentId
        })
      );
    }
    const parentEntity = entities.find((e) => e.id === parentId);
    if (!parentEntity) {
      output(
        fail("PARENT_NOT_FOUND", `Parent entity not found: ${parentId}`, {
          parentId
        })
      );
    }
    if (!config.validParentTypes.includes(parentEntity.type)) {
      output(
        fail("INVALID_PARENT", `Cannot create ${entityType} under ${parentEntity.type} '${parentId}'. Valid parent types: ${config.validParentTypes.join(", ")}`, {
          type: entityType,
          parentId,
          parentType: parentEntity.type,
          validParentTypes: config.validParentTypes
        })
      );
    }
    const parentDir = dirname(parentEntity.absolutePath);
    const siblingDir = config.siblingSubdir ? join(parentDir, config.siblingSubdir) : parentDir;
    const siblingIds = await scanSiblingIds(siblingDir, config.siblingPattern);
    const prefix = TYPE_PREFIX[entityType];
    context = prefix ? buildGenerationContext(siblingIds, prefix) : void 0;
  } else {
    const prefix = TYPE_PREFIX[entityType];
    if (prefix) {
      const sameTypeIds = entities.filter((e) => e.type === entityType).map((e) => e.id);
      context = buildGenerationContext(sameTypeIds, prefix);
    }
  }
  const ids = [];
  const generated = /* @__PURE__ */ new Set();
  for (let i = 0; i < count; i++) {
    const MAX_RETRIES = 10;
    let id;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const result = generateId(entityType, entities, context);
      if (!result) {
        output(
          fail("ID_GENERATION_FAILED", `Failed to generate ${entityType} ID (ID space may be exhausted)`, {
            type: entityType,
            generatedSoFar: ids
          })
        );
      }
      if (!generated.has(result)) {
        id = result;
        break;
      }
    }
    if (!id) {
      output(
        fail("ID_GENERATION_FAILED", `Could not generate a unique ID after ${MAX_RETRIES} attempts (batch collision)`, {
          type: entityType,
          generatedSoFar: ids
        })
      );
      return;
    }
    generated.add(id);
    ids.push(id);
  }
  output(success({ type: entityType, ids }));
}
main().catch((error) => {
  if (error instanceof Error && error.message.startsWith("process.exit(")) {
    return;
  }
  output(
    fail("UNEXPECTED_ERROR", error instanceof Error ? error.message : String(error))
  );
});
//# sourceMappingURL=generate-id.js.map
