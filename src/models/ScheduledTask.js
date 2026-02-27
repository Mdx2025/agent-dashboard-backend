import { DataTypes } from 'sequelize';
import sequelize from '../index.js';

const ScheduledTask = sequelize.define('ScheduledTask', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  agent: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'scheduled_at'
  },
  recurrence: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'once',
    validate: {
      isIn: [['once', 'daily', 'weekly', 'monthly']]
    }
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'scheduled',
    validate: {
      isIn: [['scheduled', 'running', 'completed', 'cancelled']]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'scheduled_tasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default ScheduledTask;
