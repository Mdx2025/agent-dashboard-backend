"use strict";
// backend/app/src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const prisma_1 = require("./lib/prisma");
const server = (0, fastify_1.default)({
    logger: true,
});
// --- API Routes ---
// 1. Health Check Route
server.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});
// 2. Get All Agents Route
server.get('/api/agents', async (request, reply) => {
    try {
        const agents = await prisma_1.prisma.agent.findMany();
        return agents;
    }
    catch (error) {
        server.log.error(error, 'Failed to fetch agents');
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// --- Sessions CRUD ---
// 7. List all Sessions
server.get('/api/sessions', async (request, reply) => {
    try {
        const sessions = await prisma_1.prisma.session.findMany();
        return sessions;
    }
    catch (error) {
        server.log.error(error, 'Failed to fetch sessions');
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 9. Get Session by ID
server.get('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params;
    try {
        const session = await prisma_1.prisma.session.findUnique({ where: { id } });
        if (!session) {
            return reply.status(404).send({ error: 'Session not found' });
        }
        return session;
    }
    catch (error) {
        server.log.error(error, `Failed to fetch session ${id}`);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 10. Update Session by ID
server.put('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params;
    const data = request.body; // TODO: Validation
    try {
        const updatedSession = await prisma_1.prisma.session.update({
            where: { id },
            data: {
                status: data.status,
                lastSeenAt: new Date(), // Always update lastSeenAt on any update
            },
        });
        return updatedSession;
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'P2025') {
            return reply.status(404).send({ error: 'Session not found' });
        }
        server.log.error(error, `Failed to update session ${id}`);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// --- Runs CRUD ---
// 12. List all Runs
server.get('/api/runs', async (request, reply) => {
    try {
        const runs = await prisma_1.prisma.run.findMany();
        return runs;
    }
    catch (error) {
        server.log.error(error, 'Failed to fetch runs');
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 14. Get Run by ID
server.get('/api/runs/:id', async (request, reply) => {
    const { id } = request.params;
    try {
        const run = await prisma_1.prisma.run.findUnique({ where: { id } });
        if (!run) {
            return reply.status(404).send({ error: 'Run not found' });
        }
        return run;
    }
    catch (error) {
        server.log.error(error, `Failed to fetch run ${id}`);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 15. Update Run by ID
server.put('/api/runs/:id', async (request, reply) => {
    const { id } = request.params;
    const data = request.body; // TODO: Validation
    try {
        const updatedRun = await prisma_1.prisma.run.update({
            where: { id },
            data: {
                status: data.status,
                duration: data.duration,
                contextPct: data.contextPct,
                tokensIn: data.tokensIn,
                tokensOut: data.tokensOut,
                finishReason: data.finishReason,
            },
        });
        return updatedRun;
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'P2025') {
            return reply.status(404).send({ error: 'Run not found' });
        }
        server.log.error(error, `Failed to update run ${id}`);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// --- Skills CRUD ---
// 17. List all Skills
server.get('/api/skills', async (request, reply) => {
    try {
        const skills = await prisma_1.prisma.skill.findMany();
        return skills;
    }
    catch (error) {
        server.log.error(error, 'Failed to fetch skills');
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 18. Create a new Skill
server.post('/api/skills', async (request, reply) => {
    const data = request.body; // TODO: Validation
    try {
        const newSkill = await prisma_1.prisma.skill.create({
            data: {
                name: data.name,
                version: data.version,
                category: data.category,
                enabled: data.enabled,
                description: data.description,
                config: data.config || {},
                dependencies: data.dependencies || [],
                changelog: data.changelog || [],
            },
        });
        reply.status(201).send(newSkill);
    }
    catch (error) {
        server.log.error(error, 'Failed to create skill');
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 19. Get Skill by ID
server.get('/api/skills/:id', async (request, reply) => {
    const { id } = request.params;
    try {
        const skill = await prisma_1.prisma.skill.findUnique({ where: { id } });
        if (!skill) {
            return reply.status(404).send({ error: 'Skill not found' });
        }
        return skill;
    }
    catch (error) {
        server.log.error(error, `Failed to fetch skill ${id}`);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 20. Update Skill by ID
server.put('/api/skills/:id', async (request, reply) => {
    const { id } = request.params;
    const data = request.body; // TODO: Validation
    try {
        const updatedSkill = await prisma_1.prisma.skill.update({
            where: { id },
            data: {
                version: data.version,
                enabled: data.enabled,
                description: data.description,
                config: data.config,
                dependencies: data.dependencies,
                changelog: data.changelog,
            },
        });
        return updatedSkill;
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'P2025') {
            return reply.status(404).send({ error: 'Skill not found' });
        }
        server.log.error(error, `Failed to update skill ${id}`);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// --- Services & Health ---
// 24. List all Services
server.get('/api/services', async (request, reply) => {
    try {
        const services = await prisma_1.prisma.service.findMany();
        return services;
    }
    catch (error) {
        server.log.error(error, 'Failed to fetch services');
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 25. List all Health Checks
server.get('/api/health', async (request, reply) => {
    try {
        const healthChecks = await prisma_1.prisma.healthCheck.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10, // Get the 10 most recent checks
        });
        return healthChecks;
    }
    catch (error) {
        server.log.error(error, 'Failed to fetch health checks');
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// --- Logs ---
// 22. List all Log Entries
server.get('/api/logs', async (request, reply) => {
    try {
        // In a real app, you'd want pagination here.
        const logs = await prisma_1.prisma.logEntry.findMany({
            orderBy: { timestamp: 'desc' },
            take: 100, // Limit to the last 100 logs for now
        });
        return logs;
    }
    catch (error) {
        server.log.error(error, 'Failed to fetch logs');
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 23. Create a new Log Entry
server.post('/api/logs', async (request, reply) => {
    const data = request.body; // TODO: Validation
    try {
        const newLog = await prisma_1.prisma.logEntry.create({
            data: {
                level: data.level,
                source: data.source,
                message: data.message,
                runId: data.runId,
                requestId: data.requestId,
                extra: data.extra,
            },
        });
        reply.status(201).send(newLog);
    }
    catch (error) {
        server.log.error(error, 'Failed to create log entry');
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 21. Delete Skill by ID
server.delete('/api/skills/:id', async (request, reply) => {
    const { id } = request.params;
    try {
        await prisma_1.prisma.skill.delete({ where: { id } });
        reply.status(204).send();
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'P2025') {
            return reply.status(404).send({ error: 'Skill not found' });
        }
        server.log.error(error, `Failed to delete skill ${id}`);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 16. Delete Run by ID
server.delete('/api/runs/:id', async (request, reply) => {
    const { id } = request.params;
    try {
        await prisma_1.prisma.run.delete({ where: { id } });
        reply.status(204).send();
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'P2025') {
            return reply.status(404).send({ error: 'Run not found' });
        }
        server.log.error(error, `Failed to delete run ${id}`);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 13. Create a new Run
server.post('/api/runs', async (request, reply) => {
    const data = request.body; // TODO: Validation
    try {
        // Note: In a real app, creating a run would likely trigger other events
        const newRun = await prisma_1.prisma.run.create({
            data: {
                source: data.source,
                label: data.label,
                status: data.status || 'queued',
                model: data.model,
            },
        });
        reply.status(201).send(newRun);
    }
    catch (error) {
        server.log.error(error, 'Failed to create run');
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 11. Delete Session by ID
server.delete('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params;
    try {
        await prisma_1.prisma.session.delete({ where: { id } });
        reply.status(204).send();
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'P2025') {
            return reply.status(404).send({ error: 'Session not found' });
        }
        server.log.error(error, `Failed to delete session ${id}`);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 8. Create a new Session
server.post('/api/sessions', async (request, reply) => {
    const data = request.body; // TODO: Validation
    try {
        const newSession = await prisma_1.prisma.session.create({
            data: {
                status: data.status || 'active',
                model: data.model,
                agentName: data.agentName,
            },
        });
        reply.status(201).send(newSession);
    }
    catch (error) {
        server.log.error(error, 'Failed to create session');
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 6. Delete Agent by ID Route
server.delete('/api/agents/:id', async (request, reply) => {
    const { id } = request.params;
    try {
        await prisma_1.prisma.agent.delete({
            where: { id },
        });
        reply.status(204).send();
    }
    catch (error) {
        // Handle case where the agent to delete doesn't exist
        if (error instanceof Error && 'code' in error && error.code === 'P2025') {
            return reply.status(404).send({ error: 'Agent not found' });
        }
        server.log.error(error, `Failed to delete agent ${id}`);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 5. Update Agent by ID Route
server.put('/api/agents/:id', async (request, reply) => {
    const { id } = request.params;
    const data = request.body; // TODO: Add validation
    try {
        const updatedAgent = await prisma_1.prisma.agent.update({
            where: { id },
            data: {
                name: data.name,
                type: data.type,
                model: data.model,
                provider: data.provider,
                status: data.status,
                description: data.description,
                tools: data.tools,
                // We don't update calculated fields like runs24h here
            },
        });
        return updatedAgent;
    }
    catch (error) {
        // Handle case where the agent to update doesn't exist
        if (error instanceof Error && 'code' in error && error.code === 'P2025') {
            return reply.status(404).send({ error: 'Agent not found' });
        }
        server.log.error(error, `Failed to update agent ${id}`);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 4. Get Agent by ID Route
server.get('/api/agents/:id', async (request, reply) => {
    const { id } = request.params;
    try {
        const agent = await prisma_1.prisma.agent.findUnique({
            where: { id },
        });
        if (!agent) {
            return reply.status(404).send({ error: 'Agent not found' });
        }
        return agent;
    }
    catch (error) {
        server.log.error(error, `Failed to fetch agent ${id}`);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// 3. Create Agent Route
server.post('/api/agents', async (request, reply) => {
    // TODO: Add validation for the request body
    const data = request.body;
    try {
        const newAgent = await prisma_1.prisma.agent.create({
            data: {
                name: data.name,
                type: data.type,
                model: data.model,
                provider: data.provider,
                status: data.status || 'idle',
                description: data.description,
                tools: data.tools || [],
            },
        });
        reply.status(201).send(newAgent);
    }
    catch (error) {
        server.log.error(error, 'Failed to create agent');
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});
// --- Server Start ---
const start = async () => {
    try {
        // Use Railway's PORT variable, fall back to API_PORT, then default to 8080
        const port = parseInt(process.env.PORT || process.env.API_PORT || '8080', 10);
        await server.listen({ port: port, host: '0.0.0.0' });
        server.log.info(`Server listening on port ${port}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map