const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const { uploadPayment } = require("../middlewares/upload.middleware");
const {
  createBookingSchema,
  updateBookingSchema,
} = require("../validations/booking.validation");
const { ROLES } = require("../config/constants");

router.use(authenticate);

router.get("/", bookingController.getBookings);
router.get("/stats", bookingController.getBookingStats);
router.get("/:id", bookingController.getBooking);
router.get("/:id/activity", bookingController.getBookingActivity);

router.post(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.SALES),
  uploadPayment.array("screenshots", 5),
  bookingController.createBooking,
);
router.put(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.SALES),
  validate(updateBookingSchema),
  bookingController.updateBooking,
);
router.put(
  "/:id/services",
  authorize(ROLES.SUPER_ADMIN, ROLES.SALES),
  bookingController.updateBookingServices,
);
router.post(
  "/:id/stage",
  authorize(ROLES.SUPER_ADMIN, ROLES.ACCOUNTS, ROLES.LEGAL, ROLES.OPS_MANAGER),
  bookingController.changeStage,
);
router.post("/:id/remarks", bookingController.addRemark);

router.delete(
  "/:id",
  authorize(ROLES.SUPER_ADMIN),
  bookingController.deleteBooking,
);

module.exports = router;
