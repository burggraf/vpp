#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║${NC}  ${GREEN}VPP Server Setup — Ubuntu VPS${NC}                 ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Prerequisites check ──
echo -e "${BLUE}[0/12]${NC} Checking prerequisites..."
for cmd in bun pnpm node; do
    if command -v $cmd &>/dev/null; then
        echo "  ✓ $cmd: $($cmd --version 2>/dev/null || echo 'ok')"
    else
        echo -e "${RED}  ✗ $cmd not found — install before continuing${NC}"
        exit 1
    fi
done
echo "  ✓ Prerequisites met"

# ── System packages ──
echo -e "${BLUE}[1/12]${NC} Installing system packages..."
echo "  sudo apt update && sudo apt install -y curl git nginx ffmpeg unzip"
echo "  ✓ System packages"

# ── Node.js (LTS via NodeSource) ──
echo -e "${BLUE}[2/12]${NC} Installing Node.js LTS..."
echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -"
echo "  sudo apt install -y nodejs"
echo "  node --version  # expect v22.x"
echo "  ✓ Node.js installed"

# ── pnpm ──
echo -e "${BLUE}[3/12]${NC} Installing pnpm..."
echo "  npm install -g pnpm"
echo "  pnpm --version"
echo "  ✓ pnpm installed"

# ── Bun ──
echo -e "${BLUE}[4/12]${NC} Installing Bun..."
echo "  curl -fsSL https://bun.sh/install | bash"
echo "  source ~/.bashrc  # or ~/.zshrc"
echo "  bun --version"
echo "  ✓ Bun installed"

# ── Chrome Headless Shell (for Hyperframes) ──
echo -e "${BLUE}[5/12]${NC} Installing chrome-headless-shell..."
echo "  bunx @anthropic-ai/hyperframes install chrome"
echo "  # Or manually:"
echo "  # Download chrome-headless-shell binary to ~/.cache/hyperframes/"
echo "  ✓ chrome-headless-shell ready"

# ── PocketBase systemd service ──
echo -e "${BLUE}[6/12]${NC} Setting up PocketBase systemd service..."
echo "  # 1. Copy pocketbase binary:"
echo "  sudo cp ./pb/pocketbase /usr/local/bin/pocketbase"
echo "  sudo chmod +x /usr/local/bin/pocketbase"
echo ""
echo "  # 2. Create service:"
cat << 'EOF'
  sudo tee /etc/systemd/system/pocketbase.service > /dev/null << 'UNIT'
  [Unit]
  Description=PocketBase
  After=network.target

  [Service]
  Type=simple
  User=www-data
  WorkingDirectory=/var/www/vpp/pb
  ExecStart=/usr/local/bin/pocketbase serve --http=127.0.0.1:8090
  Restart=always
  RestartSec=5

  [Install]
  WantedBy=multi-user.target
  UNIT
EOF
echo ""
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable pocketbase"
echo "  sudo systemctl start pocketbase"
echo "  sudo systemctl status pocketbase"
echo "  ✓ PocketBase service configured"

# ── Nginx config ──
echo -e "${BLUE}[7/12]${NC} Installing Nginx config..."
echo "  # Copy nginx config from deploy/nginx.conf (adjust paths):"
echo "  sudo cp ./deploy/nginx.conf /etc/nginx/sites-available/vpp"
echo "  sudo ln -sf /etc/nginx/sites-available/vpp /etc/nginx/sites-enabled/"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
echo "  ✓ Nginx configured"

# ── Directory structure ──
echo -e "${BLUE}[8/12]${NC} Creating directories..."
echo "  mkdir -p /var/www/vpp/{pb,frontend,orchestrator,renders,compositions}"
echo "  sudo chown -R www-data:www-data /var/www/vpp"
echo "  ✓ Directories created"

# ── .env files ──
echo -e "${BLUE}[9/12]${NC} Creating .env files..."
echo "  # Root .env:"
echo "  cp .env.example /var/www/vpp/.env"
echo "  nano /var/www/vpp/.env"
echo ""
echo "  # Orchestrator .env (copy from root or create):"
echo "  cp /var/www/vpp/.env /var/www/vpp/orchestrator/.env"
echo "  # Verify ORCHESTRATOR_PORT=3001 is set"
echo "  ✓ .env files created"

# ── Orchestrator systemd service ──
echo -e "${BLUE}[10/12]${NC} Setting up Orchestrator systemd service..."
cat << 'EOF'
  sudo tee /etc/systemd/system/vpp-orchestrator.service > /dev/null << 'UNIT'
  [Unit]
  Description=VPP Orchestrator
  After=network.target pocketbase.service
  Wants=pocketbase.service

  [Service]
  Type=simple
  User=www-data
  WorkingDirectory=/var/www/vpp/orchestrator
  ExecStart=/home/www-data/.bun/bin/bun run start
  Restart=always
  RestartSec=5
  EnvironmentFile=/var/www/vpp/orchestrator/.env

  [Install]
  WantedBy=multi-user.target
  UNIT
EOF
echo ""
echo "  # Note: Adjust ExecStart path to where bun is installed"
echo "  # If bun is in /usr/local/bin, use that instead"
echo ""
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable vpp-orchestrator"
echo "  sudo systemctl start vpp-orchestrator"
echo "  sudo systemctl status vpp-orchestrator"
echo "  ✓ Orchestrator service configured"

# ── Pi CLI + Hyperframes ──
echo -e "${BLUE}[11/12]${NC} Installing Pi CLI + Hyperframes..."
echo "  pnpm add -g @anthropic-ai/pi-cli"
echo "  pi --version"
echo ""
echo "  cd /var/www/vpp"
echo "  pnpm add @anthropic-ai/hyperframes"
echo "  # Test TTS:"
echo "  echo 'Hello world' | npx hyperframes tts --output test.wav"
echo "  ✓ Pi + Hyperframes installed"

# ── Cloudflare Tunnel (optional) ──
echo -e "${BLUE}[12/12]${NC} Cloudflare Tunnel (optional)..."
echo "  # Install cloudflared:"
echo "  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared"
echo "  sudo chmod +x /usr/local/bin/cloudflared"
echo ""
echo "  # Login and create tunnel:"
echo "  cloudflared tunnel login"
echo "  cloudflared tunnel create vpp-tunnel"
echo ""
echo "  # Create config ~/.cloudflared/config.yml:"
cat << 'EOF'
  tunnel: <TUNNEL-ID>
  credentials-file: /root/.cloudflared/<TUNNEL-ID>.json
  ingress:
    - hostname: vpp.yourdomain.com
      service: http://localhost:80
    - service: http_status:404
EOF
echo ""
echo "  cloudflared tunnel route dns vpp-tunnel vpp.yourdomain.com"
echo "  sudo tee /etc/systemd/system/cloudflared.service > /dev/null << 'UNIT'"
cat << 'EOF'
  [Unit]
  Description=Cloudflare Tunnel
  After=network.target

  [Service]
  Type=simple
  ExecStart=/usr/local/bin/cloudflared tunnel run vpp-tunnel
  Restart=always
  RestartSec=5

  [Install]
  WantedBy=multi-user.target
  UNIT
EOF
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable --now cloudflared"
echo "  ✓ Cloudflare Tunnel configured"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Server setup complete!${NC}"
echo -e "${GREEN}  Next: git pull && pnpm install && run deploy.sh${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
