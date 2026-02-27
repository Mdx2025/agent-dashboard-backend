import { DataTypes } from 'sequelize';
import sequelize from '../index.js';

const Mission = sequelize.define('Mission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  agentId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0, max: 100 }
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'missions',
  timestamps: true
});

export default Mission;
