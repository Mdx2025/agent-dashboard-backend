-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('MAIN', 'SUBAGENT');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('active', 'idle', 'error', 'offline');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('active', 'idle', 'closed');

-- CreateEnum
CREATE TYPE "RunSource" AS ENUM ('MAIN', 'SUBAGENT', 'CRON');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'finished', 'failed');

-- CreateEnum
CREATE TYPE "FinishReason" AS ENUM ('stop', 'tool_calls', 'error', 'length');

-- CreateEnum
CREATE TYPE "SkillStatus" AS ENUM ('ok', 'warn', 'error');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('pass', 'warn', 'fail');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('healthy', 'degraded', 'offline');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AgentType" NOT NULL DEFAULT 'MAIN',
    "status" "AgentStatus" NOT NULL DEFAULT 'idle',
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "description" TEXT,
    "runs24h" INTEGER NOT NULL DEFAULT 0,
    "runsAll" INTEGER NOT NULL DEFAULT 0,
    "err24h" INTEGER NOT NULL DEFAULT 0,
    "tokensIn24h" INTEGER NOT NULL DEFAULT 0,
    "tokensOut24h" INTEGER NOT NULL DEFAULT 0,
    "costDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costAll" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyP95" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contextAvgPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tools" TEXT[],
    "maxTokens" INTEGER,
    "temperature" DOUBLE PRECISION,
    "uptime" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "errors" JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "tokens24h" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "source" "RunSource" NOT NULL DEFAULT 'MAIN',
    "label" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'queued',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "model" TEXT NOT NULL,
    "contextPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "finishReason" "FinishReason",

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenUsageRow" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "tokensIn" INTEGER NOT NULL,
    "tokensOut" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "finishReason" "FinishReason" NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "TokenUsageRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "SkillStatus" NOT NULL DEFAULT 'ok',
    "description" TEXT NOT NULL,
    "usage24h" INTEGER NOT NULL DEFAULT 0,
    "latencyAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyP95" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,
    "dependencies" TEXT[],
    "changelog" JSONB[],

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthCheck" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "HealthStatus" NOT NULL DEFAULT 'pass',
    "detail" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'healthy',
    "host" TEXT,
    "port" INTEGER,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "cpuPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "version" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" "LogLevel" NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "runId" TEXT,
    "requestId" TEXT,
    "extra" JSONB,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Service_name_key" ON "Service"("name");

-- AddForeignKey
ALTER TABLE "TokenUsageRow" ADD CONSTRAINT "TokenUsageRow_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenUsageRow" ADD CONSTRAINT "TokenUsageRow_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;
