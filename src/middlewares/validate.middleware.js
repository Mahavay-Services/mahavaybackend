const validate = (schema) => async (req, res, next) => {
  try {
    const validated = await schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    req.body = validated;
    next();
  } catch (err) {
    const errors = err.inner?.map((e) => ({
      field: e.path,
      message: e.message,
    })) || [{ message: err.message }];

    const firstError = errors[0];
    let message = "Validation failed";
    if (firstError) {
      const fieldName = formatFieldName(firstError.field);
      message = `${fieldName}: ${firstError.message}`;
    }

    return res.status(400).json({
      success: false,
      message,
      errors,
    });
  }
};

function formatFieldName(field) {
  if (!field) return "Field";
  return field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

module.exports = validate;
