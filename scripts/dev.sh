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

# ── Frontend ──
echo -e "${BLUE}▶ Starting frontend...${NC}"
cd frontend && pnpm dev &
PIDS+=($!)
cd ..

# ── Banner ──
sleep 1
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║${NC}  ${GREEN}VPP Dev Server${NC}                          ${BOLD}║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}  PocketBase : ${YELLOW}${PB_URL}${NC}                ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  Frontend   : ${YELLOW}${FRONTEND_URL}${NC}                ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

wait
