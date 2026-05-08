#!/usr/bin/env bash
set -e

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PB_DIR="./pb"
PB_URL="http://127.0.0.1:8090"
FRONTEND_URL="http://localhost:5173"
ORCHESTRATOR_URL="http://127.0.0.1:3001"

# ── Kill any existing instances ──
kill_port() {
    local port=$1
    local pid
    pid=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}⚠ Port $port in use (PID: $pid) — killing...${NC}"
        kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi
}

echo -e "${BLUE}▶ Checking for stale processes...${NC}"
kill_port 8090
kill_port 5173
kill_port 3001

# ── Cleanup on exit ──
PIDS=()
cleanup() {
    echo -e "\n${YELLOW}⠋ Shutting down...${NC}"
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# ── PocketBase ──
if [ -f "$PB_DIR/pocketbase" ]; then
    echo -e "${BLUE}▶ Starting PocketBase...${NC}"
    "$PB_DIR/pocketbase" serve &
    PIDS+=($!)
    sleep 2
else
    echo -e "${RED}✗ PocketBase binary not found at $PB_DIR/pocketbase${NC}"
    echo -e "${YELLOW}  Run: ./scripts/dev-pb.sh${NC}"
fi

# ── Orchestrator ──
if [ -d "orchestrator" ]; then
    echo -e "${BLUE}▶ Starting orchestrator...${NC}"
    (cd orchestrator && bun run dev) &
    PIDS+=($!)
    sleep 2
else
    echo -e "${RED}✗ Orchestrator directory not found${NC}"
    echo -e "${YELLOW}  Run: ./scripts/dev-orchestrator.sh${NC}"
fi

# ── Frontend ──
echo -e "${BLUE}▶ Starting frontend...${NC}"
(cd frontend && pnpm dev) &
PIDS+=($!)

# ── Banner ──
sleep 2
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║${NC}  ${GREEN}VPP Dev Server${NC}                                ${BOLD}║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}  PocketBase   : ${YELLOW}${PB_URL}${NC}                    ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  Frontend     : ${YELLOW}${FRONTEND_URL}${NC}                    ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  Orchestrator : ${YELLOW}${ORCHESTRATOR_URL}${NC}                    ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""

wait
