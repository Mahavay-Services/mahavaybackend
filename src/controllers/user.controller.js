const { Op } = require("sequelize");
const { User } = require("../models");
const { generateEmployeeId, paginate } = require("../utils/helpers");
const { createAuditLog } = require("../services/audit.service");
const { AUDIT_ACTIONS, ROLES } = require("../config/constants");

exports.getUsers = async (req, res, next) => {
  try {
    const { search, role, is_active, page, limit } = req.query;
    const pagination = paginate(page, limit);

    const where = {};

    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { employee_id: { [Op.like]: `%${search}%` } },
      ];
    }

    if (role) where.role = role;
    if (is_active && is_active !== "") where.is_active = is_active === "true";

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ["password_hash"] },
      order: [["created_at", "DESC"]],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    res.json({
      success: true,
      data: {
        users: rows,
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

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password_hash"] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { password, ...userData } = req.body;

    const existingUser = await User.findOne({
      where: { email: userData.email },
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const employeeId = await generateEmployeeId(User, userData.department);

    const user = await User.create({
      ...userData,
      employee_id: employeeId,
      password_hash: password,
      created_by: req.user.id,
    });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.CREATE,
      entityType: "user",
      entityId: user.id,
      newValue: { email: user.email, role: user.role },
      description: `User ${user.full_name} created`,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const oldValues = user.toJSON();
    await user.update(req.body);

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "user",
      entityId: user.id,
      oldValue: oldValues,
      newValue: user.toJSON(),
      description: `User ${user.full_name} updated`,
    });

    res.json({
      success: true,
      message: "User updated successfully",
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot deactivate your own account",
      });
    }

    const newStatus = !user.is_active;
    await user.update({ is_active: newStatus });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "user",
      entityId: user.id,
      oldValue: { is_active: !newStatus },
      newValue: { is_active: newStatus },
      description: `User ${user.full_name} ${newStatus ? "activated" : "deactivated"}`,
    });

    res.json({
      success: true,
      message: `User ${newStatus ? "activated" : "deactivated"} successfully`,
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.update({
      password_hash: newPassword,
      login_attempts: 0,
      locked_until: null,
    });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "user",
      entityId: user.id,
      description: `Password reset for user ${user.full_name}`,
    });

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getBDMUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: {
        role: { [Op.in]: [ROLES.SALES, ROLES.SUPER_ADMIN] },
        is_active: true,
      },
      attributes: ["id", "full_name", "employee_id", "role"],
      order: [["full_name", "ASC"]],
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOpsUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: {
        role: { [Op.in]: [ROLES.OPS_MANAGER, ROLES.OPS_MEMBER] },
        is_active: true,
      },
      attributes: ["id", "full_name", "employee_id", "role"],
      order: [["full_name", "ASC"]],
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, roleStats] = await Promise.all([
      User.count(),
      User.count({ where: { is_active: true } }),
      User.findAll({
        attributes: [
          "role",
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        group: ["role"],
        raw: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        roleStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    if (user.role === ROLES.SUPER_ADMIN) {
      const adminCount = await User.count({
        where: { role: ROLES.SUPER_ADMIN },
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete the last super admin",
        });
      }
    }

    await user.update({ is_active: false });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.DELETE,
      entityType: "user",
      entityId: user.id,
      oldValue: { email: user.email, role: user.role },
      description: `User ${user.full_name} soft deleted`,
    });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
