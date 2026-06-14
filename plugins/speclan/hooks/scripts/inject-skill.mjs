#!/usr/bin/env node
// SPECLAN Skill Injection Hook
// Injects speclan-format skill reference when accessing speclan files

import { readFileSync } from "node:fs";

// Read hook input from stdin
let filePath = "";
try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  filePath = input?.tool_input?.file_path ?? input?.tool_input?.path ?? "";
} catch {
  // Malformed input: fall through to plain continue
}

// Check if this is a speclan file
if (
  filePath.includes("/speclan/") ||
  filePath.includes("/specs/speclan/") ||
  filePath.includes("/.speclan/")
) {
  process.stdout.write(
    JSON.stringify({
      continue: true,
      systemMessage:
        "Working with SPECLAN file. Apply 'SPECLAN Format' skill: use proper YAML frontmatter (id, type, title, status, owner, created, updated), maintain entity relationships (Goals→Features→Requirements), use correct ID prefixes (G-, F-, R-, CR-), and follow status workflow (draft→review→approved→in-development→under-test→released). IMPORTANT files under PROJECTROOT/speclan are specifications the tell WHAT from user perspective not HOW from developer or architect perspective - do so as well!",
    }) + "\n"
  );
} else {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}
