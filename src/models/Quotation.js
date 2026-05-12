const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Quotation = sequelize.define('Quotation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    quotation_number: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true
    },
    client_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    company_name: {
      type: DataTypes.STRING(150)
    },
    email: {
      type: DataTypes.STRING(100)
    },
    phone: {
      type: DataTypes.STRING(15)
    },
    address: {
      type: DataTypes.TEXT
    },
    city: {
      type: DataTypes.STRING(50)
    },
    state: {
      type: DataTypes.STRING(50)
    },
    quotation_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    valid_until: {
      type: DataTypes.DATEONLY
    },
    items: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array of {service_id, service_name, description, quantity, unit_price, discount_percent, discount_amount, gst_percentage, gst_amount, total}'
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    total_discount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    taxable_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    total_gst: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    grand_total: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    include_gst: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT
    },
    terms_conditions: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'accepted', 'rejected', 'expired'),
      defaultValue: 'draft'
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
    tableName: 'quotations',
    indexes: [
      { fields: ['quotation_number'] },
      { fields: ['client_name'] },
      { fields: ['status'] },
      { fields: ['created_by'] },
      { fields: ['created_at'] }
    ]
  });

  return Quotation;
};
