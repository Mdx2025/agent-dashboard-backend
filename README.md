# Agent Operations Dashboard

Dashboard en tiempo real para monitoreo y gestión de agentes de IA.

## 🚀 Deploy

**Producción:**
- **Frontend:** https://agent-dashboard-production-b3a8.up.railway.app
- **Backend:** https://agent-dashboard-backend-production.up.railway.app/api

**Railway Project:** "Agent dashboard Clw"

## 📊 Funcionalidades

### Overview
- Sessions activas y métricas en tiempo real
- Tokens in/out (24h)
- Costos diarios
- Agents listados con status
- Recent Runs con duración y estado

### Token Usage
- Breakdown por modelo
- Histórico de uso de tokens
- Costos por período

### Agents
- Lista de todos los agentes (8 configurados)
- Runs, errores, costo, latencia
- Filtros por status
- Detalle de agente (Drawer)

### Skills
- 29 skills de OpenClaw sincronizadas
- Paginación (12 por página)
- Búsqueda por nombre
- Categorías: productivity, development, content, utilities, communication
- Métricas de uso y latencia

### Health
- Estado de servicios (Redis, Postgres, Backend, Frontend)
- Gateway status
- Métricas de latencia
- CPU y memoria

### Logs
- Logs del sistema
- Filtrado por nivel

## 🎨 UI/UX

### Sistema de Diseño

**Tipografía:**
- Headers: 20-22px, font-weight 700
- Subtítulos: 12px
- KPI values: 28-32px
- Labels: uppercase, letter-spacing 0.5px

**Spacing:**
- Container padding: 18-22px
- Grid gap: 12-20px
- Card padding: 14-18px

**Componentes:**
- Cards con hover effects
- Zebra striping en tablas
- Badges de status (active/idle/error)
- Paginación y búsqueda

## 🔄 Sincronización

### Cron Job
El sync corre automáticamente cada 5 minutos:

```bash
# Crontab
*/5 * * * * /usr/bin/node /tmp/agent-dashboard-backend-impl/scripts/sync-real.js
```

### Script de Sync
- **Ubicación:** `/tmp/agent-dashboard-backend-impl/scripts/sync-real.js`
- **Agentes sincronizados:** clawma, coder, heartbeat, main, reasoning, researcher, support, writer
- **Runs:** Últimos 200 (7 días)
- **Sesiones:** Últimas 100
- **Log:** `/tmp/sync-real.log`

### Endpoint Manual
```bash
curl -X POST https://agent-dashboard-backend-production.up.railway.app/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "agents": [...],
    "sessions": [...],
    "runs": [...],
    "skills": [...]
  }'
```

## 🏗️ Arquitectura

```
┌─────────────────┐
│   OpenClaw      │
│  (Data Source)  │
└────────┬────────┘
         │
         │ Sync Script (cada 5 min)
         ↓
┌─────────────────┐
│ Backend API     │
│ (Fastify)       │
│                 │
│ /api/agents     │
│ /api/sessions   │
│ /api/runs       │
│ /api/skills     │
│ /api/logs       │
│ /api/services   │
│ /api/health     │
└────────┬────────┘
         │
         │ PostgreSQL + Redis
         ↓
┌─────────────────┐
│ Frontend        │
│ (React + Vite)  │
│                 │
│ - Overview      │
│ - Token Usage   │
│ - Agents        │
│ - Skills        │
│ - Health        │
│ - Logs          │
└─────────────────┘
```

## 🔧 Tecnologías

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Node.js (Express server)

**Backend:**
- Fastify
- Prisma ORM
- PostgreSQL (Railway)
- Redis (Railway)

**Deploy:**
- Railway.app
- GitHub integration (auto-deploy)

## 📝 Variables de Entorno

### Frontend (.env)
```bash
VITE_API_BASE_URL=https://agent-dashboard-backend-production.up.railway.app/api
```

### Backend (.env)
```bash
DATABASE_URL=postgresql://...@postgres-15m.railway.internal:5432/railway
REDIS_URL=redis://...@redis.railway.internal:6379
```

## 🚧 Estado del Proyecto

**✅ Funcional:**
- Frontend desplegado y accesible
- Backend API funcionando
- 8 agents configurados
- 29 skills sincronizadas
- Sync automático cada 5 minutos
- UI/UX estandarizado

**⏳ En desarrollo:**
- Logs endpoint
- Conexión en tiempo real con OpenClaw
- Métricas automáticas

**📋 Próximos pasos:**
- [ ] Implementar websockets para updates en vivo
- [ ] Agregar autenticación
- [ ] Dashboard de métricas avanzadas

## 📚 Repositorios

- **Frontend:** https://github.com/Mdx2025/agent-dashboard
- **Backend:** https://github.com/Mdx2025/agent-dashboard-backend

## 📖 Documentación

- **Dashboard:** https://agent-dashboard-production-b3a8.up.railway.app
- **Backend API:** https://agent-dashboard-backend-production.up.railway.app/api

---

**Última actualización:** 2026-02-25
**Estado:** ✅ Producción activa
