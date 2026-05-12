const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  createPaymentSchema,
  verifyPaymentSchema,
  remainingPaymentSchema,
} = require("../validations/payment.validation");
const { uploadPayment } = require("../middlewares/upload.middleware");
const { ROLES } = require("../config/constants");

router.use(authenticate);

router.get("/", paymentController.getPayments);
router.get(
  "/pending",
  authorize(ROLES.SUPER_ADMIN, ROLES.ACCOUNTS),
  paymentController.getPendingPayments,
);
router.get("/:id", paymentController.getPaymentDetails);
router.get("/screenshot/:screenshotId", paymentController.getScreenshot);

router.post(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.SALES),
  uploadPayment.array("screenshots", 10),
  paymentController.createPayment,
);
router.post(
  "/remaining",
  authorize(ROLES.SUPER_ADMIN, ROLES.SALES),
  uploadPayment.array("screenshots", 10),
  paymentController.addRemainingPayment,
);
router.post(
  "/:id/verify",
  authorize(ROLES.SUPER_ADMIN, ROLES.ACCOUNTS),
  validate(verifyPaymentSchema),
  paymentController.verifyPayment,
);
router.post(
  "/:id/screenshots",
  authorize(ROLES.SUPER_ADMIN, ROLES.SALES),
  uploadPayment.array("screenshots", 10),
  paymentController.uploadScreenshots,
);

router.delete(
  "/screenshot/:screenshotId",
  authorize(ROLES.SUPER_ADMIN),
  paymentController.deleteScreenshot,
);

module.exports = router;
