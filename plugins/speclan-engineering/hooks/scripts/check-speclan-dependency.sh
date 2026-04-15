#!/bin/bash
# speclan-engineering dependency check
# Verifies the speclan plugin is installed. speclan-engineering reuses speclan's
# skills (speclan-format, speclan-id-generator, speclan-query) and cannot function
# without them. Emits a warning via systemMessage if speclan is missing; stays
# silent when the dependency is satisfied.

check_speclan_installed() {
    local plugin_dirs=(
        "$HOME/.claude/plugins"
        "$HOME/.claude-plugins"
        ".claude-plugins"
    )
    for pdir in "${plugin_dirs[@]}"; do
        if [[ -d "$pdir" ]]; then
            if find "$pdir" -maxdepth 4 -type d -name "speclan" 2>/dev/null | grep -q .; then
                return 0
            fi
        fi
    done
    return 1
}

if check_speclan_installed; then
    cat << 'EOF'
{
  "continue": true,
  "suppressOutput": true
}
EOF
    exit 0
fi

msg="speclan-engineering requires the speclan plugin, which does not appear to be installed. Install it with: /plugin install speclan@digital-dividend-marketplace"
json_msg=$(printf '%s' "$msg" | jq -Rs . 2>/dev/null || printf '"speclan-engineering: speclan plugin not found."')

cat << EOF
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": ${json_msg}
}
EOF
