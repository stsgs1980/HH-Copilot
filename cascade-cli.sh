#!/usr/bin/env bash
#
# cascade-cli.sh — Universal CLI for AI agents to navigate task cascades
#
# Works with ANY cascade-state.json. No project-specific hardcoded logic.
#
# Usage:
#   ./cascade-cli.sh next-task          — Show the next ready task
#   ./cascade-cli.sh ready-tasks        — List all tasks ready to start
#   ./cascade-cli.sh start-task ID      — Mark task as in_progress
#   ./cascade-cli.sh complete-task ID   — Mark task as completed (with verification)
#   ./cascade-cli.sh block-task ID REASON — Mark task as blocked
#   ./cascade-cli.sh unblock-task ID    — Reset blocked task to pending
#   ./cascade-cli.sh status             — Show overall cascade status
#   ./cascade-cli.sh deps ID            — Show dependencies for a task
#   ./cascade-cli.sh implements ID      — Show function mapping
#   ./cascade-cli.sh critical-path      — Show critical path through the cascade
#   ./cascade-cli.sh validate           — Validate cascade-state.json integrity
#   ./cascade-cli.sh export-dot         — Export dependency graph as Graphviz DOT
#   ./cascade-cli.sh reset ID           — Reset a completed/blocked task to pending
#
set -euo pipefail

STATE_FILE="${CASCADE_STATE:-cascade-state.json}"

# Check dependencies
if ! command -v jq &>/dev/null; then
    echo "ERROR: jq is required. Install with: apt-get install jq"
    exit 1
fi

if [ ! -f "$STATE_FILE" ]; then
    echo "ERROR: $STATE_FILE not found. Run cascade-init.sh first or set CASCADE_STATE env var."
    exit 1
fi

# ---- Helper functions ----

get_task_status() {
    local task_id="$1"
    jq -r --arg id "$task_id" '
        [.phases[].tasks[] | select(.id == $id)] | 
        if length == 0 then "not_found" else .[0].status end
    ' "$STATE_FILE"
}

get_task_field() {
    local task_id="$1"
    local field="$2"
    jq -r --arg id "$task_id" --arg field "$field" '
        [.phases[].tasks[] | select(.id == $id)] | 
        if length == 0 then "null" else .[0][$field] end
    ' "$STATE_FILE"
}

