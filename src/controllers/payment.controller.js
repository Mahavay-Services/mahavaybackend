const { Op } = require("sequelize");
const { Booking, BookingPayment, PaymentScreenshot } = require("../models");
const { recalculateBookingTotals } = require("../services/booking.service");
const { createAuditLog } = require("../services/audit.service");
const { paginate } = require("../utils/helpers");
const {
  AUDIT_ACTIONS,
  VERIFICATION_STATUS,
  BOOKING_STAGES,
  ROLES,
} = require("../config/constants");
const path = require("path");
const fs = require("fs");

exports.getPayments = async (req, res, next) => {
  try {
    const { booking_id, status, date_from, date_to, page, limit } = req.query;
    const pagination = paginate(page, limit);

    const where = {};
    const bookingWhere = {};

    // Sales users can only see payments for their own bookings (BDM1 or BDM2)
    if (req.user.role === ROLES.SALES) {
      bookingWhere[Op.or] = [{ bdm_id: req.user.id }, { bdm2_id: req.user.id }];
    }

    if (booking_id) where.booking_id = booking_id;
    if (status) where.verification_status = status;

    if (date_from || date_to) {
      where.payment_date = {};
      if (date_from) where.payment_date[Op.gte] = date_from;
      if (date_to) where.payment_date[Op.lte] = date_to;
    }

    const { count, rows } = await BookingPayment.findAndCountAll({
      where,
      include: [
        {
          association: "booking",
          attributes: [
            "id",
            "booking_number",
            "client_name",
            "bdm_id",
            "bdm2_id",
          ],
          where:
            Object.keys(bookingWhere).length > 0 ? bookingWhere : undefined,
          required: Object.keys(bookingWhere).length > 0,
        },
        { association: "creator", attributes: ["id", "full_name"] },
        { association: "verifier", attributes: ["id", "full_name"] },
        {
          association: "screenshots",
          attributes: ["id", "file_name", "original_name", "file_type"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    res.json({
      success: true,
      data: {
        payments: rows,
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

exports.getPendingPayments = async (req, res, next) => {
  try {
    const bookingWhere = {};

    // Sales users can only see pending payments for their own bookings
    if (req.user.role === ROLES.SALES) {
      bookingWhere[Op.or] = [{ bdm_id: req.user.id }, { bdm2_id: req.user.id }];
    }

    const payments = await BookingPayment.findAll({
      where: { verification_status: VERIFICATION_STATUS.PENDING },
      include: [
        {
          association: "booking",
          attributes: [
            "id",
            "booking_number",
            "client_name",
            "total_amount",
            "bdm_id",
            "bdm2_id",
          ],
          where:
            Object.keys(bookingWhere).length > 0 ? bookingWhere : undefined,
          required: Object.keys(bookingWhere).length > 0,
        },
        { association: "creator", attributes: ["id", "full_name"] },
        {
          association: "screenshots",
          attributes: ["id", "file_name", "original_name", "file_type"],
        },
      ],
      order: [["created_at", "ASC"]],
    });

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

exports.createPayment = async (req, res, next) => {
  try {
    const paymentData = { ...req.body, created_by: req.user.id };

    const booking = await Booking.findByPk(paymentData.booking_id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const payment = await BookingPayment.create(paymentData);

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await PaymentScreenshot.create({
          payment_id: payment.id,
          file_name: file.filename,
          original_name: file.originalname,
          file_path: file.path,
          file_type: file.mimetype,
          file_size: file.size,
          uploaded_by: req.user.id,
        });
      }
    }

    if (booking.current_stage === BOOKING_STAGES.SALES_CREATED) {
      await booking.update({
        current_stage: BOOKING_STAGES.ACCOUNTS_VERIFICATION_PENDING,
      });
    }

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.CREATE,
      entityType: "payment",
      entityId: payment.id,
      newValue: {
        amount: payment.received_amount,
        booking_id: payment.booking_id,
        screenshots_count: req.files?.length || 0,
      },
      description: `Payment of ₹${payment.received_amount} added to booking ${booking.booking_number}`,
    });

    const paymentWithRelations = await BookingPayment.findByPk(payment.id, {
      include: [
        { association: "booking", attributes: ["id", "booking_number"] },
        { association: "creator", attributes: ["id", "full_name"] },
        { association: "screenshots" },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: paymentWithRelations,
    });
  } catch (error) {
    next(error);
  }
};

exports.addRemainingPayment = async (req, res, next) => {
  try {
    const {
      booking_id,
      received_amount,
      payment_mode,
      payment_date,
      payment_reference,
      remarks,
    } = req.body;

    const booking = await Booking.findByPk(booking_id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const payment = await BookingPayment.create({
      booking_id,
      payment_type: "remaining",
      payment_date: payment_date || new Date(),
      payment_mode,
      payment_reference,
      base_amount: received_amount,
      gst_amount: 0,
      total_amount: received_amount,
      received_amount,
      remarks,
      created_by: req.user.id,
    });

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await PaymentScreenshot.create({
          payment_id: payment.id,
          file_name: file.filename,
          original_name: file.originalname,
          file_path: file.path,
          file_type: file.mimetype,
          file_size: file.size,
          uploaded_by: req.user.id,
        });
      }
    }

    if (
      booking.current_stage === BOOKING_STAGES.ACCOUNTS_VERIFIED ||
      booking.current_stage === BOOKING_STAGES.LEGAL_VERIFIED ||
      booking.current_stage === BOOKING_STAGES.OPERATIONS_STARTED
    ) {
      await booking.update({
        current_stage: BOOKING_STAGES.ACCOUNTS_VERIFICATION_PENDING,
      });
    }

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.CREATE,
      entityType: "payment",
      entityId: payment.id,
      newValue: {
        amount: received_amount,
        type: "remaining",
        booking_id,
      },
      description: `Remaining payment of ₹${received_amount} added to booking ${booking.booking_number}`,
    });

    const paymentWithRelations = await BookingPayment.findByPk(payment.id, {
      include: [
        { association: "booking", attributes: ["id", "booking_number"] },
        { association: "creator", attributes: ["id", "full_name"] },
        { association: "screenshots" },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Remaining payment added successfully",
      data: paymentWithRelations,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { verification_status, verified_amount, rejection_reason, remarks } =
      req.body;

    const payment = await BookingPayment.findByPk(req.params.id, {
      include: [{ association: "booking" }],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.verification_status !== VERIFICATION_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: "Payment already verified",
      });
    }

    const verifiedAmt = verified_amount
      ? parseFloat(verified_amount)
      : parseFloat(payment.received_amount);

    await payment.update({
      verification_status,
      verified_amount: verifiedAmt,
      verified_by: req.user.id,
      verified_at: new Date(),
      rejection_reason:
        verification_status === VERIFICATION_STATUS.REJECTED
          ? rejection_reason
          : null,
      remarks,
    });

    if (verification_status === VERIFICATION_STATUS.VERIFIED) {
      const booking = payment.booking;
      const newReceivedAmount =
        parseFloat(booking.received_amount) + verifiedAmt;

      await booking.update({
        received_amount: newReceivedAmount,
        pending_amount: parseFloat(booking.total_amount) - newReceivedAmount,
        accounts_verified: true,
        current_stage: BOOKING_STAGES.ACCOUNTS_VERIFIED,
      });
    }

    await createAuditLog(req, {
      action:
        verification_status === VERIFICATION_STATUS.VERIFIED
          ? AUDIT_ACTIONS.APPROVE
          : AUDIT_ACTIONS.REJECT,
      entityType: "payment",
      entityId: payment.id,
      newValue: { status: verification_status, verified_amount: verifiedAmt },
      description: `Payment ${verification_status} for booking ${payment.booking.booking_number}`,
    });

    res.json({
      success: true,
      message: `Payment ${verification_status} successfully`,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadScreenshots = async (req, res, next) => {
  try {
    const payment = await BookingPayment.findByPk(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const screenshots = [];
    for (const file of req.files) {
      const screenshot = await PaymentScreenshot.create({
        payment_id: payment.id,
        file_name: file.filename,
        original_name: file.originalname,
        file_path: file.path,
        file_type: file.mimetype,
        file_size: file.size,
        uploaded_by: req.user.id,
      });
      screenshots.push(screenshot);
    }

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.UPLOAD,
      entityType: "payment",
      entityId: payment.id,
      description: `${req.files.length} screenshot(s) uploaded`,
    });

    res.json({
      success: true,
      message: "Screenshots uploaded successfully",
      data: screenshots,
    });
  } catch (error) {
    next(error);
  }
};

exports.getScreenshot = async (req, res, next) => {
  try {
    const screenshot = await PaymentScreenshot.findByPk(
      req.params.screenshotId,
    );

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        message: "Screenshot not found",
      });
    }

    const absolutePath = path.resolve(screenshot.file_path);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    res.sendFile(absolutePath);
  } catch (error) {
    next(error);
  }
};

exports.deleteScreenshot = async (req, res, next) => {
  try {
    const screenshot = await PaymentScreenshot.findByPk(
      req.params.screenshotId,
      {
        include: [
          { association: "payment", include: [{ association: "booking" }] },
        ],
      },
    );

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        message: "Screenshot not found",
      });
    }

    try {
      fs.unlinkSync(path.resolve(screenshot.file_path));
    } catch (e) {
      console.error("Error deleting file:", e);
    }

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.DELETE,
      entityType: "payment_screenshot",
      entityId: screenshot.id,
      oldValue: { file_name: screenshot.original_name },
      description: `Screenshot deleted from payment`,
    });

    await screenshot.destroy();

    res.json({
      success: true,
      message: "Screenshot deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentDetails = async (req, res, next) => {
  try {
    const payment = await BookingPayment.findByPk(req.params.id, {
      include: [
        {
          association: "booking",
          attributes: [
            "id",
            "booking_number",
            "client_name",
            "total_amount",
            "pending_amount",
            "bdm_id",
            "bdm2_id",
          ],
        },
        { association: "creator", attributes: ["id", "full_name"] },
        { association: "verifier", attributes: ["id", "full_name"] },
        {
          association: "screenshots",
          include: [
            { association: "uploader", attributes: ["id", "full_name"] },
          ],
        },
      ],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Sales users can only view payments for their own bookings
    if (req.user.role === ROLES.SALES) {
      const booking = payment.booking;
      if (booking.bdm_id !== req.user.id && booking.bdm2_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied - not your booking",
        });
      }
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};
