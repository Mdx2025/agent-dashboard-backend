import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Session = sequelize.define('Session', {
    id: { type: DataTypes.STRING, primaryKey: true },
    agentId: { type: DataTypes.STRING, allowNull: false, field: 'agent_id' },
    status: { type: DataTypes.ENUM('active', 'idle', 'closed') },
    startedAt: { type: DataTypes.DATE, field: 'started_at' },
    lastActivityAt: { type: DataTypes.DATE, field: 'last_activity_at' },
    totalTokens: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_tokens' },
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  }, {
    tableName: 'sessions',
    timestamps: false,
    underscored: true
  });

  return Session;
};
