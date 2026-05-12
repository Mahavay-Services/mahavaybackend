const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} = require("../validations/user.validation");
const { ROLES } = require("../config/constants");

router.use(authenticate);

router.get(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.OPS_MANAGER),
  userController.getUsers,
);
router.get("/bdm-list", userController.getBDMUsers);
router.get(
  "/ops-list",
  authorize(ROLES.SUPER_ADMIN, ROLES.OPS_MANAGER),
  userController.getOpsUsers,
);
router.get("/stats", authorize(ROLES.SUPER_ADMIN), userController.getUserStats);
router.get("/:id", userController.getUser);

router.post(
  "/",
  authorize(ROLES.SUPER_ADMIN),
  validate(createUserSchema),
  userController.createUser,
);
router.put(
  "/:id",
  authorize(ROLES.SUPER_ADMIN),
  validate(updateUserSchema),
  userController.updateUser,
);
router.patch(
  "/:id/toggle-status",
  authorize(ROLES.SUPER_ADMIN),
  userController.toggleUserStatus,
);
router.post(
  "/:id/reset-password",
  authorize(ROLES.SUPER_ADMIN),
  validate(resetPasswordSchema),
  userController.resetPassword,
);
router.delete("/:id", authorize(ROLES.SUPER_ADMIN), userController.deleteUser);

module.exports = router;
