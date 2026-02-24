#!/bin/bash
# SPECLAN Skill Injection Hook
# Injects speclan-format skill reference when accessing speclan files

# Read hook input from stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null)

# Check if this is a speclan file
if [[ "$FILE_PATH" == *"/speclan/"* ]] || [[ "$FILE_PATH" == *"/specs/speclan/"* ]] || [[ "$FILE_PATH" == *"/.speclan/"* ]]; then
  cat << 'EOF'
{
  "continue": true,
  "systemMessage": "Working with SPECLAN file. Apply 'SPECLAN Format' skill: use proper YAML frontmatter (id, type, title, status, owner, created, updated), maintain entity relationships (Goals→Features→Requirements), use correct ID prefixes (G-, F-, R-, CR-), and follow status workflow (draft→review→approved→in-development→under-test→released). IMPORTANT files under PROJECTROOT/speclan are specifications the tell WHAT from user perspective not HOW from developer or architect perspective - do so as well!"
}
EOF
else
  echo '{"continue": true}'
fi
