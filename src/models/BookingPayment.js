const { DataTypes } = require("sequelize");
const { PAYMENT_MODES, VERIFICATION_STATUS } = require("../config/constants");

module.exports = (sequelize) => {
  const BookingPayment = sequelize.define(
    "BookingPayment",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "bookings",
          key: "id",
        },
      },
      payment_type: {
        type: DataTypes.ENUM("initial", "remaining"),
        defaultValue: "initial",
      },
      payment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      payment_mode: {
        type: DataTypes.ENUM(...Object.values(PAYMENT_MODES)),
        allowNull: false,
      },
      payment_reference: {
        type: DataTypes.STRING(100),
      },
      base_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      gst_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
      },
      total_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      received_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      verified_amount: {
        type: DataTypes.DECIMAL(12, 2),
      },
      verification_status: {
        type: DataTypes.ENUM(...Object.values(VERIFICATION_STATUS)),
        defaultValue: VERIFICATION_STATUS.PENDING,
      },
      verified_by: {
        type: DataTypes.INTEGER,
        references: {
          model: "users",
          key: "id",
        },
      },
      verified_at: {
        type: DataTypes.DATE,
      },
      rejection_reason: {
        type: DataTypes.TEXT,
      },
      remarks: {
        type: DataTypes.TEXT,
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
      tableName: "booking_payments",
      indexes: [
        { fields: ["booking_id"] },
        { fields: ["verification_status"] },
        { fields: ["payment_date"] },
        { fields: ["payment_type"] },
      ],
    },
  );

  return BookingPayment;
};
