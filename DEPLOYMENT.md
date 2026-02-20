# Deployment Guide - Agent Dashboard

## 🚀 Deploy en Railway

### Arquitectura de Servicios

```
┌─────────────────────────────────────────┐
│         Railway Project                  │
│      "Agent dashboard Clw"               │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │   Frontend   │  │   Backend    │   │
│  │  (React +    │  │  (Fastify)   │   │
│  │   Vite)      │  │              │   │
│  └──────────────┘  └──────────────┘   │
│         │                  │           │
│         │                  │           │
│  ┌──────▼──────────────────▼──────┐   │
│  │      Postgres-1_5m             │   │
│  │      (PostgreSQL)              │   │
│  └────────────────────────────────┘   │
│                  │                      │
│         ┌────────▼────────┐           │
│         │      Redis      │           │
│         └─────────────────┘           │
│                                         │
└─────────────────────────────────────────┘
```

### Servicios (4 activos)

1. **agent-dashboard** (Frontend)
   - URL: https://agent-dashboard-production-b3a8.up.railway.app
   - Runtime: Node.js 22.22.0
   - Build: `npm run build`
   - Start: `node server.js`

2. **agent-dashboard-backend** (Backend API)
   - URL: https://agent-dashboard-backend-production.up.railway.app
   - Runtime: Node.js 22.22.0
   - Build: `npm run build`
   - Start: `npm run start:prod`

3. **Postgres-1_5m** (Database)
   - PostgreSQL 15
   - Conectado al backend via DATABASE_URL

4. **Redis** (Cache)
   - Redis 7
   - Conectado al backend via REDIS_URL

### Variables de Entorno

#### Frontend (agent-dashboard)
```bash
VITE_API_BASE_URL=https://agent-dashboard-backend-production.up.railway.app/api
```

#### Backend (agent-dashboard-backend)
```bash
DATABASE_URL=postgresql://postgres:***@postgres-15m.railway.internal:5432/railway
REDIS_URL=redis://default:***@redis.railway.internal:6379
```

## 🔄 Proceso de Deploy

### Deploy Automático

Railway detecta cambios en GitHub y hace deploy automático:

1. Push a GitHub:
   ```bash
   git add .
   git commit -m "Update documentation"
   git push origin main
   ```

2. Railway detecta el push
3. Ejecuta build automáticamente
4. Deploy sin downtime

### Deploy Manual

Si necesitas forzar redeploy:

```bash
# Via Railway CLI
railway redeploy -s agent-dashboard
railway redeploy -s agent-dashboard-backend
```

## 🗄️ Base de Datos

### Schema Principal

**Agents:**
- id, name, type, status
- model, provider, description
- runs24h, tokensIn24h, tokensOut24h, costDay
- latencyAvg, latencyP95, contextAvgPct

**Sessions:**
- id, status, startedAt, lastSeenAt
- tokens24h, model, agentName

**Runs:**
- id, source, label, status
- startedAt, duration, model
- contextPct, tokensIn, tokensOut

**Skills:**
- id, name, version, category
- enabled, status, description
- usage24h, latencyAvg, latencyP95, errorRate

**Services:**
- id, name, status
- host, port, latencyMs
- cpuPct, memPct, version

### Migraciones

```bash
# Aplicar migraciones
cd backend
npx prisma migrate deploy

# Reset DB (cuidado!)
npx prisma migrate reset --force
```

## 📊 Monitoreo

### Health Checks

**Backend:**
```bash
curl https://agent-dashboard-backend-production.up.railway.app/api/health
# {"status":"ok","timestamp":1234567890,"db":"connected"}
```

**Frontend:**
```bash
curl https://agent-dashboard-production-b3a8.up.railway.app
# Debe retornar HTML del dashboard
```

### Endpoints API

- `GET /api/agents` - Lista de agentes
- `GET /api/sessions` - Sesiones activas
- `GET /api/runs` - Runs históricos
- `GET /api/skills` - Skills disponibles
- `GET /api/services` - Estado de servicios
- `GET /api/logs` - Logs del sistema

### Logs

```bash
# Ver logs en tiempo real
railway logs -s agent-dashboard
railway logs -s agent-dashboard-backend
```

## 🔧 Troubleshooting

### Frontend no muestra datos

1. Verificar variable `VITE_API_BASE_URL`
2. Verificar que backend responde: `/api/health`
3. Revisar CORS en backend
4. Forzar rebuild del frontend

### Backend no conecta a DB

1. Verificar `DATABASE_URL` apunta a Postgres-1_5m
2. Verificar que Postgres-1_5m está online
3. Revisar logs: `railway logs -s agent-dashboard-backend`

### Skills vacías

1. Verificar endpoint `/api/skills`
2. Sincronizar manualmente con `/api/sync`
3. Verificar que DB tiene datos

## 🔐 Seguridad

### Consideraciones

- ✅ Variables sensibles en Railway (no en código)
- ✅ CORS configurado en backend
- ⚠️ Sin autenticación aún (agregar en producción)
- ⚠️ Logs públicos (agregar filtro de sensibilidad)

### Próximos pasos de seguridad

- [ ] Agregar autenticación (JWT)
- [ ] Rate limiting en API
- [ ] HTTPS everywhere (ya en Railway)
- [ ] Sanitización de inputs

## 💰 Costos

**Railway Trial:**
- $5/mes gratis
- Sin excedentes con 4 servicios
- Uso estimado: ~$3-4/mes

**Optimización:**
- Eliminar Postgres duplicado ✅
- Usar Redis solo para cache crítico
- Logs con retención limitada

## 📝 Checklist Pre-Deploy

- [ ] Variables de entorno configuradas
- [ ] Migraciones de DB aplicadas
- [ ] Tests pasando
- [ ] Build sin errores
- [ ] Health checks funcionando
- [ ] Documentación actualizada

## 🚀 Checklist Post-Deploy

- [ ] Verificar URLs accesibles
- [ ] Health checks respondiendo
- [ ] Datos sincronizados
- [ ] Logs sin errores críticos
- [ ] Notion actualizado con URLs

---

**Última actualización:** 2026-02-20
**Deploy status:** ✅ Producción activa
