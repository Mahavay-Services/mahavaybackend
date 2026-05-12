const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.get('/super-admin', authorize(ROLES.SUPER_ADMIN), dashboardController.getSuperAdminDashboard);
router.get('/sales', authorize(ROLES.SUPER_ADMIN, ROLES.SALES), dashboardController.getSalesDashboard);
router.get('/accounts', authorize(ROLES.SUPER_ADMIN, ROLES.ACCOUNTS), dashboardController.getAccountsDashboard);
router.get('/legal', authorize(ROLES.SUPER_ADMIN, ROLES.LEGAL), dashboardController.getLegalDashboard);
router.get('/operations', authorize(ROLES.SUPER_ADMIN, ROLES.OPS_MANAGER, ROLES.OPS_MEMBER), dashboardController.getOperationsDashboard);

module.exports = router;
