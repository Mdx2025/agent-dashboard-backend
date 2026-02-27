import sequelize from '../index.js';
import Agent from './Agent.js';
import Mission from './Mission.js';
import MissionStep from './MissionStep.js';
import Activity from './Activity.js';
import BrainXMemory from './BrainXMemory.js';
import ScheduledTask from './ScheduledTask.js';
import Artifact from './Artifact.js';
import runModel from './Run.js';
import sessionModel from './Session.js';
import logEntryModel from './LogEntry.js';

// Initialize models
const Run = runModel(sequelize);
const Session = sessionModel(sequelize);
const LogEntry = logEntryModel(sequelize);

// Associations - Original
Mission.belongsTo(Agent, { foreignKey: 'agentId', as: 'agent' });
Agent.hasMany(Mission, { foreignKey: 'agentId', as: 'missions' });

Mission.hasMany(MissionStep, { foreignKey: 'missionId', as: 'steps' });
MissionStep.belongsTo(Mission, { foreignKey: 'missionId', as: 'mission' });

Activity.belongsTo(Agent, { foreignKey: 'agentId', targetKey: 'id', as: 'agent', constraints: false });
Agent.hasMany(Activity, { foreignKey: 'agentId', as: 'activities' });

// Associations - New Run/Session/LogEntry models
Run.belongsTo(Agent, { foreignKey: 'agent_id' });
Run.belongsTo(Session, { foreignKey: 'session_id' });
Session.hasMany(Run, { foreignKey: 'session_id' });
Agent.hasMany(Run, { foreignKey: 'agent_id' });

LogEntry.belongsTo(Run, { foreignKey: 'run_id' });
Run.hasMany(LogEntry, { foreignKey: 'run_id' });

export { sequelize, Agent, Mission, MissionStep, Activity, BrainXMemory, ScheduledTask, Artifact, Run, Session, LogEntry };
