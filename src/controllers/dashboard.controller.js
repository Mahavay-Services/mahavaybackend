const { Op } = require('sequelize');
const { sequelize, Booking, BookingPayment, BookingService, Operation, User } = require('../models');
const { ROLES, BOOKING_STAGES, VERIFICATION_STATUS, OPERATION_STATUS } = require('../config/constants');

exports.getSuperAdminDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    const [
      totalBookings,
      monthlyBookings,
      totalCollections,
      monthlyCollections,
      pendingPayments,
      pendingLegal,
      pendingOperations,
      completedBookings,
      stageStats,
      topBDMs
    ] = await Promise.all([
      Booking.count(),
      Booking.count({ where: { created_at: { [Op.gte]: startOfMonth } } }),
      Booking.sum('received_amount'),
      Booking.sum('received_amount', { where: { created_at: { [Op.gte]: startOfMonth } } }),
      BookingPayment.count({ where: { verification_status: VERIFICATION_STATUS.PENDING } }),
      Booking.count({ where: { current_stage: BOOKING_STAGES.LEGAL_PENDING } }),
      Operation.count({ where: { status: { [Op.in]: [OPERATION_STATUS.PENDING, OPERATION_STATUS.IN_PROGRESS] } } }),
      Booking.count({ where: { current_stage: BOOKING_STAGES.COMPLETED } }),
      Booking.findAll({
        attributes: ['current_stage', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['current_stage'],
        raw: true
      }),
      Booking.findAll({
        attributes: [
          'bdm_id',
          [sequelize.fn('COUNT', sequelize.col('Booking.id')), 'booking_count'],
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_value'],
          [sequelize.fn('SUM', sequelize.col('received_amount')), 'collected']
        ],
        include: [{ association: 'bdm', attributes: ['id', 'full_name'] }],
        where: { created_at: { [Op.gte]: startOfMonth } },
        group: ['bdm_id'],
        order: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'DESC']],
        limit: 5,
        raw: true,
        nest: true
      })
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalBookings,
          monthlyBookings,
          totalCollections: totalCollections || 0,
          monthlyCollections: monthlyCollections || 0,
          completedBookings
        },
        pending: {
          payments: pendingPayments,
          legal: pendingLegal,
          operations: pendingOperations
        },
        stageStats,
        topBDMs
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getSalesDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const whereClause = {
      [Op.or]: [
        { bdm_id: userId },
        { bdm2_id: userId }
      ]
    };

    const [
      totalBookings,
      monthlyBookings,
      totalValue,
      collectedAmount,
      pendingAmount,
      stageStats
    ] = await Promise.all([
      Booking.count({ where: whereClause }),
      Booking.count({ where: { ...whereClause, created_at: { [Op.gte]: startOfMonth } } }),
      Booking.sum('total_amount', { where: whereClause }),
      Booking.sum('received_amount', { where: whereClause }),
      Booking.sum('pending_amount', { where: whereClause }),
      Booking.findAll({
        attributes: ['current_stage', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where: whereClause,
        group: ['current_stage'],
        raw: true
      })
    ]);

    const recentBookings = await Booking.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: 5,
      attributes: ['id', 'booking_number', 'client_name', 'total_amount', 'current_stage', 'created_at']
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalBookings,
          monthlyBookings,
          totalValue: totalValue || 0,
          collectedAmount: collectedAmount || 0,
          pendingAmount: pendingAmount || 0,
          conversionRate: totalBookings > 0 
            ? Math.round((await Booking.count({ where: { ...whereClause, current_stage: BOOKING_STAGES.COMPLETED } }) / totalBookings) * 100) 
            : 0
        },
        stageStats,
        recentBookings
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAccountsDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      pendingVerifications,
      todayCollections,
      monthlyCollections,
      verifiedToday,
      rejectedToday,
      pendingPayments
    ] = await Promise.all([
      BookingPayment.count({ where: { verification_status: VERIFICATION_STATUS.PENDING } }),
      BookingPayment.sum('received_amount', {
        where: {
          verification_status: VERIFICATION_STATUS.VERIFIED,
          verified_at: { [Op.gte]: startOfDay }
        }
      }),
      BookingPayment.sum('received_amount', {
        where: {
          verification_status: VERIFICATION_STATUS.VERIFIED,
          verified_at: { [Op.gte]: startOfMonth }
        }
      }),
      BookingPayment.count({
        where: {
          verification_status: VERIFICATION_STATUS.VERIFIED,
          verified_at: { [Op.gte]: startOfDay }
        }
      }),
      BookingPayment.count({
        where: {
          verification_status: VERIFICATION_STATUS.REJECTED,
          verified_at: { [Op.gte]: startOfDay }
        }
      }),
      BookingPayment.findAll({
        where: { verification_status: VERIFICATION_STATUS.PENDING },
        include: [
          { association: 'booking', attributes: ['id', 'booking_number', 'client_name'] },
          { association: 'creator', attributes: ['id', 'full_name'] }
        ],
        order: [['created_at', 'ASC']],
        limit: 10
      })
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          pendingVerifications,
          todayCollections: todayCollections || 0,
          monthlyCollections: monthlyCollections || 0,
          verifiedToday,
          rejectedToday
        },
        pendingPayments
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getLegalDashboard = async (req, res, next) => {
  try {
    const [
      pendingApprovals,
      approvedThisMonth,
      rejectedThisMonth,
      pendingBookings
    ] = await Promise.all([
      Booking.count({ where: { current_stage: BOOKING_STAGES.LEGAL_PENDING } }),
      Booking.count({
        where: {
          legal_verified: true,
          updated_at: { [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }
      }),
      require('../models').BookingApproval.count({
        where: {
          approval_type: 'legal',
          status: VERIFICATION_STATUS.REJECTED,
          created_at: { [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }
      }),
      Booking.findAll({
        where: { current_stage: BOOKING_STAGES.LEGAL_PENDING },
        include: [
          { association: 'bdm', attributes: ['id', 'full_name'] },
          { association: 'documents', where: { document_type: 'agreement' }, required: false }
        ],
        order: [['created_at', 'ASC']],
        limit: 10
      })
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          pendingApprovals,
          approvedThisMonth,
          rejectedThisMonth
        },
        pendingBookings
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getOperationsDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isManager = req.user.role === ROLES.OPS_MANAGER;

    const where = isManager ? {} : { assigned_to: userId };

    const [
      totalOperations,
      pendingOperations,
      inProgressOperations,
      completedOperations,
      overdueOperations,
      statusStats
    ] = await Promise.all([
      Operation.count({ where }),
      Operation.count({ where: { ...where, status: OPERATION_STATUS.PENDING } }),
      Operation.count({ where: { ...where, status: OPERATION_STATUS.IN_PROGRESS } }),
      Operation.count({ where: { ...where, status: OPERATION_STATUS.COMPLETED } }),
      Operation.count({
        where: {
          ...where,
          deadline: { [Op.lt]: new Date() },
          status: { [Op.notIn]: [OPERATION_STATUS.COMPLETED, OPERATION_STATUS.REJECTED] }
        }
      }),
      Operation.findAll({
        where,
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true
      })
    ]);

    const upcomingDeadlines = await Operation.findAll({
      where: {
        ...where,
        deadline: { [Op.gte]: new Date(), [Op.lte]: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        status: { [Op.notIn]: [OPERATION_STATUS.COMPLETED, OPERATION_STATUS.REJECTED] }
      },
      include: [
        {
          association: 'bookingService',
          include: [
            { association: 'service', attributes: ['id', 'service_name'] },
            { association: 'booking', attributes: ['id', 'booking_number', 'client_name'] }
          ]
        },
        { association: 'assignee', attributes: ['id', 'full_name'] }
      ],
      order: [['deadline', 'ASC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalOperations,
          pendingOperations,
          inProgressOperations,
          completedOperations,
          overdueOperations
        },
        statusStats,
        upcomingDeadlines
      }
    });
  } catch (error) {
    next(error);
  }
};
