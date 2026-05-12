const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

router.use(authenticate);
router.use(authorize(ROLES.SUPER_ADMIN, ROLES.ACCOUNTS, ROLES.SALES));

router.get("/collections/daily", reportController.getDailyCollections);
router.get("/collections/monthly", reportController.getMonthlyCollections);
router.get("/gst", reportController.getGSTReport);
router.get("/bdm-revenue", reportController.getBDMRevenueReport);
router.get("/split-commission", reportController.getSplitCommissionReport);
router.get("/pending-payments", reportController.getPendingPaymentsReport);
router.get(
  "/operations-workload",
  authorize(ROLES.SUPER_ADMIN, ROLES.OPS_MANAGER),
  reportController.getOperationsWorkloadReport,
);
router.get("/booking-conversion", reportController.getBookingConversionReport);
router.get("/quotation-report", reportController.getQuotationReport);
router.get("/bdm-scorecard", reportController.getBDMScorecard);

module.exports = router;
