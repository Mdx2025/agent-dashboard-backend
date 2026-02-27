import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Run = sequelize.define('Run', {
    id: { type: DataTypes.STRING, primaryKey: true },
    sessionId: { type: DataTypes.STRING, allowNull: false, field: 'session_id' },
    agentId: { type: DataTypes.STRING, allowNull: false, field: 'agent_id' },
    label: { type: DataTypes.STRING },
    status: { type: DataTypes.ENUM('queued', 'running', 'finished', 'failed', 'stopped') },
    startedAt: { type: DataTypes.DATE, field: 'started_at' },
    finishedAt: { type: DataTypes.DATE, field: 'finished_at' },
    duration: { type: DataTypes.INTEGER },
    model: { type: DataTypes.STRING },
    tokensIn: { type: DataTypes.INTEGER, defaultValue: 0, field: 'tokens_in' },
    tokensOut: { type: DataTypes.INTEGER, defaultValue: 0, field: 'tokens_out' },
    cost: { type: DataTypes.FLOAT, defaultValue: 0 },
    contextPct: { type: DataTypes.FLOAT, defaultValue: 0, field: 'context_pct' },
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  }, {
    tableName: 'runs',
    timestamps: false,
    underscored: true
  });

  return Run;
};
