const express = require("express");
const router = express.Router();
const documentController = require("../controllers/document.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const {
  uploadDocument,
  uploadAgreement,
} = require("../middlewares/upload.middleware");
const { ROLES } = require("../config/constants");

router.use(authenticate);

router.get("/", documentController.getDocuments);
router.get("/types", documentController.getDocumentTypes);
router.get(
  "/legal/stats",
  authorize(ROLES.SUPER_ADMIN, ROLES.LEGAL),
  documentController.getLegalStats,
);
router.get(
  "/legal/bookings",
  authorize(ROLES.SUPER_ADMIN, ROLES.LEGAL),
  documentController.getAllLegalBookings,
);
router.get(
  "/pending-legal",
  authorize(ROLES.SUPER_ADMIN, ROLES.LEGAL),
  documentController.getPendingLegalApprovals,
);
router.get("/:id/download", documentController.downloadDocument);
router.get("/:bookingId/approvals", documentController.getApprovalHistory);

router.post(
  "/upload",
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.LEGAL,
    ROLES.ACCOUNTS,
    ROLES.OPS_MANAGER,
    ROLES.OPS_MEMBER,
  ),
  uploadDocument.single("file"),
  documentController.uploadDocument,
);
router.post(
  "/agreement",
  authorize(ROLES.SUPER_ADMIN, ROLES.LEGAL),
  uploadAgreement.single("file"),
  documentController.uploadDocument,
);

router.put(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.LEGAL),
  uploadDocument.single("file"),
  documentController.updateDocument,
);

router.post(
  "/:bookingId/legal/approve",
  authorize(ROLES.SUPER_ADMIN, ROLES.LEGAL),
  documentController.approveLegal,
);
router.post(
  "/:bookingId/legal/reject",
  authorize(ROLES.SUPER_ADMIN, ROLES.LEGAL),
  documentController.rejectLegal,
);
router.post(
  "/:bookingId/legal/corrections",
  authorize(ROLES.SUPER_ADMIN, ROLES.LEGAL),
  documentController.sendBackForCorrections,
);

router.delete(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.LEGAL),
  documentController.deleteDocument,
);

module.exports = router;
