# MDX Control - Deploy en Railway

## 🚀 Estado Actual

| Componente | URL | Estado |
|------------|-----|--------|
| **Backend** | https://agent-dashboard-backend-production.up.railway.app | ✅ Online |
| **Frontend** | Pendiente crear servicio | ⏳ Configurado |

## 📁 Repositorios

- **Frontend**: https://github.com/Mdx2025/mdx-control
- **Backend**: https://github.com/Mdx2025/mdx-control-backend

## 🔧 Configuración Frontend para Railway

Ya creada:
- `package.json` - Dependencias Express
- `server.js` - Servidor estático
- `Dockerfile` - Container config
- `railway.json` - Railway config

## 🚀 Crear Servicio Frontend en Railway

### Opción A: Dashboard Web (Recomendado)

1. Ir a https://railway.app/dashboard
2. Seleccionar proyecto "Emailbot Project"
3. Click "New" → "Service"
4. Seleccionar "GitHub Repo"
5. Buscar `Mdx2025/mdx-control`
6. Seleccionar rama `master`
7. Railway detectará automáticamente la configuración
8. Deploy automático

### Opción B: CLI (Alternativa)

```bash
cd /home/clawd/mdx-control
railway service create mdx-control
railway up
```

## ⚙️ Variables de Entorno (Frontend)

No requiere variables - el API base está hardcodeado en `js/api.js`:
```javascript
const API_BASE = 'https://agent-dashboard-backend-production.up.railway.app/api';
```

## 🔌 API Endpoints Backend

```
GET  /api/dashboard/overview    → Estadísticas globales
GET  /api/agents                → Lista de agentes
GET  /api/missions              → Lista de misiones
POST /api/missions              → Crear misión
PATCH /api/missions/:id         → Actualizar misión
GET  /api/activity              → Feed de actividad
WS   /ws                        → WebSocket tiempo real
```

## ✅ Fases Completadas

- [x] Fase 1: Estructura modular frontend + backend
- [x] Fase 2: Conexión frontend-backend + WebSocket
- [x] Fase 3: Configuración Railway lista
- [ ] Fase 4: Crear servicio frontend en Railway

## 📝 Notas

- Frontend es HTML/CSS/JS vanilla (sin build step)
- Servidor Express sirve archivos estáticos
- CORS habilitado para comunicación con backend
