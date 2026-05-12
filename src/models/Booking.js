const { DataTypes } = require("sequelize");
const {
  BOOKING_STAGES,
  PAYMENT_TERMS,
  PAYMENT_MODES,
  AGREEMENT_TYPES,
  LEAD_SOURCES,
} = require("../config/constants");

module.exports = (sequelize) => {
  const Booking = sequelize.define(
    "Booking",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      booking_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      client_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      company_name: {
        type: DataTypes.STRING(150),
      },
      mobile: {
        type: DataTypes.STRING(15),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(100),
        validate: {
          isEmail: true,
        },
      },
      pan_number: {
        type: DataTypes.STRING(10),
      },
      gst_number: {
        type: DataTypes.STRING(15),
      },
      address: {
        type: DataTypes.TEXT,
      },
      city: {
        type: DataTypes.STRING(50),
      },
      state: {
        type: DataTypes.STRING(50),
      },
      bdm_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      bdm2_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "users",
          key: "id",
        },
      },
      lead_source: {
        type: DataTypes.ENUM(...LEAD_SOURCES),
        defaultValue: "Other",
      },
      subtotal_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
      },
      gst_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
      },
      total_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
      },
      received_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
      },
      pending_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
      },
      payment_terms: {
        type: DataTypes.ENUM(...Object.values(PAYMENT_TERMS)),
        defaultValue: PAYMENT_TERMS.ADVANCE,
      },
      payment_mode: {
        type: DataTypes.ENUM(...Object.values(PAYMENT_MODES)),
      },
      agreement_type: {
        type: DataTypes.ENUM(...Object.values(AGREEMENT_TYPES)),
      },
      current_stage: {
        type: DataTypes.ENUM(...Object.values(BOOKING_STAGES)),
        defaultValue: BOOKING_STAGES.SALES_CREATED,
      },
      accounts_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      legal_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      ops_started: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      booking_date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
    },
    {
      tableName: "bookings",
      indexes: [
        { fields: ["booking_number"] },
        { fields: ["client_name"] },
        { fields: ["mobile"] },
        { fields: ["bdm_id"] },
        { fields: ["bdm2_id"] },
        { fields: ["current_stage"] },
        { fields: ["created_at"] },
      ],
    },
  );

  return Booking;
};
