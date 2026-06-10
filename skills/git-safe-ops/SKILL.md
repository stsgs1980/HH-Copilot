---
name: git-safe-ops
description: >
  Safe git operations with automatic backups and conflict recovery.
  CRITICAL: Use this skill BEFORE any git rebase, merge, pull, or reset operation
  that involves a remote repository. Also use when the environment is blocked
  by a git merge/rebase conflict. This skill prevents data loss from failed
  rebases, merge conflicts, and environment lockups. Always invoke when:
  (1) git push is rejected due to diverged branches,
  (2) you need to sync with a remote,
  (3) the environment is completely blocked by a git conflict,
  (4) you need to update a remote URL or PAT.
---

# Git Safe Operations

## Purpose

Git operations that rewrite history (rebase, merge, pull with diverged branches)
can block the entire sandbox environment if a conflict occurs. This skill provides
a safe protocol that prevents environment lockups and data loss.

## CRITICAL RULE: Backup Before ANY Remote Operation

Before executing any git operation that interacts with a remote or rewrites history,
create a backup:

```
1. git stash push -m "pre-op-backup-<timestamp>"
2. cp -r src/ /tmp/src-backup-<timestamp>/
3. git log --oneline -20 > /tmp/git-log-backup-<timestamp>.txt
```

Only THEN proceed with the git operation.

## Decision Tree

### When `git push` is rejected (diverged branches):

**Preferred path:** Use `git push --force` if local commits are authoritative.

```
1. Backup (see above)
2. git push --force origin main
```

**DO NOT** run `git pull --rebase` or `git pull` to "fix" divergence.
Rebase is risky in sandboxed environments because conflicts lock ALL tools.

### When you need to sync with remote (remote has commits you want):

```
1. Backup (see above)
2. git fetch origin
3. git log --oneline origin/main..HEAD  (check what local has)
4. git log --oneline HEAD..origin/main  (check what remote has)
5. Decide: force push (if local is authoritative) OR merge (if remote has needed changes)
6. If merging: git merge origin/main --no-edit
7. If conflict: use "Conflict Recovery" below
```

### When updating remote URL or PAT:

```
1. git remote set-url origin <new-url>
2. git remote -v  (verify)
3. git push --force origin main  (do NOT pull first)
```

NEVER pull after changing remote URL. You already have the local state you need.

## Conflict Recovery (Environment Blocked)

If the environment is blocked (all commands return "you need to resolve your current index first"):

### Step 1: Force unlock (attempt each with 5 second timeout)

```bash
# Attempt A: Remove merge state files
rm -f .git/MERGE_HEAD .git/MERGE_MSG .git/MERGE_RR .git/index.lock
rm -rf .git/rebase-merge .git/rebase-apply
git reset --merge

# If A fails, Attempt B: Replace index
cp .git/HEAD .git/index.bak 2>/dev/null
git read-tree HEAD
git checkout-index -a
git reset --hard HEAD

# If B fails, Attempt C: Nuclear option (data is in /tmp/ backup)
rm -rf .git/rebase-merge .git/rebase-apply
git reset --hard HEAD
```

### Step 2: Restore from backup if reset lost data

```bash
# Check if source files still exist
ls src/app/page.tsx

# If missing, restore from backup
cp -r /tmp/src-backup-<timestamp>/ src/
```

### Step 3: Verify state

```bash
git status
git log --oneline -5
# Confirm files exist: ls src/app/
```

## NEVER DO These Things

1. `git pull --rebase` without a backup - this is the #1 cause of environment lockups
2. `git rebase --continue` when environment is already blocked by a conflict
3. Attempting `git checkout`, `git add`, `git merge` when all commands are blocked
4. Telling the user their code is "permanently lost" without checking:
   - `/tmp/src-backup-*/`
   - `.git/rebase-merge/`
   - `git reflog`
   - `git fsck --lost-found`
5. Running `git pull` after `git remote set-url` (creates unnecessary conflicts)

## Workflow Checklist

Before ANY git operation involving remote:
- [ ] Backup created (stash + file copy + log)
- [ ] Remote URL verified
- [ ] Operation chosen (force push preferred for diverged branches)
- [ ] After operation: git status verified
- [ ] After operation: source files verified (ls src/app/)
- [ ] Worklog.md updated with operation details
