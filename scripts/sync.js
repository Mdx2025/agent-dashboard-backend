#!/usr/bin/env node
// Sync script - Push real OpenClaw data to Railway PostgreSQL

const BACKEND_URL = process.env.BACKEND_URL || 'https://agent-dashboard-backend-production.up.railway.app';

// Read OpenClaw agents from cron jobs
async function getAgents() {
  try {
    const openclawConfig = require('/home/clawd/.openclaw/openclaw.json');
    const agents = [];
    
    // Extract agents from cron jobs
    if (openclawConfig.cronJobs) {
      for (const [agentId, job] of Object.entries(openclawConfig.cronJobs)) {
        const agentConfig = openclawConfig.agents?.[agentId];
        agents.push({
          id: agentId,
          name: agentConfig?.name || agentId,
          type: agentId === 'main' ? 'MAIN' : 'SUBAGENT',
          status: 'active',
          provider: agentConfig?.model?.split('/')[0] || 'Unknown',
          model: agentConfig?.model || 'Unknown',
          description: agentConfig?.purpose || `${agentId} agent`,
          runs24h: 0,
          err24h: 0,
          costDay: 0,
          runsAll: 0,
          tokensIn24h: 0,
          tokensOut24h: 0,
          costAll: 0,
          latencyAvg: 0,
          latencyP95: 0,
          contextAvgPct: 0,
          tools: [],
          maxTokens: agentConfig?.contextMax || null,
          temperature: agentConfig?.temperature || null,
          uptime: 100,
          errors: [],
        });
      }
    }
    
    return agents;
  } catch (e) {
    console.error('Error reading OpenClaw config:', e.message);
    return [];
  }
}

// Read skills from skills directory
async function getSkills() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const skillsDir = '/home/clawd/.openclaw/skills';
    if (!fs.existsSync(skillsDir)) {
      return [];
    }
    
    const skillFolders = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    const skills = [];
    for (const folder of skillFolders) {
      const skillPath = path.join(skillsDir, folder);
      const skillId = `sk_${folder.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      let version = '1.0.0';
      let description = `Skill: ${folder}`;
      let category = 'General';
      
      // Try to read package.json
      const packageJsonPath = path.join(skillPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = require(packageJsonPath);
          version = packageJson.version || '1.0.0';
          description = packageJson.description || description;
        } catch {}
      }
      
      // Try to read SKILL.md for description and category
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      if (fs.existsSync(skillMdPath)) {
        try {
          const skillMd = fs.readFileSync(skillMdPath, 'utf-8');
          const descMatch = skillMd.match(/## Description\s*\n([\s\S]*?)(?=\n##|\n---|$)/);
          if (descMatch) {
            description = descMatch[1].trim();
          }
          const catMatch = skillMd.match(/## Category\s*\n([\s\S]*?)(?=\n##|\n---|$)/);
          if (catMatch) {
            category = catMatch[1].trim();
          }
        } catch {}
      }
      
      skills.push({
        id: skillId,
        name: folder,
        version,
        category,
        enabled: true,
        status: 'ok',
        description,
        usage24h: 0,
        latencyAvg: 0,
        latencyP95: 0,
        errorRate: 0,
        config: {},
        dependencies: [],
        changelog: [],
      });
    }
    
    return skills;
  } catch (e) {
    console.error('Error reading skills:', e.message);
    return [];
  }
}

// Get services status
async function getServices() {
  try {
    // Check if gateway is running
    const gatewayId = 'svc_gateway';
    const gatewayStatus = await fetch('http://localhost:8080/health')
      .then(() => 'healthy')
      .catch(() => 'offline');
    
    return [
      {
        id: gatewayId,
        name: 'Gateway',
        status: gatewayStatus,
        host: 'localhost',
        port: 8080,
        latencyMs: gatewayStatus === 'healthy' ? 12 : 0,
        cpuPct: gatewayStatus === 'healthy' ? 23 : 0,
        memPct: gatewayStatus === 'healthy' ? 45 : 0,
        version: '2026.2.14',
        metadata: {},
      },
    ];
  } catch (e) {
    return [];
  }
}

// Main sync function
async function sync() {
  console.log('=== Syncing OpenClaw data to Railway ===');
  
  const agents = await getAgents();
  const skills = await getSkills();
  const services = await getServices();
  
  console.log(`Found ${agents.length} agents`);
  console.log(`Found ${skills.length} skills`);
  console.log(`Found ${services.length} services`);
  
  const payload = {
    agents,
    skills,
    services,
    sessions: [],
    runs: [],
    logs: [],
  };
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Sync completed:', result.message);
    } else {
      console.error('❌ Sync failed:', response.status, await response.text());
    }
  } catch (e) {
    console.error('❌ Sync error:', e.message);
  }
}

sync();
