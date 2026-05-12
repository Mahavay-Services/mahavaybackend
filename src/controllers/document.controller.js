const { Op } = require("sequelize");
const {
  Booking,
  BookingDocument,
  BookingApproval,
  User,
} = require("../models");
const { updateBookingStage } = require("../services/booking.service");
const { createAuditLog } = require("../services/audit.service");
const {
  AUDIT_ACTIONS,
  VERIFICATION_STATUS,
  BOOKING_STAGES,
  APPROVAL_TYPES,
} = require("../config/constants");
const path = require("path");
const fs = require("fs");

const DOCUMENT_TYPES = [
  "agreement",
  "nda",
  "invoice",
  "pan_copy",
  "gst_copy",
  "payment_receipt",
  "service_document",
  "other",
];

exports.getDocuments = async (req, res, next) => {
  try {
    const { booking_id, document_type } = req.query;

    const where = {};
    if (booking_id) where.booking_id = booking_id;
    if (document_type) where.document_type = document_type;

    const documents = await BookingDocument.findAll({
      where,
      include: [
        { association: "booking", attributes: ["id", "booking_number"] },
        { association: "uploader", attributes: ["id", "full_name"] },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    const { booking_id, document_type, remarks } = req.body;

    const booking = await Booking.findByPk(booking_id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const existingDocs = await BookingDocument.count({
      where: { booking_id, document_type },
    });

    const document = await BookingDocument.create({
      booking_id,
      document_type,
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      uploaded_by: req.user.id,
      version_number: existingDocs + 1,
      remarks,
    });

    if (
      document_type === "agreement" &&
      booking.current_stage === BOOKING_STAGES.ACCOUNTS_VERIFIED
    ) {
      await booking.update({ current_stage: BOOKING_STAGES.LEGAL_PENDING });
    }

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.UPLOAD,
      entityType: "document",
      entityId: document.id,
      newValue: { document_type, file_name: req.file.originalname },
      description: `${document_type} uploaded for booking ${booking.booking_number}`,
    });

    const documentWithRelations = await BookingDocument.findByPk(document.id, {
      include: [{ association: "uploader", attributes: ["id", "full_name"] }],
    });

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: documentWithRelations,
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadDocument = async (req, res, next) => {
  try {
    const document = await BookingDocument.findByPk(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const absolutePath = path.resolve(document.file_path);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server",
      });
    }

    res.download(absolutePath, document.file_name);
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await BookingDocument.findByPk(req.params.id, {
      include: [{ association: "booking" }],
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    try {
      fs.unlinkSync(document.file_path);
    } catch (e) {
      console.error("Error deleting file:", e);
    }

    await document.destroy();

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.DELETE,
      entityType: "document",
      entityId: req.params.id,
      oldValue: {
        document_type: document.document_type,
        file_name: document.file_name,
      },
      description: `Document deleted from booking ${document.booking.booking_number}`,
    });

    res.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getPendingLegalApprovals = async (req, res, next) => {
  try {
    const bookings = await Booking.findAll({
      where: { current_stage: BOOKING_STAGES.LEGAL_PENDING },
      include: [
        { association: "bdm", attributes: ["id", "full_name"] },
        {
          association: "documents",
          where: { document_type: "agreement" },
          required: false,
        },
      ],
      order: [["created_at", "ASC"]],
    });

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

exports.approveLegal = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const bookingId = req.params.bookingId;

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    await BookingApproval.create({
      booking_id: bookingId,
      approval_type: APPROVAL_TYPES.LEGAL,
      status: VERIFICATION_STATUS.VERIFIED,
      approved_by: req.user.id,
      approved_at: new Date(),
      remarks,
    });

    await booking.update({
      legal_verified: true,
      current_stage: BOOKING_STAGES.LEGAL_VERIFIED,
    });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.APPROVE,
      entityType: "booking",
      entityId: bookingId,
      newValue: { legal_verified: true },
      description: `Legal approval granted for booking ${booking.booking_number}`,
    });

    res.json({
      success: true,
      message: "Legal approval granted",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

exports.rejectLegal = async (req, res, next) => {
  try {
    const { rejection_reason, remarks } = req.body;
    const bookingId = req.params.bookingId;

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    await BookingApproval.create({
      booking_id: bookingId,
      approval_type: APPROVAL_TYPES.LEGAL,
      status: VERIFICATION_STATUS.REJECTED,
      approved_by: req.user.id,
      approved_at: new Date(),
      rejection_reason,
      remarks,
    });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.REJECT,
      entityType: "booking",
      entityId: bookingId,
      newValue: { rejection_reason },
      description: `Legal approval rejected for booking ${booking.booking_number}`,
    });

    res.json({
      success: true,
      message: "Legal approval rejected",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

exports.sendBackForCorrections = async (req, res, next) => {
  try {
    const { correction_notes, remarks } = req.body;
    const bookingId = req.params.bookingId;

    if (!correction_notes?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Correction notes are required",
      });
    }

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    await BookingApproval.create({
      booking_id: bookingId,
      approval_type: APPROVAL_TYPES.LEGAL,
      status: "correction_needed",
      approved_by: req.user.id,
      approved_at: new Date(),
      rejection_reason: correction_notes,
      remarks,
    });

    await booking.update({ current_stage: BOOKING_STAGES.ACCOUNTS_VERIFIED });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "booking",
      entityId: bookingId,
      newValue: { correction_notes },
      description: `Booking ${booking.booking_number} sent back for corrections`,
    });

    res.json({
      success: true,
      message: "Booking sent back for corrections",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDocument = async (req, res, next) => {
  try {
    const { document_type, remarks } = req.body;
    const document = await BookingDocument.findByPk(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const oldValues = document.toJSON();

    if (req.file) {
      try {
        fs.unlinkSync(document.file_path);
      } catch (e) {
        console.error("Error deleting old file:", e);
      }

      const existingDocs = await BookingDocument.count({
        where: {
          booking_id: document.booking_id,
          document_type: document_type || document.document_type,
        },
      });

      await document.update({
        document_type: document_type || document.document_type,
        file_name: req.file.originalname,
        file_path: req.file.path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        version_number: existingDocs + 1,
        remarks: remarks || document.remarks,
      });
    } else {
      await document.update({
        document_type: document_type || document.document_type,
        remarks: remarks !== undefined ? remarks : document.remarks,
      });
    }

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "document",
      entityId: document.id,
      oldValue: oldValues,
      newValue: document.toJSON(),
      description: `Document updated`,
    });

    const updatedDoc = await BookingDocument.findByPk(document.id, {
      include: [{ association: "uploader", attributes: ["id", "full_name"] }],
    });

    res.json({
      success: true,
      message: "Document updated successfully",
      data: updatedDoc,
    });
  } catch (error) {
    next(error);
  }
};

exports.getDocumentTypes = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: DOCUMENT_TYPES.map((type) => ({
        value: type,
        label: type
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.getLegalStats = async (req, res, next) => {
  try {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const [pending, approved, rejected, corrections, recentApprovals] =
      await Promise.all([
        Booking.count({
          where: { current_stage: BOOKING_STAGES.LEGAL_PENDING },
        }),
        Booking.count({
          where: {
            legal_verified: true,
            updated_at: { [Op.gte]: startOfMonth },
          },
        }),
        BookingApproval.count({
          where: {
            approval_type: APPROVAL_TYPES.LEGAL,
            status: VERIFICATION_STATUS.REJECTED,
            created_at: { [Op.gte]: startOfMonth },
          },
        }),
        BookingApproval.count({
          where: {
            approval_type: APPROVAL_TYPES.LEGAL,
            status: "correction_needed",
            created_at: { [Op.gte]: startOfMonth },
          },
        }),
        BookingApproval.findAll({
          where: { approval_type: APPROVAL_TYPES.LEGAL },
          include: [
            {
              association: "booking",
              attributes: ["id", "booking_number", "client_name"],
            },
            { association: "approver", attributes: ["id", "full_name"] },
          ],
          order: [["created_at", "DESC"]],
          limit: 10,
        }),
      ]);

    res.json({
      success: true,
      data: {
        pending,
        approved,
        rejected,
        corrections,
        recentApprovals,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getApprovalHistory = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const approvals = await BookingApproval.findAll({
      where: { booking_id: bookingId },
      include: [
        { association: "approver", attributes: ["id", "full_name", "role"] },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: approvals,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllLegalBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status === "pending") {
      where.current_stage = BOOKING_STAGES.LEGAL_PENDING;
    } else if (status === "approved") {
      where.legal_verified = true;
    } else {
      // "All Bookings" tab - show only accounts verified bookings
      where.accounts_verified = true;
    }

    const { count, rows } = await Booking.findAndCountAll({
      where,
      include: [
        { association: "bdm", attributes: ["id", "full_name"] },
        { association: "documents", required: false },
        {
          association: "approvals",
          where: { approval_type: APPROVAL_TYPES.LEGAL },
          required: false,
          include: [
            { association: "approver", attributes: ["id", "full_name"] },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: {
        bookings: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
