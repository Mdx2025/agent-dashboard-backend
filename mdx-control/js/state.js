// State Management with API Integration
import { api, createWebSocket } from './api.js';

// Initial State
const initialState = {
  // Data
  dashboard: null,
  agents: [],
  missions: [],
  activity: [],
  
  // Loading states
  loading: {
    dashboard: false,
    agents: false,
    missions: false,
    activity: false
  },
  
  // Errors
  errors: {},
  
  // WebSocket
  wsConnected: false,
  
  // UI State
  currentPage: 'overview',
  selectedAgent: null,
  selectedMission: null
};

// Store
class Store {
  constructor() {
    this.state = { ...initialState };
    this.listeners = [];
    this.ws = null;
  }
  
  // Subscribe to changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  // Notify listeners
  notify(key) {
    this.listeners.forEach(listener => listener(this.state, key));
  }
  
  // Get state
  get(key) {
    return key ? this.state[key] : this.state;
  }
  
  // Set state
  set(key, value) {
    this.state[key] = value;
    this.notify(key);
  }
  
  // Update nested state
  update(path, value) {
    const keys = path.split('.');
    let current = this.state;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    this.notify(path);
  }
  
  // API Actions
  async loadDashboard() {
    this.update('loading.dashboard', true);
    this.update('errors.dashboard', null);
    
    try {
      const data = await api.getDashboard();
      this.set('dashboard', data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      this.update('errors.dashboard', error.message);
    } finally {
      this.update('loading.dashboard', false);
    }
  }
  
  async loadAgents() {
    this.update('loading.agents', true);
    this.update('errors.agents', null);
    
    try {
      const data = await api.getAgents();
      this.set('agents', data);
    } catch (error) {
      console.error('Failed to load agents:', error);
      this.update('errors.agents', error.message);
    } finally {
      this.update('loading.agents', false);
    }
  }
  
  async loadMissions() {
    this.update('loading.missions', true);
    this.update('errors.missions', null);
    
    try {
      const data = await api.getMissions();
      this.set('missions', data);
    } catch (error) {
      console.error('Failed to load missions:', error);
      this.update('errors.missions', error.message);
    } finally {
      this.update('loading.missions', false);
    }
  }
  
  async loadActivity() {
    this.update('loading.activity', true);
    this.update('errors.activity', null);
    
    try {
      const data = await api.getActivity();
      this.set('activity', data);
    } catch (error) {
      console.error('Failed to load activity:', error);
      this.update('errors.activity', error.message);
    } finally {
      this.update('loading.activity', false);
    }
  }
  
  async createMission(missionData) {
    try {
      const newMission = await api.createMission(missionData);
      this.set('missions', [...this.state.missions, newMission]);
      return newMission;
    } catch (error) {
      console.error('Failed to create mission:', error);
      throw error;
    }
  }
  
  async updateMission(id, updates) {
    try {
      const updated = await api.updateMission(id, updates);
      this.set('missions', this.state.missions.map(m => 
        m.id === id ? { ...m, ...updated } : m
      ));
      return updated;
    } catch (error) {
      console.error('Failed to update mission:', error);
      throw error;
    }
  }
  
  // WebSocket
  connectWebSocket() {
    this.ws = createWebSocket(
      (data) => this.handleWebSocketMessage(data),
      () => this.set('wsConnected', true),
      () => this.set('wsConnected', false)
    );
  }
  
  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'agent.status':
        this.updateAgentStatus(data.agentId, data.status);
        break;
      case 'activity.new':
        this.set('activity', [data.activity, ...this.state.activity]);
        break;
      case 'mission.update':
        this.updateMissionInState(data.mission);
        break;
      default:
        console.log('WS Message:', data);
    }
  }
  
  updateAgentStatus(agentId, status) {
    this.set('agents', this.state.agents.map(agent => 
      agent.id === agentId ? { ...agent, status } : agent
    ));
  }
  
  updateMissionInState(updatedMission) {
    this.set('missions', this.state.missions.map(mission => 
      mission.id === updatedMission.id ? { ...mission, ...updatedMission } : mission
    ));
  }
  
  // Initialize
  async init() {
    await Promise.all([
      this.loadDashboard(),
      this.loadAgents(),
      this.loadMissions(),
      this.loadActivity()
    ]);
    this.connectWebSocket();
  }
}

// Export singleton
export const store = new Store();
export default store;
