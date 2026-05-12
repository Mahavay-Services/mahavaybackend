const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BookingBDMSplit = sequelize.define('BookingBDMSplit', {
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    split_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    split_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    }
  }, {
    tableName: 'booking_bdm_splits',
    indexes: [
      { fields: ['booking_id'] },
      { fields: ['user_id'] }
    ]
  });

  return BookingBDMSplit;
};
