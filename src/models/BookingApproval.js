const { DataTypes } = require('sequelize');
const { APPROVAL_TYPES, VERIFICATION_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  const BookingApproval = sequelize.define('BookingApproval', {
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
    approval_type: {
      type: DataTypes.ENUM(...Object.values(APPROVAL_TYPES)),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(...Object.values(VERIFICATION_STATUS)),
      defaultValue: VERIFICATION_STATUS.PENDING
    },
    approved_by: {
      type: DataTypes.INTEGER,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approved_at: {
      type: DataTypes.DATE
    },
    rejection_reason: {
      type: DataTypes.TEXT
    },
    remarks: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'booking_approvals',
    indexes: [
      { fields: ['booking_id'] },
      { fields: ['approval_type'] },
      { fields: ['status'] }
    ]
  });

  return BookingApproval;
};
