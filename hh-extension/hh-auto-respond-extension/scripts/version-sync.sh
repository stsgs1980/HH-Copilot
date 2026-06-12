#!/bin/bash
# version-sync.sh — Anti-Hallucination Guard: Version Consistency Check
# Verifies that ALL version references in the project are identical.
# Blocks commit if any file has a stale or different version.
#
# Checks:
#   1. manifest.json  -> "version" field
#   2. package.json   -> "version" field
#   3. src/lib/version.js -> VERSION constant
#   4. popup/index.html -> .subtitle div text
#   5. README.md      -> "Версия:" line
#
# Exit codes:
#   0 = all versions match
#   1 = version mismatch found
#   2 = file not found or parse error
#
# Usage:
#   bash scripts/version-sync.sh          # check only
#   bash scripts/version-sync.sh --fix    # show what to fix (no auto-fix)
#
# Created: 2026-06-13 (after v1.9.23→1.9.28 popup gap)
# Rule: AGENT_RULES.md Rule 9.2

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0
VERSIONS=()

# ---- Helper: extract version from a file ----

get_manifest_version() {
    if [ ! -f "manifest.json" ]; then
        echo -e "${RED}  MISSING: manifest.json${NC}" >&2
        ERRORS=$((ERRORS + 1))
        return
    fi
    # Extract "version": "X.Y.Z.W"
    local ver
    ver=$(grep -oP '"version"\s*:\s*"\K[^"]+' manifest.json | head -1)
    if [ -z "$ver" ]; then
        echo -e "${RED}  PARSE ERROR: cannot find version in manifest.json${NC}" >&2
        ERRORS=$((ERRORS + 1))
        return
    fi
    echo "$ver"
}

get_package_version() {
    if [ ! -f "package.json" ]; then
        echo -e "${RED}  MISSING: package.json${NC}" >&2
        ERRORS=$((ERRORS + 1))
        return
    fi
    local ver
    ver=$(grep -oP '"version"\s*:\s*"\K[^"]+' package.json | head -1)
    if [ -z "$ver" ]; then
        echo -e "${RED}  PARSE ERROR: cannot find version in package.json${NC}" >&2
        ERRORS=$((ERRORS + 1))
        return
    fi
    echo "$ver"
}

get_versionjs_version() {
    if [ ! -f "src/lib/version.js" ]; then
        echo -e "${RED}  MISSING: src/lib/version.js${NC}" >&2
        ERRORS=$((ERRORS + 1))
        return
    fi
    local ver
    # Match: export const VERSION = '1.9.28.0'; or VERSION = '1.9.28.0'
    ver=$(grep -oP "VERSION\s*=\s*['\"]\K[^'\"]+" src/lib/version.js | head -1)
    if [ -z "$ver" ]; then
        echo -e "${RED}  PARSE ERROR: cannot find VERSION in src/lib/version.js${NC}" >&2
        ERRORS=$((ERRORS + 1))
        return
    fi
    echo "$ver"
}

get_popup_version() {
    if [ ! -f "popup/index.html" ]; then
        echo -e "${YELLOW}  WARNING: popup/index.html not found (skip)${NC}" >&2
        WARNINGS=$((WARNINGS + 1))
        return
    fi
    local ver
    # Match: v1.9.28.0 or version 1.9.28.0 in .subtitle div
    ver=$(grep -oP 'v?\K\d+\.\d+\.\d+\.\d+' popup/index.html | head -1)
    if [ -z "$ver" ]; then
        # Try without build number: 1.9.28
        ver=$(grep -oP 'v?\K\d+\.\d+\.\d+' popup/index.html | head -1)
    fi
    if [ -z "$ver" ]; then
        echo -e "${RED}  PARSE ERROR: cannot find version in popup/index.html${NC}" >&2
        ERRORS=$((ERRORS + 1))
        return
    fi
    echo "$ver"
}

