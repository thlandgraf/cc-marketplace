#!/bin/bash
# SPECLAN Context Detection Hook
# Runs at session start to detect speclan directory and installed plugins
#
# Outputs context information for Claude and persists environment variables

# Minimal error handling - hooks must not fail on "not found" conditions

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# --- Detection Functions ---

detect_speclan_dir() {
    local dir="$1"
    local speclan_dirs=("speclan" "specs/speclan" ".speclan")
    local markers=("goals" "features" "requirements")

    for speclan_name in "${speclan_dirs[@]}"; do
        local candidate="$dir/$speclan_name"
        if [[ -d "$candidate" ]]; then
            local marker_count=0
            for marker in "${markers[@]}"; do
                if [[ -d "$candidate/$marker" ]]; then
                    ((marker_count++))
                fi
            done
            if [[ $marker_count -ge 2 ]]; then
                echo "$candidate"
                return 0
            fi
        fi
    done
    return 1
}

check_plugin_installed() {
    local plugin_name="$1"
    # Check if plugin commands are available by looking for skill triggers
    # This is a heuristic - plugins register their skills
    if command -v claude &> /dev/null; then
        # Try to detect via claude's internal plugin registry
        # For now, use a simple file-based check
        local plugin_dirs=(
            "$HOME/.claude/plugins"
            "$HOME/.claude-plugins"
            ".claude-plugins"
        )
        for pdir in "${plugin_dirs[@]}"; do
            if [[ -d "$pdir/$plugin_name" ]]; then
                return 0
            fi
        done
    fi
    return 1
}

count_specs() {
    local speclan_dir="$1"
    local type="$2"
    local pattern="$3"

    if [[ -d "$speclan_dir/$type" ]]; then
        find "$speclan_dir/$type" -name "$pattern" -type f 2>/dev/null | wc -l | tr -d ' '
    else
        echo "0"
    fi
}

count_by_status() {
    local speclan_dir="$1"
    local status="$2"

    # Count specs with specific status in YAML frontmatter
    # Use || true to handle no matches gracefully
    grep -r "^status: $status" "$speclan_dir" 2>/dev/null | wc -l | tr -d ' ' || echo "0"
}

# --- Main Detection ---

output=""
env_output=""

# Detect SPECLAN directory
speclan_dir=""
current="$PROJECT_DIR"
while [[ "$current" != "/" ]]; do
    if result=$(detect_speclan_dir "$current" 2>/dev/null); then
        speclan_dir="$result"
        break
    fi
    current=$(dirname "$current")
done

if [[ -n "$speclan_dir" ]]; then
    # Persist to environment
    env_output+="export SPECLAN_DIR=\"$speclan_dir\"\n"

    # Count by status
    draft=$(count_by_status "$speclan_dir" "draft")
    review=$(count_by_status "$speclan_dir" "review")
    approved=$(count_by_status "$speclan_dir" "approved")

    output+="SPECLAN Project ($draft draft, $review review, $approved approved)"

    # Check if rules file is installed
    rules_found=false
    for rules_dir in "$PROJECT_DIR/.claude/rules" "$current/.claude/rules"; do
        if ls "$rules_dir"/speclan*.md &>/dev/null; then
            rules_found=true
            break
        fi
    done
    if [[ "$rules_found" == false ]]; then
        output+="\nWARN: No .claude/rules/speclan.md found. Add a path-restricted rules file for SPECLAN format guidance."
    fi

    env_output+="export SPECLAN_DRAFT_COUNT=\"$draft\"\n"
    env_output+="export SPECLAN_REVIEW_COUNT=\"$review\"\n"
    env_output+="export SPECLAN_APPROVED_COUNT=\"$approved\"\n"

    # Check optional plugin dependencies
    if check_plugin_installed "speckit"; then
        env_output+="export SPECLAN_HAS_SPECKIT=\"true\"\n"
    else
        env_output+="export SPECLAN_HAS_SPECKIT=\"false\"\n"
    fi
    if check_plugin_installed "feature-dev"; then
        env_output+="export SPECLAN_HAS_FEATURE_DEV=\"true\"\n"
    else
        env_output+="export SPECLAN_HAS_FEATURE_DEV=\"false\"\n"
    fi
fi

# Persist environment variables if CLAUDE_ENV_FILE is available
if [[ -n "${CLAUDE_ENV_FILE:-}" ]]; then
    echo -e "$env_output" >> "$CLAUDE_ENV_FILE"
fi

# Output context for Claude as systemMessage JSON
if [[ -n "$output" ]]; then
    json_output=$(echo -e "$output" | jq -Rs . 2>/dev/null || echo '"SPECLAN context detection completed."')
    cat << EOF
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": ${json_output}
}
EOF
else
    cat << 'EOF'
{
  "continue": true,
  "suppressOutput": true
}
EOF
fi
