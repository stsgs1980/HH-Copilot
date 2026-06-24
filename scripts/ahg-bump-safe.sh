#!/bin/bash
# scripts/ahg-bump-safe.sh
#
# Safe wrapper around `ahg bump` that excludes directories which are NOT
# part of the HH-Copilot project version scope:
#   - skills/               (Z.ai platform skills, own versions)
#   - FabInspector/         (separate submodule)
#   - hh-extension/         (legacy fork, not part of HH-Copilot)
#   - anti-hallucination-guard/ (submodule, own version)
#
# Why this exists:
#   ahg bump uses discover-versions.ts which has SKIP_DIRS but does NOT
#   include skills/, FabInspector/, or hh-extension/. Running ahg bump
#   directly would clobber version strings in 25+ foreign skill files.
#   We cannot patch the submodule (Rule 16: AHG submodule is immutable).
#
# Strategy:
#   1. Run `ahg bump X.Y.Z --dry-run` to get list of files
#   2. Filter out excluded paths
#   3. For each remaining file, apply version replacement inline
#   4. Add CHANGELOG entry manually
#
# Usage:
#   bash scripts/ahg-bump-safe.sh <version>           # real bump
#   bash scripts/ahg-bump-safe.sh <version> --dry-run # preview

set -euo pipefail

VERSION="${1:-}"
DRY_RUN=false
if [ "${2:-}" = "--dry-run" ]; then
  DRY_RUN=true
fi

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version> [--dry-run]"
  echo "Example: $0 1.9.62.0"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Excluded path prefixes (relative to repo root)
EXCLUDE_PREFIXES=(
  "skills/"
  "FabInspector/"
  "hh-extension/"
  "anti-hallucination-guard/"
  "node_modules/"
  ".git/"
  "dist/"
  "tool-results/"
  "agent-ctx/"
  "download/"
  "upload/"
)

is_excluded() {
  local filepath="$1"
  for prefix in "${EXCLUDE_PREFIXES[@]}"; do
    if [[ "$filepath" == "$prefix"* ]]; then
      return 0
    fi
  done
  return 1
}

# Get current version from extension/package.json (source of truth)
CURRENT_VERSION=$(jq -r '.version' extension/package.json)

# Always run discover + update -- even if SoT matches, other files may lag.
# (e.g. README at 1.9.56.0, CHANGELOG at 1.9.55.0, AGENT_RULES timeline at 1.9.47.0)
if [ "$CURRENT_VERSION" = "$VERSION" ]; then
  echo "Source of truth (extension/package.json) is already at $VERSION."
  echo "Checking for lagging files..."
  echo ""
fi

echo "=== Safe version bump: $CURRENT_VERSION -> $VERSION ==="
echo ""

# Get list of files from ahg bump dry-run
echo "[1/3] Discovering files with version strings..."
DRY_RUN_OUTPUT=$(bash scripts/ahg.sh bump "$VERSION" --dry-run 2>&1 | grep "^\s*\[+\]" || true)

# Parse file list
declare -a FILES_TO_UPDATE=()
while IFS= read -r line; do
  # Extract path from "  [+] path" format
  filepath=$(echo "$line" | sed -E 's/^\s*\[\+\]\s+//; s/\s*$//')
  if [ -z "$filepath" ]; then continue; fi
  if is_excluded "$filepath"; then continue; fi
  # Skip CHANGELOG (handled separately)
  if [[ "$filepath" == *"CHANGELOG"* ]]; then continue; fi
  FILES_TO_UPDATE+=("$filepath")
done <<< "$DRY_RUN_OUTPUT"

echo "[2/3] Files to update (${#FILES_TO_UPDATE[@]} files, excluding skills/, FabInspector/, hh-extension/, anti-hallucination-guard/):"
for f in "${FILES_TO_UPDATE[@]}"; do
  echo "  [+] $f"
