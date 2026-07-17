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

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [
        "https://mediumseagreen-penguin-371115.hostingersite.com",
        process.env.FRONTEND_URL,
      ].filter(Boolean)
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
    message: "CRM API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

module.exports = app;
