import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const LogEntry = sequelize.define('LogEntry', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    runId: { type: DataTypes.STRING, allowNull: false, field: 'run_id' },
    level: { type: DataTypes.ENUM('info', 'warn', 'error', 'debug') },
    message: { type: DataTypes.TEXT },
    timestamp: { type: DataTypes.DATE },
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  }, {
    tableName: 'log_entries',
    timestamps: false,
    underscored: true
  });

  return LogEntry;
};
