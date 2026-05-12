const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BookingRemark = sequelize.define('BookingRemark', {
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
    remark: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    remark_type: {
      type: DataTypes.ENUM('general', 'sales', 'accounts', 'legal', 'operations'),
      defaultValue: 'general'
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
    tableName: 'booking_remarks',
    indexes: [
      { fields: ['booking_id'] },
      { fields: ['created_at'] }
    ]
  });

  return BookingRemark;
};
