import { DataTypes } from 'sequelize';
import sequelize from '../index.js';

const Activity = sequelize.define('Activity', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  agentId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  agentName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  emoji: {
    type: DataTypes.STRING,
    defaultValue: '🤖'
  },
  type: {
    type: DataTypes.ENUM('task', 'deploy', 'error', 'info', 'approval', 'mission', 'system', 'message', 'run'),
    defaultValue: 'info'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tokens: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'activities',
  timestamps: true
});

export default Activity;
