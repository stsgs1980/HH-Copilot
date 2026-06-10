---
name: git-safety
description: >
  Critical safety rules for git operations in Z.ai/ZCode sandbox environments.
  Prevents complete system deadlock caused by middleware hooks that block all
  commands when git enters conflict state. Covers: middleware deadlock mechanism,
  absolute prohibitions, pre-command checklist, remote ahead decision tree,
  rebase deadlock recovery, network failure handling, auto-generated file conflicts,
  nested clone trap after deadlock.
  Activate whenever: performing git operations, encountering "remote ahead" situation,
  seeing git conflict or lock files, after session restart with dirty git state,
  before ANY git pull/rebase/merge operation, when git commands hang or fail,
  after deadlock when cloning repository.
  CRITICAL: Failure to follow this skill can cause UNRECOVERABLE deadlock requiring
  session restart and potential data loss.
---

# Git Safety for Z.ai/ZCode Sandbox

## Why this matters

Z.ai/ZCode sandbox uses a **middleware hook** that intercepts ALL shell commands. Before executing ANY command, it runs `git status`. If git returns non-zero (conflict, rebase in progress, dirty state), **ALL commands are blocked** — even `echo`, `ls`, `rm`. This creates **absolute deadlock** where you cannot fix the problem because no commands work.

**Real scenario that causes deadlock:**
```
User runs: git pull --rebase
Result: Conflict in dev.log (auto-generated file)
Middleware: Detects conflict -> blocks ALL commands
User tries: git rebase --abort
Result: BLOCKED - command never executes
User tries: rm .git/rebase-merge
Result: BLOCKED - command never executes
Outcome: COMPLETE DEADLOCK - only session restart helps
```

---

## The 7 Absolute Prohibitions

### Prohibition 1: NEVER `git pull --rebase`

```bash
# FORBIDDEN
git pull --rebase

# CORRECT
git push --force-with-lease origin main
```

**Why:** Rebase conflict triggers middleware deadlock. In solo projects, your local state is authoritative — force push is always safe.

### Prohibition 2: NEVER `git pull` without prior fetch

```bash
# FORBIDDEN
git pull origin main

# CORRECT
git fetch origin
git log HEAD..origin/main --oneline  # check what's ahead
git push --force-with-lease origin main  # for solo projects
```

**Why:** Unexpected merge conflicts cause deadlock. Always check remote state first.

### Prohibition 3: NEVER rebase on dirty tree

```bash
# FORBIDDEN (when git status shows uncommitted changes)
git rebase origin/main

# CORRECT
git status  # verify clean
git add -A && git commit -m "checkpoint"
git push --force-with-lease origin main
```

**Why:** Dirty tree + rebase = unrecoverable state if conflict occurs.

### Prohibition 4: NEVER leave session with dirty tree

```bash
# FORBIDDEN
# (end session while git status shows changes)

# CORRECT
git add -A
git commit -m "chore: session checkpoint"
git push --force-with-lease origin main
# NOW safe to end session
```

**Why:** Sandbox performs automatic git operations on restart. Dirty tree = conflict = deadlock.

### Prohibition 5: NEVER `git stash` during conflict

```bash
# FORBIDDEN (when conflict markers exist)
git stash

# CORRECT
git checkout --ours <conflicted-file>
git add <conflicted-file>
git commit -m "fix: resolve conflict"
git push --force-with-lease origin main
```

**Why:** Stash with conflict markers cannot be applied cleanly.

### Prohibition 6: NEVER use `kill -9` on git processes first

```bash
# FORBIDDEN (as first action)
kill -9 <git-pid>

# CORRECT
kill <git-pid>  # SIGTERM first
sleep 5
kill -9 <git-pid>  # SIGKILL only if still running
rm -f .git/*.lock  # then clean up
```

**Why:** `kill -9` leaves `.lock` files that block future git operations.

### Prohibition 7: NEVER edit files during rebase/merge

```bash
# FORBIDDEN (while .git/rebase-merge exists)
# editing any files

# CORRECT
git rebase --abort  # OR
git merge --abort
# THEN edit files
```

**Why:** Editing during rebase extends conflict window and deadlock risk.

---

## Pre-Command Checklist

Run this BEFORE any git operation:

