#!/bin/bash
# Guard SPECLAN specs from invalid modifications
#
# Two guards:
# 1. Invalid status: Blocks setting status to any value not in the valid SPECLAN lifecycle
#    Applies to ALL files under speclan/ (features, requirements, change requests)
# 2. Locked specs: Blocks Write/Edit on Features and Requirements with locked status
#    (deprecated, in-development, under-test, released)

# Read hook input from stdin
INPUT=$(cat) || true
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null) || TOOL_NAME=""
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null) || FILE_PATH=""

# Only check files under PROJECTROOT/speclan/
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
SPECLAN_ROOT="${PROJECT_DIR}/speclan/"
if [[ "$FILE_PATH" != "${SPECLAN_ROOT}"* ]]; then
  exit 0
fi

# --- Guard 1: Invalid status values ---
# Extract the new content being written
if [[ "$TOOL_NAME" == "Edit" ]]; then
  NEW_CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // ""' 2>/dev/null) || NEW_CONTENT=""
elif [[ "$TOOL_NAME" == "Write" ]]; then
  NEW_CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // ""' 2>/dev/null) || NEW_CONTENT=""
else
  NEW_CONTENT=""
fi

# Check if the edit introduces a status: field with an invalid value
if [[ -n "$NEW_CONTENT" ]]; then
  NEW_STATUS=$(echo "$NEW_CONTENT" | grep -m1 '^status:' | sed 's/^status:[ ]*//' | sed "s/^[\"']//;s/[\"']$//" | sed 's/[ \t]*$//')

  if [[ -n "$NEW_STATUS" ]]; then
    case "$NEW_STATUS" in
      draft|review|approved|in-development|under-test|released|deprecated)
        # Valid status, continue to next guard
        ;;
      *)
        echo "{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\"},\"systemMessage\":\"BLOCKED: '${NEW_STATUS}' is not a valid SPECLAN status. Valid statuses: draft, review, approved, in-development, under-test, released, deprecated. Do NOT change spec statuses during review — they remain as-is.\"}"
        exit 0
        ;;
    esac
  fi
fi

# --- Guard 2: Locked spec statuses ---
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