get_readme_version() {
    # README might be in extension dir, parent dir, or repo root (2 levels up)
    local readme_path=""
    if [ -f "README.md" ]; then
        readme_path="README.md"
    elif [ -f "../README.md" ]; then
        readme_path="../README.md"
    elif [ -f "../../README.md" ]; then
        readme_path="../../README.md"
    fi

    if [ -z "$readme_path" ]; then
        echo -e "${YELLOW}  WARNING: README.md not found (skip)${NC}" >&2
        WARNINGS=$((WARNINGS + 1))
        return
    fi

    local ver
    # Match: **Версия:** 1.9.28.0 or Version: 1.9.28.0 (markdown bold markers allowed)
    ver=$(grep -oPi '(версия|version)[\s*:]*v?\K\d+\.\d+\.\d+(\.\d+)?' "$readme_path" | head -1)
    if [ -z "$ver" ]; then
        echo -e "${YELLOW}  WARNING: cannot find version in README.md${NC}" >&2
        WARNINGS=$((WARNINGS + 1))
        return
    fi
    echo "$ver"
}

# ---- Main: collect and compare all versions ----

echo ""
echo "  ==========================================="
echo "  Version Sync Check (Rule 9.2 enforcement)"
echo "  ==========================================="
echo ""

# Collect versions from all sources
V_MANIFEST=$(get_manifest_version)
V_PACKAGE=$(get_package_version)
V_VERSIONJS=$(get_versionjs_version)
V_POPUP=$(get_popup_version)
V_README=$(get_readme_version)

# Determine the "source of truth" — manifest.json
if [ -z "$V_MANIFEST" ]; then
    echo -e "${RED}  FATAL: Cannot determine source of truth (manifest.json version missing)${NC}" >&2
    exit 2
fi

TRUTH="$V_MANIFEST"

# Print all versions with alignment
printf "  %-25s %s\n" "manifest.json:" "$V_MANIFEST"
[ -n "$V_PACKAGE" ]   && printf "  %-25s %s\n" "package.json:" "$V_PACKAGE"
[ -n "$V_VERSIONJS" ] && printf "  %-25s %s\n" "src/lib/version.js:" "$V_VERSIONJS"
[ -n "$V_POPUP" ]     && printf "  %-25s %s\n" "popup/index.html:" "$V_POPUP"
[ -n "$V_README" ]    && printf "  %-25s %s\n" "README.md:" "$V_README"

echo ""

# Compare each against manifest.json (source of truth)
check_match() {
    local label="$1"
    local value="$2"

    if [ -z "$value" ]; then
        return 0  # already reported as error/warning above
    fi

    # Normalize: strip trailing ".0" for comparison if needed
    # Some files use "1.9.28.0", others might use "1.9.28"
    local truth_norm="$TRUTH"
    local value_norm="$value"

    # If truth has 4 parts and value has 3, add .0 for comparison
    if [[ "$truth_norm" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && [[ "$value_norm" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        value_norm="${value_norm}.0"
    fi
    # If truth has 3 parts and value has 4, strip .0
    if [[ "$truth_norm" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] && [[ "$value_norm" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        truth_norm="${truth_norm}.0"
    fi

    if [ "$truth_norm" != "$value_norm" ]; then
        echo -e "  ${RED}MISMATCH: ${label} has '${value}' but manifest.json has '${TRUTH}'${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "  ${GREEN}OK: ${label} matches${NC}"
    fi
}

check_match "package.json" "$V_PACKAGE"
check_match "src/lib/version.js" "$V_VERSIONJS"
check_match "popup/index.html" "$V_POPUP"
check_match "README.md" "$V_README"

echo ""

# ---- Summary ----

if [ "$ERRORS" -gt 0 ]; then
    echo -e "  ${RED}FAILED: $ERRORS version mismatch(es) found!${NC}"
    echo ""
    echo "  Fix by updating ALL these files to version $TRUTH:"
    echo "    manifest.json     -> \"version\": \"$TRUTH\""
    echo "    package.json      -> \"version\": \"$TRUTH\""
    echo "    src/lib/version.js -> VERSION = '$TRUTH'"
    echo "    popup/index.html  -> v$TRUTH in .subtitle"
    echo "    README.md         -> Версия: $TRUTH"
    echo ""
    exit 1
fi

if [ "$WARNINGS" -gt 0 ]; then
    echo -e "  ${YELLOW}PASSED with $WARNINGS warning(s)${NC}"
else
    echo -e "  ${GREEN}PASSED: All versions synchronized at $TRUTH${NC}"
fi

echo ""
exit 0
