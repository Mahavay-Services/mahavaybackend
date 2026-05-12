const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createServiceSchema, updateServiceSchema } = require('../validations/service.validation');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.get('/', serviceController.getServices);
router.get('/active', serviceController.getActiveServices);
router.get('/categories', serviceController.getCategories);
router.get('/:id', serviceController.getService);

router.post('/', authorize(ROLES.SUPER_ADMIN), validate(createServiceSchema), serviceController.createService);
router.put('/:id', authorize(ROLES.SUPER_ADMIN), validate(updateServiceSchema), serviceController.updateService);
router.patch('/:id/toggle-status', authorize(ROLES.SUPER_ADMIN), serviceController.toggleServiceStatus);

module.exports = router;
