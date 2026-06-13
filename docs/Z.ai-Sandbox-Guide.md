# Z.ai Sandbox — Complete Guide

> This guide is based on real hands-on experience. All errors and solutions are genuine.

---

## Table of Contents

1. [Quick Start (Clean Install)](#1-quick-start-clean-install)
2. [Everything Is Installed but Nothing Works](#2-everything-is-installed-but-nothing-works)
3. [Cloning a Third-Party Project into the Sandbox](#3-cloning-a-third-party-project-into-the-sandbox)
4. [Dev Server Won't Start](#4-dev-server-wont-start)
5. [Port 3000 Is in Use (EADDRINUSE)](#5-port-3000-is-in-use-eaddrinuse)
6. [HMR Crashed — Page Returns 500](#6-hmr-crashed--page-returns-500)
7. [Modules Not Found (Module not found)](#7-modules-not-found-module-not-found)
8. [Adding a Git Submodule](#8-adding-a-git-submodule)
9. [Updating a Submodule](#9-updating-a-submodule)
10. [Useful Commands](#10-useful-commands)
11. [Common Errors and Solutions](#11-common-errors-and-solutions)

---

## 1. Quick Start (Clean Install)

### Clean Start — Correct Sequence

```bash
# Step 1: Initialize the sandbox (ALWAYS the first command)
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
```

This command:
- Creates a Next.js 16 project structure
- Installs base dependencies
- Configures TypeScript, Tailwind CSS, shadcn/ui
- **Automatically starts the dev server** in the background via `.zscripts/dev.sh`
- Writes logs to `/home/z/my-project/.zscripts/dev.log`

```bash
# Step 2: Install additional dependencies
cd /home/z/my-project && bun add <package-name>

# Example:
bun add framer-motion
bun add three @react-three/fiber @react-three/drei
```

```bash
# Step 3: Verify everything is working
cat /home/z/my-project/.zscripts/dev.log | tail -20
# Should show: "GET / 200 in ..."
```

### What NOT to Do

```bash
# ❌ DO NOT start the dev server manually
npm run dev
bun run dev
next dev
npx next dev

# ❌ DO NOT create projects from scratch
npx create-next-app

# ❌ DO NOT clone into subdirectories (see section 3)
git clone ... && cd subdir && npm install
```

> **Why:** The sandbox manages the dev server itself via `.zscripts/dev.sh`. Manual startup breaks the Preview Panel — the preview stops updating and stops working.

---

## 2. Everything Is Installed but Nothing Works

### Situation: "I did something and the sandbox stopped showing the preview"

**What we did wrong (real case):**

1. Cloned a repository into a **subdirectory** `/home/z/my-project/Rust-performance-optimization/`
2. Started the dev server **manually** via `npx next dev`
3. The dev server periodically crashed during HMR, the preview didn't work

**How to fix it:**

```bash
# Step 1: Kill ALL manually started processes
pkill -f "next dev"
pkill -f "bun run dev"

# Step 2: Make sure ports are freed
lsof -i :3000  # should be empty

# Step 3: Copy code from subdirectory to the project ROOT
# If you cloned into a subdirectory — move the files:
rsync -av --exclude='node_modules' --exclude='.next' \
  /home/z/my-project/ subdir/ /home/z/my-project/

# Step 4: Reinstall dependencies in the root
cd /home/z/my-project && bun install

# Step 5: Reinitialize the sandbox
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash

# Step 6: Check the logs
cat /home/z/my-project/.zscripts/dev.log | tail -20
# Expected: "GET / 200 in ..."
```

### Other Reasons for a Non-Working Preview

| Symptom | Cause | Solution |
|---|---|---|
| Page 500 | Compilation error in code | `cat .zscripts/dev.log \| tail -30` — look for the error |
| White screen | Dev server crashed | Reinitialize the sandbox |
| Preview shows old content | HMR broke | Reinitialize the sandbox |
| "Connection refused" | No process on port 3000 | Reinitialize the sandbox |
| Module not found | Forgot `bun add` | `bun add <package>` |

---

## 3. Cloning a Third-Party Project into the Sandbox

### Correct Way (code in the project root)

```bash
# Step 1: Initialize the sandbox (will create a Next.js scaffold)
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash

# Step 2: Clone TEMPORARILY into a separate folder
cd /tmp && git clone https://github.com/user/project.git

# Step 3: Copy project files to the sandbox ROOT
rsync -av --exclude='node_modules' --exclude='.next' \
  /tmp/project/ /home/z/my-project/

# Step 4: Install dependencies IN the sandbox ROOT
cd /home/z/my-project && bun install

# Step 5: Reinitialize (will restart the dev server)
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash

# Step 6: Verify
cat /home/z/my-project/.zscripts/dev.log | tail -20
```

### Incorrect Way (WHAT NOT TO DO)

```bash
# ❌ DO NOT clone directly into a project subdirectory
cd /home/z/my-project
git clone https://github.com/user/project.git my-project
cd my-project && npm install && npm run dev  # Will break the sandbox!
```

> **Why it doesn't work:** The sandbox's dev server runs in `/home/z/my-project/` and expects the code there. If the code is in a subdirectory — the preview shows the default placeholder, not your project.

### If You Need a Database (Prisma)

```bash
# After copying files to the root:
cd /home/z/my-project

# Apply the schema
bunx prisma db push

# Generate the client
bunx prisma generate
```

---

## 4. Dev Server Won't Start

### Symptoms

```bash
cat .zscripts/dev.log | tail -30
# Shows: EADDRINUSE, Connection refused, or just empty
```

### Solution: Full Reinitialization

```bash
# Step 1: Kill everything
pkill -f "next"
pkill -f "node"
pkill -f "bun"

# Step 2: Delete the cache
rm -rf /home/z/my-project/.next

# Step 3: Reinitialize
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash

# Step 4: Wait 10-15 seconds
sleep 15

# Step 5: Verify
cat /home/z/my-project/.zscripts/dev.log | tail -20
```

### If Reinitialization Doesn't Help

```bash
# Check if the log file is being written at all
ls -la /home/z/my-project/.zscripts/dev.log
ls -la /home/z/my-project/.zscripts/dev.pid

# If dev.pid exists but the server is dead:
kill $(cat /home/z/my-project/.zscripts/dev.pid)
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
```

---

## 5. Port 3000 Is in Use (EADDRINUSE)

### Real Case

```
Error: listen EADDRINUSE: address already in use :::3000
```

This means: the dev server is already running (possibly started manually in a previous session).

### Solution

```bash
# Step 1: DO NOT start manually! The sandbox will start the server itself.

# Step 2: If you need a restart:
pkill -f "next dev"
pkill -f "bun run dev"

# Step 3: Reinitialize
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
```

> **Important:** In the sandbox, NEVER run `npm run dev`, `bun run dev`, or `next dev`. The server starts automatically via `.zscripts/dev.sh`.

---

## 6. HMR Crashed — Page Returns 500

### Symptoms

```
GET / 500 in 942ms (compile: 852ms, render: 90ms)
```

### Cause

You changed/deleted files that Turbopack (HMR) was trying to reload. For example:
- Deleted a component that is imported in `page.tsx`
- Renamed a folder
- Added a submodule (deletion + recreation of folder)

### Solution

```bash
# HMR does not recover on its own after file deletion.
# A full restart is needed:

pkill -f "next dev"
rm -rf /home/z/my-project/.next
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
sleep 15
cat /home/z/my-project/.zscripts/dev.log | tail -10
# Expected: GET / 200
```

---

## 7. Modules Not Found (Module not found)

### Symptoms

```
Module not found: Can't resolve '@/lib/guided-tour/src'
```

### Causes and Solutions

| Cause | Solution |
|---|---|
| Package not installed | `cd /home/z/my-project && bun add <package>` |
| Incorrect import path | Check the path: the file must exist at the specified path |
| Path ends with a file instead of a folder | `@/lib/guided-tour` instead of `@/lib/guided-tour/index` |
| Deleted file but import remains | Update the import in `page.tsx` |
| Submodule not downloaded | `git submodule update --init --recursive` |

### How to Verify

```bash
# Check that the file exists
ls /home/z/my-project/src/lib/guided-tour/index.ts

# Check the alias path (should be @/ -> src/)
cat /home/z/my-project/tsconfig.json | grep -A3 "paths"

# Run the linter
cd /home/z/my-project && bun run lint
```

---

## 8. Adding a Git Submodule

### Example: adding GuidedTour as a submodule

```bash
# Step 1: Prepare a folder for the submodule
mkdir -p /home/z/my-project/src/lib/guided-tour

# Step 2: Add the submodule
cd /home/z/my-project
git submodule add https://github.com/user/GuidedTour.git src/lib/guided-tour

# Step 3: Verify
cat .gitmodules
# Should show:
# [submodule "src/lib/guided-tour"]
#     path = src/lib/guided-tour
#     url = https://github.com/user/GuidedTour.git

ls src/lib/guided-tour/
# Should contain the component files

# Step 4: Update imports in the code
# Before: import { X } from "@/components/ui/guided-tour"
# After:  import { X } from "@/lib/guided-tour"

# Step 5: Reinitialize the sandbox (HMR may crash)
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
```

### If the Submodule Won't Push (protected branch)

```bash
# Push to a separate branch, then create a PR via GitHub UI:
git checkout -b feature/my-changes
git push origin feature/my-changes

# Create a PR: https://github.com/user/repo/pull/new/feature/my-changes
```

---

## 9. Updating a Submodule

### Quick Update

```bash
git submodule update --remote src/lib/guided-tour
```

### Full Cycle (update + commit)

```bash
# 1. Pull changes from upstream
git submodule update --remote src/lib/guided-tour

# 2. See what changed
git diff src/lib/guided-tour

# 3. Commit the new version
git add src/lib/guided-tour
git commit -m "chore: update GuidedTour submodule"

# 4. Reinitialize the sandbox (if dependencies are needed)
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
```

### Check Current Submodule Version

```bash
git submodule status src/lib/guided-tour
```

### What's New Since the Last Update

```bash
cd src/lib/guided-tour && git log --oneline HEAD..origin/main && cd -
```

### Roll Back if Broken

```bash
cd src/lib/guided-tour
git checkout <commit-hash>
cd ..
git add src/lib/guided-tour
git commit -m "chore: pin GuidedTour to <commit-hash>"
```

---

## 10. Useful Commands

### Checking Sandbox Status

```bash
# Dev server logs
cat /home/z/my-project/.zscripts/dev.log | tail -30

# Dev server PID
cat /home/z/my-project/.zscripts/dev.pid

# Process info by PID
cat /home/z/my-project/.zscripts/dev.pid | xargs ps -p
```

### Code Checking

```bash
# Linter
cd /home/z/my-project && bun run lint

# TypeScript errors
bunx tsc --noEmit
```

### Database (Prisma)

```bash
cd /home/z/my-project

# Apply the schema
bunx prisma db push

# Generate the client
bunx prisma generate

# Reset the database
bunx prisma migrate reset
```

### Restarting the Sandbox

```bash
# Standard reinitialization
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash

# Hard restart (if standard doesn't help)
pkill -f "next dev"
rm -rf /home/z/my-project/.next
curl https://z-cdn.chatglm.cn/fullstack/init-fullstack_1775040338514.sh | bash
```

### Preview URL

```bash
# Get the container ID
echo $FC_CONTAINER_ID
# or
hostname

# Preview URL:
# https://preview-<container-id>.space-z.ai/
```

---

## 11. Common Errors and Solutions

| # | Error | Cause | Solution |
|---|---|---|---|
| 1 | `Module not found` | Package not installed | `bun add <package>` |
| 2 | `EADDRINUSE` | Server already running | `pkill -f next` + reinitialization |
| 3 | `GET / 500` | Error in code | Check `.zscripts/dev.log` |
| 4 | `GET / 200` but white screen | HMR broken | Reinitialize the sandbox |
| 5 | `Connection refused` | Server not running | Reinitialize the sandbox |
| 6 | Preview not updating | Dev server crashed | `cat .zscripts/dev.log` + reinitialization |
| 7 | Submodule folder empty | Forgot `--recurse-submodules` | `git submodule update --init --recursive` |
| 8 | TypeScript errors | Incorrect types | `bunx tsc --noEmit` |
| 9 | Imports not working | Incorrect path | Use the `@/` alias |
| 10 | Turbopack panic | File deletion while server is running | Reinitialize the sandbox |

---

## Project Structure

```
/home/z/my-project/
├── src/
│   ├── app/
│   │   ├── page.tsx          # MAIN FILE — all UI goes here
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── sections/         # Page sections
│   │   ├── features/         # Stateful components
│   │   └── perf/             # Specialized components
│   └── lib/
│       ├── guided-tour/      # Git submodule (GuidedTour)
│       ├── perf-data.ts
│       ├── db.ts
│       └── utils.ts
├── prisma/
│   └── schema.prisma
├── public/
├── .zscripts/
│   ├── dev.sh               # Dev server startup script (DO NOT EDIT)
│   ├── dev.pid              # Process PID
│   └── dev.log              # LOGS (read from here when errors occur)
├── .gitmodules              # Submodule configuration
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Golden Rules of the Sandbox

1. **ALWAYS** start with `curl ... init-fullstack ... | bash`
2. **NEVER** start the dev server manually (`npm run dev`, `bun run dev`, `next dev`)
3. **ALL CODE** goes in `/home/z/my-project/` (project root, not subdirectories)
4. **LOGS** are always here: `cat /home/z/my-project/.zscripts/dev.log | tail -30`
5. **DEPENDENCIES** are installed via: `cd /home/z/my-project && bun add <package>`
6. **RESTART** = reinitialization: `curl ... init-fullstack ... | bash`
7. **BROKEN** — don't fix manually, reinitialize
