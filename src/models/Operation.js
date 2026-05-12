const { DataTypes } = require('sequelize');
const { OPERATION_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  const Operation = sequelize.define('Operation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    booking_service_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'booking_services',
        key: 'id'
      }
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM(...Object.values(OPERATION_STATUS)),
      defaultValue: OPERATION_STATUS.PENDING
    },
    notes: {
      type: DataTypes.TEXT
    },
    deadline: {
      type: DataTypes.DATEONLY
    },
    completed_at: {
      type: DataTypes.DATE
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'operations',
    indexes: [
      { fields: ['booking_service_id'] },
      { fields: ['assigned_to'] },
      { fields: ['status'] },
      { fields: ['deadline'] }
    ]
  });

  return Operation;
};
