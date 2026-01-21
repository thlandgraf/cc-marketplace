#!/bin/bash
# Todo Skill Injection Hook
# Injects todo-format skill reference when accessing todo files

# Get file path from tool input
FILE_PATH=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.file_path // .path // ""' 2>/dev/null)

# Check if this is a todo file
if [[ "$FILE_PATH" == */todo/open/* ]] || [[ "$FILE_PATH" == */todo/wip/* ]] || [[ "$FILE_PATH" == */todo/done/* ]]; then
  cat << 'EOF'
{
  "continue": true,
  "systemMessage": "Working with todo task file. Apply 'Todo Format' skill: use header format (Status/Priority/Assignee/Created/Branch), maintain Tasks checklist with [ ]/[x], log work in Implementation Log with timestamps (YYYY-MM-DD HH:MM), reference dependencies by ID only."
}
EOF
else
  echo '{"continue": true}'
fi
