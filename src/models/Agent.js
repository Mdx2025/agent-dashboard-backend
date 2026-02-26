import { DataTypes } from 'sequelize';
import sequelize from '../index.js';

const Agent = sequelize.define('Agent', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('MAIN', 'SUBAGENT'),
    defaultValue: 'SUBAGENT'
  },
  status: {
    type: DataTypes.ENUM('active', 'idle', 'error', 'offline'),
    defaultValue: 'idle'
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'unknown'
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'unknown'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  emoji: {
    type: DataTypes.STRING,
    defaultValue: '🤖'
  },
  runs24h: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  runsAll: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  err24h: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tokensIn24h: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tokensOut24h: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  costDay: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  costAll: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  latencyAvg: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  uptime: {
    type: DataTypes.FLOAT,
    defaultValue: 100
  }
}, {
  tableName: 'agents',
  timestamps: true
});

export default Agent;
