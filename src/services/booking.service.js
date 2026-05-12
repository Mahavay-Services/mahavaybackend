const {
  sequelize,
  Booking,
  BookingService,
  BookingBDMSplit,
  BookingStageLog,
  BookingPayment,
  PaymentScreenshot,
  Service,
} = require("../models");
const {
  generateBookingNumber,
  calculateBookingTotals,
  calculateBDMSplits,
} = require("../utils/helpers");
const {
  BOOKING_STAGES,
  AUDIT_ACTIONS,
  VERIFICATION_STATUS,
} = require("../config/constants");
const { createAuditLog } = require("./audit.service");

const createBooking = async (
  req,
  bookingData,
  servicesData,
  screenshots = [],
) => {
  const transaction = await sequelize.transaction();

  try {
    const bookingNumber = await generateBookingNumber(Booking);

    const totals = calculateBookingTotals(servicesData);
    const receivedAmount = parseFloat(bookingData.received_amount) || 0;

    const booking = await Booking.create(
      {
        booking_number: bookingNumber,
        ...bookingData,
        subtotal_amount: totals.subtotal_amount,
        gst_amount: totals.gst_amount,
        total_amount: totals.total_amount,
        received_amount: receivedAmount,
        pending_amount: totals.total_amount - receivedAmount,
        booking_date:
          bookingData.booking_date || new Date().toISOString().split("T")[0],
        current_stage:
          receivedAmount > 0
            ? BOOKING_STAGES.ACCOUNTS_VERIFICATION_PENDING
            : BOOKING_STAGES.SALES_CREATED,
        created_by: req.user.id,
      },
      { transaction },
    );

    for (const serviceData of servicesData) {
      const service = await Service.findByPk(serviceData.service_id);
      if (!service) continue;

      const price = parseFloat(
        serviceData.custom_price || service.default_price,
      );
      const gstPercent = parseFloat(
        serviceData.gst_percentage ?? service.gst_percentage,
      );
      const gstAmount = (price * gstPercent) / 100;

      await BookingService.create(
        {
          booking_id: booking.id,
          service_id: serviceData.service_id,
          custom_price: price,
          gst_percentage: gstPercent,
          gst_amount: gstAmount,
          final_amount: price + gstAmount,
        },
        { transaction },
      );
    }

    const splits = calculateBDMSplits(
      totals.total_amount,
      booking.bdm_id,
      booking.bdm2_id,
    );
    for (const split of splits) {
      await BookingBDMSplit.create(
        {
          booking_id: booking.id,
          ...split,
        },
        { transaction },
      );
    }

    if (receivedAmount > 0) {
      const payment = await BookingPayment.create(
        {
          booking_id: booking.id,
          payment_date: new Date(),
          payment_mode: bookingData.payment_mode || "upi",
          payment_type: "initial",
          base_amount: receivedAmount,
          gst_amount: 0,
          total_amount: receivedAmount,
          received_amount: receivedAmount,
          verification_status: VERIFICATION_STATUS.PENDING,
          remarks: "Initial payment during booking creation",
          created_by: req.user.id,
        },
        { transaction },
      );

      for (const file of screenshots) {
        await PaymentScreenshot.create(
          {
            payment_id: payment.id,
            file_name: file.filename,
            original_name: file.originalname,
            file_path: file.path,
            file_type: file.mimetype,
            file_size: file.size,
            uploaded_by: req.user.id,
          },
          { transaction },
        );
      }
    }

    const initialStage =
      receivedAmount > 0
        ? BOOKING_STAGES.ACCOUNTS_VERIFICATION_PENDING
        : BOOKING_STAGES.SALES_CREATED;

    await BookingStageLog.create(
      {
        booking_id: booking.id,
        from_stage: null,
        to_stage: initialStage,
        changed_by: req.user.id,
        reason:
          receivedAmount > 0
            ? "Booking created with initial payment"
            : "Booking created",
      },
      { transaction },
    );

    await transaction.commit();

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.CREATE,
      entityType: "booking",
      entityId: booking.id,
      newValue: {
        booking_number: bookingNumber,
        total_amount: totals.total_amount,
        received_amount: receivedAmount,
      },
      description: `Booking ${bookingNumber} created${receivedAmount > 0 ? " with initial payment of ₹" + receivedAmount : ""}`,
    });

    return booking;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateBookingStage = async (req, bookingId, newStage, reason = null) => {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw new Error("Booking not found");

  const oldStage = booking.current_stage;

  await booking.update({ current_stage: newStage });

  await BookingStageLog.create({
    booking_id: bookingId,
    from_stage: oldStage,
    to_stage: newStage,
    changed_by: req.user.id,
    reason,
  });

  await createAuditLog(req, {
    action: AUDIT_ACTIONS.STAGE_CHANGE,
    entityType: "booking",
    entityId: bookingId,
    oldValue: { stage: oldStage },
    newValue: { stage: newStage },
    description: `Stage changed from ${oldStage} to ${newStage}`,
  });

  return booking;
};

const recalculateBookingTotals = async (bookingId) => {
  const bookingServices = await BookingService.findAll({
    where: { booking_id: bookingId },
  });

  let subtotal = 0;
  let gstTotal = 0;

  for (const bs of bookingServices) {
    subtotal += parseFloat(bs.custom_price) || 0;
    gstTotal += parseFloat(bs.gst_amount) || 0;
  }

  const total = subtotal + gstTotal;

  const booking = await Booking.findByPk(bookingId);
  const receivedAmount = parseFloat(booking.received_amount) || 0;

  await booking.update({
    subtotal_amount: subtotal,
    gst_amount: gstTotal,
    total_amount: total,
    pending_amount: total - receivedAmount,
  });

  const splits = calculateBDMSplits(total, booking.bdm_id, booking.bdm2_id);
  await BookingBDMSplit.destroy({ where: { booking_id: bookingId } });
  for (const split of splits) {
    await BookingBDMSplit.create({ booking_id: bookingId, ...split });
  }

  return booking;
};

module.exports = {
  createBooking,
  updateBookingStage,
  recalculateBookingTotals,
};
