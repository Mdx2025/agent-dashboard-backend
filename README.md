# MDX Control Backend

Backend API para el dashboard de control de agentes MDX.

## Estructura del Proyecto

```
mdx-control-backend/
├── src/
│   ├── routes-new/       # Endpoints de API
│   │   ├── dashboard.js  # Stats globales
│   │   ├── missions.js   # CRUD de misiones + ejecución
│   │   ├── webhooks.js   # Webhooks de OpenClaw Gateway
│   │   ├── brainx.js     # Memorias BrainX
│   │   ├── activity.js   # Feed de actividad
│   │   ├── agents.js     # Gestión de agentes
│   │   └── health.js     # Health checks
│   ├── services/         # Servicios
│   │   └── agentRunner.js # Integración con OpenClaw Gateway
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
- `DATABASE_URL` - URL de base de datos PostgreSQL
- `OPENCLAW_GATEWAY_URL` - URL del Gateway de OpenClaw
- `OPENCLAW_GATEWAY_TOKEN` - Token de autenticación del Gateway

### 3. Configurar OpenClaw Gateway (para ejecución de agentes)

Para habilitar la ejecución real de agentes, necesitas:

1. Tener acceso a un OpenClaw Gateway
2. Obtener un token de autenticación:
   ```bash
   openclaw gateway token
   ```
3. Configurar las variables en `.env`:
   ```bash
   OPENCLAW_GATEWAY_URL=https://gateway.tu-dominio.com
   OPENCLAW_GATEWAY_TOKEN=tu-token-aqui
   ```

### 4. Iniciar el servidor

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
- `POST /api/missions/:id/execute` - **Ejecutar misión (spawn agente)**
- `PATCH /api/missions/:id` - Actualizar misión
- `DELETE /api/missions/:id` - Eliminar misión

### Webhooks (OpenClaw Gateway)
- `POST /api/webhooks/mission-complete` - Callback cuando un agente completa
- `POST /api/webhooks/mission-update` - Callback de progreso del agente

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

## Ejecución de Agentes

### Flujo de ejecución

1. **Crear misión** (POST /api/missions)
   ```json
   {
     "title": "Fix login bug",
     "agentId": "coder",
     "priority": "high"
   }
   ```

2. **Ejecutar misión** (POST /api/missions/:id/execute)
   - Llama al OpenClaw Gateway para spawnear un sub-agente
   - El agente recibe la descripción de la misión como tarea
   - Retorna inmediatamente con `executionId`

3. **Webhook de completado** (POST /api/webhooks/mission-complete)
   - El Gateway notifica cuando el agente termina
   - Se actualiza el estado de la misión a `completed` o `failed`
   - Se guarda el resultado en `metadata.executionResult`

### Estados de misión

- `pending` - Creada, esperando ejecución
- `in_progress` - Agente ejecutando
- `completed` - Agente terminó exitosamente
- `failed` - Agente falló o error
- `cancelled` - Cancelada por usuario

## WebSocket

Conecta a `ws://localhost:3001` (o el puerto configurado)

### Canales
- `agent.status` - Cambios de status de agentes
- `activity.new` - Nueva actividad
- `mission.create` - Nueva misión creada
- `mission.update` - Actualización de misión
- `mission.execute` - Misión iniciada
- `mission.complete` - Misión completada
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
- metadata (JSONB) - incluye executionResult, executionId
- startedAt (DATE)
- completedAt (DATE)

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

Configura las variables de entorno en el dashboard de Railway:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENCLAW_GATEWAY_URL` - URL del Gateway
- `OPENCLAW_GATEWAY_TOKEN` - Token del Gateway

### Docker

```bash
docker build -t mdx-control-backend .
docker run -p 3001:3001 \
  -e DATABASE_URL=postgres://... \
  -e OPENCLAW_GATEWAY_URL=https://... \
  -e OPENCLAW_GATEWAY_TOKEN=... \
  mdx-control-backend
```
