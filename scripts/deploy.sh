#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# ── Config ──
REMOTE_HOST="${REMOTE_HOST:?REMOTE_HOST not set}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/vpp}"
PB_BINARY="./pb/pocketbase"
NGINX_CONF="./deploy/nginx.conf"

echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║${NC}  ${GREEN}VPP Deploy — ${REMOTE_USER}@${REMOTE_HOST}${NC}            ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── Build frontend ──
echo -e "${BLUE}▶ Building frontend...${NC}"
cd frontend && pnpm build && cd ..
echo -e "${GREEN}✓ Frontend built${NC}"

# ── Build orchestrator ──
if [ -d "orchestrator" ]; then
    echo -e "${BLUE}▶ Building orchestrator...${NC}"
    cd orchestrator && bun run build && cd ..
    echo -e "${GREEN}✓ Orchestrator built${NC}"
else
    echo -e "${YELLOW}⊘ No orchestrator directory, skipping${NC}"
fi

# ── Rsync to remote ──
echo -e "${BLUE}▶ Syncing files to ${REMOTE_HOST}:${REMOTE_DIR}...${NC}"
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'pb/pb_data' \
    --exclude 'renders' \
    --exclude 'compositions' \
    --exclude '.env' \
    ./ "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"
echo -e "${GREEN}✓ Files synced${NC}"

# ── Deploy PocketBase binary ──
if [ -f "$PB_BINARY" ]; then
    echo -e "${BLUE}▶ Uploading PocketBase binary...${NC}"
    scp "$PB_BINARY" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/pb/"
    echo -e "${GREEN}✓ PocketBase binary deployed${NC}"
fi

# ── Deploy Nginx config ──
if [ -f "$NGINX_CONF" ]; then
    echo -e "${BLUE}▶ Deploying Nginx config...${NC}"
    scp "$NGINX_CONF" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/deploy/"
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "sudo cp ${REMOTE_DIR}/deploy/nginx.conf /etc/nginx/sites-available/vpp && sudo ln -sf /etc/nginx/sites-available/vpp /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx"
    echo -e "${GREEN}✓ Nginx config deployed${NC}"
fi

# ── Install deps on remote ──
echo -e "${BLUE}▶ Installing dependencies on remote...${NC}"
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_DIR}/frontend && pnpm install --prod"
if [ -d "orchestrator" ]; then
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_DIR}/orchestrator && bun install --production"
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# ── Restart services ──
echo -e "${BLUE}▶ Restarting services...${NC}"
ssh "${REMOTE_USER}@${REMOTE_HOST}" "sudo systemctl restart pocketbase"
echo -e "${GREEN}✓ Services restarted${NC}"

# ── Health check ──
echo -e "${BLUE}▶ Running health check...${NC}"
sleep 3
HTTP_CODE=$(ssh "${REMOTE_USER}@${REMOTE_HOST}" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8090/api/health" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PocketBase healthy (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ PocketBase health check failed (HTTP $HTTP_CODE)${NC}"
    echo -e "${YELLOW}  SSH in and check: sudo systemctl status pocketbase${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deploy complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
