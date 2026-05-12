const express = require("express");
const router = express.Router();
const settingController = require("../controllers/setting.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

router.get("/public", settingController.getPublicSettings);

router.use(authenticate);

router.get("/", settingController.getSettings);
router.put(
  "/",
  authorize(ROLES.SUPER_ADMIN),
  settingController.updateSettings,
);

module.exports = router;
