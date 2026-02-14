
// src/api/types.ts

/**
 * Based on the technical documentation provided.
 * These interfaces define the data contracts for the MDX Dashboard.
 */

export interface AgentError {
    timestamp: number;
    message: string;
    severity: "warn" | "error";
}

export interface Agent {
    id: string; // "agt_main"
    name: string; // "Orchestrator"
    type: "MAIN" | "SUBAGENT";
    status: "active" | "idle" | "error" | "offline";
    model: string; // "anthropic/claude-opus-4"
    provider: string; // "Anthropic"
    description: string;
    runs24h: number;
    runsAll: number;
    err24h: number;
    tokensIn24h: number;
    tokensOut24h: number;
    costDay: number; // USD
    costAll: number;
    latencyAvg: number; // seconds
    latencyP95: number;
    contextAvgPct: number; // 0-100
    tools: string[];
    maxTokens: number;
    temperature: number;
    uptime: number; // percentage
    errors: AgentError[];
    createdAt: string; // ISO 8601
}

export interface Session {
    id: string; // "sess_a1b2c3"
    status: "active" | "idle" | "closed";
    startedAt: number; // Unix ms
    lastSeenAt: number;
    tokens24h: number;
    model: string;
    agent: string; // Agent name
}

export interface Run {
    id: string; // "run_001"
    source: "MAIN" | "SUBAGENT" | "CRON";
    label: string; // "Refactor auth module"
    status: "queued" | "running" | "finished" | "failed";
    startedAt: number;
    duration: number | null; // ms
    model: string;
    contextPct: number; // 0-100
    tokensIn: number;
    tokensOut: number;
    finishReason: "stop" | "tool_calls" | "error" | "length" | null;
}

export interface TokenUsageRow {
    id: string;
    timestamp: number;
    provider: string; // "Anthropic" | "Moonshot" | "Google" | "OpenAI"
    model: string; // "claude-opus-4" | "Kimi K2.5" | etc.
    agent: string; // Which agent made this request
    tokensIn: number;
    tokensOut: number;
    cost: number; // USD (e.g., 0.0231)
    speed: number; // tokens/sec
    finishReason: string; // "stop" | "tool_calls" | "error" | "--"
    sessionId: string; // Link to session
}

export interface Skill {
    id: string;
    name: string;
    version: string;
    category: string;
    enabled: boolean;
    status: "ok" | "warn" | "error";
    description: string;
    usage24h: number;
    latencyAvg: number; // ms
    latencyP95: number;
    errorRate: number; // percentage
    config: Record<string, any>;
    dependencies: string[];
    changelog: ChangelogEntry[];
}

export interface ChangelogEntry {
    version: string;
    date: string;
    changes: string[];
}

export interface HealthCheck {
    name: string;
    status: "pass" | "warn" | "fail";
    detail: string;
    durationMs: number;
}

export interface Service {
    name:string;
    status: "healthy" | "degraded" | "offline";
    host: string;
    port: number;
    latencyMs: number;
    cpuPct: number;
    memPct: number;
    version: string;
    metadata: Record<string, any>; // workers, hit rate, etc.
}

export interface LogEntry {
    id: string;
    timestamp: number;
    level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
    source: string; // "gateway" | "orchestrator" | "redis" | etc.
    message: string;
    runId?: string;
    requestId?: string;
    extra?: Record<string, any>; // stack traces, durations, etc.
}

export interface SystemMetrics {
    cpuPct: number;
    memPct: number;
    diskPct: number;
    netIn: number; // kb/s
    netOut: number; // kb/s
}

export interface HealthData {
    gateway: Service;
    services: Service[];
    checks: HealthCheck[];
    systemMetrics: SystemMetrics;
}

export interface OverviewData {
    summary: Record<string, any>; // Define more strictly if needed
    agents: Agent[];
    sessions: Session[];
    recentRuns: Run[];
}
