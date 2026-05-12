const yup = require("yup");

const createServiceSchema = yup.object({
  service_name: yup.string().required("Service name is required").max(100),
  service_code: yup.string().max(20),
  category: yup.string().max(50),
  description: yup.string(),
  default_price: yup
    .number()
    .required("Price is required")
    .min(0, "Price must be positive"),
  gst_percentage: yup.number().min(0).max(100).default(18),
  is_active: yup.boolean().default(true),
});

const updateServiceSchema = yup.object({
  service_name: yup.string().max(100),
  category: yup.string().max(50),
  description: yup.string(),
  default_price: yup.number().min(0, "Price must be positive"),
  gst_percentage: yup.number().min(0).max(100),
  is_active: yup.boolean(),
});

module.exports = {
  createServiceSchema,
  updateServiceSchema,
};
