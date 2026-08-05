const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const serviceRoutes = require("./routes/service.routes");
const bookingRoutes = require("./routes/booking.routes");
const paymentRoutes = require("./routes/payment.routes");
const documentRoutes = require("./routes/document.routes");
const operationRoutes = require("./routes/operation.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const reportRoutes = require("./routes/report.routes");
const quotationRoutes = require("./routes/quotation.routes");
const settingRoutes = require("./routes/setting.routes");
const invoiceRoutes = require("./routes/invoice.routes");

const errorHandler = require("./middlewares/error.middleware");

const app = express();

// Trust proxy when running behind Hostinger/nginx
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", true);
}

app.use(helmet());

// Prevent CDN/proxy from caching or serving truncated API responses
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // Override res.json to send explicit Content-Length and avoid chunked-transfer truncation
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const json = JSON.stringify(body);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Length", Buffer.byteLength(json, "utf8"));
    return res.send(json);
  };

  next();
});

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL].filter(Boolean)
    : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all in case of misconfigured origin
      }
    },
    credentials: true,
  }),
);

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:
    process.env.NODE_ENV === "production"
      ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500
      : 1000,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
  skip: () => process.env.NODE_ENV === "development",
});
app.use("/api/", limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/operations", operationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/invoices", invoiceRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Mahavay CRM API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

module.exports = app;
