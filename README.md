# Agent Dashboard Backend

Backend API para el Agent Operations Dashboard.

## 🚀 Producción

**URL:** https://agent-dashboard-backend-production.up.railway.app/api

**Endpoints:**
- `GET /api/health` - Health check
- `GET /api/agents` - Lista de agentes
- `GET /api/sessions` - Sesiones activas
- `GET /api/runs` - Runs históricos
- `GET /api/skills` - Skills disponibles
- `GET /api/services` - Estado de servicios
- `GET /api/logs` - Logs del sistema
- `POST /api/sync` - Sincronizar datos

## 🔄 Sincronización Automática

### Cron Job
El sync corre automáticamente cada 5 minutos via crontab:

```bash
# Crontab (verificar con: crontab -l)
*/5 * * * * /usr/bin/node /tmp/agent-dashboard-backend-impl/scripts/sync-real.js >> /tmp/sync-real.log 2>&1
```

### Script de Sync
- **Ubicación:** `/tmp/agent-dashboard-backend-impl/scripts/sync-real.js`
- **Logs:** `/tmp/sync-real.log`

### Agentes Sincronizados (REAL_AGENTS)
Solo estos agentes se sincronizan:
- `clawma`, `coder`, `heartbeat`, `main`
- `reasoning`, `researcher`, `support`, `writer`

### Datos Sincronizados
- **Runs:** Últimos 200 (7 días de historial)
- **Sesiones:** Últimas 100
- **Agents:** Los 8 agentes reales

### Formato de Skills
```json
{
  "id": "brainx-v3",
  "name": "BrainX V3",
  "version": "3.0.0",
  "category": "productivity",
  "enabled": true,
  "status": "ok",  // "ok", "warn", o "error"
  "description": "Vector memory",
  "usage24h": 45,
  "latencyAvg": 85,
  "latencyP95": 150,
  "errorRate": 0.02,
  "config": {},
  "dependencies": [],
  "changelog": []
}
```

## 🏗️ Arquitectura

```
┌─────────────────┐
│   Fastify       │
│   Server        │
├─────────────────┤
│ - REST API      │
│ - CORS enabled  │
│ - Static files  │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ Prisma   │
    │   ORM    │
    └────┬─────┘
         │
    ┌────▼─────────┐
    │ PostgreSQL   │
    │ (Railway)    │
    └──────────────┘
```

## 🔧 Tecnologías

- **Fastify** - Web framework
- **Prisma** - ORM
- **PostgreSQL** - Database
- **Redis** - Cache
- **TypeScript** - Type safety

## 📊 Modelo de Datos

### Agent
```typescript
{
  id: string
  name: string
  type: "MAIN" | "SUBAGENT"
  status: "active" | "idle" | "error" | "offline"
  model: string
  provider: string
  runs24h: number
  tokensIn24h: number
  tokensOut24h: number
  costDay: number
  latencyAvg: number
  uptime: number
}
```

### Session
```typescript
{
  id: string
  status: "active" | "idle" | "closed"
  startedAt: Date
  lastSeenAt: Date
  tokens24h: number
  model: string
  agentName: string
}
```

### Run
```typescript
{
  id: string
  source: string
  label: string
  status: "completed" | "failed" | "running"
  startedAt: Date
  duration: number
  model: string
  tokensIn: number
  tokensOut: number
}
```

### Skill
```typescript
{
  id: string
  name: string
  version: string
  category: string
  enabled: boolean
  status: "ok" | "warn" | "error"
  usage24h: number
  latencyAvg: number
  errorRate: number
}
```

## 🗄️ Base de Datos

### Migraciones

```bash
# Desarrollo
npx prisma migrate dev

# Producción
npx prisma migrate deploy
```

### Reset

```bash
# Cuidado: borra todos los datos
npx prisma migrate reset --force
```

## 🚀 Deploy

### Railway

1. Conectar repositorio de GitHub
2. Configurar variables de entorno
3. Deploy automático en cada push a main

### Variables de Entorno

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

## 📝 Scripts

### sync-real.js

Script principal para sincronizar datos de OpenClaw:

```bash
cd /tmp/agent-dashboard-backend-impl/scripts
node sync-real.js
```

Lee datos de `/home/clawd/.openclaw/agents` y los sincroniza con el backend.

## 🔧 Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo con hot reload
npm run dev

# Build para producción
npm run build

# Iniciar en producción
npm run start:prod
```

## 📊 Estado Actual

**✅ Funcional:**
- 8 agentes configurados
- 29 skills sincronizadas
- Sync automático cada 5 minutos
- Health check funcionando
- API endpoints operativos

**⏳ En desarrollo:**
- Logs endpoint
- Conexión en tiempo real con OpenClaw
- Redis caching

## 📚 Repositorios Relacionados

- **Frontend:** https://github.com/Mdx2025/agent-dashboard
- **Backend:** https://github.com/Mdx2025/agent-dashboard-backend

---

**Última actualización:** 2026-02-25
**Estado:** ✅ Producción activa
