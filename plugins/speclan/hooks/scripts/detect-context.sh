#!/bin/bash
# SPECLAN Context Detection Hook
# Runs at session start to detect speclan directory and installed plugins
#
# Outputs context information for Claude and persists environment variables

# Minimal error handling - hooks must not fail on "not found" conditions

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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
    output+="## SPECLAN Project Detected\n\n"
    output+="**Speclan Directory:** \`$speclan_dir\`\n\n"

    # Persist to environment
    env_output+="export SPECLAN_DIR=\"$speclan_dir\"\n"

    # Count specifications
    goals=$(count_specs "$speclan_dir" "goals" "G-*.md")
    features=$(count_specs "$speclan_dir" "features" "F-*.md")
    requirements=$(count_specs "$speclan_dir" "requirements" "R-*.md")

    # Count by status
    approved=$(count_by_status "$speclan_dir" "approved")
    draft=$(count_by_status "$speclan_dir" "draft")
    in_dev=$(count_by_status "$speclan_dir" "in-development")

    output+="### Specification Summary\n\n"
    output+="| Entity | Count |\n"
    output+="|--------|-------|\n"
    output+="| Goals | $goals |\n"
    output+="| Features | $features |\n"
    output+="| Requirements | $requirements |\n"
    output+="\n"

    output+="### Status Distribution\n\n"
    output+="| Status | Count |\n"
    output+="|--------|-------|\n"
    output+="| Approved | $approved |\n"
    output+="| Draft | $draft |\n"
    output+="| In Development | $in_dev |\n"
    output+="\n"

    env_output+="export SPECLAN_GOALS_COUNT=\"$goals\"\n"
    env_output+="export SPECLAN_FEATURES_COUNT=\"$features\"\n"
    env_output+="export SPECLAN_REQUIREMENTS_COUNT=\"$requirements\"\n"
    env_output+="export SPECLAN_APPROVED_COUNT=\"$approved\"\n"
else
    output+="## No SPECLAN Directory Found\n\n"
    output+="This project does not appear to have a SPECLAN specification directory.\n"
    output+="To use SPECLAN, create a \`speclan/\` directory with \`goals/\`, \`features/\`, and \`requirements/\` subdirectories.\n\n"
fi

# Check for optional plugin dependencies
output+="### Plugin Dependencies\n\n"
output+="| Plugin | Status |\n"
output+="|--------|--------|\n"

# Check speckit
if check_plugin_installed "speckit"; then
    output+="| speckit | Installed |\n"
    env_output+="export SPECLAN_HAS_SPECKIT=\"true\"\n"
else
    output+="| speckit | Not installed |\n"
    env_output+="export SPECLAN_HAS_SPECKIT=\"false\"\n"
fi

# Check feature-dev
if check_plugin_installed "feature-dev"; then
    output+="| feature-dev | Installed |\n"
    env_output+="export SPECLAN_HAS_FEATURE_DEV=\"true\"\n"
else
    output+="| feature-dev | Not installed |\n"
    env_output+="export SPECLAN_HAS_FEATURE_DEV=\"false\"\n"
fi

output+="\n"

# Persist environment variables if CLAUDE_ENV_FILE is available
if [[ -n "${CLAUDE_ENV_FILE:-}" ]]; then
    echo -e "$env_output" >> "$CLAUDE_ENV_FILE"
fi

# Output context for Claude
echo -e "$output"

# Return JSON for systemMessage
cat << EOF
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "SPECLAN context loaded. Speclan dir: ${speclan_dir:-none}. Use /speclan:status for details."
}
EOF
