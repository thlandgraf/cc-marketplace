#!/bin/bash
# SPECLAN Skill Injection Hook
# Injects speclan-format skill reference when accessing speclan files

# Get file path from tool input
FILE_PATH=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.file_path // .path // ""' 2>/dev/null)

# Check if this is a speclan file
if [[ "$FILE_PATH" == *"/speclan/"* ]] || [[ "$FILE_PATH" == *"/specs/speclan/"* ]] || [[ "$FILE_PATH" == *"/.speclan/"* ]]; then
  cat << 'EOF'
{
  "continue": true,
  "systemMessage": "Working with SPECLAN file. Apply 'SPECLAN Format' skill: use proper YAML frontmatter (id, type, title, status, owner, created, updated), maintain entity relationships (Goals→Features→Requirements), use correct ID prefixes (G-, F-, R-, CR-), and follow status workflow (draft→review→approved→in-development→under-test→released)."
}
EOF
else
  echo '{"continue": true}'
fi
