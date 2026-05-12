const { Op } = require("sequelize");
const {
  sequelize,
  Booking,
  BookingPayment,
  BookingBDMSplit,
  Operation,
  User,
  Quotation,
} = require("../models");
const {
  VERIFICATION_STATUS,
  BOOKING_STAGES,
  OPERATION_STATUS,
} = require("../config/constants");

exports.getDailyCollections = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const collections = await BookingPayment.findAll({
      where: {
        verification_status: VERIFICATION_STATUS.VERIFIED,
        verified_at: { [Op.between]: [startOfDay, endOfDay] },
      },
      include: [
        {
          association: "booking",
          attributes: ["id", "booking_number", "client_name"],
        },
        { association: "verifier", attributes: ["id", "full_name"] },
      ],
      order: [["verified_at", "DESC"]],
    });

    const total = collections.reduce(
      (sum, p) => sum + parseFloat(p.received_amount),
      0,
    );

    res.json({
      success: true,
      data: {
        date: startOfDay.toISOString().split("T")[0],
        total,
        count: collections.length,
        collections,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMonthlyCollections = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const dailyCollections = await BookingPayment.findAll({
      where: {
        verification_status: VERIFICATION_STATUS.VERIFIED,
        verified_at: { [Op.between]: [startOfMonth, endOfMonth] },
      },
      attributes: [
        [sequelize.fn("DATE", sequelize.col("verified_at")), "date"],
        [sequelize.fn("SUM", sequelize.col("received_amount")), "total"],
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: [sequelize.fn("DATE", sequelize.col("verified_at"))],
      order: [[sequelize.fn("DATE", sequelize.col("verified_at")), "ASC"]],
      raw: true,
    });

    const monthTotal = dailyCollections.reduce(
      (sum, d) => sum + parseFloat(d.total),
      0,
    );

    res.json({
      success: true,
      data: {
        year: targetYear,
        month: targetMonth,
        total: monthTotal,
        dailyBreakdown: dailyCollections,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getGSTReport = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const where = {
      verification_status: VERIFICATION_STATUS.VERIFIED,
    };

    if (start_date && end_date) {
      where.verified_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + "T23:59:59")],
      };
    }

    const payments = await BookingPayment.findAll({
      where,
      include: [
        {
          association: "booking",
          attributes: [
            "id",
            "booking_number",
            "client_name",
            "gst_number",
            "subtotal_amount",
            "gst_amount",
            "total_amount",
          ],
        },
      ],
      order: [["verified_at", "DESC"]],
    });

    const summary = {
      totalBase: 0,
      totalGST: 0,
      totalAmount: 0,
    };

    payments.forEach((p) => {
      summary.totalBase += parseFloat(p.base_amount) || 0;
      summary.totalGST += parseFloat(p.gst_amount) || 0;
      summary.totalAmount += parseFloat(p.total_amount) || 0;
    });

    res.json({
      success: true,
      data: {
        summary,
        payments,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getBDMRevenueReport = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const where = {};
    if (start_date && end_date) {
      where.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + "T23:59:59")],
      };
    }

    const bdmStats = await Booking.findAll({
      where,
      attributes: [
        "bdm_id",
        [sequelize.fn("COUNT", sequelize.col("Booking.id")), "total_bookings"],
        [sequelize.fn("SUM", sequelize.col("total_amount")), "total_value"],
        [
          sequelize.fn("SUM", sequelize.col("received_amount")),
          "collected_amount",
        ],
        [
          sequelize.fn("SUM", sequelize.col("pending_amount")),
          "pending_amount",
        ],
      ],
      include: [
        { association: "bdm", attributes: ["id", "full_name", "employee_id"] },
      ],
      group: ["bdm_id"],
      order: [[sequelize.fn("SUM", sequelize.col("total_amount")), "DESC"]],
      raw: true,
      nest: true,
    });

    res.json({
      success: true,
      data: bdmStats,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSplitCommissionReport = async (req, res, next) => {
  try {
    const { start_date, end_date, bdm_id } = req.query;

    const where = {};
    if (bdm_id) where.user_id = bdm_id;

    const includeWhere = {};
    if (start_date && end_date) {
      includeWhere.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + "T23:59:59")],
      };
    }

    const splits = await BookingBDMSplit.findAll({
      where,
      include: [
        {
          association: "booking",
          where: includeWhere,
          attributes: [
            "id",
            "booking_number",
            "client_name",
            "total_amount",
            "received_amount",
            "created_at",
          ],
        },
        {
          association: "bdmUser",
          attributes: ["id", "full_name", "employee_id"],
        },
      ],
      order: [[{ model: Booking, as: "booking" }, "created_at", "DESC"]],
    });

    const summary = await BookingBDMSplit.findAll({
      where,
      attributes: [
        "user_id",
        [sequelize.fn("SUM", sequelize.col("split_amount")), "total_split"],
        [
          sequelize.fn("COUNT", sequelize.col("BookingBDMSplit.id")),
          "booking_count",
        ],
      ],
      include: [
        { association: "bdmUser", attributes: ["id", "full_name"] },
        { association: "booking", where: includeWhere, attributes: [] },
      ],
      group: ["user_id"],
      raw: true,
      nest: true,
    });

    res.json({
      success: true,
      data: {
        summary,
        details: splits,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getPendingPaymentsReport = async (req, res, next) => {
  try {
    const bookings = await Booking.findAll({
      where: {
        pending_amount: { [Op.gt]: 0 },
      },
      include: [
        { association: "bdm", attributes: ["id", "full_name"] },
        { association: "bdm2", attributes: ["id", "full_name"] },
      ],
      order: [["pending_amount", "DESC"]],
    });

    const totalPending = bookings.reduce(
      (sum, b) => sum + parseFloat(b.pending_amount),
      0,
    );

    res.json({
      success: true,
      data: {
        totalPending,
        count: bookings.length,
        bookings,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getOperationsWorkloadReport = async (req, res, next) => {
  try {
    const workload = await Operation.findAll({
      where: {
        status: {
          [Op.notIn]: [OPERATION_STATUS.COMPLETED, OPERATION_STATUS.REJECTED],
        },
      },
      attributes: [
        "assigned_to",
        "status",
        [sequelize.fn("COUNT", sequelize.col("Operation.id")), "count"],
      ],
      include: [{ association: "assignee", attributes: ["id", "full_name"] }],
      group: ["assigned_to", "status"],
      raw: true,
      nest: true,
    });

    const overdueByUser = await Operation.findAll({
      where: {
        deadline: { [Op.lt]: new Date() },
        status: {
          [Op.notIn]: [OPERATION_STATUS.COMPLETED, OPERATION_STATUS.REJECTED],
        },
      },
      attributes: [
        "assigned_to",
        [sequelize.fn("COUNT", sequelize.col("Operation.id")), "overdue_count"],
      ],
      include: [{ association: "assignee", attributes: ["id", "full_name"] }],
      group: ["assigned_to"],
      raw: true,
      nest: true,
    });

    res.json({
      success: true,
      data: {
        workload,
        overdueByUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getBookingConversionReport = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const where = {};
    if (start_date && end_date) {
      where.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + "T23:59:59")],
      };
    }

    const stageStats = await Booking.findAll({
      where,
      attributes: [
        "current_stage",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("SUM", sequelize.col("total_amount")), "total_value"],
      ],
      group: ["current_stage"],
      raw: true,
    });

    const total = stageStats.reduce((sum, s) => sum + parseInt(s.count), 0);
    const completed = stageStats.find(
      (s) => s.current_stage === BOOKING_STAGES.COMPLETED,
    );
    const conversionRate =
      total > 0 ? (((completed?.count || 0) / total) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        total,
        conversionRate,
        stageStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getQuotationReport = async (req, res, next) => {
  try {
    const { start_date, end_date, bdm_id, status, company_name } = req.query;

    const where = {};
    if (start_date && end_date) {
      where.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + "T23:59:59")],
      };
    }
    if (status) where.status = status;
    if (bdm_id) where.created_by = bdm_id;
    if (company_name) where.company_name = { [Op.like]: `%${company_name}%` };

    const quotations = await Quotation.findAll({
      where,
      include: [{ association: "creator", attributes: ["id", "full_name"] }],
      order: [["created_at", "DESC"]],
    });

    const summary = {
      total: quotations.length,
      draft: quotations.filter((q) => q.status === "draft").length,
      sent: quotations.filter((q) => q.status === "sent").length,
      accepted: quotations.filter((q) => q.status === "accepted").length,
      rejected: quotations.filter((q) => q.status === "rejected").length,
      totalValue: quotations.reduce(
        (sum, q) => sum + (parseFloat(q.grand_total) || 0),
        0,
      ),
      acceptedValue: quotations
        .filter((q) => q.status === "accepted")
        .reduce((sum, q) => sum + (parseFloat(q.grand_total) || 0), 0),
    };

    // BDM-wise breakdown
    const bdmMap = {};
    quotations.forEach((q) => {
      const bdmName = q.creator?.full_name || "Unknown";
      const bdmId = q.created_by;
      if (!bdmMap[bdmId]) {
        bdmMap[bdmId] = {
          bdm_id: bdmId,
          bdm_name: bdmName,
          total: 0,
          accepted: 0,
          totalValue: 0,
          acceptedValue: 0,
        };
      }
      bdmMap[bdmId].total++;
      bdmMap[bdmId].totalValue += parseFloat(q.grand_total) || 0;
      if (q.status === "accepted") {
        bdmMap[bdmId].accepted++;
        bdmMap[bdmId].acceptedValue += parseFloat(q.grand_total) || 0;
      }
    });

    // Company-wise breakdown
    const companyMap = {};
    quotations.forEach((q) => {
      const company = q.company_name || q.client_name || "Individual";
      if (!companyMap[company]) {
        companyMap[company] = {
          company,
          total: 0,
          accepted: 0,
          totalValue: 0,
          acceptedValue: 0,
        };
      }
      companyMap[company].total++;
      companyMap[company].totalValue += parseFloat(q.grand_total) || 0;
      if (q.status === "accepted") {
        companyMap[company].accepted++;
        companyMap[company].acceptedValue += parseFloat(q.grand_total) || 0;
      }
    });

    res.json({
      success: true,
      data: {
        summary,
        bdmWise: Object.values(bdmMap).sort(
          (a, b) => b.totalValue - a.totalValue,
        ),
        companyWise: Object.values(companyMap).sort(
          (a, b) => b.totalValue - a.totalValue,
        ),
        quotations,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getBDMScorecard = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const bookingWhere = {};
    if (start_date && end_date) {
      bookingWhere.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + "T23:59:59")],
      };
    }

    // Get all BDM users
    const bdmUsers = await User.findAll({
      where: { role: "sales", is_active: true },
      attributes: ["id", "full_name", "employee_id"],
      raw: true,
    });

    const scorecard = [];

    for (const bdm of bdmUsers) {
      // Direct bookings (as BDM1)
      const directBookings = await Booking.findAll({
        where: { ...bookingWhere, bdm_id: bdm.id },
        attributes: [
          "id",
          "total_amount",
          "received_amount",
          "pending_amount",
          "current_stage",
          "bdm2_id",
        ],
        raw: true,
      });

      // Shared bookings (as BDM2)
      const sharedBookings = await Booking.findAll({
        where: { ...bookingWhere, bdm2_id: bdm.id },
        attributes: [
          "id",
          "total_amount",
          "received_amount",
          "pending_amount",
          "current_stage",
          "bdm_id",
        ],
        raw: true,
      });

      // Calculate with 50-50 rule
      let totalBookings = 0;
      let totalRevenue = 0;
      let collectedRevenue = 0;
      let pendingRevenue = 0;
      let completedBookings = 0;
      let soloBookings = 0;
      let splitBookings = 0;

      // Direct bookings (BDM1)
      directBookings.forEach((b) => {
        totalBookings++;
        const hasSplit = b.bdm2_id && b.bdm2_id !== bdm.id;
        if (hasSplit) {
          // 50-50 split
          splitBookings++;
          totalRevenue += (parseFloat(b.total_amount) || 0) * 0.5;
          collectedRevenue += (parseFloat(b.received_amount) || 0) * 0.5;
          pendingRevenue += (parseFloat(b.pending_amount) || 0) * 0.5;
        } else {
          // 100% revenue
          soloBookings++;
          totalRevenue += parseFloat(b.total_amount) || 0;
          collectedRevenue += parseFloat(b.received_amount) || 0;
          pendingRevenue += parseFloat(b.pending_amount) || 0;
        }
        if (b.current_stage === "completed") completedBookings++;
      });

      // Shared bookings (BDM2) - always 50%
      sharedBookings.forEach((b) => {
        totalBookings++;
        splitBookings++;
        totalRevenue += (parseFloat(b.total_amount) || 0) * 0.5;
        collectedRevenue += (parseFloat(b.received_amount) || 0) * 0.5;
        pendingRevenue += (parseFloat(b.pending_amount) || 0) * 0.5;
        if (b.current_stage === "completed") completedBookings++;
      });

      // Quotation stats
      const quotationWhere = { created_by: bdm.id };
      if (start_date && end_date) {
        quotationWhere.created_at = {
          [Op.between]: [
            new Date(start_date),
            new Date(end_date + "T23:59:59"),
          ],
        };
      }
      const quotationCount = await Quotation.count({ where: quotationWhere });
      const acceptedQuotations = await Quotation.count({
        where: { ...quotationWhere, status: "accepted" },
      });

      scorecard.push({
        bdm_id: bdm.id,
        bdm_name: bdm.full_name,
        employee_id: bdm.employee_id,
        totalBookings,
        soloBookings,
        splitBookings,
        completedBookings,
        conversionRate:
          totalBookings > 0
            ? ((completedBookings / totalBookings) * 100).toFixed(1)
            : "0.0",
        totalRevenue,
        collectedRevenue,
        pendingRevenue,
        quotationCount,
        acceptedQuotations,
        quotationConversion:
          quotationCount > 0
            ? ((acceptedQuotations / quotationCount) * 100).toFixed(1)
            : "0.0",
      });
    }

    // Sort by total revenue descending
    scorecard.sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.json({
      success: true,
      data: scorecard,
    });
  } catch (error) {
    next(error);
  }
};
