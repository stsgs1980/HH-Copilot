#!/bin/bash
# doc-consistency.sh — Anti-Hallucination Guard: Documentation Consistency Check
# Verifies that project documentation is in sync with actual code state.
# Blocks commit if documentation gaps are detected.
#
# Checks:
#   1. CHANGELOG.md has entry for current version (from manifest.json)
#   2. cascade-state.json lastUpdated is not stale (>48h = WARN, >168h = ERROR)
#   3. cascade-state.json: no "pending" tasks where code file exists
#   4. README.md mentions key features that exist in src/
#   5. README.md mentions test suite if tests/ directory exists
#
# Exit codes:
#   0 = all checks pass (or warnings only)
#   1 = documentation inconsistency found
#   2 = file not found or parse error
#
# Created: 2026-06-13 (after CHANGELOG loss + cascade-state staleness + README gaps)
# Rule: AGENT_RULES.md Rule 9.3

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# ---- Get current version from manifest.json ----

CURRENT_VERSION=""
if [ -f "manifest.json" ]; then
    CURRENT_VERSION=$(grep -oP '"version"\s*:\s*"\K[^"]+' manifest.json | head -1)
fi

if [ -z "$CURRENT_VERSION" ]; then
    echo -e "${RED}  FATAL: Cannot determine current version from manifest.json${NC}" >&2
    exit 2
fi

echo ""
echo "  ==============================================="
echo "  Documentation Consistency Check (Rule 9.3)"
echo "  Current version: $CURRENT_VERSION"
echo "  ==============================================="
echo ""

# ---- Check 1: CHANGELOG.md has entry for current version ----

check_changelog() {
    echo "  --- Check 1: CHANGELOG.md ---"

    # Find CHANGELOG — could be in extension dir, parent, or repo root
    local changelog_path=""
    for path in "CHANGELOG.md" "../CHANGELOG.md" "../../CHANGELOG.md"; do
        if [ -f "$path" ]; then
            changelog_path="$path"
            break
        fi
    done

    if [ -z "$changelog_path" ]; then
        echo -e "  ${RED}ERROR: CHANGELOG.md not found!${NC}"
        echo -e "  ${RED}  Create CHANGELOG.md with entry for version $CURRENT_VERSION${NC}"
        ERRORS=$((ERRORS + 1))
        return
    fi

    echo -e "  Found: ${changelog_path}"

    # Check that current version appears as a heading
    # Formats: ## [1.9.28.0], ## 1.9.28.0, # v1.9.28.0, ## [1.9.28]
    local version_pattern
    # Escape dots for grep
    version_pattern=$(echo "$CURRENT_VERSION" | sed 's/\./\\./g')

    if grep -qP "^#+\s*\[?v?${version_pattern}" "$changelog_path"; then
        echo -e "  ${GREEN}OK: CHANGELOG has entry for $CURRENT_VERSION${NC}"
    else
        # Also try just the major.minor.patch (without build number)
        local short_ver
        short_ver=$(echo "$CURRENT_VERSION" | sed 's/\.[0-9]$//')
        local short_pattern
        short_pattern=$(echo "$short_ver" | sed 's/\./\\./g')

        if grep -qP "^#+\s*\[?v?${short_pattern}" "$changelog_path"; then
            echo -e "  ${GREEN}OK: CHANGELOG has entry for $short_ver (matches $CURRENT_VERSION)${NC}"
        else
            echo -e "  ${RED}ERROR: CHANGELOG.md has no entry for version $CURRENT_VERSION!${NC}"
            echo -e "  ${RED}  Add a '## [$CURRENT_VERSION]' section with changes${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    fi

    # Count total version entries in CHANGELOG
    local entry_count
    entry_count=$(grep -cP "^##\s+\[?\d+\.\d+" "$changelog_path" 2>/dev/null || echo "0")
    echo "  Total CHANGELOG entries: $entry_count"
    echo ""
}

# ---- Check 2: cascade-state.json freshness ----

