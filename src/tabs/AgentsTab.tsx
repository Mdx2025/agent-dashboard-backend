// src/tabs/AgentsTab.tsx

import React, { useState, useEffect } from 'react';
import { fetchAgents, createAgent, updateAgent, deleteAgent, CreateAgentDto, UpdateAgentDto } from '../services';
import { Agent } from '../api/types';

export function AgentsTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await fetchAgents();
      setAgents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    const newAgent: CreateAgentDto = {
      name: 'New Agent',
      type: 'SUBAGENT',
      model: 'gpt-3.5-turbo',
      provider: 'OpenAI',
      description: 'A newly created agent.',
    };
    try {
      await createAgent(newAgent);
      loadAgents(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
    }
  };

  const handleUpdateAgent = async (id: string) => {
    const updatedData: UpdateAgentDto = {
      status: 'idle',
    };
    try {
      await updateAgent(id, updatedData);
      loadAgents(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to update agent');
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      await deleteAgent(id);
      loadAgents(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to delete agent');
    }
  };

  if (loading) return <div>Loading agents...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  // Filter agents by type and search
  const filteredAgents = agents.filter(agent => {
    const matchesType = typeFilter === 'ALL' || agent.type === typeFilter;
    const matchesSearch = searchQuery === '' || 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.model?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Agents</h1>
      <p className="mb-4">All registered agents and subagents with performance metrics.</p>
      
      {/* Filters */}
      <div className="mb-4 flex gap-2 flex-wrap items-center">
        {/* Type Filter */}
        {['ALL', 'MAIN', 'SUBAGENT'].map(type => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              typeFilter === type
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {type}
          </button>
        ))}
        
        {/* Search */}
        <input
          type="text"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ml-4 px-3 py-1 border rounded text-sm flex-1 max-w-xs"
        />
        
        <span className="ml-auto text-sm text-gray-500">
          {filteredAgents.length} agents
        </span>
      </div>

      <button 
        onClick={handleCreateAgent}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Create New Agent
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => (
          <div key={agent.id} className="p-4 border rounded shadow-md">
            <h2 className="text-xl font-semibold">{agent.name} <span className="text-sm text-gray-500">({agent.type})</span></h2>
            <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
            <p><strong>Status:</strong> {agent.status}</p>
            <p><strong>Model:</strong> {agent.model}</p>
            <div className="mt-4 flex space-x-2">
              <button 
                onClick={() => handleUpdateAgent(agent.id)}
                className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
              >
                Set to Idle
              </button>
              <button 
                onClick={() => handleDeleteAgent(agent.id)}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
