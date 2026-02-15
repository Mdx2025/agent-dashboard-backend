"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const server = (0, fastify_1.default)({ logger: true });
server.register(cors_1.default, { origin: true });
server.get('/api/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
});
server.get('/api/agents', async () => {
    return [
        { id: 'main', name: 'Main', status: 'active', type: 'MAIN', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Main agent', runs24h: 45, err24h: 1, costDay: 3.2 },
        { id: 'coder', name: 'Coder', status: 'active', type: 'SUBAGENT', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Code writing agent', runs24h: 32, err24h: 0, costDay: 2.1 },
        { id: 'researcher', name: 'Researcher', status: 'active', type: 'SUBAGENT', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Research agent', runs24h: 28, err24h: 0, costDay: 1.8 },
        { id: 'writer', name: 'Writer', status: 'active', type: 'SUBAGENT', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Content writer', runs24h: 15, err24h: 0, costDay: 0.9 },
        { id: 'support', name: 'Support', status: 'active', type: 'SUBAGENT', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Support agent', runs24h: 22, err24h: 0, costDay: 1.5 },
        { id: 'heartbeat', name: 'Heartbeat', status: 'active', type: 'SUBAGENT', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Cron scheduler', runs24h: 18, err24h: 0, costDay: 0.4 },
        { id: 'reasoning', name: 'Reasoning', status: 'idle', type: 'SUBAGENT', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Deep reasoning', runs24h: 8, err24h: 0, costDay: 0.3 },
        { id: 'clawma', name: 'Clawma', status: 'idle', type: 'SUBAGENT', provider: 'MiniMax', model: 'MiniMax-M2.5', description: 'Cost-optimized tasks', runs24h: 12, err24h: 0, costDay: 0.6 },
    ];
});
server.get('/api/sessions', async () => {
    return [
        { id: 'sess_main', status: 'active', agent: 'main', model: 'MiniMax-M2.5', tokens24h: 45000 },
        { id: 'sess_coder', status: 'active', agent: 'coder', model: 'MiniMax-M2.5', tokens24h: 23000 },
        { id: 'sess_researcher', status: 'idle', agent: 'researcher', model: 'MiniMax-M2.5', tokens24h: 12000 },
    ];
});
server.get('/api/runs', async () => {
    return [
        { id: 'run_1', source: 'MAIN', label: 'User request', status: 'running', model: 'MiniMax-M2.5', ctxAvg: 45, tokIn: 1200, tokOut: 340, startedAt: Date.now() - 30000 },
        { id: 'run_2', source: 'SUBAGENT', label: 'Code review', status: 'finished', model: 'MiniMax-M2.5', ctxAvg: 62, tokIn: 8900, tokOut: 2100, startedAt: Date.now() - 120000 },
    ];
});
server.get('/api/skills', async () => {
    return [
        { id: 'sk1', name: 'Web Search', ver: '2.4.1', cat: 'Research', on: true, status: 'ok', use24h: 234, latAvg: 420, errRate: 0.2 },
        { id: 'sk2', name: 'File Ops', ver: '3.1.0', cat: 'System', on: true, status: 'ok', use24h: 189, latAvg: 45, errRate: 0.1 },
        { id: 'sk3', name: 'Shell', ver: '1.8.2', cat: 'System', on: true, status: 'warn', use24h: 78, latAvg: 890, errRate: 1.8 },
    ];
});
server.get('/api/services', async () => {
    return [
        { name: 'Gateway', status: 'healthy', latencyMs: 12, cpuPct: 23, memPct: 45 },
        { name: 'Database', status: 'healthy', latencyMs: 8, cpuPct: 18, memPct: 52 },
        { name: 'Cache', status: 'healthy', latencyMs: 1, cpuPct: 5, memPct: 28 },
    ];
});
server.get('/api/logs', async () => {
    return [
        { id: 'log1', timestamp: Date.now() - 5000, level: 'INFO', source: 'gateway', message: 'Request processed' },
        { id: 'log2', timestamp: Date.now() - 10000, level: 'DEBUG', source: 'main', message: 'Context loaded' },
        { id: 'log3', timestamp: Date.now() - 15000, level: 'INFO', source: 'coder', message: 'Code generated' },
    ];
});
const PORT = process.env.PORT || 3000;
server.listen({ port: Number(PORT), host: '0.0.0.0' }, (err, address) => {
    if (err) {
        server.log.error(err);
        process.exit(1);
    }
    console.log('Server on ' + address);
});
//# sourceMappingURL=server.js.map