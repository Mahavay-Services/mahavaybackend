const { AuditLog } = require('../models');
const { getClientIP } = require('../utils/helpers');

const createAuditLog = async (req, {
  action,
  entityType,
  entityId,
  oldValue = null,
  newValue = null,
  description = null
}) => {
  try {
    await AuditLog.create({
      user_id: req.user?.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      description,
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent']?.substring(0, 500)
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

const getAuditLogs = async (entityType, entityId, limit = 50) => {
  return AuditLog.findAll({
    where: { entity_type: entityType, entity_id: entityId },
    include: [{
      association: 'user',
      attributes: ['id', 'full_name', 'role']
    }],
    order: [['created_at', 'DESC']],
    limit
  });
};

module.exports = {
  createAuditLog,
  getAuditLogs
};
