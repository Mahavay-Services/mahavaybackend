const { DataTypes } = require('sequelize');
const { AUDIT_ACTIONS } = require('../config/constants');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.ENUM(...Object.values(AUDIT_ACTIONS)),
      allowNull: false
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    entity_id: {
      type: DataTypes.INTEGER
    },
    old_value: {
      type: DataTypes.JSON
    },
    new_value: {
      type: DataTypes.JSON
    },
    description: {
      type: DataTypes.TEXT
    },
    ip_address: {
      type: DataTypes.STRING(45)
    },
    user_agent: {
      type: DataTypes.STRING(500)
    }
  }, {
    tableName: 'audit_logs',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['entity_type', 'entity_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] }
    ]
  });

  return AuditLog;
};
