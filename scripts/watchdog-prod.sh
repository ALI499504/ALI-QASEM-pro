#!/bin/bash
# BFX AI — Stable Next.js dev server watchdog.
# Starts the dev server in a fully-detached session and watches it.
# If the dev server dies for any reason, restarts it automatically.

set -uo pipefail
PROJECT_DIR="/home/z/my-project"
cd "$PROJECT_DIR"

export PORT=3000
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export NEXT_TELEMETRY_DISABLED=1

LOG="$PROJECT_DIR/dev.log"

# On watchdog exit, kill all child processes too
trap 'pkill -f "next dev" 2>/dev/null || true; pkill -f "next-server" 2>/dev/null || true; exit 0' TERM INT

while true; do
  # Don't kill our own bash — use a more targeted approach
  # Just check if port 3000 is responding. If not, start the dev server.
  RESP=$(curl -s -m 3 "http://localhost:3000/api/mt5/account" 2>/dev/null | head -c 30)
  if [ -n "$RESP" ]; then
    # Server is healthy — sleep longer between checks
    sleep 30
    continue
  fi

  # Server not responding — kill any stale instances
  echo "[$(date)] Server not responding. Cleaning stale instances..." >> "$LOG"
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "next-server" 2>/dev/null || true
  sleep 3

  # Start a fresh dev server in a fully-detached session
  echo "[$(date)] Starting Next.js dev server..." >> "$LOG"
  nohup setsid bash -c "cd $PROJECT_DIR && exec bun run dev" </dev/null >> "$LOG" 2>&1 &
  disown 2>/dev/null || true

  # Wait 10s for server to come up, then loop back to check
  sleep 10
done
