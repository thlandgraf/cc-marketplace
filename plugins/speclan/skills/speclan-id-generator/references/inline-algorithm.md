# Inline ID Generation Algorithm

If the `scripts/generate-id.sh` script is not available, commands can use this inline algorithm as a fallback:

```bash
# Generate unique Feature ID (4-digit)
generate_feature_id() {
  local speclan_dir="${1:-speclan}"
  local max_attempts=100

  for attempt in $(seq 1 $max_attempts); do
    # Generate random 4-digit number (1000-9999)
    local num=$((RANDOM % 9000 + 1000))
    local id="F-${num}"

    # Check for collisions
    if [ ! -d "$speclan_dir" ]; then
      echo "$id"
      return 0
    fi

    # Check filenames and frontmatter
    if ! find "$speclan_dir" -name "${id}-*" 2>/dev/null | grep -q . && \
       ! grep -r "^id: ${id}$" "$speclan_dir" 2>/dev/null | grep -q .; then
      echo "$id"
      return 0
    fi
  done

  echo "ERROR: Could not generate unique ID" >&2
  return 1
}

# Generate unique Requirement ID (4-digit)
generate_requirement_id() {
  local speclan_dir="${1:-speclan}"
  local max_attempts=100

  for attempt in $(seq 1 $max_attempts); do
    # Generate random 4-digit number (1000-9999)
    local num=$((RANDOM % 9000 + 1000))
    local id="R-${num}"

    if [ ! -d "$speclan_dir" ]; then
      echo "$id"
      return 0
    fi

    if ! find "$speclan_dir" -name "${id}-*" 2>/dev/null | grep -q . && \
       ! grep -r "^id: ${id}$" "$speclan_dir" 2>/dev/null | grep -q .; then
      echo "$id"
      return 0
    fi
  done

  echo "ERROR: Could not generate unique ID" >&2
  return 1
}

# Usage
FEATURE_ID=$(generate_feature_id speclan)
REQ_ID=$(generate_requirement_id speclan)
```
