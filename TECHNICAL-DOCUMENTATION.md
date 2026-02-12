# OpenClaw — MDX Agent Operations Dashboard

## Technical Documentation & Implementation Guide

**Version:** 1.0.0
**Last Updated:** February 12, 2026
**Status:** MVP Complete — 6 Tabs Implemented

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Design System](#2-design-system)
3. [Dashboard Tabs — Current State](#3-dashboard-tabs--current-state)
4. [Data Models & API Contracts](#4-data-models--api-contracts)
5. [Implementation Roadmap — Next Steps](#5-implementation-roadmap--next-steps)
6. [Backend Integration Guide](#6-backend-integration-guide)
7. [Real-Time Data Pipeline](#7-real-time-data-pipeline)
8. [Deployment & Infrastructure](#8-deployment--infrastructure)
9. [Testing Strategy](#9-testing-strategy)
10. [Known Issues & Tech Debt](#10-known-issues--tech-debt)

---

## 1. Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     MDX Dashboard (React SPA)                    │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────┐ ┌──────┐ ┌────┐│
│  │ Overview  │ │  Token   │ │ Agents │ │Skills│ │Health│ │Logs││
│  │          │ │  Usage   │ │        │ │      │ │      │ │    ││
│  └────┬─────┘ └────┬─────┘ └───┬────┘ └──┬───┘ └──┬───┘ └──┬─┘│
│       └─────────────┴───────────┴─────────┴────────┴────────┘   │
│                              │                                   │
│                    WebSocket + REST API                           │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────────┐
│                     OpenClaw API Gateway                          │
│              gw-us-east-1.openclaw.dev:443                        │
│                                                                   │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │ REST API │  │ WebSocket │  │   Auth   │  │  Rate Limiter   │ │
│  │  /api/*  │  │  /ws/*    │  │  (JWT)   │  │ (per provider)  │ │
│  └────┬─────┘  └─────┬─────┘  └──────────┘  └─────────────────┘ │
└───────┼──────────────┼───────────────────────────────────────────┘
        │              │
┌───────┴──────────────┴───────────────────────────────────────────┐
│                        Service Layer                              │
│                                                                   │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Agent Mgr  │  │ Session  │  │   Run    │  │  Skill Reg.  │  │
│  │             │  │  Store   │  │ Executor │  │              │  │
│  └──────┬──────┘  └────┬─────┘  └────┬─────┘  └──────────────┘  │
│         │              │              │                           │
│  ┌──────┴──────────────┴──────────────┴────────────────────────┐ │
│  │                    Model Router / Proxy                      │ │
│  │   Anthropic │ Google │ OpenAI │ Moonshot │ ...providers     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
        │              │              │
┌───────┴──────┐ ┌─────┴─────┐ ┌─────┴──────┐
│  PostgreSQL  │ │   Redis   │ │  Qdrant    │
│  (primary)   │ │  (cache)  │ │ (vectors)  │
└──────────────┘ └───────────┘ └────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + JSX (single file) | Dashboard SPA |
| Styling | Inline styles, JetBrains Mono | Dark navy design system |
| State | React useState/useEffect | Local component state |
| Transport | WebSocket + REST | Real-time + CRUD |
| Backend | Node.js / Python | API Gateway + Workers |
| Database | PostgreSQL 16 | Primary data store |
| Cache | Redis 7.2 | Session cache, rate limits |
| Vectors | Qdrant 1.7 | Semantic memory / RAG |
| Hosting | Railway | Current deployment |

---

## 2. Design System

### Color Palette

```javascript
const COLORS = {
  // Backgrounds
  bg:       "#080c18",                    // Main background
  bgS:      "rgba(12,18,35,0.75)",        // Glass card surface
  bgH:      "rgba(18,26,52,0.9)",         // Hover state
  bgSub:    "rgba(255,255,255,0.02)",      // Subtle bg for detail grids

  // Borders
  bdr:      "rgba(50,70,120,0.22)",        // Default border
  bdrH:     "rgba(59,130,246,0.45)",       // Hover border

  // Accent (Blue)
  acc:      "#3b82f6",                     // Primary accent
  accB:     "#60a5fa",                     // Bright accent
  accD:     "rgba(59,130,246,0.12)",       // Accent dim (backgrounds)

  // Status Colors
  ok:       "#22c55e",                     // Success / Active / Pass
  wn:       "#f59e0b",                     // Warning / Degraded
  er:       "#ef4444",                     // Error / Failed

  // Utility Colors
  cy:       "#06b6d4",                     // Cyan — model names, log sources
  pu:       "#a78bfa",                     // Purple — subagent badges

  // Text Hierarchy
  t1:       "#e2e8f0",                     // Primary text
  t2:       "#94a3b8",                     // Secondary text
  t3:       "#64748b",                     // Tertiary / labels
  t4:       "#475569",                     // Muted / disabled
};
```

### Typography

- **Font Family:** JetBrains Mono (monospace) — loaded via Google Fonts
- **Fallbacks:** SF Mono, Cascadia Code, system monospace
- **Scale:** 9px (badges) → 11px (body) → 13-17px (headings) → 22-24px (KPI values)
- **Weight:** 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Feature:** `font-variant-numeric: tabular-nums` for all numerical data

### Component Library

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Card` | Glass container with blur | `p`, `hover`, `onClick`, `style` |
| `Pill` | Status indicator with dot | `s` (status string), `glow` |
| `SrcBadge` | Source type badge (MAIN/SUBAGENT/CRON) | `s` |
| `LvlBadge` | Log level indicator | `l` (DEBUG/INFO/WARN/ERROR/FATAL) |
| `PIcon` | Provider icon (circle with initial) | `p` (provider name) |
| `Drawer` | Right-side slide-out panel | `open`, `onClose`, `title`, `children` |
| `MBar` | Metric progress bar with % label | `v` (value 0-100) |
| `KPI` | Large metric card | `label`, `value`, `sub`, `trend` |
| `Chip` | Filter toggle button | `label`, `active`, `onClick` |
| `DGrid` | 3-column detail grid | `items` array of `{l, v}` |
| `CtxBar` | Compact context % bar | `p` (percentage) |
| `TRow` | Interactive table row with hover | `onClick`, `children` |
| `InfoR` | Label-value row | `l`, `v`, `c` (color) |
| `SLbl` | Section label with count badge | `children`, `n` |

### Animations

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

Used for: Live indicators, active status dots, gateway heartbeat.

---

## 3. Dashboard Tabs — Current State

### Tab 1: Overview (⊞)

**Purpose:** Bird's-eye view of the entire system.

**Sections:**
- **KPI Row** (5 cards): Sessions, Total Tokens, Cost, Requests, Main Model
- **Agents Strip:** Horizontal scroll of all 7 agents with status/runs/errors
- **Two-column layout:**
  - Left (300px): Active Sessions list with status/agent/tokens
  - Right (flex): Recent Runs table (Src, Label, Status, When, Model, Ctx, Tokens)
- **Model Usage Breakdown:** 5-card grid showing per-model cost/percentage

**Drawers:** Run Detail (status, source, model, duration, context, tokens)

### Tab 2: Token Usage (◎)

**Purpose:** Per-request token tracking, modeled after OpenRouter's usage table.

**Sections:**
- **KPI Row** (4 cards): Total Cost, Tokens In, Tokens Out, Avg Speed (tps)
- **Filter Bar:** Period selector (24h/7d/30d/90d), Provider filter chips
- **Main Table:** Timestamp, Provider Icon, Model (colored), Agent, Tokens in→out, Cost, Speed (tps), Finish Reason

**Drawers:** Request Detail with cost breakdown (input/output/total)

**Finish Reasons:**
- `stop` — Normal completion
- `tool_calls` — Model invoked a tool
- `error` — Request failed
- `--` — Still in progress / streaming
- `length` — Max tokens reached

### Tab 3: Agents (◈)

**Purpose:** All registered agents and subagents with performance metrics.

**Sections:**
- **KPI Row** (4 cards): Total Agents, Runs 24h, Errors, Cost Today
- **Type Filter:** ALL / MAIN / SUBAGENT
- **Agent Table:** Name, Type, Status, Model, Runs, Errors, Tokens in→out, Cost, Latency

**Drawers:** Agent Detail with description, 9-cell DGrid (type, status, model, provider, runs, cost, latency, P95, context avg), tools list, recent errors

### Tab 4: Skills (⚡)

**Purpose:** Installed plugins, tools, and capabilities registry.

**Sections:**
- **Category Filter Chips:** ALL, Research, System, Analysis, DevOps, Memory, Security, etc.
- **Skills Card Grid:** Each skill shows name, version, category, status (ok/warn/error), ON/OFF toggle, description, usage 24h, avg latency, error rate

**Drawers:** Skill Detail with DGrid, config JSON, changelog entries

### Tab 5: Health (♥)

**Purpose:** System status, service health, and diagnostics.

**Sections:**
- **Gateway Banner:** Online status with pulse, host, version, uptime, connections, req/s
- **Two-column layout:**
  - Left: Services list (7 services, expandable with CPU/MEM bars)
  - Right: System Metrics (CPU/MEM/DISK/NET) + `openclaw doctor` checks (pass/warn/fail with duration)

### Tab 6: Logs (☰)

**Purpose:** Real-time system log stream with filtering.

**Sections:**
- **Level KPI Strip:** Counter cards for each log level with colored bottom border
- **Filter Bar:** Level chips (ALL/DEBUG/INFO/WARN/ERROR/FATAL), Auto-scroll toggle
- **Log Stream:** Grid layout (Time, Level, Source, Message) with new logs every ~2.8s
- **Color coding:** WARN rows have amber tint, ERROR/FATAL rows have red tint

---

## 4. Data Models & API Contracts

### Agent

```typescript
interface Agent {
  id: string;               // "agt_main"
  name: string;             // "Orchestrator"
  type: "MAIN" | "SUBAGENT";
  status: "active" | "idle" | "error" | "offline";
  model: string;            // "anthropic/claude-opus-4"
  provider: string;         // "Anthropic"
  description: string;
  runs24h: number;
  runsAll: number;
  err24h: number;
  tokensIn24h: number;
  tokensOut24h: number;
  costDay: number;          // USD
  costAll: number;
  latencyAvg: number;       // seconds
  latencyP95: number;
  contextAvgPct: number;    // 0-100
  tools: string[];
  maxTokens: number;
  temperature: number;
  uptime: number;           // percentage
  errors: AgentError[];
  createdAt: string;        // ISO 8601
}

interface AgentError {
  timestamp: number;
  message: string;
  severity: "warn" | "error";
}
```

### Session

```typescript
interface Session {
  id: string;               // "sess_a1b2c3"
  status: "active" | "idle" | "closed";
  startedAt: number;        // Unix ms
  lastSeenAt: number;
  tokens24h: number;
  model: string;
  agent: string;            // Agent name
}
```

### Run

```typescript
interface Run {
  id: string;               // "run_001"
  source: "MAIN" | "SUBAGENT" | "CRON";
  label: string;            // "Refactor auth module"
  status: "queued" | "running" | "finished" | "failed";
  startedAt: number;
  duration: number | null;  // ms
  model: string;
  contextPct: number;       // 0-100
  tokensIn: number;
  tokensOut: number;
  finishReason: "stop" | "tool_calls" | "error" | "length" | null;
}
```

### Token Usage Row

```typescript
interface TokenUsageRow {
  id: string;
  timestamp: number;
  provider: string;         // "Anthropic" | "Moonshot" | "Google" | "OpenAI"
  model: string;            // "claude-opus-4" | "Kimi K2.5" | etc.
  agent: string;            // Which agent made this request
  tokensIn: number;
  tokensOut: number;
  cost: number;             // USD (e.g., 0.0231)
  speed: number;            // tokens/sec
  finishReason: string;     // "stop" | "tool_calls" | "error" | "--"
  sessionId: string;        // Link to session
}
```

### Skill

```typescript
interface Skill {
  id: string;
  name: string;
  version: string;
  category: string;
  enabled: boolean;
  status: "ok" | "warn" | "error";
  description: string;
  usage24h: number;
  latencyAvg: number;       // ms
  latencyP95: number;
  errorRate: number;        // percentage
  config: Record<string, any>;
  dependencies: string[];
  changelog: ChangelogEntry[];
}
```

### Health Check

```typescript
interface HealthCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  durationMs: number;
}

interface Service {
  name: string;
  status: "healthy" | "degraded" | "offline";
  host: string;
  port: number;
  latencyMs: number;
  cpuPct: number;
  memPct: number;
  version: string;
  metadata: Record<string, any>; // workers, hit rate, etc.
}
```

### Log Entry

```typescript
interface LogEntry {
  id: string;
  timestamp: number;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
  source: string;           // "gateway" | "orchestrator" | "redis" | etc.
  message: string;
  runId?: string;
  requestId?: string;
  extra?: Record<string, any>; // stack traces, durations, etc.
}
```

### REST API Endpoints

```
GET    /api/overview              → { summary, agents, sessions, recentRuns }
GET    /api/tokens?period=24h     → { rows: TokenUsageRow[], summary }
GET    /api/agents                → Agent[]
GET    /api/agents/:id            → Agent (detailed)
GET    /api/sessions              → Session[]
GET    /api/runs?limit=50         → Run[]
GET    /api/runs/:id              → Run (with transcript, tool calls, errors)
GET    /api/skills                → Skill[]
GET    /api/skills/:id            → Skill (detailed with config)
GET    /api/health                → { gateway, services, checks, systemMetrics }
GET    /api/health/doctor         → HealthCheck[]
GET    /api/logs?level=&source=   → LogEntry[]

WS     /ws/logs                   → Real-time log stream
WS     /ws/sessions               → Session status updates
WS     /ws/runs                   → Run status changes
```

---

## 5. Implementation Roadmap — Next Steps

### Phase 1: Connect Real Data (Priority: HIGH)

Replace all mock data with live API calls.

**Tasks:**

1. **Create API client module** (`/src/api/client.ts`)
   - Base URL config (env variable)
   - Auth header injection (JWT from context)
   - Error handling wrapper
   - Request/response logging

2. **Add data fetching hooks**
   ```typescript
   useAgents()       → { agents, loading, error, refetch }
   useSessions()     → { sessions, loading, error }
   useRuns(limit)    → { runs, loading, error }
   useTokenUsage(period, provider) → { rows, summary }
   useSkills()       → { skills, loading, error }
   useHealth()       → { gateway, services, checks, metrics }
   ```

3. **WebSocket connections for real-time data**
   - `/ws/logs` → Stream into Logs tab (replace setInterval mock)
   - `/ws/sessions` → Update session status in Overview
   - `/ws/runs` → Update run status + add new runs

4. **Add loading states** — Skeleton shimmer for cards and tables
5. **Add error states** — Retry buttons, error messages in red banners
6. **Add empty states** — "No data" illustrations when arrays are empty

### Phase 2: Interactive Features (Priority: HIGH)

**Tasks:**

1. **Run Actions**
   - Stop running run (with confirmation modal)
   - Retry failed run
   - View full transcript in drawer

2. **Agent Management**
   - Toggle agent enabled/disabled
   - Edit agent config (model, temperature, max tokens)
   - View agent prompt template

3. **Skill Management**
   - Toggle skill ON/OFF
   - Edit skill config
   - View skill execution history

4. **Session Management**
   - Kill active session
   - View session full history
   - Export session transcript

5. **Log Export**
   - Download filtered logs as JSON/CSV
   - Copy log range to clipboard
   - Search with regex support

### Phase 3: Analytics & Visualization (Priority: MEDIUM)

**Tasks:**

1. **Token Usage Charts** (using Recharts or D3)
   - Line chart: Token usage over time (by model)
   - Bar chart: Cost by provider per day
   - Pie chart: Model distribution
   - Area chart: Request volume over time

2. **Agent Performance Charts**
   - Latency distribution histogram
   - Error rate trend line
   - Context utilization heatmap
   - Cost accumulation over time

3. **System Health Charts**
   - CPU/MEM/DISK time series (last 24h)
   - Request latency percentiles (p50/p95/p99)
   - Service uptime calendar (last 30 days)

4. **Dashboard Widgets**
   - Configurable grid layout
   - Drag-and-drop widget rearrangement
   - Widget size presets (1x1, 2x1, 2x2)

### Phase 4: New Tabs (Priority: MEDIUM)

#### Tab: Workflows

Multi-step agent pipeline visualization.

```
User Request → Orchestrator → [Safety Check] → [Research] → [Code Gen] → Response
                    │                                │
                    └── Context enrichment ◄──────────┘
```

- DAG visualization of agent handoffs
- Step timing and status for each pipeline node
- Workflow templates (create, edit, duplicate)
- Execution history with replay

#### Tab: Tools / MCP

MCP (Model Context Protocol) tool registry and invocation logs.

- Registered MCP servers and their tools
- Tool invocation frequency and latency
- Tool error rates and failure analysis
- Tool permission management

#### Tab: Memory

Vector store and context management.

- Collections list (conversations, knowledge, code)
- Vector count and storage size
- Search testing (query → results with scores)
- Memory retention policies
- Context window optimization metrics

#### Tab: Alerts

Threshold monitoring and notification configuration.

- Alert rules editor (metric + threshold + action)
- Alert history with timeline
- Notification channel management (Slack, email, webhook)
- Escalation policies
- Incident tracking

#### Tab: Playground

Interactive agent testing environment.

- Model selector with parameter tuning
- System prompt editor
- Tool selection checkboxes
- Chat interface with token counter
- Request/response inspector
- Save test cases as presets

### Phase 5: Polish & Production (Priority: LOW)

1. **Authentication** — Login page, JWT management, role-based access
2. **Multi-tenant** — Org/team selector, shared dashboards
3. **Dark/Light theme** — Theme toggle (extend design tokens)
4. **Keyboard shortcuts** — Tab switching, search focus, drawer close (Esc)
5. **Responsive design** — Mobile-friendly sidebar collapse, card stacking
6. **Performance** — Virtual scrolling for large tables, React.memo optimization
7. **Accessibility** — ARIA labels, keyboard navigation, screen reader support
8. **i18n** — Internationalization support (Spanish, English)

---

## 6. Backend Integration Guide

### API Client Setup

```typescript
// src/api/client.ts
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.openclaw.dev';

async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('openclaw_token');
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new APIError(res.status, error.message);
  }

  return res.json();
}

// Usage
const agents = await apiCall<Agent[]>('/api/agents');
const health = await apiCall<HealthData>('/api/health');
```

### WebSocket Setup

```typescript
// src/api/ws.ts
function createLogStream(onMessage: (log: LogEntry) => void) {
  const ws = new WebSocket(`wss://api.openclaw.dev/ws/logs`);

  ws.onmessage = (event) => {
    const log = JSON.parse(event.data);
    onMessage(log);
  };

  ws.onclose = () => {
    // Reconnect with exponential backoff
    setTimeout(() => createLogStream(onMessage), 2000);
  };

  return () => ws.close();
}
```

### Data Refresh Strategy

| Data Type | Method | Interval |
|-----------|--------|----------|
| Overview KPIs | REST polling | 5 seconds |
| Active sessions | WebSocket | Real-time |
| Run status | WebSocket | Real-time |
| Token usage rows | REST polling | 10 seconds |
| Agent metrics | REST polling | 15 seconds |
| Skills | REST on tab open | On demand |
| Health/Doctor | REST polling | 30 seconds |
| System metrics | REST polling | 10 seconds |
| Logs | WebSocket | Real-time |

---

## 7. Real-Time Data Pipeline

### Log Ingestion Flow

```
Agent/Service → stdout/stderr
       │
       ▼
  Log Collector (Fluentd/Vector)
       │
       ├──→ PostgreSQL (persistent storage, queryable)
       ├──→ Redis PubSub (real-time streaming to dashboard)
       └──→ S3/R2 (long-term archival)
```

### Token Usage Tracking

Every LLM API call should be instrumented to capture:

```typescript
interface TokenEvent {
  requestId: string;
  sessionId: string;
  agentId: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;         // Calculated from provider pricing
  latencyMs: number;
  tokensPerSec: number;    // tokensOut / (latencyMs / 1000)
  finishReason: string;
  timestamp: number;
}
```

### Provider Pricing Table (for cost calculation)

| Provider | Model | Input $/1M | Output $/1M |
|----------|-------|-----------|------------|
| Anthropic | claude-opus-4 | $15.00 | $75.00 |
| Anthropic | claude-sonnet-4 | $3.00 | $15.00 |
| Anthropic | claude-haiku-4 | $0.25 | $1.25 |
| Google | gemini-2.5-pro | $1.25 | $10.00 |
| OpenAI | gpt-4o | $2.50 | $10.00 |
| Moonshot | Kimi K2.5 | $1.00 | $4.00 |

---

## 8. Deployment & Infrastructure

### Current Setup

- **Frontend:** Single JSX file rendered via Claude artifacts or deployable as standalone React app
- **Backend:** Railway deployment at `agent-dashboard-production-b090.up.railway.app`

### Production Deployment

```bash
# Frontend (Vite + React)
npm create vite@latest mdx-dashboard -- --template react-ts
cd mdx-dashboard
# Copy dashboard.jsx → src/App.tsx (convert to TypeScript)
npm run build
# Deploy to Vercel/Cloudflare Pages

# Environment Variables
VITE_API_URL=https://api.openclaw.dev
VITE_WS_URL=wss://api.openclaw.dev
```

### Recommended Stack for Production

```yaml
Frontend:
  - Framework: React 18 + TypeScript
  - Build: Vite 5
  - State: Zustand or React Query
  - Charts: Recharts
  - Host: Vercel / Cloudflare Pages

Backend:
  - Runtime: Node.js 20 (Fastify)
  - ORM: Drizzle or Prisma
  - Cache: Redis 7
  - DB: PostgreSQL 16
  - Vectors: Qdrant
  - Host: Railway / Fly.io

Monitoring:
  - Logs: Axiom or Grafana Loki
  - Metrics: Prometheus + Grafana
  - Alerts: PagerDuty / OpsGenie
```

---

## 9. Testing Strategy

### Unit Tests

```typescript
// Component tests (Vitest + Testing Library)
test('Pill renders correct status color', () => {
  render(<Pill s="active" />);
  expect(screen.getByText('active')).toHaveStyle({ color: '#4ade80' });
});

test('Token table filters by provider', () => {
  render(<TokenUsageTab />);
  fireEvent.click(screen.getByText('Anthropic'));
  expect(screen.queryByText('Kimi K2.5')).not.toBeInTheDocument();
});
```

### Integration Tests

```typescript
// API integration (MSW for mocking)
test('fetches and displays agents', async () => {
  server.use(
    http.get('/api/agents', () => HttpResponse.json(mockAgents))
  );
  render(<AgentsTab />);
  await waitFor(() => {
    expect(screen.getByText('Orchestrator')).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
// Playwright
test('navigate all tabs', async ({ page }) => {
  await page.goto('/');
  for (const tab of ['Token Usage', 'Agents', 'Skills', 'Health', 'Logs']) {
    await page.click(`text=${tab}`);
    await expect(page.locator('h1')).toContainText(tab === 'Token Usage' ? 'Token Usage' : tab);
  }
});
```

---

## 10. Known Issues & Tech Debt

### Current Limitations

1. **All data is mock** — No backend integration yet
2. **No persistence** — Page refresh resets all state
3. **No authentication** — Open access
4. **Single file** — 700+ lines, should be split into modules
5. **No error boundaries** — Crash propagates to full app
6. **No virtualization** — Large log/token tables may lag
7. **No responsive design** — Desktop-only layout
8. **JetBrains Mono dependency** — Requires Google Fonts CDN

### Refactoring Priority

1. Split into module files: `/components`, `/tabs`, `/hooks`, `/api`, `/data`
2. Add TypeScript types for all data models
3. Extract color tokens into CSS variables or Tailwind config
4. Add React Error Boundaries around each tab
5. Implement React.memo on heavy components (table rows, cards)
6. Add virtual scrolling (react-window) for Logs and Token Usage tables
7. Move mock data to `/mocks` directory with MSW handlers

### Performance Targets

| Metric | Target | Current (estimated) |
|--------|--------|-------------------|
| First Contentful Paint | < 1.0s | ~0.8s |
| Time to Interactive | < 2.0s | ~1.5s |
| Log stream rendering | 60fps | 30-40fps (> 200 entries) |
| Tab switch | < 100ms | ~80ms |
| Drawer open | < 150ms | ~120ms |
| Memory usage | < 50MB | ~35MB |

---

## Appendix: File Structure (Recommended)

```
mdx-dashboard/
├── src/
│   ├── api/
│   │   ├── client.ts           # REST API client
│   │   ├── ws.ts               # WebSocket manager
│   │   └── types.ts            # Shared TypeScript interfaces
│   ├── components/
│   │   ├── Card.tsx
│   │   ├── Chip.tsx
│   │   ├── Drawer.tsx
│   │   ├── KPI.tsx
│   │   ├── Pill.tsx
│   │   ├── Table.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useAgents.ts
│   │   ├── useHealth.ts
│   │   ├── useLogs.ts
│   │   ├── useTokenUsage.ts
│   │   └── ...
│   ├── tabs/
│   │   ├── OverviewTab.tsx
│   │   ├── TokenUsageTab.tsx
│   │   ├── AgentsTab.tsx
│   │   ├── SkillsTab.tsx
│   │   ├── HealthTab.tsx
│   │   └── LogsTab.tsx
│   ├── theme/
│   │   └── tokens.ts           # Design system constants
│   ├── App.tsx                  # Main app shell (nav + routing)
│   └── main.tsx                 # Entry point
├── mocks/
│   ├── agents.ts
│   ├── logs.ts
│   └── handlers.ts             # MSW request handlers
├── tests/
│   ├── components/
│   └── tabs/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

*This document is the single source of truth for the MDX Agent Operations Dashboard. Update it as features are implemented and decisions are made.*
