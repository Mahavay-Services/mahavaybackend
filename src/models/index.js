const { Sequelize } = require("sequelize");
const config = require("../config/database");

const env = process.env.NODE_ENV || "development";
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: dbConfig.define,
  },
);

const User = require("./User")(sequelize);
const Service = require("./Service")(sequelize);
const Booking = require("./Booking")(sequelize);
const BookingService = require("./BookingService")(sequelize);
const BookingPayment = require("./BookingPayment")(sequelize);
const PaymentScreenshot = require("./PaymentScreenshot")(sequelize);
const BookingDocument = require("./BookingDocument")(sequelize);
const BookingApproval = require("./BookingApproval")(sequelize);
const BookingStageLog = require("./BookingStageLog")(sequelize);
const BookingRemark = require("./BookingRemark")(sequelize);
const BookingBDMSplit = require("./BookingBDMSplit")(sequelize);
const Operation = require("./Operation")(sequelize);
const AuditLog = require("./AuditLog")(sequelize);
const RefreshToken = require("./RefreshToken")(sequelize);
const Quotation = require("./Quotation")(sequelize);
const Setting = require("./Setting")(sequelize);
const Invoice = require("./Invoice")(sequelize);

User.hasMany(Booking, { foreignKey: "bdm_id", as: "bdmBookings" });
User.hasMany(Booking, { foreignKey: "bdm2_id", as: "bdm2Bookings" });
User.hasMany(Booking, { foreignKey: "created_by", as: "createdBookings" });
Booking.belongsTo(User, { foreignKey: "bdm_id", as: "bdm" });
Booking.belongsTo(User, { foreignKey: "bdm2_id", as: "bdm2" });
Booking.belongsTo(User, { foreignKey: "created_by", as: "creator" });

Booking.hasMany(BookingService, {
  foreignKey: "booking_id",
  as: "bookingServices",
});
BookingService.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
BookingService.belongsTo(Service, { foreignKey: "service_id", as: "service" });
Service.hasMany(BookingService, {
  foreignKey: "service_id",
  as: "bookingServices",
});

BookingService.belongsTo(User, {
  foreignKey: "assigned_ops_user_id",
  as: "assignedOpsUser",
});

Booking.hasMany(BookingPayment, { foreignKey: "booking_id", as: "payments" });
BookingPayment.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
BookingPayment.belongsTo(User, { foreignKey: "created_by", as: "creator" });
BookingPayment.belongsTo(User, { foreignKey: "verified_by", as: "verifier" });

BookingPayment.hasMany(PaymentScreenshot, {
  foreignKey: "payment_id",
  as: "screenshots",
});
PaymentScreenshot.belongsTo(BookingPayment, {
  foreignKey: "payment_id",
  as: "payment",
});
PaymentScreenshot.belongsTo(User, {
  foreignKey: "uploaded_by",
  as: "uploader",
});

Booking.hasMany(BookingDocument, { foreignKey: "booking_id", as: "documents" });
BookingDocument.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
BookingDocument.belongsTo(User, { foreignKey: "uploaded_by", as: "uploader" });

Booking.hasMany(BookingApproval, { foreignKey: "booking_id", as: "approvals" });
BookingApproval.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
BookingApproval.belongsTo(User, { foreignKey: "approved_by", as: "approver" });

Booking.hasMany(BookingStageLog, { foreignKey: "booking_id", as: "stageLogs" });
BookingStageLog.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
BookingStageLog.belongsTo(User, { foreignKey: "changed_by", as: "changer" });

Booking.hasMany(BookingRemark, { foreignKey: "booking_id", as: "remarks" });
BookingRemark.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
BookingRemark.belongsTo(User, { foreignKey: "created_by", as: "creator" });

Booking.hasMany(BookingBDMSplit, { foreignKey: "booking_id", as: "bdmSplits" });
BookingBDMSplit.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
BookingBDMSplit.belongsTo(User, { foreignKey: "user_id", as: "bdmUser" });

BookingService.hasMany(Operation, {
  foreignKey: "booking_service_id",
  as: "operations",
});
Operation.belongsTo(BookingService, {
  foreignKey: "booking_service_id",
  as: "bookingService",
});
Operation.belongsTo(User, { foreignKey: "assigned_to", as: "assignee" });
Operation.belongsTo(User, { foreignKey: "created_by", as: "creator" });

User.hasMany(RefreshToken, { foreignKey: "user_id", as: "refreshTokens" });
RefreshToken.belongsTo(User, { foreignKey: "user_id", as: "user" });

User.hasMany(AuditLog, { foreignKey: "user_id", as: "auditLogs" });
AuditLog.belongsTo(User, { foreignKey: "user_id", as: "user" });

User.hasMany(Quotation, { foreignKey: "created_by", as: "quotations" });
Quotation.belongsTo(User, { foreignKey: "created_by", as: "creator" });

User.hasMany(Invoice, { foreignKey: "created_by", as: "invoices" });
Invoice.belongsTo(User, { foreignKey: "created_by", as: "creator" });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Service,
  Booking,
  BookingService,
  BookingPayment,
  PaymentScreenshot,
  BookingDocument,
  BookingApproval,
  BookingStageLog,
  BookingRemark,
  BookingBDMSplit,
  Operation,
  AuditLog,
  RefreshToken,
  Quotation,
  Setting,
  Invoice,
};
