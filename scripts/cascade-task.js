#!/usr/bin/env node
/**
 * cascade-task.js — Node.js CLI for cascade task management
 * ==========================================================
 *
 * Replaces scripts/cascade-cli.sh (bash + jq) with a pure Node.js implementation.
 * Reads cascade/state.json (the task cascade with phases/tasks/dependencies).
 *
 * Usage:
 *   node scripts/cascade-task.js next-task          — Show the next ready task
 *   node scripts/cascade-task.js ready-tasks        — List all tasks ready to start
 *   node scripts/cascade-task.js status             — Show overall cascade status
 *   node scripts/cascade-task.js task F1.3          — Show details for a specific task
 *   node scripts/cascade-task.js deps F1.3          — Show dependencies for a task
 *   node scripts/cascade-task.js start F1.3         — Mark a task as in_progress
 *   node scripts/cascade-task.js complete F1.3      — Mark a task as completed
 *   node scripts/cascade-task.js block F1.3 "reason" — Mark a task as blocked
 *   node scripts/cascade-task.js pending           — List all pending tasks
 *   node scripts/cascade-task.js blocked           — List all blocked tasks
 *   node scripts/cascade-task.js validate          — Validate state.json integrity
 *   node scripts/cascade-task.js phases            — List all phases with progress
 *   node scripts/cascade-task.js functions         — List function inventory
 *   node scripts/cascade-task.js func F-OV-01      — Show function details
 *
 * Exit codes:
 *   0 — success
 *   1 — error (file not found, invalid args, task not found)
 *   2 — no ready tasks (for next-task command)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const STATE_FILE = join(REPO_ROOT, 'cascade', 'state.json');

// ---- Colors (ANSI) --------------------------------------------------------
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function colorize(text, color) {
  if (!process.stdout.isTTY) return text;
  return `${C[color]}${text}${C.reset}`;
}

// ---- State loading --------------------------------------------------------
function loadState() {
  if (!existsSync(STATE_FILE)) {
    console.error(colorize(`ERROR: state.json not found at ${STATE_FILE}`, 'red'));
    process.exit(1);
  }
  const raw = readFileSync(STATE_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(colorize(`ERROR: Invalid JSON in ${STATE_FILE}: ${e.message}`, 'red'));
    process.exit(1);
  }
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

// ---- Task helpers ---------------------------------------------------------
function getAllTasks(state) {
  const tasks = [];
  for (const phase of state.phases) {
    for (const task of phase.tasks) {
      tasks.push({ ...task, phaseId: phase.id, phaseName: phase.name });
    }
  }
  return tasks;
}

function findTask(state, taskId) {
  for (const phase of state.phases) {
    for (const task of phase.tasks) {
      if (task.id === taskId) {
        return { ...task, phaseId: phase.id, phaseName: phase.name };
      }
    }
  }
  return null;
}

function getTaskStatus(state, taskId) {
  const task = findTask(state, taskId);
  return task ? task.status : null;
}

function areDepsCompleted(state, taskId) {
  const task = findTask(state, taskId);
  if (!task) return false;
  if (!task.depends_on || task.depends_on.length === 0) return true;
  return task.depends_on.every(depId => getTaskStatus(state, depId) === 'completed');
}

function getReadyTasks(state) {
  return getAllTasks(state).filter(t =>
    t.status === 'pending' && areDepsCompleted(state, t.id)
  );
}

function getBlockedTasks(state) {
  // Tasks that are pending but deps not completed
  return getAllTasks(state).filter(t =>
    t.status === 'pending' && !areDepsCompleted(state, t.id)
  );
}

function updateTaskStatus(state, taskId, newStatus) {
  for (const phase of state.phases) {
    for (const task of phase.tasks) {
      if (task.id === taskId) {
        const oldStatus = task.status;
        task.status = newStatus;
        // Update lastUpdated in meta
        if (state._meta) {
          state._meta.lastUpdated = new Date().toISOString();
        }
        return { task, oldStatus };
      }
    }
  }
  return null;
}

// ---- Formatters -----------------------------------------------------------
function formatTaskLine(task, opts = {}) {
  const statusColors = {
    completed: 'green',
    in_progress: 'yellow',
    pending: 'cyan',
    blocked: 'red',
    ready: 'magenta',
  };
  const statusIcons = {
    completed: '[x]',
    in_progress: '[>]',
    pending: '[ ]',
    blocked: '[!]',
  };
  const icon = statusIcons[task.status] || '[?]';
  const color = statusColors[task.status] || 'gray';
  const id = colorize(task.id.padEnd(6), 'bold');
  const status = colorize(icon, color);
  const title = task.title.length > 70 ? task.title.substring(0, 67) + '...' : task.title;
  let line = `  ${status} ${id} ${title}`;
  if (opts.showPhase) {
    line += colorize(`  (${task.phaseId})`, 'gray');
  }
  if (opts.showDeps && task.depends_on && task.depends_on.length > 0) {
    line += colorize(`  deps: ${task.depends_on.join(', ')}`, 'gray');
  }
  return line;
}

function formatTaskDetail(task) {
  const lines = [];
  lines.push(colorize(`╔══ Task ${task.id} ════════════════════════════════════════`, 'bold'));
  lines.push(colorize(`║ ${task.title}`, 'bold'));
  lines.push(colorize(`╚════════════════════════════════════════════════════════`, 'bold'));
  lines.push('');
  lines.push(`  Phase:     ${colorize(task.phaseId, 'cyan')} — ${task.phaseName}`);
  lines.push(`  Status:    ${colorize(task.status, 'bold')}`);
  lines.push(`  Priority:  ${task.priority}`);
  lines.push(`  Size:      ${task.size}`);
  if (task.depends_on && task.depends_on.length > 0) {
    lines.push(`  Deps:      ${task.depends_on.join(', ')}`);
  } else {
    lines.push(`  Deps:      ${colorize('(none)', 'gray')}`);
  }
  if (task.implements && task.implements.length > 0) {
    lines.push(`  Implements: ${task.implements.join(', ')}`);
  }
  lines.push('');
  lines.push(colorize('  Acceptance criteria:', 'bold'));
  lines.push(`  ${task.acceptance}`);
  if (task.anti_hallucination) {
    lines.push('');
    lines.push(colorize('  Anti-hallucination check:', 'bold'));
    lines.push(`  ${task.anti_hallucination}`);
  }
  return lines.join('\n');
}

// ---- Commands -------------------------------------------------------------
function cmdNextTask(state) {
  const ready = getReadyTasks(state);
  if (ready.length === 0) {
    console.log(colorize('No tasks are ready to start.', 'yellow'));
    const blocked = getBlockedTasks(state);
    if (blocked.length > 0) {
      console.log(colorize('\nBlocked tasks (deps not completed):', 'gray'));
      blocked.forEach(t => console.log(formatTaskLine(t, { showDeps: true })));
    }
    const inProgress = getAllTasks(state).filter(t => t.status === 'in_progress');
    if (inProgress.length > 0) {
      console.log(colorize('\nTasks in progress:', 'yellow'));
      inProgress.forEach(t => console.log(formatTaskLine(t)));
    }
    process.exit(2);
  }
  // Pick highest priority + smallest size
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, P6: 6 };
  const sizeOrder = { XS: 0, S: 1, M: 2, L: 3, XL: 4 };
  ready.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 99;
    const pb = priorityOrder[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    const sa = sizeOrder[a.size] ?? 99;
    const sb = sizeOrder[b.size] ?? 99;
    return sa - sb;
  });
  console.log(colorize('Next task to work on:', 'bold'));
  console.log('');
  console.log(formatTaskDetail(ready[0]));
  if (ready.length > 1) {
    console.log('');
    console.log(colorize(`(${ready.length - 1} more ready tasks available — run 'ready-tasks' to see all)`, 'gray'));
  }
}

function cmdReadyTasks(state) {
  const ready = getReadyTasks(state);
  if (ready.length === 0) {
    console.log(colorize('No tasks are ready to start.', 'yellow'));
    process.exit(2);
  }
  console.log(colorize(`Ready tasks (${ready.length}):`, 'bold'));
  ready.forEach(t => console.log(formatTaskLine(t, { showPhase: true })));
}

function cmdStatus(state) {
  const all = getAllTasks(state);
  const byStatus = {};
  for (const t of all) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  }
  const total = all.length;
  const completed = byStatus.completed || 0;
  const inProgress = byStatus.in_progress || 0;
  const pending = byStatus.pending || 0;
  const blocked = byStatus.blocked || 0;
  const ready = getReadyTasks(state).length;

  console.log(colorize('═══ Cascade Status ═══════════════════════════', 'bold'));
  console.log(`  Total:       ${total}`);
  console.log(`  Completed:   ${colorize(String(completed), 'green')}`);
  console.log(`  In progress: ${colorize(String(inProgress), 'yellow')}`);
  console.log(`  Pending:     ${colorize(String(pending), 'cyan')}`);
  console.log(`  Blocked:     ${colorize(String(blocked), 'red')}`);
  console.log(`  Ready now:   ${colorize(String(ready), 'magenta')}`);
  console.log('');
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
  console.log(`  Progress: ${colorize(bar, 'green')} ${pct}%`);
  console.log('');

  console.log(colorize('Phases:', 'bold'));
  for (const phase of state.phases) {
    const phaseTasks = phase.tasks;
    const phaseCompleted = phaseTasks.filter(t => t.status === 'completed').length;
    const phaseTotal = phaseTasks.length;
    const phasePct = phaseTotal > 0 ? Math.round((phaseCompleted / phaseTotal) * 100) : 0;
    const status = phasePct === 100 ? colorize('✓', 'green') : phasePct > 0 ? colorize('◐', 'yellow') : colorize('○', 'gray');
    console.log(`  ${status} ${phase.id.padEnd(5)} ${phase.name.substring(0, 45).padEnd(45)} ${phaseCompleted}/${phaseTotal} (${phasePct}%)`);
  }
}

function cmdTask(state, taskId) {
  if (!taskId) {
    console.error(colorize('ERROR: task ID required. Usage: cascade-task.js task F1.3', 'red'));
    process.exit(1);
  }
  const task = findTask(state, taskId);
  if (!task) {
    console.error(colorize(`ERROR: Task ${taskId} not found`, 'red'));
    process.exit(1);
  }
  console.log(formatTaskDetail(task));
}

function cmdDeps(state, taskId) {
  if (!taskId) {
    console.error(colorize('ERROR: task ID required. Usage: cascade-task.js deps F1.3', 'red'));
    process.exit(1);
  }
  const task = findTask(state, taskId);
  if (!task) {
    console.error(colorize(`ERROR: Task ${taskId} not found`, 'red'));
    process.exit(1);
  }
  console.log(colorize(`Dependencies for ${task.id}:`, 'bold'));
  if (!task.depends_on || task.depends_on.length === 0) {
    console.log(colorize('  (no dependencies)', 'gray'));
    return;
  }
  for (const depId of task.depends_on) {
    const dep = findTask(state, depId);
    if (!dep) {
      console.log(`  ${colorize('[!]', 'red')} ${depId.padEnd(6)} ${colorize('NOT FOUND', 'red')}`);
    } else {
      const icon = dep.status === 'completed' ? colorize('[x]', 'green') : colorize('[ ]', 'cyan');
      console.log(`  ${icon} ${dep.id.padEnd(6)} ${dep.title}`);
    }
  }
  console.log('');
  const ready = areDepsCompleted(state, taskId);
  console.log(`  Status: ${ready ? colorize('READY (all deps completed)', 'green') : colorize('BLOCKED (deps pending)', 'red')}`);
}

function cmdStart(state, taskId) {
  if (!taskId) {
    console.error(colorize('ERROR: task ID required', 'red'));
    process.exit(1);
  }
  const task = findTask(state, taskId);
  if (!task) {
    console.error(colorize(`ERROR: Task ${taskId} not found`, 'red'));
    process.exit(1);
  }
  if (task.status === 'completed') {
    console.error(colorize(`ERROR: Task ${taskId} is already completed`, 'red'));
    process.exit(1);
  }
  if (task.status === 'in_progress') {
    console.log(colorize(`Task ${taskId} is already in progress`, 'yellow'));
    return;
  }
  if (!areDepsCompleted(state, taskId)) {
    console.error(colorize(`ERROR: Task ${taskId} has uncompleted dependencies`, 'red'));
    cmdDeps(state, taskId);
    process.exit(1);
  }
  const result = updateTaskStatus(state, taskId, 'in_progress');
  saveState(state);
  console.log(colorize(`✓ Task ${taskId} marked as in_progress`, 'green'));
  console.log(`  ${task.title}`);
}

function cmdComplete(state, taskId) {
  if (!taskId) {
    console.error(colorize('ERROR: task ID required', 'red'));
    process.exit(1);
  }
  const task = findTask(state, taskId);
  if (!task) {
    console.error(colorize(`ERROR: Task ${taskId} not found`, 'red'));
    process.exit(1);
  }
  if (task.status === 'completed') {
    console.log(colorize(`Task ${taskId} is already completed`, 'yellow'));
    return;
  }
  const result = updateTaskStatus(state, taskId, 'completed');
  saveState(state);
  console.log(colorize(`✓ Task ${taskId} marked as completed`, 'green'));
  console.log(`  ${task.title}`);
  // Show newly ready tasks
  const newlyReady = getReadyTasks(state).filter(t => t.depends_on && t.depends_on.includes(taskId));
  if (newlyReady.length > 0) {
    console.log('');
    console.log(colorize(`Newly ready tasks (${newlyReady.length}):`, 'magenta'));
    newlyReady.forEach(t => console.log(formatTaskLine(t)));
  }
}

function cmdBlock(state, taskId, reason) {
  if (!taskId) {
    console.error(colorize('ERROR: task ID required', 'red'));
    process.exit(1);
  }
  if (!reason) {
    console.error(colorize('ERROR: reason required. Usage: cascade-task.js block F1.3 "reason"', 'red'));
    process.exit(1);
  }
  const task = findTask(state, taskId);
  if (!task) {
    console.error(colorize(`ERROR: Task ${taskId} not found`, 'red'));
    process.exit(1);
  }
  updateTaskStatus(state, taskId, 'blocked');
  // Store reason in a comment field
  for (const phase of state.phases) {
    for (const t of phase.tasks) {
      if (t.id === taskId) {
        t.block_reason = reason;
        break;
      }
    }
  }
  saveState(state);
  console.log(colorize(`✓ Task ${taskId} marked as blocked`, 'red'));
  console.log(`  ${task.title}`);
  console.log(`  Reason: ${reason}`);
}

function cmdPending(state) {
  const pending = getAllTasks(state).filter(t => t.status === 'pending');
  if (pending.length === 0) {
    console.log(colorize('No pending tasks.', 'green'));
    return;
  }
  console.log(colorize(`Pending tasks (${pending.length}):`, 'cyan'));
  pending.forEach(t => console.log(formatTaskLine(t, { showPhase: true, showDeps: true })));
}

function cmdBlocked(state) {
  const blocked = getAllTasks(state).filter(t => t.status === 'blocked' || (t.status === 'pending' && !areDepsCompleted(state, t.id)));
  if (blocked.length === 0) {
    console.log(colorize('No blocked tasks.', 'green'));
    return;
  }
  console.log(colorize(`Blocked tasks (${blocked.length}):`, 'red'));
  blocked.forEach(t => {
    console.log(formatTaskLine(t, { showPhase: true }));
    if (t.depends_on && t.depends_on.length > 0) {
      const pendingDeps = t.depends_on.filter(d => getTaskStatus(state, d) !== 'completed');
      if (pendingDeps.length > 0) {
        console.log(colorize(`      waiting on: ${pendingDeps.join(', ')}`, 'gray'));
      }
    }
    if (t.block_reason) {
      console.log(colorize(`      reason: ${t.block_reason}`, 'gray'));
    }
  });
}

function cmdPhases(state) {
  console.log(colorize('Phases:', 'bold'));
  for (const phase of state.phases) {
    const total = phase.tasks.length;
    const completed = phase.tasks.filter(t => t.status === 'completed').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    console.log('');
    console.log(colorize(`${phase.id}: ${phase.name}`, 'bold'));
    console.log(colorize(`  Gate: ${phase.gate}`, 'dim'));
    console.log(`  Progress: ${completed}/${total} (${pct}%)`);
  }
}

function cmdFunctions(state) {
  const fi = state.functionInventory;
  if (!fi || (Array.isArray(fi) && fi.length === 0) || (typeof fi === 'object' && Object.keys(fi).length === 0)) {
    console.log(colorize('No function inventory found.', 'yellow'));
    return;
  }
  const funcs = Array.isArray(fi) ? fi : Object.values(fi);
  console.log(colorize(`Function inventory (${funcs.length}):`, 'bold'));
  for (const f of funcs) {
    const status = f.status === 'Works' ? colorize('✓', 'green') : f.status === 'Broken' ? colorize('✗', 'red') : colorize('?', 'yellow');
    console.log(`  ${status} ${f.id.padEnd(10)} ${f.name.padEnd(30)} ${colorize(`[${f.tab}]`, 'gray')}`);
  }
}

function cmdFunc(state, funcId) {
  if (!funcId) {
    console.error(colorize('ERROR: function ID required', 'red'));
    process.exit(1);
  }
  const fi = state.functionInventory;
  const funcs = Array.isArray(fi) ? fi : Object.values(fi);
  const f = funcs.find(x => x.id === funcId);
  if (!f) {
    console.error(colorize(`ERROR: Function ${funcId} not found`, 'red'));
    process.exit(1);
  }
  console.log(colorize(`Function ${f.id}: ${f.name}`, 'bold'));
  console.log(`  Tab:      ${f.tab}`);
  console.log(`  Status:   ${f.status}`);
  console.log(`  Priority: ${f.priority}`);
  if (f.depends_on && f.depends_on.length > 0) {
    console.log(`  Deps:     ${f.depends_on.join(', ')}`);
  }
  if (f.implemented_by && f.implemented_by.length > 0) {
    console.log(`  Implemented by: ${f.implemented_by.join(', ')}`);
  }
}

function cmdValidate(state) {
  const errors = [];
  const warnings = [];
  const allTaskIds = new Set();
  // Collect all task IDs
  for (const phase of state.phases) {
    for (const task of phase.tasks) {
      if (allTaskIds.has(task.id)) {
        errors.push(`Duplicate task ID: ${task.id}`);
      }
      allTaskIds.add(task.id);
      // Check required fields
      for (const field of ['id', 'title', 'priority', 'size', 'status']) {
        if (!task[field]) {
          errors.push(`Task ${task.id}: missing required field '${field}'`);
        }
      }
      // Check status is valid
      const validStatuses = ['pending', 'in_progress', 'completed', 'blocked'];
      if (!validStatuses.includes(task.status)) {
        errors.push(`Task ${task.id}: invalid status '${task.status}'`);
      }
    }
  }
  // Check dependencies exist
  for (const phase of state.phases) {
    for (const task of phase.tasks) {
      if (task.depends_on) {
        for (const depId of task.depends_on) {
          if (!allTaskIds.has(depId)) {
            errors.push(`Task ${task.id}: depends on non-existent task ${depId}`);
          }
        }
      }
    }
  }
  // Check for circular dependencies (simple DFS)
  const visited = new Map(); // 0=unvisited, 1=in progress, 2=done
  function hasCycle(taskId, path) {
    if (visited.get(taskId) === 1) {
      errors.push(`Circular dependency detected: ${path.join(' -> ')} -> ${taskId}`);
      return true;
    }
    if (visited.get(taskId) === 2) return false;
    visited.set(taskId, 1);
    const task = findTask(state, taskId);
    if (task && task.depends_on) {
      for (const depId of task.depends_on) {
        if (hasCycle(depId, [...path, taskId])) return true;
      }
    }
    visited.set(taskId, 2);
    return false;
  }
  for (const id of allTaskIds) {
    if (!visited.has(id)) {
      hasCycle(id, []);
    }
  }
  // Report
  if (errors.length === 0 && warnings.length === 0) {
    console.log(colorize('✓ state.json is valid', 'green'));
    console.log(`  Tasks: ${getAllTasks(state).length}`);
    console.log(`  Phases: ${state.phases.length}`);
    return;
  }
  if (warnings.length > 0) {
    console.log(colorize(`Warnings (${warnings.length}):`, 'yellow'));
    warnings.forEach(w => console.log(`  ${colorize('⚠', 'yellow')} ${w}`));
  }
  if (errors.length > 0) {
    console.log(colorize(`Errors (${errors.length}):`, 'red'));
    errors.forEach(e => console.log(`  ${colorize('✗', 'red')} ${e}`));
    process.exit(1);
  }
}

// ---- Main -----------------------------------------------------------------
function printUsage() {
  console.log(`
${colorize('cascade-task.js', 'bold')} — Cascade task management CLI

${colorize('USAGE:', 'bold')}
  node scripts/cascade-task.js <command> [args]

${colorize('COMMANDS:', 'bold')}
  ${colorize('next-task', 'cyan')}                Show the next ready task to work on
  ${colorize('ready-tasks', 'cyan')}              List all tasks ready to start
  ${colorize('status', 'cyan')}                   Show overall cascade status
  ${colorize('phases', 'cyan')}                   List all phases with progress
  ${colorize('task <id>', 'cyan')}                Show details for a specific task
  ${colorize('deps <id>', 'cyan')}                Show dependencies for a task
  ${colorize('start <id>', 'cyan')}               Mark a task as in_progress
  ${colorize('complete <id>', 'cyan')}            Mark a task as completed
  ${colorize('block <id> <reason>', 'cyan')}      Mark a task as blocked
  ${colorize('pending', 'cyan')}                  List all pending tasks
  ${colorize('blocked', 'cyan')}                  List all blocked tasks
  ${colorize('functions', 'cyan')}                List function inventory
  ${colorize('func <id>', 'cyan')}                Show function details
  ${colorize('validate', 'cyan')}                 Validate state.json integrity

${colorize('EXAMPLES:', 'bold')}
  node scripts/cascade-task.js next-task
  node scripts/cascade-task.js start F1.3
  node scripts/cascade-task.js complete F1.3
  node scripts/cascade-task.js block F4.3 "waiting on AI service"
  node scripts/cascade-task.js validate

${colorize('STATE FILE:', 'bold')}
  ${STATE_FILE}
`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }
  const cmd = args[0];
  const state = loadState();

  switch (cmd) {
    case 'next-task':
    case 'next':
      cmdNextTask(state);
      break;
    case 'ready-tasks':
    case 'ready':
      cmdReadyTasks(state);
      break;
    case 'status':
    case 'st':
      cmdStatus(state);
      break;
    case 'phases':
      cmdPhases(state);
      break;
    case 'task':
      cmdTask(state, args[1]);
      break;
    case 'deps':
      cmdDeps(state, args[1]);
      break;
    case 'start':
      cmdStart(state, args[1]);
      break;
    case 'complete':
    case 'done':
      cmdComplete(state, args[1]);
      break;
    case 'block':
      cmdBlock(state, args[1], args.slice(2).join(' '));
      break;
    case 'pending':
      cmdPending(state);
      break;
    case 'blocked':
      cmdBlocked(state);
      break;
    case 'functions':
    case 'funcs':
      cmdFunctions(state);
      break;
    case 'func':
      cmdFunc(state, args[1]);
      break;
    case 'validate':
      cmdValidate(state);
      break;
    case 'help':
    case '--help':
    case '-h':
      printUsage();
      break;
    default:
      console.error(colorize(`ERROR: Unknown command '${cmd}'`, 'red'));
      console.error('Run \'cascade-task.js help\' for usage.');
      process.exit(1);
  }
}

main();
