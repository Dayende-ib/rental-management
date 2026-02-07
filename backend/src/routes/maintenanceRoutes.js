const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const authMiddleware = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Maintenance
 *   description: Maintenance request tracking API
 */

router.get('/', authMiddleware, maintenanceController.getMaintenanceRequests);
router.post('/', authMiddleware, maintenanceController.createMaintenanceRequest);
router.put('/:id', authMiddleware, maintenanceController.updateMaintenanceRequest);

module.exports = router;
