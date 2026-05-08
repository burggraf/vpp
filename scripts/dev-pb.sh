#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PB_DIR="./pb"

if [ ! -f "$PB_DIR/pocketbase" ]; then
    echo -e "${RED}✗ PocketBase binary not found at $PB_DIR/pocketbase${NC}"
    echo -e "${YELLOW}  Download from: https://pocketbase.io/docs/${NC}"
    exit 1
fi

echo -e "${BLUE}▶ Starting PocketBase...${NC}"
"$PB_DIR/pocketbase" serve &
PB_PID=$!

sleep 2

echo ""
echo -e "${BOLD}╔══════════════════════════════════╗${NC}"
echo -e "${BOLD}║${NC}  ${GREEN}PocketBase Admin${NC}              ${BOLD}║${NC}"
echo -e "${BOLD}╠══════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}  ${YELLOW}http://127.0.0.1:8090/_/${NC}      ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════╝${NC}"
echo ""

trap "kill $PB_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
