#!/bin/bash
# Production server launcher — keeps the process alive as a daemon.
# Uses setsid to fully detach from the controlling shell, and `tee` so the
# parent bash stays alive (tini reaps orphans, but the pipe keeps bun alive
# even if the calling bash exits — same pattern as `bun run dev`).

set -euo pipefail

PROJECT_DIR="/home/z/my-project"
cd "$PROJECT_DIR"

# Kill any prior prod / dev server to free port 3000
pkill -f "next-server" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "standalone/server.js" 2>/dev/null || true
sleep 2

export NODE_ENV=production
export PORT=3000
export NEXT_TELEMETRY_DISABLED=1
export DATABASE_URL="file:/home/z/my-project/db/custom.db"

# Run production server — `tee` keeps the pipe open and the bash alive,
# so the bun process never gets SIGHUP'd when the launching shell exits.
# `setsid` makes bun a session leader so it survives terminal detach.
setsid bash -c 'exec bun .next/standalone/server.js 2>&1 | tee /home/z/my-project/server.log' &
PROD_PID=$!
disown "$PROD_PID" 2>/dev/null || true
echo "Production server launched (PID: $PROD_PID)"

# Wait for readiness
for i in {1..30}; do
  if curl -s -o /dev/null --max-time 2 "http://localhost:3000/" 2>/dev/null; then
    echo "Server is ready"
    break
  fi
  sleep 1
done

# Final check
if curl -s -o /dev/null --max-time 5 "http://localhost:3000/" 2>/dev/null; then
  echo "OK: production server responding on :3000"
else
  echo "FAIL: server not responding"
  tail -30 /home/z/my-project/server.log || true
  exit 1
fi
