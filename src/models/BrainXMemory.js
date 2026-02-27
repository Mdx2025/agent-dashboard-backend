import { DataTypes } from 'sequelize';
import sequelize from '../index.js';

const BrainXMemory = sequelize.define('BrainXMemory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  embedding: {
    type: DataTypes.ARRAY(DataTypes.FLOAT),
    allowNull: true
  },
  workspace: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'createdAt'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'updatedAt'
  }
}, {
  tableName: 'brainx_memories',
  timestamps: true,
  underscored: false
});

export default BrainXMemory;
