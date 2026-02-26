// API Client for MDX Control
const API_BASE = 'https://agent-dashboard-backend-production.up.railway.app/api';
const WS_URL = 'wss://agent-dashboard-backend-production.up.railway.app/ws';

// HTTP Client
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Error: ${path}`, error);
    throw error;
  }
}

// API Methods
export const api = {
  // Dashboard
  getDashboard: () => request('/dashboard/overview'),
  
  // Agents
  getAgents: () => request('/agents'),
  getAgent: (id) => request(`/agents/${id}`),
  getAgentLogs: (id) => request(`/agents/${id}/logs`),
  
  // Missions
  getMissions: () => request('/missions'),
  getMission: (id) => request(`/missions/${id}`),
  createMission: (data) => request('/missions', { method: 'POST', body: JSON.stringify(data) }),
  updateMission: (id, data) => request(`/missions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  
  // Activity
  getActivity: (params = '') => request(`/activity${params}`),
  
  // Health
  getHealth: () => request('/health/services')
};

// WebSocket Client
export function createWebSocket(onMessage, onConnect, onDisconnect) {
  let ws = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;
  
  function connect() {
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts = 0;
      onConnect?.();
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (error) {
        console.error('WS Message parse error:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      onDisconnect?.();
      
      // Auto-reconnect
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`);
        setTimeout(connect, reconnectDelay * reconnectAttempts);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return ws;
  }
  
  return connect();
}

export default api;
