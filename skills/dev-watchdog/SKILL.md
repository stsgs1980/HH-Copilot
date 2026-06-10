---
name: dev-watchdog
description: >
  Dev server keepalive and health monitoring for Next.js projects in sandboxed environments.
  Use this skill when: (1) the dev server needs to be started or restarted,
  (2) the user reports 502 Bad Gateway or connection refused errors,
  (3) a cron/watchdog task asks to restart the server,
  (4) you need to verify the dev server is running after code changes.
  Also proactively use this at the start of any session to ensure the server is alive.
---

# Dev Server Watchdog

## Purpose

In sandboxed environments, the Next.js dev server (`next dev`) tends to terminate
after approximately 5 minutes of running. This skill provides a reliable protocol
for starting, monitoring, and restarting the dev server.

## Server Start Protocol

### Standard Start

```bash
# Kill any existing process first
pkill -f 'next dev' 2>/dev/null
sleep 1

# Start server (npx, not bun - bun has shown instability)
cd /home/z/my-project && npx next dev -p 3000 </dev/null >/tmp/zdev.log 2>&1 &

# Wait for compilation
sleep 6

# Verify
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/
# Expected: 200
```

### Important Notes

- Always use `127.0.0.1` not `localhost` for curl (IPv6 resolution issues in sandbox)
- Always redirect stdout/stderr to `/tmp/zdev.log` (prevents process death from output buffer)
- Always use `</dev/null` to close stdin (prevents process hanging on input)
- Use `npx next dev` directly, NOT `bun run dev` (bun wrapper adds instability)
- Wait at least 6 seconds after start before health check (Turbopack compilation time)

## Health Check Protocol

```bash
# Quick check
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/
# 200 = alive, 000 = dead, 5xx = error

# If dead: check logs before restarting
tail -20 /tmp/zdev.log
```

### When Server Returns 000 (Connection Refused)

This means the process has died. Restart using Standard Start protocol.

### When Server Returns 500

This usually means a compilation error. Check the log:

```bash
tail -30 /tmp/zdev.log
```

Do NOT blindly restart. Fix the compilation error first, then restart.

## Cron Watchdog Task

For automated keepalive, a cron task should run every 5 minutes:

```
Job: Restart dev server if dead
Schedule: every 5 minutes
Command: Check health, restart if 000
```

The cron task handler should:

1. Check if server is alive (`curl` to `127.0.0.1:3000`)
2. If alive (200): do nothing
3. If dead (000): restart using Standard Start protocol
4. Log the restart event

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 000 after start | Process died immediately | Check `/tmp/zdev.log` for errors |
| 200 on first request, 000 later | Process timeout | This is expected in sandbox; cron watchdog handles it |
| 500 | Compilation error in code | Fix the error, then restart |
| Port 3000 already in use | Previous process not killed | `pkill -f 'next dev'` then restart |
| Slow first response (>10s) | Turbopack cold compile | Normal; wait up to 15 seconds |

## File Locations

| File | Purpose |
|------|---------|
| `/tmp/zdev.log` | Server stdout/stderr |
| `/home/z/my-project/dev.log` | Alternate log (bun creates this) |
| Port 3000 | Standard dev server port (mandatory, per project config) |
