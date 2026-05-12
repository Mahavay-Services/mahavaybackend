const { Op } = require("sequelize");
const { Quotation, User, Service } = require("../models");
const { paginate } = require("../utils/helpers");
const { createAuditLog } = require("../services/audit.service");
const { AUDIT_ACTIONS } = require("../config/constants");

const generateQuotationNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;
  const lastQuotation = await Quotation.findOne({
    where: { quotation_number: { [Op.like]: `${prefix}%` } },
    order: [["id", "DESC"]],
  });
  let nextNum = 1;
  if (lastQuotation) {
    const lastNum = parseInt(lastQuotation.quotation_number.split("-").pop());
    nextNum = lastNum + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

exports.getQuotations = async (req, res, next) => {
  try {
    const { search, status, page, limit } = req.query;
    const pagination = paginate(page, limit);

    const where = {};

    if (req.user.role === "sales") {
      where.created_by = req.user.id;
    }

    if (search) {
      where[Op.or] = [
        { quotation_number: { [Op.like]: `%${search}%` } },
        { client_name: { [Op.like]: `%${search}%` } },
        { company_name: { [Op.like]: `%${search}%` } },
      ];
    }

    if (status && status !== "") where.status = status;

    const { count, rows } = await Quotation.findAndCountAll({
      where,
      include: [{ association: "creator", attributes: ["id", "full_name"] }],
      order: [["created_at", "DESC"]],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    res.json({
      success: true,
      data: {
        quotations: rows,
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

exports.getQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findByPk(req.params.id, {
      include: [{ association: "creator", attributes: ["id", "full_name"] }],
    });

    if (!quotation) {
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });
    }

    const data = quotation.toJSON();
    // Ensure items is always an array (MySQL JSON can sometimes return as string)
    if (typeof data.items === "string") {
      try {
        data.items = JSON.parse(data.items);
      } catch (e) {
        data.items = [];
      }
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.createQuotation = async (req, res, next) => {
  try {
    const quotationNumber = await generateQuotationNumber();
    const data = req.body;

    const quotation = await Quotation.create({
      ...data,
      quotation_number: quotationNumber,
      created_by: req.user.id,
    });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.CREATE,
      entityType: "quotation",
      entityId: quotation.id,
      newValue: {
        quotation_number: quotationNumber,
        client_name: data.client_name,
      },
      description: `Quotation ${quotationNumber} created`,
    });

    res.status(201).json({ success: true, data: quotation });
  } catch (error) {
    next(error);
  }
};

exports.updateQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findByPk(req.params.id);
    if (!quotation) {
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });
    }

    await quotation.update(req.body);

    res.json({ success: true, data: quotation });
  } catch (error) {
    next(error);
  }
};

exports.deleteQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findByPk(req.params.id);
    if (!quotation) {
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });
    }

    await quotation.destroy();
    res.json({ success: true, message: "Quotation deleted" });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const quotation = await Quotation.findByPk(req.params.id);
    if (!quotation) {
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });
    }

    await quotation.update({ status });
    res.json({ success: true, data: quotation });
  } catch (error) {
    next(error);
  }
};

exports.getServices = async (req, res, next) => {
  try {
    const services = await Service.findAll({
      where: { is_active: true },
      attributes: [
        "id",
        "service_name",
        "service_code",
        "category",
        "default_price",
        "gst_percentage",
      ],
      order: [["service_name", "ASC"]],
    });
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
};
