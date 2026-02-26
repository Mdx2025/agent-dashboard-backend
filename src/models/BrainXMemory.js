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
  }
}, {
  tableName: 'brainx_memories',
  timestamps: true
});

export default BrainXMemory;
