#!/bin/bash
# Detect SPECLAN directory in a project
#
# Usage (executed): detect-speclan.sh [start_directory]
#   Prints the speclan directory path to stdout, exits 1 if not found.
#
# Usage (sourced):  source detect-speclan.sh [start_directory]
#   Sets and exports $SPECLAN_ROOT, returns 1 if not found.
#   Does not exit or alter shell options of the calling shell.

_DETECT_SPECLAN_SOURCED=0
if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
    _DETECT_SPECLAN_SOURCED=1
else
    set -e
fi

_detect_speclan_main() {
    local start_dir="${1:-.}"
    start_dir=$(cd "$start_dir" 2>/dev/null && pwd) || return 1

    # Common speclan directory names. Entries may be symlinks (e.g. a repo-root
    # "speclan" symlink pointing into a spec submodule like .specs/speclan) —
    # the -d checks below follow symlinks, so both layouts work.
    local speclan_dirs=("speclan" "specs/speclan" ".speclan" ".specs/speclan")

    # Search from start directory up to root
    local current_dir="$start_dir"
    local dir candidate
    while :; do
        for dir in "${speclan_dirs[@]}"; do
            candidate="$current_dir/$dir"
            # Confirm via core entity directories. A speclan dir always has
            # features/ and/or goals/ at the top level; requirements/ never
            # appears there (requirements nest under features), and young
            # projects may not have goals/ yet — so one core marker suffices.
            if [[ -d "$candidate" && ( -d "$candidate/features" || -d "$candidate/goals" ) ]]; then
                echo "$candidate"
                return 0
            fi
        done
        [[ "$current_dir" == "/" ]] && break
        current_dir=$(dirname "$current_dir")
    done

    return 1
}

if SPECLAN_ROOT=$(_detect_speclan_main "$@"); then
    export SPECLAN_ROOT
    if [[ $_DETECT_SPECLAN_SOURCED -eq 0 ]]; then
        echo "$SPECLAN_ROOT"
    fi
else
    unset SPECLAN_ROOT
    echo "No SPECLAN directory found" >&2
    if [[ $_DETECT_SPECLAN_SOURCED -eq 1 ]]; then
        return 1
    fi
    exit 1
fi
