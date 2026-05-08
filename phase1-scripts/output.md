# Phase 1: Dev Scripts, Deployment Scripts, Git Repo

## Status: ✅ COMPLETE

## Files Created

| File | Description |
|------|-------------|
| `package.json` | Root package.json with dev, build, lint, typecheck scripts |
| `scripts/dev.sh` | Dev server launcher — PocketBase + Frontend, signal trap, colored banner |
| `scripts/dev-pb.sh` | PocketBase standalone launcher on :8090 |
| `scripts/dev-frontend.sh` | Frontend dev server (`cd frontend && npm run dev`) |
| `scripts/setup-server.sh` | Ubuntu VPS setup — Node.js, Bun, FFmpeg, chrome-headless-shell, Nginx, PocketBase systemd, Pi CLI, Hyperframes, Cloudflare Tunnel, directories, .env |
| `scripts/deploy.sh` | Deploy script — builds frontend + orchestrator, rsync to remote, PB binary upload, Nginx config deploy, remote npm ci, service restart, health check |
| `scripts/deploy-checklist.md` | Manual first-time deploy checklist |
| `.gitignore` | Ignores node_modules, dist, .env, pb_data, renders, compositions, media, .DS_Store |
| `.env.example` | Template env vars — PB, Orchestrator, Hyperframes, R2, Groq, Cloudflare |

## Scripts — Executable Permissions

All `.sh` files chmod +x: ✅

## Package.json Scripts

| Script | Command |
|--------|---------|
| `npm run dev` | `./scripts/dev.sh` (PB + Frontend) |
| `npm run dev:pb` | `./scripts/dev-pb.sh` (PB only) |
| `npm run dev:frontend` | `cd frontend && npm run dev` |
| `npm run dev:orchestrator` | `cd orchestrator && bun run dev` |
| `npm run build:frontend` | `cd frontend && npm run build` |
| `npm run build:orchestrator` | `cd orchestrator && bun run build` |
| `npm run lint` | `cd frontend && npm run lint` |
| `npm run typecheck` | `cd frontend && npx tsc --noEmit` |

## Deploy Script Usage

```bash
export REMOTE_HOST=your-server-ip
export REMOTE_USER=root        # default
export REMOTE_DIR=/var/www/vpp # default
./scripts/deploy.sh
```

## Server Setup Usage

```bash
ssh root@your-server-ip
./scripts/setup-server.sh
```

## Git Repo

⏳ Not created — handled separately.

## Notes

- `setup-server.sh` prints commands/instructions — does not mutate server directly. Safe to review before running.
- `deploy.sh` requires `rsync`, `ssh`, `scp` on local machine.
- PocketBase binary must be manually downloaded to `./pb/pocketbase`.
- Nginx config expected at `./deploy/nginx.conf` (not created in this phase).
