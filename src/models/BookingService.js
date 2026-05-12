const { DataTypes } = require('sequelize');
const { OPERATION_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  const BookingService = sequelize.define('BookingService', {
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
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'services',
        key: 'id'
      }
    },
    custom_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    gst_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 18.00
    },
    gst_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    final_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    operation_status: {
      type: DataTypes.ENUM(...Object.values(OPERATION_STATUS)),
      defaultValue: OPERATION_STATUS.PENDING
    },
    assigned_ops_user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'booking_services',
    indexes: [
      { fields: ['booking_id'] },
      { fields: ['service_id'] },
      { fields: ['operation_status'] }
    ]
  });

  BookingService.beforeSave((bookingService) => {
    const price = parseFloat(bookingService.custom_price) || 0;
    const gstPercent = parseFloat(bookingService.gst_percentage) || 0;
    bookingService.gst_amount = (price * gstPercent) / 100;
    bookingService.final_amount = price + bookingService.gst_amount;
  });

  return BookingService;
};
