#!/usr/bin/env bash
set -e

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)/frontend" || cd ./frontend

# Kill existing Vite on port 5173
FE_PID=$(lsof -ti :5173 2>/dev/null || true)
if [ -n "$FE_PID" ]; then
    echo "⚠ Port 5173 in use (PID: $FE_PID) — killing..."
    kill "$FE_PID" 2>/dev/null || kill -9 "$FE_PID" 2>/dev/null || true
    sleep 1
fi

npm run dev