```bash
# Step 1: Check state
git status
ls .git/*.lock 2>/dev/null && echo "LOCK EXISTS - remove first"
ls .git/rebase-merge/ 2>/dev/null && echo "REBASE IN PROGRESS - abort first"
ls .git/MERGE_HEAD 2>/dev/null && echo "MERGE IN PROGRESS - abort first"

# Step 2: Check remote
git fetch origin
git log HEAD..origin/main --oneline  # shows if remote is ahead

# Step 3: Decide action based on matrix below
```

### Decision Matrix

| State | Action |
|-------|--------|
| Clean tree, remote up-to-date | Safe to proceed |
| Dirty tree, no remote changes | Commit + push, then proceed |
| Remote ahead (solo project) | `git push --force-with-lease origin main` |
| Remote ahead (team project) | Review changes, then merge or reset |
| Lock files exist | Remove: `rm -f .git/*.lock` |
| Rebase in progress | Abort: `git rebase --abort` |
| Merge in progress | Abort: `git merge --abort` |

---

## Remote Ahead Decision Tree

```
git log HEAD..origin/main shows commits?
    |
    v
Is this YOUR project (solo work)?
    |
    +-- YES --> git push --force-with-lease origin main
    |           (your local state is authoritative)
    |
    +-- NO --> Are remote changes important?
                |
                +-- YES --> git fetch origin
                |           git log origin/main
                |           git reset --hard origin/main
                |           # Then reapply your work
                |
                +-- NO --> git push --force-with-lease origin main
                           (your work overrides)
```

---

## Recovery Procedures

### Scenario 1: Middleware Deadlock (all commands blocked)

**You CANNOT recover without session restart.**

Before restart:
- All uncommitted work WILL be lost
- Unpushed commits MAY be lost

**After restart:**
```bash
# 1. Check state
ls .git/rebase-merge/ 2>/dev/null && echo "REBASE EXISTS"
ls .git/MERGE_HEAD 2>/dev/null && echo "MERGE EXISTS"

# 2. Abort any in-progress operations
git rebase --abort 2>/dev/null
git merge --abort 2>/dev/null

# 3. Manual cleanup if abort fails
rm -rf .git/rebase-merge .git/rebase-apply
rm -f .git/MERGE_HEAD .git/MERGE_MSG .git/MERGE_MODE
rm -f .git/*.lock

# 4. Reset to clean state
git reset --hard HEAD

# 5. Sync with remote
git fetch origin
git reset --hard origin/main

# 6. Verify clean
git status

# 7. Push if needed
git push --force-with-lease origin main
```

### Scenario 2: Network Failure During Git Operation

```bash
# If command hangs > 30 seconds:
# 1. Find process
ps aux | grep git

# 2. Graceful termination
kill <pid>
sleep 5

# 3. Force kill if needed
kill -9 <pid>

# 4. Clean locks
rm -f .git/*.lock
rm -f .git/objects/*.lock
rm -f .git/FETCH_HEAD

# 5. Verify integrity
git fsck --full

# 6. Retry operation
git push --force-with-lease origin main
```

### Scenario 3: Auto-Generated File Conflict

Files like `*.log`, `dev.log`, `*.db` cause conflicts because they auto-change.

```bash
# Prevention: Add to .gitignore
echo "*.log" >> .gitignore
echo "*.db" >> .gitignore
git rm --cached *.log  # if already tracked

# If conflict already occurred:
git checkout --ours dev.log  # accept your version
git add dev.log
git commit -m "fix: resolve log conflict"
git push --force-with-lease origin main
```

### Scenario 4: Detached HEAD

```bash
# 1. Check state
git branch -v
git log --oneline -5

# 2. Save work
git checkout -b rescue-branch
git push origin rescue-branch

# 3. Return to main
git checkout main
git pull origin main

# 4. Merge rescue
git merge rescue-branch
```

---

## Session Start/End Checklist

### Session Start

```bash
# Always run first
git status
ls .git/rebase-merge/ 2>/dev/null && git rebase --abort
ls .git/MERGE_HEAD 2>/dev/null && git merge --abort
ls .git/*.lock 2>/dev/null && rm -f .git/*.lock
git status  # verify clean
```

### Session End

```bash
# ALWAYS before ending
git add -A
git commit -m "chore: session checkpoint"
git push --force-with-lease origin main
git status  # verify: "nothing to commit, working tree clean"
```

