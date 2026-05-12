const { Setting } = require("../models");

const DEFAULT_SETTINGS = {
  crm_name: "SATYA CRM",
  crm_tagline: "Enterprise Management",
  primary_color: "#16a34a",
  accent_color: "#d97706",
  quotation_logo_url: "/logo.svg",
  quotation_company_name: "SATYA CRM Pvt Ltd",
  quotation_company_tagline: "Enterprise Solutions",
  quotation_show_signature: "true",
  quotation_signature_label: "Authorized Signatory",
  quotation_footer_text: "This is a computer-generated quotation.",
};

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Setting.findAll();
    const result = { ...DEFAULT_SETTINGS };
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.getPublicSettings = async (req, res, next) => {
  try {
    const settings = await Setting.findAll({
      where: {
        category: ["general", "appearance"],
      },
    });
    const result = {
      crm_name: DEFAULT_SETTINGS.crm_name,
      crm_tagline: DEFAULT_SETTINGS.crm_tagline,
      primary_color: DEFAULT_SETTINGS.primary_color,
      accent_color: DEFAULT_SETTINGS.accent_color,
    };
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      const category = getCategory(key);
      await Setting.upsert({
        key,
        value: value !== null && value !== undefined ? String(value) : "",
        category,
      });
    }

    const settings = await Setting.findAll();
    const result = { ...DEFAULT_SETTINGS };
    settings.forEach((s) => {
      result[s.key] = s.value;
    });

    res.json({ success: true, data: result, message: "Settings updated successfully" });
  } catch (error) {
    next(error);
  }
};

function getCategory(key) {
  if (key.startsWith("quotation_")) return "quotation";
  if (["primary_color", "accent_color"].includes(key)) return "appearance";
  return "general";
}
