const { Op } = require("sequelize");
const { Invoice, User, Service } = require("../models");
const { paginate } = require("../utils/helpers");
const { createAuditLog } = require("../services/audit.service");
const { AUDIT_ACTIONS } = require("../config/constants");

const generateInvoiceNumber = async (type) => {
  const year = new Date().getFullYear();
  const prefix = type === "proforma" ? `PI-${year}-` : `TI-${year}-`;
  const lastInvoice = await Invoice.findOne({
    where: { invoice_number: { [Op.like]: `${prefix}%` } },
    order: [["id", "DESC"]],
  });
  let nextNum = 1;
  if (lastInvoice) {
    const lastNum = parseInt(lastInvoice.invoice_number.split("-").pop());
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

exports.getInvoices = async (req, res, next) => {
  try {
    const { search, status, invoice_type, page, limit } = req.query;
    const pagination = paginate(page, limit);

    const where = {};

    if (invoice_type && invoice_type !== "") where.invoice_type = invoice_type;
    if (status && status !== "") where.status = status;

    if (search) {
      where[Op.or] = [
        { invoice_number: { [Op.like]: `%${search}%` } },
        { buyer_name: { [Op.like]: `%${search}%` } },
        { buyer_company: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [{ association: "creator", attributes: ["id", "full_name"] }],
      order: [["created_at", "DESC"]],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    res.json({
      success: true,
      data: {
        invoices: rows,
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

exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [{ association: "creator", attributes: ["id", "full_name"] }],
    });

    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    const data = invoice.toJSON();
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

exports.createInvoice = async (req, res, next) => {
  try {
    const data = req.body;
    const invoiceType = data.invoice_type || "tax";
    const invoiceNumber = await generateInvoiceNumber(invoiceType);

    const invoice = await Invoice.create({
      ...data,
      invoice_number: invoiceNumber,
      created_by: req.user.id,
    });

    await createAuditLog(req, {
      action: AUDIT_ACTIONS.CREATE,
      entityType: "invoice",
      entityId: invoice.id,
      newValue: {
        invoice_number: invoiceNumber,
        invoice_type: invoiceType,
        buyer_name: data.buyer_name,
      },
      description: `${invoiceType === "proforma" ? "Proforma" : "Tax"} Invoice ${invoiceNumber} created`,
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

exports.updateInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    await invoice.update(req.body);

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    await invoice.destroy();
    res.json({ success: true, message: "Invoice deleted" });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    await invoice.update({ status });
    res.json({ success: true, data: invoice });
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
