#!/bin/bash
# Root-project validate.sh
# Проверяет сабмодули (cascade-guard, anti-hallucination-guard) и запрещённые файлы в корне.
# Запуск: bash scripts/validate.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ERRORS=0

echo "=== validate.sh: проверка проекта ==="
echo ""

# 1. cascade-guard submodule
CG="$REPO_ROOT/cascade-guard"
if [ -d "$CG" ] && [ -f "$CG/validate.sh" ]; then
    echo "--- cascade-guard ---"
    (cd "$CG" && bash validate.sh) || ERRORS=$((ERRORS + 1))
else
    echo "[SKIP] cascade-guard submodule не найден"
fi

# 2. anti-hallucination-guard submodule — whitelist check
AHG="$REPO_ROOT/hh-extension/hh-auto-respond-extension/anti-hallucination-guard"
if [ -d "$AHG" ]; then
    echo "--- anti-hallucination-guard ---"
    AHG_FILES=$(cd "$AHG" && git ls-files 2>/dev/null || true)
    AHG_ALLOWED=("setup.sh" "AGENT_RULES.md" "README.md" ".gitignore" ".git-hooks/" "scripts/" "skills/")
    AHG_FORBIDDEN=("*.env" "*.log" "*.tmp" "*.bak" "node_modules/" "package.json" "cascade-state.json")
    AHG_ERR=0
    for F in $AHG_FILES; do
        OK=0
        for A in "${AHG_ALLOWED[@]}"; do
            case "$F" in "$A"*) OK=1 ;; esac
        done
        if [ "$OK" -eq 0 ]; then
            echo "[-] AHG foreign file: $F"
            AHG_ERR=$((AHG_ERR + 1))
        fi
    done
    for PAT in "${AHG_FORBIDDEN[@]}"; do
        MATCHES=$(cd "$AHG" && git ls-files "$PAT" 2>/dev/null || true)
        if [ -n "$MATCHES" ]; then
            echo "[-] AHG forbidden: $MATCHES"
            AHG_ERR=$((AHG_ERR + 1))
        fi
    done
    if [ "$AHG_ERR" -eq 0 ]; then
        echo "[+] anti-hallucination-guard: OK"
    else
        ERRORS=$((ERRORS + AHG_ERR))
    fi
else
    echo "[SKIP] anti-hallucination-guard submodule не найден"
fi

# 3. Root-level forbidden files
echo "--- root repo ---"
FORBIDDEN_PATTERNS=("*.env" "*.log" "*.tmp" "*.bak" "*.map")
for PAT in "${FORBIDDEN_PATTERNS[@]}"; do
    MATCHES=$(cd "$REPO_ROOT" && git ls-files "$PAT" 2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
        for M in $MATCHES; do
            echo "[-] ЗАПРЕЩЁННЫЙ ФАЙЛ: $M"
            ERRORS=$((ERRORS + 1))
        done
    fi
done

echo ""
if [ "$ERRORS" -eq 0 ]; then
    echo "Все проверки пройдены."
    exit 0
else
    echo "ОБНАРУЖЕНО ОШИБОК: $ERRORS"
    exit 1
fi
