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

### Sessions
- Lista de sesiones activas/idle
- Tokens por sesión
- Modelo y agente asociado

### Runs
- Historial de ejecuciones
- Duración y contexto
- Tokens consumidos

### Skills
- 29 skills de OpenClaw sincronizadas
- Categorías: productivity, development, content, utilities, communication
- Métricas de uso y latencia

### Health
- Estado de servicios (Redis, Postgres, Backend, Frontend)
- Métricas de latencia
- CPU y memoria

### Logs
- Logs del sistema (en desarrollo)

## 🏗️ Arquitectura

```
┌─────────────────┐
│   OpenClaw      │
│  (Data Source)  │
└────────┬────────┘
         │
         │ Sync Script
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
└────────┬────────┘
         │
         │ PostgreSQL + Redis
         ↓
┌─────────────────┐
│ Frontend        │
│ (React + Vite)  │
│                 │
│ - Overview      │
│ - Sessions      │
│ - Skills        │
│ - Logs          │
│ - Health        │
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

## 🔄 Sincronización

El backend tiene un endpoint de sync para poblar datos:

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

Ver `backend/scripts/sync.js` para implementación completa.

## 🚧 Estado del Proyecto

**✅ Funcional:**
- Frontend desplegado y accesible
- Backend API funcionando
- 8 agents configurados
- 29 skills sincronizadas
- 5 sessions activas
- 3 runs históricos

**⏳ En desarrollo:**
- Logs endpoint
- Conexión en tiempo real con OpenClaw
- Métricas automáticas

**📋 Próximos pasos:**
- [ ] Implementar logs reales
- [ ] Conectar con OpenClaw en tiempo real
- [ ] Agregar autenticación
- [ ] Implementar websockets para updates en vivo

## 📚 Repositorios

- **Frontend:** https://github.com/Mdx2025/agent-dashboard
- **Backend:** https://github.com/Mdx2025/agent-dashboard-backend

## 📖 Notion

Documentación completa: [Agent Dashboard - Notion](https://www.notion.so/Agent-Dashboard-30d9d39579248091a322f86216b6b894)

---

**Última actualización:** 2026-02-20
**Estado:** ✅ Producción activa