check_cascade_state() {
    echo "  --- Check 2: cascade-state.json ---"

    local cascade_path=""
    for path in "cascade-state.json" "../cascade-state.json" "../../cascade-state.json"; do
        if [ -f "$path" ]; then
            cascade_path="$path"
            break
        fi
    done

    if [ -z "$cascade_path" ]; then
        echo -e "  ${YELLOW}SKIP: cascade-state.json not found (not all projects use it)${NC}"
        echo ""
        return
    fi

    echo -e "  Found: ${cascade_path}"

    # Check lastUpdated freshness
    local last_updated
    last_updated=$(grep -oP '"lastUpdated"\s*:\s*"\K[^"]+' "$cascade_path" | head -1)

    if [ -n "$last_updated" ]; then
        echo "  lastUpdated: $last_updated"

        # Convert to epoch for comparison
        local last_epoch now_epoch diff_hours
        # Parse ISO date (works with GNU date)
        last_epoch=$(date -d "${last_updated}" +%s 2>/dev/null || echo "0")
        now_epoch=$(date +%s)

        if [ "$last_epoch" != "0" ]; then
            local diff_seconds=$((now_epoch - last_epoch))
            diff_hours=$((diff_seconds / 3600))

            if [ "$diff_hours" -gt 168 ]; then  # 7 days
                echo -e "  ${RED}ERROR: cascade-state.json lastUpdated is ${diff_hours}h old (>168h = 7 days)${NC}"
                echo -e "  ${RED}  Update lastUpdated and review task statuses${NC}"
                ERRORS=$((ERRORS + 1))
            elif [ "$diff_hours" -gt 48 ]; then  # 2 days
                echo -e "  ${YELLOW}WARN: cascade-state.json lastUpdated is ${diff_hours}h old (>48h)${NC}"
                echo -e "  ${YELLOW}  Consider updating if recent commits were made${NC}"
                WARNINGS=$((WARNINGS + 1))
            else
                echo -e "  ${GREEN}OK: lastUpdated is fresh (${diff_hours}h ago)${NC}"
            fi
        fi
    else
        echo -e "  ${YELLOW}WARN: no lastUpdated field in cascade-state.json${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Check for "pending" tasks where code file might already exist
    # This is a heuristic — if a task's implements[] refers to a file that exists,
    # the task should probably not be "pending"
    if command -v jq &>/dev/null; then
        local pending_count completed_count in_progress_count
        pending_count=$(jq '[.phases[].tasks[] | select(.status == "pending")] | length' "$cascade_path" 2>/dev/null || echo "?")
        completed_count=$(jq '[.phases[].tasks[] | select(.status == "completed")] | length' "$cascade_path" 2>/dev/null || echo "?")
        in_progress_count=$(jq '[.phases[].tasks[] | select(.status == "in_progress")] | length' "$cascade_path" 2>/dev/null || echo "?")
        echo "  Tasks: completed=$completed_count, in_progress=$in_progress_count, pending=$pending_count"

        # If there are pending tasks but no in-progress and recent git activity, warn
        if [ "$pending_count" != "0" ] && [ "$in_progress_count" = "0" ]; then
            local recent_commits
            recent_commits=$(git log --oneline --since="24 hours ago" 2>/dev/null | wc -l || echo "0")
            if [ "$recent_commits" -gt 0 ]; then
                echo -e "  ${YELLOW}WARN: $pending_count pending tasks but $recent_commits recent commits — update cascade-state?${NC}"
                WARNINGS=$((WARNINGS + 1))
            fi
        fi
    fi

    echo ""
}

# ---- Check 3: README mentions key features ----

check_readme_coverage() {
    echo "  --- Check 3: README.md feature coverage ---"

    local readme_path=""
    for path in "README.md" "../README.md" "../../README.md"; do
        if [ -f "$path" ]; then
            readme_path="$path"
            break
        fi
    done

    if [ -z "$readme_path" ]; then
        echo -e "  ${RED}ERROR: README.md not found!${NC}"
        ERRORS=$((ERRORS + 1))
        echo ""
        return
    fi

    echo -e "  Found: ${readme_path}"

    # Check: test suite mentioned if tests/ exists
    if [ -d "tests" ] || [ -d "test" ] || [ -d "__tests__" ]; then
        if grep -qiP '(тест|test|vitest|jest)' "$readme_path"; then
            echo -e "  ${GREEN}OK: README mentions tests${NC}"
        else
            echo -e "  ${RED}ERROR: tests/ directory exists but README doesn't mention test suite!${NC}"
            echo -e "  ${RED}  Add a section describing the test suite${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "  ${GREEN}OK: No tests/ directory (no mention needed)${NC}"
    fi

    # Check: HMR/hot-reload mentioned if src/lib/hot-reload.js exists
    if [ -f "src/lib/hot-reload.js" ] || [ -f "src/lib/hmr.js" ]; then
        if grep -qiP '(hot.?reload|hmr|авто.?перезагрузка)' "$readme_path"; then
            echo -e "  ${GREEN}OK: README mentions hot-reload/HMR${NC}"
        else
            echo -e "  ${YELLOW}WARN: hot-reload file exists but README doesn't mention HMR${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi

    # Check: Key parser modules mentioned
    local parser_count
    parser_count=$(ls src/parsers/*.js 2>/dev/null | wc -l || echo "0")
    if [ "$parser_count" -gt 0 ]; then
        if grep -qiP 'парс' "$readme_path"; then
            echo -e "  ${GREEN}OK: README mentions parsing ($parser_count parser modules)${NC}"
        else
            echo -e "  ${YELLOW}WARN: $parser_count parser modules in src/parsers/ but README doesn't mention parsing${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi

    echo ""
}

# ---- Run all checks ----

check_changelog
check_cascade_state
check_readme_coverage

# ---- Summary ----

echo "  ==============================================="
if [ "$ERRORS" -gt 0 ]; then
    echo -e "  ${RED}FAILED: $ERRORS documentation error(s) found${NC}"
    if [ "$WARNINGS" -gt 0 ]; then
        echo -e "  ${YELLOW}         $WARNINGS warning(s) (non-blocking)${NC}"
    fi
    echo ""
    echo "  Fix documentation before committing."
    echo "  See AGENT_RULES.md Rule 9.3 for documentation checklist."
    echo ""
    exit 1
fi

if [ "$WARNINGS" -gt 0 ]; then
    echo -e "  ${YELLOW}PASSED with $WARNINGS warning(s)${NC}"
else
    echo -e "  ${GREEN}PASSED: All documentation consistent${NC}"
fi

echo ""
exit 0