done
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "[3/3] DRY RUN: no changes written."
  echo "Would also add CHANGELOG entry for $VERSION."
  exit 0
fi

# Apply version replacement
echo "[3/3] Applying version bump..."
ESCAPED_OLD=$(echo "$CURRENT_VERSION" | sed 's/\./\\./g')
ESCAPED_NEW="$VERSION"

for filepath in "${FILES_TO_UPDATE[@]}"; do
  if [ ! -f "$filepath" ]; then
    echo "  [!] SKIP (not found): $filepath"
    continue
  fi

  # If SoT already at target, find the actual lagging version in this file
  if [ "$CURRENT_VERSION" = "$VERSION" ]; then
    # Find any 1.9.X.Y version string in the file that is NOT the target
    LAGGING_VERSION=$(grep -oE "1\.9\.[0-9]+\.[0-9]+" "$filepath" 2>/dev/null \
      | grep -v "^$VERSION$" | head -1 || true)
    if [ -z "$LAGGING_VERSION" ]; then
      echo "  [skip] $filepath (already at $VERSION or no version found)"
      continue
    fi
    ESCAPED_OLD=$(echo "$LAGGING_VERSION" | sed 's/\./\\./g')
    # Also handle typo variants like "1.9.47.059" (extra digits)
    # by also replacing any 1.9.X.Y followed by extra digits
    if perl -i -pe "s/(?<![0-9.])${ESCAPED_OLD}[0-9]*(?![0-9.])/${ESCAPED_NEW}/g" "$filepath" 2>/dev/null; then
      echo "  [ok] $filepath ($LAGGING_VERSION -> $VERSION)"
    else
      echo "  [!] FAIL: $filepath"
    fi
    continue
  fi

  # Normal case: replace old target version with new
  if perl -i -pe "s/(?<![0-9.])${ESCAPED_OLD}(?![0-9.])/${ESCAPED_NEW}/g" "$filepath"; then
    echo "  [ok] $filepath"
  else
    echo "  [!] FAIL: $filepath"
  fi
done

# Add CHANGELOG entry
CHANGELOG="extension/CHANGELOG.md"
if [ -f "$CHANGELOG" ]; then
  # Get today's date
  TODAY=$(date +%Y-%m-%d)
  # Get last entry to find where to insert
  LAST_VERSION=$(grep -m1 "^## \[" "$CHANGELOG" | sed -E 's/^## \[([^\]]+)\].*/\1/')

  if [ "$LAST_VERSION" != "$VERSION" ]; then
    # Read git log since last version tag for changelog content
    echo "  [+] Adding CHANGELOG entry for $VERSION"

    # Create temp file with new entry
    TMPFILE=$(mktemp)
    cat > "$TMPFILE" <<EOF
## [$VERSION] — $TODAY

### Changed
- See git log for v$CURRENT_VERSION..v$VERSION for full details.
- Run: git log --oneline v$CURRENT_VERSION..HEAD

EOF
    # Insert after header (after line 11 which is "---" separator)
    # Find first "---" line and insert after it
    awk -v entry="$(cat "$TMPFILE")" '
      /^---$/ && !inserted { print; print ""; print entry; inserted=1; next }
      { print }
    ' "$CHANGELOG" > "${CHANGELOG}.tmp" && mv "${CHANGELOG}.tmp" "$CHANGELOG"
    rm "$TMPFILE"
    echo "  [ok] $CHANGELOG"
  else
    echo "  [skip] $CHANGELOG (entry already exists for $VERSION)"
  fi
fi

echo ""
echo "=== Bump complete: $CURRENT_VERSION -> $VERSION ==="
echo "Files updated: ${#FILES_TO_UPDATE[@]} + CHANGELOG"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Run tests: cd extension && npm test"
echo "  3. Run lint: cd extension && npm run lint:ci"
echo "  4. Run verify-docs: bash scripts/ahg.sh verify --ci"
echo "  5. Commit: git add -A && git commit"
