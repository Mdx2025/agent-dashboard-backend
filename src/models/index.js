import sequelize from '../index.js';
import Agent from './Agent.js';
import Mission from './Mission.js';
import MissionStep from './MissionStep.js';
import Activity from './Activity.js';
import BrainXMemory from './BrainXMemory.js';
import ScheduledTask from './ScheduledTask.js';
import Artifact from './Artifact.js';

// Associations
Mission.belongsTo(Agent, { foreignKey: 'agentId', as: 'agent' });
Agent.hasMany(Mission, { foreignKey: 'agentId', as: 'missions' });

Mission.hasMany(MissionStep, { foreignKey: 'missionId', as: 'steps' });
MissionStep.belongsTo(Mission, { foreignKey: 'missionId', as: 'mission' });

Activity.belongsTo(Agent, { foreignKey: 'agentId', targetKey: 'id', as: 'agent', constraints: false });
Agent.hasMany(Activity, { foreignKey: 'agentId', as: 'activities' });

export { sequelize, Agent, Mission, MissionStep, Activity, BrainXMemory, ScheduledTask, Artifact };
