const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Invoice = sequelize.define(
    "Invoice",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      invoice_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "tax",
        validate: {
          isIn: [["proforma", "tax"]],
        },
      },
      invoice_number: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      invoice_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      // Seller details
      seller_name: {
        type: DataTypes.STRING(200),
        defaultValue: "Satya Sankalp Services Private Limited",
      },
      seller_address: {
        type: DataTypes.TEXT,
      },
      seller_gstin: {
        type: DataTypes.STRING(20),
      },
      seller_state: {
        type: DataTypes.STRING(50),
      },
      seller_state_code: {
        type: DataTypes.STRING(5),
      },
      // Buyer details
      buyer_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      buyer_company: {
        type: DataTypes.STRING(200),
      },
      buyer_address: {
        type: DataTypes.TEXT,
      },
      buyer_gstin: {
        type: DataTypes.STRING(20),
      },
      buyer_state: {
        type: DataTypes.STRING(50),
      },
      buyer_state_code: {
        type: DataTypes.STRING(5),
      },
      buyer_email: {
        type: DataTypes.STRING(100),
      },
      buyer_phone: {
        type: DataTypes.STRING(15),
      },
      // Reference fields
      delivery_note: {
        type: DataTypes.STRING(100),
      },
      payment_terms: {
        type: DataTypes.STRING(100),
      },
      buyer_order_no: {
        type: DataTypes.STRING(100),
      },
      other_references: {
        type: DataTypes.STRING(200),
      },
      dispatch_doc_no: {
        type: DataTypes.STRING(100),
      },
      dispatched_through: {
        type: DataTypes.STRING(100),
      },
      destination: {
        type: DataTypes.STRING(100),
      },
      terms_of_delivery: {
        type: DataTypes.STRING(100),
      },
      // Items stored as JSON
      items: {
        type: DataTypes.JSON,
        allowNull: false,
        comment:
          "Array of {sl_no, description, hsn_sac, quantity, rate, per, amount}",
      },
      // Totals
      subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      // GST fields - CGST+SGST for same state, IGST for different state
      cgst_rate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
      },
      cgst_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      sgst_rate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
      },
      sgst_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      igst_rate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
      },
      igst_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      total_tax: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      grand_total: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      amount_in_words: {
        type: DataTypes.STRING(300),
      },
      tax_amount_in_words: {
        type: DataTypes.STRING(300),
      },
      // Bank details
      bank_holder_name: {
        type: DataTypes.STRING(200),
        defaultValue: "Satya Sankalp Services Private Limited",
      },
      bank_name: {
        type: DataTypes.STRING(100),
      },
      bank_account_no: {
        type: DataTypes.STRING(30),
      },
      bank_branch_ifsc: {
        type: DataTypes.STRING(100),
      },
      bank_swift_code: {
        type: DataTypes.STRING(20),
      },
      notes: {
        type: DataTypes.TEXT,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "draft",
        validate: {
          isIn: [["draft", "sent", "paid", "cancelled"]],
        },
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "invoices",
      timestamps: true,
    },
  );

  return Invoice;
};
