const express = require("express");
const router = express.Router();
const quotationController = require("../controllers/quotation.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

router.use(authenticate);

router.get("/", quotationController.getQuotations);
router.get("/services", quotationController.getServices);
router.get("/:id", quotationController.getQuotation);

router.post(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.SALES),
  quotationController.createQuotation,
);

router.put(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.SALES),
  quotationController.updateQuotation,
);

router.patch(
  "/:id/status",
  authorize(ROLES.SUPER_ADMIN, ROLES.SALES),
  quotationController.updateStatus,
);

router.delete(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.SALES),
  quotationController.deleteQuotation,
);

module.exports = router;
