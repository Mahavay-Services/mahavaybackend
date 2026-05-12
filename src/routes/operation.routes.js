const express = require('express');
const router = express.Router();
const operationController = require('../controllers/operation.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.OPS_MANAGER, ROLES.OPS_MEMBER), operationController.getOperations);
router.get('/stats', authorize(ROLES.SUPER_ADMIN, ROLES.OPS_MANAGER, ROLES.OPS_MEMBER), operationController.getOperationStats);
router.get('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.OPS_MANAGER, ROLES.OPS_MEMBER), operationController.getOperation);

router.post('/start/:bookingId', authorize(ROLES.SUPER_ADMIN, ROLES.OPS_MANAGER), operationController.startOperations);
router.post('/:id/assign', authorize(ROLES.SUPER_ADMIN, ROLES.OPS_MANAGER), operationController.assignOperation);
router.patch('/:id/status', authorize(ROLES.SUPER_ADMIN, ROLES.OPS_MANAGER, ROLES.OPS_MEMBER), operationController.updateOperationStatus);

module.exports = router;
