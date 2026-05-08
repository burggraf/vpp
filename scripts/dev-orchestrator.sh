#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)/orchestrator" || cd ./orchestrator

# Kill existing orchestrator on port 3001
ORCH_PID=$(lsof -ti :3001 2>/dev/null || true)
if [ -n "$ORCH_PID" ]; then
    echo -e "${YELLOW}⚠ Port 3001 in use (PID: $ORCH_PID) — killing...${NC}"
    kill "$ORCH_PID" 2>/dev/null || kill -9 "$ORCH_PID" 2>/dev/null || true
    sleep 1
fi

echo -e "${BLUE}▶ Starting orchestrator...${NC}"

# Ensure .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ No .env found, copying from root...${NC}"
    if [ -f ../.env.example ]; then
        cp ../.env.example .env
        echo -e "${YELLOW}  Edit orchestrator/.env with your values${NC}"
    fi
fi

bun run dev
