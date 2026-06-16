#!/usr/bin/env bash
#
# cascade-cli.sh — DEPRECATED, thin wrapper around cascade-task.js
# ==================================================================
#
# This file was a 484-line bash+jq implementation. It has been replaced by
# cascade-task.js (Node.js, no external deps, cross-platform).
#
# The old script read cascade-state.json (AHG items file), which was the
# wrong file — it should have read cascade/state.json (task cascade).
# cascade-task.js reads the correct file (cascade/state.json).
#
# Usage (same commands, but task IDs no longer need -task suffix):
#   ./cascade-cli.sh next-task        ->  node cascade-task.js next-task
#   ./cascade-cli.sh ready-tasks      ->  node cascade-task.js ready-tasks
#   ./cascade-cli.sh complete-task ID ->  node cascade-task.js complete ID
#   ./cascade-cli.sh start-task ID    ->  node cascade-task.js start ID
#   ./cascade-cli.sh block-task ID R  ->  node cascade-task.js block ID R
#   ./cascade-cli.sh status           ->  node cascade-task.js status
#   ./cascade-cli.sh deps ID          ->  node cascade-task.js deps ID
#   ./cascade-cli.sh validate         ->  node cascade-task.js validate
#
# For full usage, run: node scripts/cascade-task.js help
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Map old command names to new ones
case "${1:-help}" in
  complete-task) shift; exec node "$SCRIPT_DIR/cascade-task.js" complete "$@" ;;
  start-task)    shift; exec node "$SCRIPT_DIR/cascade-task.js" start "$@" ;;
  block-task)    shift; exec node "$SCRIPT_DIR/cascade-task.js" block "$@" ;;
  implements)    shift; exec node "$SCRIPT_DIR/cascade-task.js" task "$@" ;;
  *)             exec node "$SCRIPT_DIR/cascade-task.js" "$@" ;;
esac
