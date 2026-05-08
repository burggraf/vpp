# VPP Deploy Checklist

## First-Time Server Setup

### 1. Provision VPS
- [ ] Ubuntu 22.04+ VPS provisioned
- [ ] SSH access configured
- [ ] Firewall allows ports 80, 443, 22

### 2. Run Setup Script
```bash
ssh root@your-server-ip
./scripts/setup-server.sh
```

### 3. PocketBase Setup
- [ ] PocketBase binary downloaded from https://pocketbase.io/docs/
- [ ] Binary placed in `./pb/pocketbase`
- [ ] Admin account created at `http://server-ip:8090/_/`
- [ ] Collections created (schemas)
- [ ] `pb/pb_data` copied to server if migrating

### 4. Environment
- [ ] `.env` file created on server at `/var/www/vpp/.env`
- [ ] Production values set (PB_URL, R2 credentials, GROQ_API_KEY, etc.)
- [ ] `REMOTE_HOST`, `REMOTE_USER`, `REMOTE_DIR` set locally or in CI

### 5. Nginx & DNS
- [ ] Domain DNS points to server IP
- [ ] Nginx config deployed: `sudo nginx -t && sudo systemctl reload nginx`
- [ ] SSL certificate configured (Let's Encrypt / Cloudflare)

### 6. Cloudflare Tunnel (if using)
- [ ] `cloudflared` installed and logged in
- [ ] Tunnel created and DNS routed
- [ ] Service enabled: `sudo systemctl enable --now cloudflared`

### 7. Initial Deploy
```bash
export REMOTE_HOST=your-server-ip
export REMOTE_USER=root
export REMOTE_DIR=/var/www/vpp
./scripts/deploy.sh
```

### 8. Post-Deploy Verification
- [ ] Frontend loads at domain
- [ ] PocketBase admin accessible
- [ ] API health: `curl http://server-ip:8090/api/health`
- [ ] Nginx proxying correctly
- [ ] HTTPS working (if configured)
