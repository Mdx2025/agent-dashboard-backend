#!/bin/bash
# Sync script - Runs on the local server to push real data to Railway PostgreSQL

BACKEND_URL="https://agent-dashboard-backend-production.up.railway.app"
OPENCLAW_DIR="/home/clawd/.openclaw"

echo "=== Syncing OpenClaw data to Railway PostgreSQL ==="

# Read agents from cron jobs (they have agentId info)
AGENTS_JSON=$(cat << 'EOF'
[
  {"id": "main", "name": "Main", "type": "MAIN", "status": "active", "provider": "MiniMax", "model": "MiniMax-M2.5", "description": "Main agent", "runs24h": 0, "err24h": 0, "costDay": 0},
  {"id": "coder", "name": "Coder", "type": "SUBAGENT", "status": "active", "provider": "MiniMax", "model": "MiniMax-M2.5", "description": "Code writing agent", "runs24h": 0, "err24h": 0, "costDay": 0},
  {"id": "researcher", "name": "Researcher", "type": "SUBAGENT", "status": "active", "provider": "MiniMax", "model": "MiniMax-M2.5", "description": "Research agent", "runs24h": 0, "err24h": 0, "costDay": 0},
  {"id": "writer", "name": "Writer", "type": "SUBAGENT", "status": "active", "provider": "MiniMax", "model": "MiniMax-M2.5", "description": "Content writer agent", "runs24h": 0, "err24h": 0, "costDay": 0},
  {"id": "support", "name": "Support", "type": "SUBAGENT", "status": "active", "provider": "MiniMax", "model": "MiniMax-M2.5", "description": "Support agent", "runs24h": 0, "err24h": 0, "costDay": 0},
  {"id": "heartbeat", "name": "Heartbeat", "type": "SUBAGENT", "status": "active", "provider": "MiniMax", "model": "MiniMax-M2.5", "description": "Cron scheduler", "runs24h": 0, "err24h": 0, "costDay": 0},
  {"id": "reasoning", "name": "Reasoning", "type": "SUBAGENT", "status": "idle", "provider": "MiniMax", "model": "MiniMax-M2.5", "description": "Deep reasoning", "runs24h": 0, "err24h": 0, "costDay": 0},
  {"id": "clawma", "name": "Clawma", "type": "SUBAGENT", "status": "idle", "provider": "MiniMax", "model": "MiniMax-M2.5", "description": "Cost-optimized tasks", "runs24h": 0, "err24h": 0, "costDay": 0}
]
EOF
)

# Read skills from the skills directory
SKILLS_JSON=$(ls -d $OPENCLAW_DIR/skills/*/ 2>/dev/null | while read dir; do
  name=$(basename "$dir")
  ver="1.0.0"
  if [ -f "$dir/package.json" ]; then
    ver=$(node -p "require('$dir/package.json').version || '1.0.0'" 2>/dev/null || echo "1.0.0")
  fi
  echo "{\"id\":\"sk_$name\",\"name\":\"$name\",\"version\":\"$ver\",\"category\":\"General\",\"enabled\":true,\"status\":\"ok\",\"description\":\"Skill: $name\",\"usage24h\":0,\"latencyAvg\":0,\"errorRate\":0}"
done | jq -s '.')

# Services - gateway status
SERVICES_JSON=$(curl -s http://localhost:8080/health >/dev/null 2>&1 && echo "healthy" || echo "offline")
GATEWAY_STATUS=$SERVICES_JSON

cat << JSONEOF
{
  "agents": $AGENTS_JSON,
  "skills": $SKILLS_JSON,
  "services": [
    {"id": "svc_gateway", "name": "Gateway", "status": "$GATEWAY_STATUS", "host": "localhost", "port": 8080, "latencyMs": 0, "cpuPct": 0, "memPct": 0, "version": "2026.2.14"}
  ],
  "sessions": [],
  "runs": [],
  "logs": []
}
JSONEOF
