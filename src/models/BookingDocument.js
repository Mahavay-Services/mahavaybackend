const { DataTypes } = require('sequelize');
const { DOCUMENT_TYPES } = require('../config/constants');

module.exports = (sequelize) => {
  const BookingDocument = sequelize.define('BookingDocument', {
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
    document_type: {
      type: DataTypes.ENUM(...DOCUMENT_TYPES),
      allowNull: false
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    file_size: {
      type: DataTypes.INTEGER
    },
    mime_type: {
      type: DataTypes.STRING(100)
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    version_number: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    remarks: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'booking_documents',
    indexes: [
      { fields: ['booking_id'] },
      { fields: ['document_type'] }
    ]
  });

  return BookingDocument;
};
