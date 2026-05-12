const { Op } = require('sequelize');
const { Booking, BookingService, Operation, Service, User } = require('../models');
const { createAuditLog } = require('../services/audit.service');
const { paginate } = require('../utils/helpers');
const { AUDIT_ACTIONS, OPERATION_STATUS, BOOKING_STAGES, ROLES } = require('../config/constants');

exports.getOperations = async (req, res, next) => {
  try {
    const { status, assigned_to, overdue, page, limit } = req.query;
    const pagination = paginate(page, limit);

    const where = {};

    if (status) where.status = status;
    
    if (req.user.role === ROLES.OPS_MEMBER) {
      where.assigned_to = req.user.id;
    } else if (assigned_to) {
      where.assigned_to = assigned_to;
    }

    if (overdue === 'true') {
      where.deadline = { [Op.lt]: new Date() };
      where.status = { [Op.notIn]: [OPERATION_STATUS.COMPLETED, OPERATION_STATUS.REJECTED] };
    }

    const { count, rows } = await Operation.findAndCountAll({
      where,
      include: [
        {
          association: 'bookingService',
          include: [
            { association: 'service', attributes: ['id', 'service_name', 'service_code'] },
            {
              association: 'booking',
              attributes: ['id', 'booking_number', 'client_name', 'company_name']
            }
          ]
        },
        { association: 'assignee', attributes: ['id', 'full_name'] }
      ],
      order: [
        ['deadline', 'ASC'],
        ['created_at', 'DESC']
      ],
      limit: pagination.limit,
      offset: pagination.offset
    });

    res.json({
      success: true,
      data: {
        operations: rows,
        pagination: {
          total: count,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(count / pagination.limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getOperation = async (req, res, next) => {
  try {
    const operation = await Operation.findByPk(req.params.id, {
      include: [
        {
          association: 'bookingService',
          include: [
            { association: 'service' },
            {
              association: 'booking',
              include: [
                { association: 'bdm', attributes: ['id', 'full_name'] },
                { association: 'documents' }
              ]
            }
          ]
        },
        { association: 'assignee', attributes: ['id', 'full_name', 'email', 'phone'] },
        { association: 'creator', attributes: ['id', 'full_name'] }
      ]
    });

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: 'Operation not found'
      });
    }

    res.json({
      success: true,
      data: operation
    });
  } catch (error) {
    next(error);
  }
};

exports.startOperations = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;

    const booking = await Booking.findByPk(bookingId, {
      include: [{ association: 'bookingServices' }]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (!booking.legal_verified) {
      return res.status(400).json({
        success: false,
        message: 'Legal approval required before starting operations'
      });
    }

    const createdOperations = [];
    for (const bs of booking.bookingServices) {
      const existingOp = await Operation.findOne({
        where: { booking_service_id: bs.id }
      });

      if (!existingOp) {
        const operation = await Operation.create({
          booking_service_id: bs.id,
          status: OPERATION_STATUS.PENDING,
          created_by: req.user.id
        });
        createdOperations.push(operation);
      }
    }

    await booking.update({
      ops_started: true,
      current_stage: BOOKING_STAGES.OPERATIONS_STARTED
    });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.CREATE,
      entityType: 'operations',
      entityId: bookingId,
      description: `Operations started for booking ${booking.booking_number}`
    });

    res.json({
      success: true,
      message: 'Operations started successfully',
      data: createdOperations
    });
  } catch (error) {
    next(error);
  }
};

exports.assignOperation = async (req, res, next) => {
  try {
    const { assigned_to, deadline, notes } = req.body;

    const operation = await Operation.findByPk(req.params.id, {
      include: [{ association: 'bookingService', include: [{ association: 'booking' }] }]
    });

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: 'Operation not found'
      });
    }

    const assignee = await User.findByPk(assigned_to);
    if (!assignee || ![ROLES.OPS_MANAGER, ROLES.OPS_MEMBER].includes(assignee.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignee'
      });
    }

    await operation.update({
      assigned_to,
      deadline,
      notes,
      status: OPERATION_STATUS.PENDING
    });

    await operation.bookingService.update({
      assigned_ops_user_id: assigned_to,
      operation_status: OPERATION_STATUS.PENDING
    });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.ASSIGN,
      entityType: 'operation',
      entityId: operation.id,
      newValue: { assigned_to, deadline },
      description: `Operation assigned to ${assignee.full_name}`
    });

    res.json({
      success: true,
      message: 'Operation assigned successfully',
      data: operation
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOperationStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    const operation = await Operation.findByPk(req.params.id, {
      include: [{ association: 'bookingService', include: [{ association: 'booking' }] }]
    });

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: 'Operation not found'
      });
    }

    const oldStatus = operation.status;
    const updates = { status };

    if (notes) updates.notes = notes;
    if (status === OPERATION_STATUS.COMPLETED) {
      updates.completed_at = new Date();
    }

    await operation.update(updates);
    await operation.bookingService.update({ operation_status: status });

    const allOperations = await Operation.findAll({
      include: [{
        association: 'bookingService',
        where: { booking_id: operation.bookingService.booking_id }
      }]
    });

    const booking = operation.bookingService.booking;
    const allCompleted = allOperations.every(op => op.status === OPERATION_STATUS.COMPLETED);
    const someCompleted = allOperations.some(op => op.status === OPERATION_STATUS.COMPLETED);

    if (allCompleted) {
      await booking.update({ current_stage: BOOKING_STAGES.COMPLETED });
    } else if (someCompleted) {
      await booking.update({ current_stage: BOOKING_STAGES.PARTIALLY_COMPLETED });
    }

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.UPDATE,
      entityType: 'operation',
      entityId: operation.id,
      oldValue: { status: oldStatus },
      newValue: { status },
      description: `Operation status changed from ${oldStatus} to ${status}`
    });

    res.json({
      success: true,
      message: 'Operation updated successfully',
      data: operation
    });
  } catch (error) {
    next(error);
  }
};

exports.getOperationStats = async (req, res, next) => {
  try {
    const where = {};
    
    if (req.user.role === ROLES.OPS_MEMBER) {
      where.assigned_to = req.user.id;
    }

    const stats = await Operation.findAll({
      where,
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const overdueCount = await Operation.count({
      where: {
        ...where,
        deadline: { [Op.lt]: new Date() },
        status: { [Op.notIn]: [OPERATION_STATUS.COMPLETED, OPERATION_STATUS.REJECTED] }
      }
    });

    res.json({
      success: true,
      data: {
        byStatus: stats,
        overdue: overdueCount
      }
    });
  } catch (error) {
    next(error);
  }
};
