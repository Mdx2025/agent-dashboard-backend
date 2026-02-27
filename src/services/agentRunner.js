/**
 * Agent Runner Service
 * Integrates with OpenClaw Gateway to spawn sub-agents
 */

const OPENCLAW_GATEWAY = process.env.OPENCLAW_GATEWAY_URL;
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

/**
 * Spawn a new agent via OpenClaw Gateway
 * @param {Object} params - Spawn parameters
 * @param {string} params.agentId - Agent ID (e.g., 'coder', 'writer', 'researcher')
 * @param {string} params.task - Task description for the agent
 * @param {string} params.label - Label for the session
 * @param {string} params.model - Model to use (optional)
 * @returns {Promise<Object>} - Session spawn result
 */
export async function spawnAgent({ agentId, task, label, model = 'default' }) {
  if (!OPENCLAW_GATEWAY) {
    throw new Error('OPENCLAW_GATEWAY_URL not configured');
  }
  
  if (!GATEWAY_TOKEN) {
    throw new Error('OPENCLAW_GATEWAY_TOKEN not configured');
  }

  const response = await fetch(`${OPENCLAW_GATEWAY}/v1/sessions/spawn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GATEWAY_TOKEN}`
    },
    body: JSON.stringify({
      agentId,
      task,
      label,
      model,
      mode: 'run',
      runtime: 'subagent'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gateway error: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * Execute a mission by spawning the appropriate agent
 * @param {Object} mission - Mission object from database
 * @returns {Promise<Object>} - Execution result
 */
export async function executeAgent(mission) {
  const { agentId, title, description, metadata } = mission;
  
  // Build task from mission data
  const task = description || title || 'Execute mission';
  
  // Get model from metadata or use default
  const model = metadata?.model || 'default';
  
  return await spawnAgent({
    agentId: agentId || 'coder',
    task,
    label: `mission-${mission.id}`,
    model
  });
}

export default { spawnAgent, executeAgent };
