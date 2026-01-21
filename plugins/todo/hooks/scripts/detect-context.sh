#!/bin/bash
# Todo Context Detection Hook
# Runs at session start to detect todo directory and show status summary

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# Check if todo directory exists
TODO_DIR="$PROJECT_DIR/todo"

if [[ ! -d "$TODO_DIR" ]]; then
    # No todo directory - silent exit
    echo '{"continue": true}'
    exit 0
fi

# Count tasks in each state
count_tasks() {
    local dir="$1"
    if [[ -d "$dir" ]]; then
        find "$dir" -maxdepth 1 -name "[0-9]*.md" -type f 2>/dev/null | wc -l | tr -d ' '
    else
        echo "0"
    fi
}

open_count=$(count_tasks "$TODO_DIR/open")
wip_count=$(count_tasks "$TODO_DIR/wip")
done_count=$(count_tasks "$TODO_DIR/done")

# Build output
output=""
output+="## Todo Status\n\n"
output+="| State | Count |\n"
output+="|-------|-------|\n"
output+="| Open | $open_count |\n"
output+="| In Progress | $wip_count |\n"
output+="| Done | $done_count |\n"
output+="\n"

# List WIP tasks if any
if [[ "$wip_count" -gt 0 ]]; then
    output+="### Active Tasks\n"
    for f in "$TODO_DIR/wip"/[0-9]*.md; do
        if [[ -f "$f" ]]; then
            # Extract ID and title from filename
            filename=$(basename "$f" .md)
            id=$(echo "$filename" | grep -oE '^[0-9]+')
            slug=$(echo "$filename" | sed 's/^[0-9]*-//')
            output+="- **$id**: $slug\n"
        fi
    done
    output+="\n"
fi

# Persist environment if available
if [[ -n "${CLAUDE_ENV_FILE:-}" ]]; then
    echo "export TODO_DIR=\"$TODO_DIR\"" >> "$CLAUDE_ENV_FILE"
    echo "export TODO_OPEN_COUNT=\"$open_count\"" >> "$CLAUDE_ENV_FILE"
    echo "export TODO_WIP_COUNT=\"$wip_count\"" >> "$CLAUDE_ENV_FILE"
    echo "export TODO_DONE_COUNT=\"$done_count\"" >> "$CLAUDE_ENV_FILE"
fi

# Output for Claude
echo -e "$output"

# Return JSON
cat << EOF
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "Todo context: $open_count open, $wip_count in progress, $done_count done. Use /todo:add, /todo:start, /todo:update, /todo:done."
}
EOF
