const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/invoice.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

router.use(authenticate);

router.get("/", invoiceController.getInvoices);
router.get("/services", invoiceController.getServices);
router.get("/:id", invoiceController.getInvoice);

router.post(
  "/",
  authorize(ROLES.SUPER_ADMIN),
  invoiceController.createInvoice
);

router.put(
  "/:id",
  authorize(ROLES.SUPER_ADMIN),
  invoiceController.updateInvoice
);

router.patch(
  "/:id/status",
  authorize(ROLES.SUPER_ADMIN),
  invoiceController.updateStatus
);

router.delete(
  "/:id",
  authorize(ROLES.SUPER_ADMIN),
  invoiceController.deleteInvoice
);

module.exports = router;
