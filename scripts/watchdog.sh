#!/bin/bash
# M.ROBOT Production Watchdog - restarts server if it dies
while true; do
  if ! curl -s -o /dev/null --max-time 5 "http://localhost:3000/" 2>/dev/null; then
    echo "[$(date)] Server DOWN - restarting..." >> /home/z/my-project/server.log
    pkill -9 -f "standalone/server" 2>/dev/null || true
    sleep 2
    cd /home/z/my-project
    setsid bash -c "exec bun .next/standalone/server.js 2>&1 | tee -a /home/z/my-project/server.log" &
    disown
    sleep 5
    echo "[$(date)] Server restarted" >> /home/z/my-project/server.log
  fi
  sleep 10
done