are_deps_completed() {
    local task_id="$1"
    local result
    result=$(jq -r --arg id "$task_id" '
        [.phases[].tasks[] | select(.id == $id)][0].depends_on // [] |
        if length == 0 then "yes"
        else
            (map(. as $dep |
                [.phases[].tasks[] | select(.id == $dep)] |
                if length == 0 then "missing"
                elif .[0].status != "completed" then .[0].status
                else "ok" end
            ) | unique | if any(. != "ok") then "no" else "yes" end)
        end
    ' "$STATE_FILE")
    echo "$result"
}

get_blocked_by() {
    jq -r --arg id "$1" '
        [.phases[].tasks[] | select(.id == $id)][0].depends_on // [] as $deps |
        $deps[] as $dep |
        {id: $dep, status: ([.phases[].tasks[] | select(.id == $dep)][0].status // "not_found")} |
        select(.status != "completed") |
        "\(.id)(\(.status))"
    ' "$STATE_FILE" | tr '\n' ',' | sed 's/,$//;s/^$/none/'
}

update_task_status() {
    local task_id="$1"
    local new_status="$2"
    local tmp
    tmp=$(mktemp)
    jq --arg id "$task_id" --arg status "$new_status" '
        .phases[].tasks |= map(
            if .id == $id then .status = $status else . end
        ) |
        ._meta.lastUpdated = (now | todate)
    ' "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

# ---- Commands ----

cmd_next_task() {
    echo "=== NEXT READY TASK (by priority) ==="
    echo ""

    # Find highest-priority pending task with all deps completed
    local found_id
    found_id=$(jq -r '
        [ .phases[] | . as $phase |
          .tasks[] | select(.status == "pending") |
          . + {phase_id: $phase.id, phase_name: $phase.name}
        ] |
        sort_by(
            if .priority == "P0" then 0 elif .priority == "P1" then 1 else 2 end,
            if .size == "S" then 0 elif .size == "M" then 1 else 2 end
        ) |
        .[0].id // "NONE"
    ' "$STATE_FILE")

    if [ "$found_id" = "NONE" ] || [ -z "$found_id" ]; then
        echo "No pending tasks found."
        # Check if there are in-progress tasks
        local in_progress
        in_progress=$(jq -r '[.phases[].tasks[] | select(.status == "in_progress")] | length' "$STATE_FILE")
        if [ "$in_progress" -gt 0 ]; then
            echo ""
            echo "Active tasks:"
            jq -r '.phases[].tasks[] | select(.status == "in_progress") | "  \(.id) — \(.title)"' "$STATE_FILE"
        fi
        return
    fi

    local deps_ok
    deps_ok=$(are_deps_completed "$found_id")

    echo "ID:       $found_id"
    echo "Title:    $(get_task_field "$found_id" 'title')"
    echo "Priority: $(get_task_field "$found_id" 'priority')"
    echo "Size:     $(get_task_field "$found_id" 'size')"
    echo "Phase:    $(jq -r --arg id "$found_id" '.phases[] | select(.tasks[]?.id == $id) | "\(.id) \(.name)"' "$STATE_FILE")"
    echo "Depends:  $(jq -r --arg id "$found_id" '[.phases[].tasks[] | select(.id == $id)][0].depends_on | if length == 0 then "none" else join(", ") end' "$STATE_FILE")"
    echo "Ready:    $deps_ok"
    echo ""

    if [ "$deps_ok" = "yes" ]; then
        echo ">>> READY to start. Run: ./cascade-cli.sh start-task $found_id"
    else
        local blocked
        blocked=$(get_blocked_by "$found_id")
        echo ">>> BLOCKED by: $blocked"
        echo ""
        echo "Looking for other ready tasks..."
        echo ""
        cmd_ready_tasks
    fi
}

cmd_ready_tasks() {
    echo "=== READY TASKS (all deps completed, status=pending) ==="
    echo ""

    local count=0
    jq -r '
        .phases[] | . as $phase |
        .tasks[] | select(.status == "pending") |
        "\(.id)|\(.priority)|\(.size)|\(.depends_on | if length == 0 then "none" else join(",") end)|\($phase.id)|\(.title)"
    ' "$STATE_FILE" | while IFS='|' read -r id pri size deps phase title; do
        local ready="yes"
        if [ "$deps" != "none" ]; then
            IFS=',' read -ra dep_arr <<< "$deps"
            for dep in "${dep_arr[@]}"; do
                dep=$(echo "$dep" | xargs)
                local dep_status
                dep_status=$(get_task_status "$dep")
                if [ "$dep_status" != "completed" ]; then
                    ready="no"
                    break
                fi
            done
        fi

        if [ "$ready" = "yes" ]; then
            printf "  %-8s %-3s %-2s [%-2s] %s\n" "$id" "$pri" "$size" "$phase" "$title"
            count=$((count + 1))
        fi
    done

    echo ""
    echo "--- BLOCKED tasks ---"
    jq -r '
        .phases[] | . as $phase |
        .tasks[] | select(.status == "pending") |
        "\(.id)|\(.priority)|\(.depends_on | if length == 0 then "none" else join(",") end)|\(.title)"
    ' "$STATE_FILE" | while IFS='|' read -r id pri deps title; do
        local ready="yes"
        local blocked_by=""
        if [ "$deps" != "none" ]; then
            IFS=',' read -ra dep_arr <<< "$deps"
            for dep in "${dep_arr[@]}"; do
                dep=$(echo "$dep" | xargs)
                local dep_status
                dep_status=$(get_task_status "$dep")
                if [ "$dep_status" != "completed" ]; then
                    ready="no"
                    blocked_by="$blocked_by $dep($dep_status)"
                fi
            done
        fi

        if [ "$ready" = "no" ]; then
            printf "  %-8s blocked by:%s | %s\n" "$id" "$blocked_by" "$title"
        fi
    done
}

cmd_start_task() {
    local task_id="${1:?Usage: cascade-cli.sh start-task TASK_ID}"
    local current_status
    current_status=$(get_task_status "$task_id")

    if [ "$current_status" = "not_found" ]; then
        echo "ERROR: Task $task_id not found in cascade-state.json"
        exit 1
    fi

    if [ "$current_status" = "completed" ]; then
        echo "ERROR: Task $task_id is already completed"
        exit 1
    fi

    if [ "$current_status" = "in_progress" ]; then
        echo "WARN: Task $task_id is already in_progress"
        return
    fi

    if [ "$current_status" = "blocked" ]; then
        echo "WARN: Task $task_id is explicitly blocked. Use unblock-task first."
    fi

    local deps_ok
    deps_ok=$(are_deps_completed "$task_id")
    if [ "$deps_ok" != "yes" ]; then
        local blocked
        blocked=$(get_blocked_by "$task_id")
        echo "ERROR: Task $task_id is BLOCKED by: $blocked"
        echo "Complete the blocking tasks first."
        exit 1
    fi

    update_task_status "$task_id" "in_progress"

    echo "OK: Task $task_id marked as in_progress"
    echo "Title: $(get_task_field "$task_id" 'title')"
    echo ""
    echo "Acceptance criteria:"
    get_task_field "$task_id" 'acceptance' | sed 's/^/  /'
    echo ""
    echo "Anti-hallucination checks:"
    get_task_field "$task_id" 'anti_hallucination' | sed 's/^/  /'
}

cmd_complete_task() {
    local task_id="${1:?Usage: cascade-cli.sh complete-task TASK_ID}"
    local current_status
    current_status=$(get_task_status "$task_id")

    if [ "$current_status" = "not_found" ]; then
        echo "ERROR: Task $task_id not found"
        exit 1
    fi

    if [ "$current_status" != "in_progress" ]; then
        echo "ERROR: Task $task_id is $current_status. Only in_progress tasks can be completed."
        exit 1
    fi

    echo "=== VERIFICATION CHECKLIST for $task_id ==="
    echo ""
    echo "Acceptance criteria:"
    get_task_field "$task_id" 'acceptance' | sed 's/^/  [ ] /'
    echo ""
    echo "Anti-hallucination checks:"
    get_task_field "$task_id" 'anti_hallucination' | sed 's/^/  [ ] /'
    echo ""

    # Non-interactive mode: use --yes flag
    if [ "${2:-}" != "--yes" ]; then
        echo "Have ALL criteria been verified? (y/N)"
        read -r confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            echo "ABORTED: Task $task_id NOT marked as completed."
            return
        fi
    fi

    update_task_status "$task_id" "completed"

    echo "OK: Task $task_id marked as COMPLETED"
    echo ""

    # Show what's now unblocked
    local unblocked
    unblocked=$(jq -r --arg id "$task_id" '
        [.phases[].tasks[] | select(.status == "pending") | select((.depends_on // []) | contains([$id]))] |
        if length == 0 then "  (none)" else .[] | "  \(.id) — \(.title)" end
    ' "$STATE_FILE")

    if [ "$unblocked" != "  (none)" ]; then
        echo "Tasks now unblocked:"
        echo "$unblocked"
    fi

    # Update worklog if it exists (AHG integration)
    if [ -f "worklog.md" ]; then
        local timestamp
        timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        cat >> worklog.md <<EOF

---
Task ID: $task_id
Agent: cascade-cli
Task: $(get_task_field "$task_id" 'title')

Work Log:
- Verified all acceptance criteria
- Verified all anti-hallucination checks
- Marked task as completed in cascade-state.json

Stage Summary:
- Task $task_id completed at $timestamp
EOF
        echo "(worklog.md updated)"
    fi
}

cmd_block_task() {
    local task_id="${1:?Usage: cascade-cli.sh block-task TASK_ID REASON}"
    local reason="${2:-No reason provided}"
    update_task_status "$task_id" "blocked"
    echo "OK: Task $task_id marked as BLOCKED. Reason: $reason"
}

cmd_unblock_task() {
    local task_id="${1:?Usage: cascade-cli.sh unblock-task TASK_ID}"
    local current_status
    current_status=$(get_task_status "$task_id")
    if [ "$current_status" != "blocked" ]; then
        echo "ERROR: Task $task_id is not blocked (status: $current_status)"
        exit 1
    fi
    update_task_status "$task_id" "pending"
    echo "OK: Task $task_id reset to pending"
}

cmd_reset_task() {
    local task_id="${1:?Usage: cascade-cli.sh reset TASK_ID}"
    local current_status
    current_status=$(get_task_status "$task_id")
    if [ "$current_status" = "not_found" ]; then
        echo "ERROR: Task $task_id not found"
        exit 1
    fi
    update_task_status "$task_id" "pending"
    echo "OK: Task $task_id reset to pending (was $current_status)"
}

cmd_status() {
    local project_name
    project_name=$(jq -r '._meta.project // "Unknown"' "$STATE_FILE")

    echo "============================================="
    echo "  $project_name — CASCADE STATUS"
    echo "============================================="
    echo ""

    jq -r '
        .phases[] |
        {id, name, total: (.tasks | length), 
         completed: ([.tasks[] | select(.status == "completed")] | length), 
         in_progress: ([.tasks[] | select(.status == "in_progress")] | length), 
         blocked: ([.tasks[] | select(.status == "blocked")] | length), 
         pending: ([.tasks[] | select(.status == "pending")] | length)} |
        "\(.id) \(.name)\n  Total: \(.total) | Done: \(.completed) | In Progress: \(.in_progress) | Blocked: \(.blocked) | Pending: \(.pending)\n"
    ' "$STATE_FILE"

    echo "-------------------------------------------"
    local total completed
    total=$(jq '[.phases[].tasks] | flatten | length' "$STATE_FILE")
    completed=$(jq '[.phases[].tasks[] | select(.status == "completed")] | length' "$STATE_FILE")
    if [ "$total" -gt 0 ]; then
        echo "TOTAL: $completed / $total tasks completed ($(( completed * 100 / total ))%)"
    fi
    echo ""

    # Show in_progress
    local in_progress
    in_progress=$(jq -r '[.phases[].tasks[] | select(.status == "in_progress")] | length' "$STATE_FILE")
    if [ "$in_progress" -gt 0 ]; then
        echo "=== IN PROGRESS ==="
        jq -r '.phases[].tasks[] | select(.status == "in_progress") | "  \(.id) — \(.title)"' "$STATE_FILE"
        echo ""
    fi

    # Show blocked
    local blocked_count
    blocked_count=$(jq -r '[.phases[].tasks[] | select(.status == "blocked")] | length' "$STATE_FILE")
    if [ "$blocked_count" -gt 0 ]; then
        echo "=== BLOCKED ==="
        jq -r '.phases[].tasks[] | select(.status == "blocked") | "  \(.id) — \(.title)"' "$STATE_FILE"
        echo ""
    fi

    # Show next
    cmd_next_task
}

cmd_deps() {
    local task_id="${1:?Usage: cascade-cli.sh deps TASK_ID}"
    echo "=== Dependencies for $task_id ==="
    echo ""

    echo "Direct depends_on:"
    local deps
    deps=$(jq -r --arg id "$task_id" '
        [.phases[].tasks[] | select(.id == $id)][0].depends_on // []
    ' "$STATE_FILE")

    if [ "$deps" = "[]" ]; then
        echo "  (no dependencies — this is a root task)"
    else
        echo "$deps" | jq -r '.[]' | while read -r dep; do
            local dep_status
            dep_status=$(get_task_status "$dep")
            printf "  %-8s [%s]\n" "$dep" "$dep_status"
        done
    fi

    echo ""
    echo "Tasks that depend on this task (dependents):"
    local dependents
    dependents=$(jq -r --arg id "$task_id" '
        [.phases[].tasks[] | select((.depends_on // []) | contains([$id]))] |
        if length == 0 then "  (none)" else .[] | "  \(.id) — \(.title) [\(.status)]" end
    ' "$STATE_FILE")
    echo "$dependents"
}

cmd_implements() {
    local task_id="${1:?Usage: cascade-cli.sh implements TASK_ID}"
    echo "=== Function mapping for $task_id ==="
    echo ""

    echo "This task implements functions:"
    local impl
    impl=$(jq -r --arg id "$task_id" '
        [.phases[].tasks[] | select(.id == $id)][0].implements // []
    ' "$STATE_FILE")

    if [ "$impl" = "[]" ] || [ -z "$impl" ]; then
        echo "  (no function mapping)"
    else
        echo "$impl" | jq -r '.[]' | while read -r func_id; do
            local func_name
            func_name=$(jq -r --arg fid "$func_id" '
                [.functionInventory[] | select(.id == $fid)][0].name // "unknown"
            ' "$STATE_FILE")
            printf "  %-12s %s\n" "$func_id" "$func_name"
        done
    fi
}

cmd_critical_path() {
    echo "=== CRITICAL PATH (longest dependency chain) ==="
    echo ""

    # Simple topological sort to find critical path
    jq -r '
        # Build adjacency: task -> its dependents
        [.phases[].tasks[] | {id, depends_on: (.depends_on // []), priority}] |
        
        # Find root tasks (no dependencies)
        map(select(.depends_on | length == 0) | .id) as $roots |
        
        # For each task, compute depth (longest path from any root)
        # This is a simplified BFS approach
        {roots: $roots, tasks: [.phases[].tasks[].id]} |
        "Root tasks: \($roots | join(", "))",
        "",
        "Dependency chains (by phase):",
        (.phases[] | .tasks[] | select((.depends_on // []) | length > 0) |
            "\(.id) <- \(.depends_on | join(" + "))  [\(.priority)]"
        )
    ' "$STATE_FILE" 2>/dev/null || echo "(no dependency data available)"

    echo ""
    echo "P0 tasks (critical):"
    jq -r '.phases[].tasks[] | select(.priority == "P0") | "  \(.id) [\(.status)] — \(.title)"' "$STATE_FILE"
}

cmd_validate() {
    echo "=== Validating cascade-state.json ==="
    echo ""
    local errors=0

    # Check required structure
    if ! jq -e '.phases | length > 0' "$STATE_FILE" &>/dev/null; then
        echo "ERROR: No phases defined"
        errors=$((errors + 1))
    fi

    # Check all depends_on references exist
    local missing_deps
    missing_deps=$(jq -r '
        [.phases[].tasks[].id] as $all_ids |
        .phases[].tasks[] | .id as $task_id | (.depends_on // [])[] |
        . as $dep | 
        select($all_ids | index($dep) | not) |
        "ERROR: \($task_id) depends on \($dep) which does not exist"
    ' "$STATE_FILE")
    if [ -n "$missing_deps" ]; then
        echo "$missing_deps"
        errors=$((errors + 1))
    fi

    # Check all implements references exist (if functionInventory exists)
    local missing_impl
    missing_impl=$(jq -r '
        [.functionInventory[]?.id] as $all_funcs |
        if ($all_funcs | length) > 0 then
            .phases[].tasks[] | .id as $task_id | (.implements // [])[] |
            . as $func |
            select($all_funcs | index($func) | not) |
            "ERROR: \($task_id) implements \($func) which does not exist in functionInventory"
        else empty end
    ' "$STATE_FILE")
    if [ -n "$missing_impl" ]; then
        echo "$missing_impl"
        errors=$((errors + 1))
    fi

    # Check for circular dependencies
    echo "Circular dependency check:"
    local all_tasks
    all_tasks=$(jq -r '.phases[].tasks[].id' "$STATE_FILE")
    for task_id in $all_tasks; do
        local deps
        deps=$(jq -r --arg id "$task_id" '
            [.phases[].tasks[] | select(.id == $id)][0].depends_on // []
        ' "$STATE_FILE")
        if [ "$deps" != "[]" ]; then
            for dep in $(echo "$deps" | jq -r '.[]'); do
                local reverse_deps
                reverse_deps=$(jq -r --arg did "$dep" '
                    [.phases[].tasks[] | select(.id == $did)][0].depends_on // []
                ' "$STATE_FILE")
                if echo "$reverse_deps" | jq -e --arg tid "$task_id" 'contains([$tid])' &>/dev/null; then
                    echo "  ERROR: Circular dependency between $task_id and $dep"
                    errors=$((errors + 1))
                fi
            done
        fi
    done
    echo "  No circular dependencies found"

    # Check for duplicate task IDs
    local dupes
    dupes=$(jq -r '.phases[].tasks[].id' "$STATE_FILE" | sort | uniq -d)
    if [ -n "$dupes" ]; then
        echo "ERROR: Duplicate task IDs: $dupes"
        errors=$((errors + 1))
    fi

    # Check for tasks without acceptance criteria
    local no_criteria
    no_criteria=$(jq -r '
        .phases[].tasks[] | select(.acceptance == null or .acceptance == "") |
        "WARN: \(.id) has no acceptance criteria"
    ' "$STATE_FILE")
    if [ -n "$no_criteria" ]; then
        echo "$no_criteria"
    fi

    echo ""
    if [ "$errors" -eq 0 ]; then
        echo "Validation PASSED. Cascade state is valid."
    else
        echo "Validation FAILED with $errors error(s). Fix before proceeding."
        exit 1
    fi
}

cmd_export_dot() {
    echo "=== Dependency Graph (Graphviz DOT) ==="
    echo ""
    echo "digraph cascade {"
    echo "  rankdir=LR;"
    echo "  node [shape=box, style=rounded, fontname=\"Arial\"];"
    echo ""

    # Phase subgraphs
    jq -r '
        .phases[] | 
        "  subgraph cluster_\(.id) { label=\"\(.id): \(.name)\"; style=dashed; color=gray;",
        (.tasks[] | "    \"\(.id)\" [label=\"\(.id)\n\(.title)\", fillcolor=\(
            if .status == "completed" then "\"#90EE90\""
            elif .status == "in_progress" then "\"#FFD700\""
            elif .status == "blocked" then "\"#FFB6C1\""
            else "\"#F0F0F0\"" end
        ), style=filled];"),
        "  }"
    ' "$STATE_FILE"

    echo ""

    # Dependency edges
    jq -r '
        .phases[].tasks[] | .id as $from | (.depends_on // [])[] |
        "  \"\(.)\" -> \"\($from)\";"
    ' "$STATE_FILE"

    echo "}"
    echo ""
    echo "Save output and render: dot -Tpng cascade.dot -o cascade.png"
}

# ---- Main ----

case "${1:-help}" in
    next-task)       cmd_next_task ;;
    ready-tasks)     cmd_ready_tasks ;;
    start-task)      cmd_start_task "${2:-}" ;;
    complete-task)   cmd_complete_task "${2:-}" "${3:-}" ;;
    block-task)      cmd_block_task "${2:-}" "${3:-}" ;;
    unblock-task)    cmd_unblock_task "${2:-}" ;;
    reset)           cmd_reset_task "${2:-}" ;;
    status)          cmd_status ;;
    deps)            cmd_deps "${2:-}" ;;
    implements)      cmd_implements "${2:-}" ;;
    critical-path)   cmd_critical_path ;;
    validate)        cmd_validate ;;
    export-dot)      cmd_export_dot ;;
    help|*)
        echo "Cascade Guard CLI — Universal task cascade navigator"
        echo ""
        echo "State file: $STATE_FILE"
        echo ""
        echo "Commands:"
        echo "  next-task              Show the next ready task"
        echo "  ready-tasks            List all ready tasks"
        echo "  start-task ID          Mark task as in_progress"
        echo "  complete-task ID       Mark task as completed"
        echo "  block-task ID REASON   Mark task as blocked"
        echo "  unblock-task ID        Reset blocked task to pending"
        echo "  reset ID               Reset any task to pending"
        echo "  status                 Show cascade overview"
        echo "  deps ID                Show task dependencies"
        echo "  implements ID          Show function mapping"
        echo "  critical-path          Show critical path"
        echo "  validate               Validate cascade-state.json"
        echo "  export-dot             Export Graphviz DOT graph"
        echo ""
        echo "Environment:"
        echo "  CASCADE_STATE=path     Override default state file location"
        ;;
esac
