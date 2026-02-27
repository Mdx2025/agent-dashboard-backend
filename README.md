# MDX Bridge — OpenClaw Dashboard Backend

Lightweight Node.js bridge that runs as a sidecar alongside OpenClaw Gateway. Reads directly from OpenClaw's local files and gateway — zero database required.

## Architecture

```
Browser → nginx (SSL) → MDX Bridge (:3001) → OpenClaw Gateway (:18789)
                              ↓
                      Local files (config, JSONL transcripts, cron)
```

## Data Sources

| Data | Source | Method |
|------|--------|--------|
| Agents | `~/.openclaw/openclaw.json` → `agents.list` | File read |
| Sessions | `~/.openclaw/agents/<id>/sessions/sessions.json` | File read |
| Live Feed | JSONL transcript files via `chokidar` | File watch |
| Cron Jobs | `~/.openclaw/cron/jobs.json` | File read |
| Tasks | `~/.openclaw/mdx/tasks.json` | File read/write |
| Config | `~/.openclaw/openclaw.json` | File read |
| BrainX | `brainx` CLI | CLI exec |
| Artifacts | Agent workspace directories | File scan |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/overview` | Aggregated dashboard stats |
| GET | `/api/agents` | All agents with status, tokens, current task |
| GET | `/api/agents/:id` | Single agent detail |
| GET | `/api/agents/:id/session` | Last 50 lines of agent's active transcript |
| POST | `/api/agents/:id/message` | Send message to agent via chat completions |
| GET | `/api/tasks` | MDX task list (missions) |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/feed` | Last 50 feed events from all agents |
| WS | `/ws/feed` | Real-time feed via WebSocket |
| GET | `/api/cron` | Cron job list |
| POST | `/api/cron` | Create cron job |
| PATCH | `/api/cron/:jobId` | Toggle cron job |
| DELETE | `/api/cron/:jobId` | Delete cron job |
| POST | `/api/cron/:jobId/run` | Run cron job now |
| GET | `/api/connections` | AI providers + channels + automation |
| GET | `/api/artifacts` | Files from agent workspaces |
| GET | `/api/sessions` | All sessions across all agents |
| GET | `/api/opportunities` | MDX opportunities |
| GET | `/api/config` | OpenClaw config (redacted) |
| PATCH | `/api/config` | Patch OpenClaw config |
| GET | `/api/brainx/health` | BrainX status |
| GET | `/api/brainx/stats` | BrainX statistics |
| GET | `/api/brainx/memories` | Search memories |
| POST | `/api/brainx/search` | Semantic memory search |
| POST | `/api/brainx/inject` | Inject memories into prompt |

## Quick Start

```bash
npm install
node server.js
# Bridge runs on port 3001
```

## Deployment

### systemd (recommended)

```ini
[Unit]
Description=MDX Bridge - OpenClaw Dashboard Sidecar
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/clawd/mdx-bridge
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
Environment=PORT=3001

[Install]
WantedBy=default.target
```

```bash
# Install as user service
cp mdx-bridge.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now mdx-bridge
```

### nginx reverse proxy

```nginx
location /control/ws/ {
    proxy_pass http://127.0.0.1:3001/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}

location /control/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `HOME` | System HOME | Used to locate `~/.openclaw/` |

## Requirements

- Node.js 20+
- OpenClaw Gateway running on same machine
- Must run on same host as OpenClaw (reads local files)

## Tech Stack

- Express 4 + cors
- ws (WebSocket)
- chokidar (file watching for live feed)
- uuid (task IDs)
- Zero database — reads directly from OpenClaw files
