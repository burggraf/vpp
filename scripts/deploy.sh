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
    echo -e "${RED}✗ Orchestrator directory missing${NC}"
    exit 1
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
    --exclude 'orchestrator/node_modules' \
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
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_DIR}/orchestrator && bun install --production"
echo -e "${GREEN}✓ Dependencies installed${NC}"

# ── Deploy orchestrator systemd service ──
echo -e "${BLUE}▶ Deploying orchestrator service...${NC}"
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cat > /tmp/vpp-orchestrator.service << 'UNIT'
[Unit]
Description=VPP Orchestrator
After=network.target pocketbase.service
Wants=pocketbase.service

[Service]
Type=simple
User=www-data
WorkingDirectory=${REMOTE_DIR}/orchestrator
ExecStart=$(ssh \"${REMOTE_USER}@${REMOTE_HOST}\" \"which bun 2>/dev/null || echo /root/.bun/bin/bun\") run start
Restart=always
RestartSec=5
EnvironmentFile=${REMOTE_DIR}/orchestrator/.env

[Install]
WantedBy=multi-user.target
UNIT"
ssh "${REMOTE_USER}@${REMOTE_HOST}" "sudo mv /tmp/vpp-orchestrator.service /etc/systemd/system/vpp-orchestrator.service && sudo systemctl daemon-reload && sudo systemctl enable vpp-orchestrator && sudo systemctl restart vpp-orchestrator"
echo -e "${GREEN}✓ Orchestrator service deployed${NC}"

# ── Restart services ──
echo -e "${BLUE}▶ Restarting services...${NC}"
ssh "${REMOTE_USER}@${REMOTE_HOST}" "sudo systemctl restart pocketbase"
echo -e "${GREEN}✓ PocketBase restarted${NC}"

# ── Health checks ──
echo -e "${BLUE}▶ Running health checks...${NC}"
sleep 3

# PocketBase
PB_CODE=$(ssh "${REMOTE_USER}@${REMOTE_HOST}" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8090/api/health" 2>/dev/null || echo "000")
if [ "$PB_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PocketBase healthy (HTTP $PB_CODE)${NC}"
else
    echo -e "${RED}✗ PocketBase health check failed (HTTP $PB_CODE)${NC}"
    echo -e "${YELLOW}  SSH in and check: sudo systemctl status pocketbase${NC}"
    exit 1
fi

# Orchestrator
ORCH_CODE=$(ssh "${REMOTE_USER}@${REMOTE_HOST}" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/health" 2>/dev/null || echo "000")
if [ "$ORCH_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Orchestrator healthy (HTTP $ORCH_CODE)${NC}"
else
    echo -e "${RED}✗ Orchestrator health check failed (HTTP $ORCH_CODE)${NC}"
    echo -e "${YELLOW}  SSH in and check: sudo systemctl status vpp-orchestrator${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deploy complete!${NC}"
echo -e "${GREEN}  PocketBase : http://127.0.0.1:8090${NC}"
echo -e "${GREEN}  Orchestrator: http://127.0.0.1:3001${NC}"
echo -e "${GREEN}  Frontend   : via Nginx${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
