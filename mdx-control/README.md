# MDX Control

Dashboard de control para agentes MDX.

## 🚀 Deploy Status

| Componente | URL | Estado |
|------------|-----|--------|
| **Frontend** | [GitHub Pages](https://mdx2025.github.io/mdx-control/) | ⚠️ Requiere activar en Settings |
| **Backend** | https://agent-dashboard-backend-production.up.railway.app | ✅ Online |

## 📁 Repositorios

- **Frontend**: https://github.com/Mdx2025/mdx-control
- **Backend**: https://github.com/Mdx2025/mdx-control-backend (rama `mdx-control`)

## 🔧 Configuración Local

```bash
# Frontend
cd mdx-control
# Abrir index.html en navegador o usar servidor local:
npx serve .

# Backend
cd mdx-control-backend
npm install
npm start
```

## 🔌 API Endpoints

```
GET  /api/dashboard/overview    → Estadísticas globales
GET  /api/agents                → Lista de agentes
GET  /api/missions              → Lista de misiones
POST /api/missions              → Crear misión
PATCH /api/missions/:id         → Actualizar misión
GET  /api/activity              → Feed de actividad
WS   /ws                        → WebSocket para tiempo real
```

## 🛠️ Tecnologías

- **Frontend**: Vanilla JS, CSS Modular, WebSocket
- **Backend**: Node.js, Express, Sequelize, PostgreSQL
- **Deploy**: Railway (backend), GitHub Pages (frontend)

## 📝 Activar GitHub Pages

1. Ir a Settings → Pages
2. Source: Deploy from a branch
3. Branch: master / (root)
4. Save
5. Esperar 2-3 minutos
6. Acceder a: `https://mdx2025.github.io/mdx-control/`

## ✅ Fases Completadas

- [x] Fase 1: Estructura modular frontend + backend
- [x] Fase 2: Conexión frontend-backend + WebSocket
- [ ] Fase 3: Deploy completo + testing
