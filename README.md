# MDX Control Backend

Backend API para el dashboard de control de agentes MDX.

## Estructura del Proyecto

```
mdx-control-backend/
├── src/
│   ├── routes-new/       # Endpoints de API
│   │   ├── dashboard.js  # Stats globales
│   │   ├── missions.js  # CRUD de misiones
│   │   ├── brainx.js     # Memorias BrainX
│   │   ├── activity.js   # Feed de actividad
│   │   ├── agents.js     # Gestión de agentes
│   │   └── health.js     # Health checks
│   ├── websocket/        # WebSocket server
│   │   └── index.js
│   ├── models/           # Modelos Sequelize
│   │   ├── Mission.js
│   │   ├── MissionStep.js
│   │   ├── BrainXMemory.js
│   │   └── Activity.js
│   └── index.js          # Entry point
├── migrations/
├── .env.example
└── package.json
```

## Setup

### 1. Instalar dependencias

```bash
cd mdx-control-backend
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Edita .env con tu configuración
```

Variables disponibles:
- `PORT` - Puerto del servidor (default: 3001)
- `DATABASE_URL` - URL de base de datos (default: sqlite local)
- `CORS_ORIGIN` - Orígenes permitidos para CORS (separados por coma)

### 3. Iniciar el servidor

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

El servidor escuchará en `http://localhost:3001`

## Endpoints API

### Dashboard
- `GET /api/dashboard/overview` - Stats globales

### Agentes
- `GET /api/agents` - Lista de agentes
- `GET /api/agents/:id` - Detalle de agente
- `GET /api/agents/:id/logs` - Logs del agente
- `POST /api/agents/:id/status` - Actualizar status

### Misiones
- `GET /api/missions` - Lista de misiones
- `GET /api/missions/:id` - Detalle de misión
- `POST /api/missions` - Crear misión
- `PATCH /api/missions/:id` - Actualizar misión
- `DELETE /api/missions/:id` - Eliminar misión

### Activity
- `GET /api/activity` - Feed de actividad
- `POST /api/activity` - Crear actividad
- `GET /api/activity/recent` - Actividad reciente

### BrainX
- `GET /api/brainx` - Lista de memorias
- `POST /api/brainx` - Crear memoria
- `POST /api/brainx/search` - Buscar memorias
- `DELETE /api/brainx/:id` - Eliminar memoria

### Health
- `GET /api/health` - Health check básico
- `GET /api/health/services` - Estado de servicios

## WebSocket

Conecta a `ws://localhost:3001` (o el puerto configurado)

### Canales
- `agent.status` - Cambios de status de agentes
- `activity.new` - Nueva actividad
- `mission.update` - Actualización de misiones
- `notifications` - Notificaciones

### Eventos del cliente
- `join` - Unirse a un canal
- `leave` - Salir de un canal
- `subscribe:agent` - Suscribirse a un agente
- `subscribe:mission` - Suscribirse a una misión

## Desarrollo

### Estructura de modelos

**Mission**
- id (UUID)
- title (STRING)
- agentId (STRING)
- status (pending|in_progress|completed|cancelled)
- progress (INTEGER 0-100)
- priority (low|medium|high|urgent)
- dueDate (DATE)
- metadata (JSONB)

**MissionStep**
- id (UUID)
- missionId (UUID)
- name (STRING)
- order (INTEGER)
- done (BOOLEAN)
- current (BOOLEAN)

**BrainXMemory**
- id (UUID)
- content (TEXT)
- embedding (ARRAY[FLOAT])
- workspace (STRING)
- metadata (JSONB)

**Activity**
- id (UUID)
- agentId (STRING)
- type (agent|mission|system|user)
- action (STRING)
- details (JSONB)
- timestamp (DATE)

## Deploy

### Railway

```bash
railway init
railway up
```

Configura las variables de entorno en el dashboard de Railway.

### Docker

```bash
docker build -t mdx-control-backend .
docker run -p 3001:3001 mdx-control-backend
```
