const { Op } = require("sequelize");
const {
  Booking,
  BookingService,
  BookingPayment,
  PaymentScreenshot,
  BookingRemark,
  BookingStageLog,
  BookingBDMSplit,
  BookingDocument,
  BookingApproval,
  Service,
  User,
} = require("../models");
const {
  createBooking,
  updateBookingStage,
  recalculateBookingTotals,
} = require("../services/booking.service");
const { createAuditLog, getAuditLogs } = require("../services/audit.service");
const { paginate } = require("../utils/helpers");
const { AUDIT_ACTIONS, ROLES, BOOKING_STAGES } = require("../config/constants");
const fs = require("fs");
const path = require("path");

const bookingIncludes = [
  { association: "bdm", attributes: ["id", "full_name", "employee_id"] },
  { association: "bdm2", attributes: ["id", "full_name", "employee_id"] },
  { association: "creator", attributes: ["id", "full_name"] },
  {
    association: "bookingServices",
    include: [
      {
        association: "service",
        attributes: ["id", "service_name", "service_code"],
      },
      { association: "assignedOpsUser", attributes: ["id", "full_name"] },
    ],
  },
];

exports.getBookings = async (req, res, next) => {
  try {
    const {
      search,
      stage,
      status,
      month,
      bdm_id,
      date_from,
      date_to,
      page,
      limit,
    } = req.query;
    const pagination = paginate(page, limit);

    const where = {};

    // Sales can only view their own bookings (BDM1 or BDM2)
    if (req.user.role === ROLES.SALES) {
      where[Op.or] = [{ bdm_id: req.user.id }, { bdm2_id: req.user.id }];
    }

    if (search) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { booking_number: { [Op.like]: `%${search}%` } },
          { client_name: { [Op.like]: `%${search}%` } },
          { company_name: { [Op.like]: `%${search}%` } },
          { mobile: { [Op.like]: `%${search}%` } },
        ],
      });
    }

    if (stage) {
      where.current_stage = stage;
    } else if (status === "active") {
      where.current_stage = { [Op.notIn]: ["completed", "cancelled"] };
    } else if (status === "completed") {
      where.current_stage = "completed";
    } else if (status === "cancelled") {
      where.current_stage = "cancelled";
    }

    if (bdm_id) where.bdm_id = bdm_id;

    // Month filter
    if (month) {
      const year = new Date().getFullYear();
      const monthInt = parseInt(month);
      const startDate = new Date(year, monthInt - 1, 1);
      const endDate = new Date(year, monthInt, 0, 23, 59, 59);
      where.created_at = {
        ...(where.created_at || {}),
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      };
    }

    if (date_from || date_to) {
      where.created_at = where.created_at || {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to) where.created_at[Op.lte] = new Date(date_to + "T23:59:59");
    }

    const { count, rows } = await Booking.findAndCountAll({
      where,
      include: [
        { association: "bdm", attributes: ["id", "full_name"] },
        { association: "bdm2", attributes: ["id", "full_name"] },
      ],
      order: [["created_at", "DESC"]],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    res.json({
      success: true,
      data: {
        bookings: rows,
        pagination: {
          total: count,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(count / pagination.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        ...bookingIncludes,
        {
          association: "payments",
          include: [
            { association: "creator", attributes: ["id", "full_name"] },
            { association: "verifier", attributes: ["id", "full_name"] },
            {
              association: "screenshots",
              attributes: [
                "id",
                "file_name",
                "original_name",
                "file_type",
                "file_size",
                "created_at",
              ],
            },
          ],
          order: [["created_at", "DESC"]],
        },
        {
          association: "documents",
          include: [
            { association: "uploader", attributes: ["id", "full_name"] },
          ],
        },
        {
          association: "approvals",
          include: [
            { association: "approver", attributes: ["id", "full_name"] },
          ],
        },
        {
          association: "remarks",
          include: [
            { association: "creator", attributes: ["id", "full_name"] },
          ],
        },
        {
          association: "bdmSplits",
          include: [
            { association: "bdmUser", attributes: ["id", "full_name"] },
          ],
        },
        {
          association: "stageLogs",
          include: [
            { association: "changer", attributes: ["id", "full_name"] },
          ],
        },
      ],
      order: [
        [{ model: BookingRemark, as: "remarks" }, "created_at", "DESC"],
        [{ model: BookingStageLog, as: "stageLogs" }, "created_at", "DESC"],
      ],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Sales users can only view their own bookings
    if (req.user.role === ROLES.SALES) {
      if (booking.bdm_id !== req.user.id && booking.bdm2_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied - not your booking",
        });
      }
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    let bookingData = req.body;
    let services = req.body.services;

    if (typeof services === "string") {
      services = JSON.parse(services);
    }

    const screenshots = req.files || [];

    const booking = await createBooking(
      req,
      bookingData,
      services,
      screenshots,
    );

    const fullBooking = await Booking.findByPk(booking.id, {
      include: bookingIncludes,
    });

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: fullBooking,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Sales users can only update their own bookings
    if (req.user.role === ROLES.SALES) {
      if (booking.bdm_id !== req.user.id && booking.bdm2_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied - not your booking",
        });
      }
    }

    const oldValues = booking.toJSON();
    await booking.update(req.body);

    if (req.body.bdm_id || req.body.bdm2_id) {
      await recalculateBookingTotals(booking.id);
    }

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "booking",
      entityId: booking.id,
      oldValue: oldValues,
      newValue: booking.toJSON(),
      description: `Booking ${booking.booking_number} updated`,
    });

    const updatedBooking = await Booking.findByPk(booking.id, {
      include: bookingIncludes,
    });

    res.json({
      success: true,
      message: "Booking updated successfully",
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateBookingServices = async (req, res, next) => {
  try {
    const { services } = req.body;
    const bookingId = req.params.id;

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Sales users can only update their own bookings
    if (req.user.role === ROLES.SALES) {
      if (booking.bdm_id !== req.user.id && booking.bdm2_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied - not your booking",
        });
      }
    }

    await BookingService.destroy({ where: { booking_id: bookingId } });

    for (const serviceData of services) {
      const service = await Service.findByPk(serviceData.service_id);
      if (!service) continue;

      const price = parseFloat(
        serviceData.custom_price || service.default_price,
      );
      const gstPercent = parseFloat(
        serviceData.gst_percentage ?? service.gst_percentage,
      );

      await BookingService.create({
        booking_id: bookingId,
        service_id: serviceData.service_id,
        custom_price: price,
        gst_percentage: gstPercent,
      });
    }

    await recalculateBookingTotals(bookingId);

    const updatedBooking = await Booking.findByPk(bookingId, {
      include: bookingIncludes,
    });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "booking",
      entityId: bookingId,
      description: `Services updated for booking ${booking.booking_number}`,
    });

    res.json({
      success: true,
      message: "Services updated successfully",
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

exports.changeStage = async (req, res, next) => {
  try {
    const { stage, reason } = req.body;

    const booking = await updateBookingStage(req, req.params.id, stage, reason);

    res.json({
      success: true,
      message: "Stage updated successfully",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

exports.addRemark = async (req, res, next) => {
  try {
    const { remark, remark_type } = req.body;

    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const newRemark = await BookingRemark.create({
      booking_id: booking.id,
      remark,
      remark_type: remark_type || "general",
      created_by: req.user.id,
    });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.CREATE,
      entityType: "booking_remark",
      entityId: newRemark.id,
      description: `Remark added to booking ${booking.booking_number}`,
    });

    const remarkWithUser = await BookingRemark.findByPk(newRemark.id, {
      include: [{ association: "creator", attributes: ["id", "full_name"] }],
    });

    res.status(201).json({
      success: true,
      message: "Remark added successfully",
      data: remarkWithUser,
    });
  } catch (error) {
    next(error);
  }
};

exports.getBookingActivity = async (req, res, next) => {
  try {
    const logs = await getAuditLogs("booking", req.params.id, 100);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

exports.getBookingStats = async (req, res, next) => {
  try {
    const where = {};

    if (req.user.role === ROLES.SALES) {
      where[Op.or] = [{ bdm_id: req.user.id }, { bdm2_id: req.user.id }];
    }

    const stats = await Booking.findAll({
      where,
      attributes: [
        "current_stage",
        [
          require("sequelize").fn("COUNT", require("sequelize").col("id")),
          "count",
        ],
        [
          require("sequelize").fn(
            "SUM",
            require("sequelize").col("total_amount"),
          ),
          "total_amount",
        ],
        [
          require("sequelize").fn(
            "SUM",
            require("sequelize").col("received_amount"),
          ),
          "received_amount",
        ],
      ],
      group: ["current_stage"],
      raw: true,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { association: "payments", include: [{ association: "screenshots" }] },
        { association: "documents" },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Sales users can only delete their own bookings
    if (req.user.role === ROLES.SALES) {
      if (booking.bdm_id !== req.user.id && booking.bdm2_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied - not your booking",
        });
      }
    }

    for (const payment of booking.payments || []) {
      for (const screenshot of payment.screenshots || []) {
        try {
          fs.unlinkSync(path.resolve(screenshot.file_path));
        } catch (e) {
          console.error("Error deleting screenshot:", e);
        }
      }
    }

    for (const doc of booking.documents || []) {
      try {
        fs.unlinkSync(path.resolve(doc.file_path));
      } catch (e) {
        console.error("Error deleting document:", e);
      }
    }

    const bookingNumber = booking.booking_number;
    const bookingId = booking.id;

    await PaymentScreenshot.destroy({
      where: {
        payment_id: { [Op.in]: booking.payments.map((p) => p.id) },
      },
    });
    await BookingPayment.destroy({ where: { booking_id: bookingId } });
    await BookingDocument.destroy({ where: { booking_id: bookingId } });
    await BookingApproval.destroy({ where: { booking_id: bookingId } });
    await BookingStageLog.destroy({ where: { booking_id: bookingId } });
    await BookingRemark.destroy({ where: { booking_id: bookingId } });
    await BookingBDMSplit.destroy({ where: { booking_id: bookingId } });
    await BookingService.destroy({ where: { booking_id: bookingId } });
    await booking.destroy();

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.DELETE,
      entityType: "booking",
      entityId: bookingId,
      oldValue: { booking_number: bookingNumber },
      description: `Booking ${bookingNumber} deleted`,
    });

    res.json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