---

## Post-Deadlock Clean Clone Procedure

### The Nested Project Trap

After a git deadlock, another agent might clone the repository **inside** the broken project instead of **replacing** it. This creates a nested structure that breaks everything:

```
WRONG (nested project - NOTHING WORKS):
/home/z/my-project/                          ← old broken project (git deadlock)
  ├── .git/                                  ← BLOCKED rebase
  ├── src/
  ├── package.json
  └── Z.Code-Guide-Coding-Tool-Helper/       ← clone INSIDE old project!
       ├── .git/                             ← clean git
       ├── src/
       └── package.json

CORRECT (clean replacement):
/home/z/my-project/                          ← clean clone (replacement)
  ├── .git/                                  ← clean git
  ├── src/
  └── package.json
```

**Why nested projects fail:**
- Dev server won't find correct paths
- Port 3000 won't bind correctly
- Imports resolve to wrong node_modules
- Environment files not found
- Git operations affect wrong repository

### Correct Procedure After Deadlock

**Step 1: Verify if project is corrupted**

```bash
# Check for deadlock state
ls /home/z/my-project/.git/rebase-merge/ 2>/dev/null && echo "DEADLOCKED"
ls /home/z/my-project/.git/MERGE_HEAD 2>/dev/null && echo "DEADLOCKED"

# Check for nested project (WRONG structure)
ls -d /home/z/my-project/*/  # should show src/, not another project!
```

**Step 2: If corrupted, DELETE ENTIRE directory and re-clone**

```bash
# DELETE the entire corrupted project
rm -rf /home/z/my-project

# Clone DIRECTLY to the target path (NOT as subdirectory)
git clone https://<token>@github.com/<owner>/<repo>.git /home/z/my-project

# Verify correct structure
ls /home/z/my-project/
# Should show: src/, package.json, .git/ — NOT another project folder!

# Setup
cd /home/z/my-project
bun install
cp .env.example .env
bun run db:push  # if applicable
bun run dev
```

### The Critical Difference

| Wrong | Correct |
|-------|---------|
| `git clone <url>` (creates subdirectory) | `git clone <url> /home/z/my-project` |
| `cd /home/z/my-project && git clone <url>` | `rm -rf /home/z/my-project && git clone <url> /home/z/my-project` |

**Key insight:** Always specify the target directory explicitly when cloning after deadlock:

```bash
# WRONG - creates nested project
git clone https://github.com/user/repo.git
# Result: /home/z/my-project/repo/  ← WRONG!

# CORRECT - replaces old project
git clone https://github.com/user/repo.git /home/z/my-project
# Result: /home/z/my-project/  ← CORRECT!
```

### Cleanup Checklist After Deadlock Recovery

```bash
[ ] Old directory completely removed (rm -rf)
[ ] Clone command specifies target path explicitly
[ ] No nested project structure exists
[ ] .git/ is at correct level (/home/z/my-project/.git/)
[ ] package.json is at correct level
[ ] bun install runs successfully
[ ] bun run dev starts on correct port
```

---

## Quick Reference Card

| Situation | Command |
|-----------|---------|
| Remote ahead (solo) | `git push --force-with-lease origin main` |
| Rebase deadlock | Restart session → `git rebase --abort` |
| Merge deadlock | Restart session → `git merge --abort` |
| Lock files | `rm -f .git/*.lock` |
| Auto-file conflict | `git checkout --ours <file>` |
| Network hang | `kill <pid>` → `rm -f .git/*.lock` |
| Detached HEAD | `git checkout -b rescue && git push` |
| Session end | `git add -A && git commit && git push` |
| Nested project trap | `rm -rf /home/z/my-project && git clone <url> /home/z/my-project` |

---

## The Golden Rule

```
When in doubt: git push --force-with-lease origin main
```

In Z.ai/ZCode sandbox:
- Your local state is typically the authoritative version
- Remote conflicts are usually from previous session's auto-operations
- Force push with lease is SAFE because it checks if remote changed unexpectedly

---

## What This Skill Does NOT Cover

- Team collaboration workflows (use standard git practices for teams)
- Complex merge strategies (avoid in sandbox)
- Git internals and plumbing commands
- Advanced rebase operations (dangerous in sandbox)
- SSH key management (platform-specific)
