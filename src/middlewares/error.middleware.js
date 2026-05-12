const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "SequelizeValidationError") {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
    const firstError = errors[0];
    return res.status(400).json({
      success: false,
      message: firstError
        ? `${formatFieldName(firstError.field)}: ${firstError.message}`
        : "Validation error",
      errors,
    });
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    const field = err.errors[0]?.path || "field";
    const fieldName = formatFieldName(field);
    return res.status(400).json({
      success: false,
      message: `${fieldName} already exists`,
      field,
    });
  }

  if (err.name === "SequelizeForeignKeyConstraintError") {
    return res.status(400).json({
      success: false,
      message: "Referenced record does not exist",
    });
  }

  if (err.name === "SequelizeDatabaseError") {
    if (err.original?.code === "ER_DATA_TOO_LONG") {
      return res.status(400).json({
        success: false,
        message: "Input data is too long for one or more fields",
      });
    }
    if (err.original?.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD") {
      return res.status(400).json({
        success: false,
        message: "Invalid data format for one or more fields",
      });
    }
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File size exceeds maximum limit of 5MB",
    });
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      message: "Too many files uploaded",
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "Unexpected file field",
    });
  }

  if (err.message === "Invalid file type") {
    return res.status(400).json({
      success: false,
      message:
        "Invalid file type. Only images (JPG, PNG, GIF, WebP) and PDFs are allowed",
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

function formatFieldName(field) {
  if (!field) return "Field";
  return field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

module.exports = errorHandler;
