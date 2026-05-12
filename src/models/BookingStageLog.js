const { DataTypes } = require('sequelize');
const { BOOKING_STAGES } = require('../config/constants');

module.exports = (sequelize) => {
  const BookingStageLog = sequelize.define('BookingStageLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bookings',
        key: 'id'
      }
    },
    from_stage: {
      type: DataTypes.ENUM(...Object.values(BOOKING_STAGES))
    },
    to_stage: {
      type: DataTypes.ENUM(...Object.values(BOOKING_STAGES)),
      allowNull: false
    },
    changed_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    reason: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'booking_stage_logs',
    indexes: [
      { fields: ['booking_id'] },
      { fields: ['created_at'] }
    ]
  });

  return BookingStageLog;
};
