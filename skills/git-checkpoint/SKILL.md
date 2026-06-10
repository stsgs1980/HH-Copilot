---
name: git-checkpoint
description: >
  Systematic git checkpoints during work. Use this skill to create WIP commits,
  recovery tags, and rollback points. Invoke when: (1) 15-20 min of work passed,
  (2) before risky operations (refactor, delete, restructure), (3) completing
  a logical unit, (4) session end. Prevents data loss in Z.ai sandbox.
---

# Git Checkpoint

## Purpose

Systematic version control during active work. Do NOT wait until session end.

## When to Use

| Trigger | Checkpoint Type |
|---------|-----------------|
| 15-20 min of work | WIP Checkpoint |
| Before refactor/delete/restructure | Pre-risk Tag |
| Logical unit completed | Milestone Commit |
| Session end | Session Checkpoint |

## Commands

### WIP Checkpoint (every 15-20 min)

```bash
# Stage all changes
git add -A

# Commit with WIP marker
git commit -m "chore(wip): checkpoint -- <task-id> in progress"

# Push immediately
git push --force-with-lease origin main

# Log to worklog
echo "Checkpoint: $(date -Iseconds) -- <task-id>" >> /home/z/my-project/worklog.md
```

### Pre-risk Tag (before risky operation)

```bash
# Create tag
git tag checkpoint-<task-id>-before-<operation>

# Push tag
git push origin checkpoint-<task-id>-before-<operation>

# Now safe to perform risky operation
```

### Milestone Commit (logical unit completed)

```bash
git add -A
git commit -m "<type>(<scope>): <description>"  # Normal conventional commit
git push --force-with-lease origin main
```

### Session End Checkpoint

```bash
git add -A
git commit -m "chore: session checkpoint -- <summary of work>"
git push --force-with-lease origin main
```

## Rollback

If something goes wrong after a checkpoint:

```bash
# List recent checkpoints
git tag -l "checkpoint-*" | tail -5

# Rollback to specific checkpoint
git reset --hard checkpoint-<task-id>-before-<operation>
git push --force-with-lease origin main

# Or rollback to last commit
git reset --hard HEAD~1
git push --force-with-lease origin main
```

## Checklist

Before creating checkpoint:

- [ ] All relevant files staged (`git status` clean or intentional)
- [ ] Commit message follows format
- [ ] Push completed
- [ ] Logged to worklog.md (for WIP checkpoints)

## Integration with Other Skills

| Skill | Interaction |
|-------|-------------|
| `git-safe-ops` | Use git-checkpoint BEFORE git-safe-ops operations |
| `health-check` | After recovery, run health-check to verify state |
| `dev-watchdog` | Checkpoint before dev server restart |
