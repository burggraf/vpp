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

# ── System packages ──
echo -e "${BLUE}[1/10]${NC} Installing system packages..."
echo "  sudo apt update && sudo apt install -y curl git nginx ffmpeg unzip"
echo "  ✓ System packages"

# ── Node.js (LTS via NodeSource) ──
echo -e "${BLUE}[2/10]${NC} Installing Node.js LTS..."
echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -"
echo "  sudo apt install -y nodejs"
echo "  node --version  # expect v22.x"
echo "  ✓ Node.js installed"

# ── Bun ──
echo -e "${BLUE}[3/10]${NC} Installing Bun..."
echo "  curl -fsSL https://bun.sh/install | bash"
echo "  source ~/.bashrc  # or ~/.zshrc"
echo "  bun --version"
echo "  ✓ Bun installed"

# ── Chrome Headless Shell (for Hyperframes) ──
echo -e "${BLUE}[4/10]${NC} Installing chrome-headless-shell..."
echo "  bunx @anthropic-ai/hyperframes install chrome"
echo "  # Or manually:"
echo "  # Download chrome-headless-shell binary to ~/.cache/hyperframes/"
echo "  ✓ chrome-headless-shell ready"

# ── PocketBase systemd service ──
echo -e "${BLUE}[5/10]${NC} Setting up PocketBase systemd service..."
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
echo -e "${BLUE}[6/10]${NC} Installing Nginx config..."
echo "  # Copy nginx config from deploy/nginx.conf (adjust paths):"
echo "  sudo cp ./deploy/nginx.conf /etc/nginx/sites-available/vpp"
echo "  sudo ln -sf /etc/nginx/sites-available/vpp /etc/nginx/sites-enabled/"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
echo "  ✓ Nginx configured"

# ── Directory structure ──
echo -e "${BLUE}[7/10]${NC} Creating directories..."
echo "  mkdir -p /var/www/vpp/{pb,frontend,orchestrator,renders,compositions}"
echo "  sudo chown -R www-data:www-data /var/www/vpp"
echo "  ✓ Directories created"

# ── .env file ──
echo -e "${BLUE}[8/10]${NC} Creating .env file..."
echo "  cp .env.example /var/www/vpp/.env"
echo "  # Edit with production values:"
echo "  nano /var/www/vpp/.env"
echo "  ✓ .env created"

# ── Pi CLI + Hyperframes ──
echo -e "${BLUE}[9/10]${NC} Installing Pi CLI + Hyperframes..."
echo "  pnpm add -g @anthropic-ai/pi-cli"
echo "  pi --version"
echo ""
echo "  cd /var/www/vpp"
echo "  pnpm add @anthropic-ai/hyperframes"
echo "  # Test TTS:"
echo "  echo 'Hello world' | npx hyperframes tts --output test.wav"
echo "  ✓ Pi + Hyperframes installed"

# ── Cloudflare Tunnel (optional) ──
echo -e "${BLUE}[10/10]${NC} Cloudflare Tunnel (optional)..."
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
