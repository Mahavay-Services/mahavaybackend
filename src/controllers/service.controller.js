const { Op } = require("sequelize");
const { Service } = require("../models");
const { paginate } = require("../utils/helpers");
const { createAuditLog } = require("../services/audit.service");
const { AUDIT_ACTIONS } = require("../config/constants");

exports.getServices = async (req, res, next) => {
  try {
    const { search, category, is_active, page, limit } = req.query;
    const pagination = paginate(page, limit);

    const where = {};

    if (search) {
      where[Op.or] = [
        { service_name: { [Op.like]: `%${search}%` } },
        { service_code: { [Op.like]: `%${search}%` } },
      ];
    }

    if (category) where.category = category;
    if (is_active === "true" || is_active === "false")
      where.is_active = is_active === "true";

    const { count, rows } = await Service.findAndCountAll({
      where,
      order: [["service_name", "ASC"]],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    res.json({
      success: true,
      data: {
        services: rows,
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

exports.getActiveServices = async (req, res, next) => {
  try {
    const services = await Service.findAll({
      where: { is_active: true },
      order: [["service_name", "ASC"]],
    });

    res.json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

exports.getService = async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

exports.createService = async (req, res, next) => {
  try {
    // Auto-generate service_code if not provided
    if (!req.body.service_code) {
      const lastService = await Service.findOne({
        where: {
          service_code: { [Op.like]: "SVC-%" },
        },
        order: [["id", "DESC"]],
      });
      let seq = 1;
      if (lastService && lastService.service_code) {
        const lastSeq = parseInt(lastService.service_code.split("-")[1]);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
      }
      req.body.service_code = `SVC-${String(seq).padStart(4, "0")}`;
    }

    const existing = await Service.findOne({
      where: { service_code: req.body.service_code },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Service code already exists",
      });
    }

    const service = await Service.create(req.body);

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.CREATE,
      entityType: "service",
      entityId: service.id,
      newValue: service.toJSON(),
      description: `Service ${service.service_name} created`,
    });

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateService = async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const oldValues = service.toJSON();
    await service.update(req.body);

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "service",
      entityId: service.id,
      oldValue: oldValues,
      newValue: service.toJSON(),
      description: `Service ${service.service_name} updated`,
    });

    res.json({
      success: true,
      message: "Service updated successfully",
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleServiceStatus = async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const newStatus = !service.is_active;
    await service.update({ is_active: newStatus });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "service",
      entityId: service.id,
      oldValue: { is_active: !newStatus },
      newValue: { is_active: newStatus },
      description: `Service ${service.service_name} ${newStatus ? "activated" : "deactivated"}`,
    });

    res.json({
      success: true,
      message: `Service ${newStatus ? "activated" : "deactivated"} successfully`,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Service.findAll({
      attributes: [
        [
          require("sequelize").fn(
            "DISTINCT",
            require("sequelize").col("category"),
          ),
          "category",
        ],
      ],
      where: { category: { [Op.ne]: null } },
      raw: true,
    });

    res.json({
      success: true,
      data: categories.map((c) => c.category).filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
};
