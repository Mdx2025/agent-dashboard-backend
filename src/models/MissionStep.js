import { DataTypes } from 'sequelize';
import sequelize from '../index.js';

const MissionStep = sequelize.define('MissionStep', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  missionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'missions',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  done: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  current: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'mission_steps',
  timestamps: true
});

export default MissionStep;
