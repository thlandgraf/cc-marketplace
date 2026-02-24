#!/bin/bash
# Guard locked SPECLAN specs from direct modification
# Blocks Write/Edit on Features and Requirements with locked status:
# - deprecated: NEVER writable, frozen permanently
# - in-development, under-test, released: require a Change Request (CR-####)
#   in the entity's change-requests/ directory

# Read hook input from stdin
INPUT=$(cat) || true
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null) || FILE_PATH=""

# Only check files under PROJECTROOT/speclan/
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
SPECLAN_ROOT="${PROJECT_DIR}/speclan/"
if [[ "$FILE_PATH" != "${SPECLAN_ROOT}"* ]]; then
  exit 0
fi

# Only check Feature and Requirement files (F-####-*.md or R-####-*.md)
BASENAME=$(basename "$FILE_PATH" 2>/dev/null)
if [[ ! "$BASENAME" =~ ^(F|R)-[0-9]+-.*\.md$ ]]; then
  exit 0
fi

# New files are always OK
if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Extract status from YAML frontmatter
STATUS=$(awk '
  BEGIN { in_fm = 0 }
  /^---$/ {
    if (in_fm) exit
    in_fm = 1
    next
  }
  in_fm && /^status:/ {
    sub(/^status:[ ]*/, "")
    gsub(/["'"'"']/, "")
    gsub(/[ \t]+$/, "")
    print
    exit
  }
' "$FILE_PATH" 2>/dev/null)

# Check locked statuses
ENTITY_ID=$(echo "$BASENAME" | grep -oE '^(F|R)-[0-9]+' 2>/dev/null || echo "unknown")
ENTITY_DIR=$(dirname "$FILE_PATH")

case "$STATUS" in
  deprecated)
    echo "{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\"},\"systemMessage\":\"BLOCKED: ${ENTITY_ID} is deprecated and must not be modified. Deprecated specs are frozen and cannot be changed or receive Change Requests.\"}"
    exit 0
    ;;
  in-development|under-test|released)
    echo "{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\"},\"systemMessage\":\"BLOCKED: ${ENTITY_ID} has status '${STATUS}' and cannot be directly modified. Create a Change Request (CR-####) in ${ENTITY_DIR}/change-requests/ instead. Use the speclan-id-generator skill to generate a CR ID.\"}"
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
