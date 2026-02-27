import { DataTypes } from 'sequelize';
import sequelize from '../index.js';

const Artifact = sequelize.define('Artifact', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  emoji: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: '📄'
  },
  agent: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  size: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['markdown', 'pdf', 'svg', 'json', 'text', 'image']]
    }
  },
  badge: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'file_path'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'artifacts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default Artifact;
