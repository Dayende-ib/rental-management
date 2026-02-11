const express = require('express');
const router = express.Router();
const propertyController = require('../../controllers/propertyController');
const tenantController = require('../../controllers/tenantController');
const contractController = require('../../controllers/contractController');
const paymentController = require('../../controllers/paymentController');
const maintenanceController = require('../../controllers/maintenanceController');
const authMiddleware = require('../../middlewares/auth');
const roleCheck = require('../../middlewares/roleCheck');

// Roles autorisés pour le mobile (tenant)
const tenantRole = ['tenant'];

// Profiles / Me
router.get('/me', authMiddleware, roleCheck(tenantRole), tenantController.getCurrentTenant);

// Properties (View Only)
router.get('/properties', authMiddleware, roleCheck(tenantRole), propertyController.getProperties);
router.get('/properties/:id', authMiddleware, roleCheck(tenantRole), propertyController.getPropertyById);

// Contracts (View Only - Own contracts)
router.get('/contracts', authMiddleware, roleCheck(tenantRole), contractController.getContracts);
router.get('/contracts/:id', authMiddleware, roleCheck(tenantRole), contractController.getContractById);

// Payments (View & Pay)
router.get('/payments', authMiddleware, roleCheck(tenantRole), paymentController.getPayments);
// Payment creation/upload proof might be needed for tenants? Assuming tenants can upload proof?
// The original route had uploadPaymentProof.
router.post('/payments/:id/proof', authMiddleware, roleCheck(tenantRole), require('../../middlewares/upload').single('file'), require('../../middlewares/validatePaymentProof'), paymentController.uploadPaymentProof);

// Maintenance (View & Create)
router.get('/maintenance', authMiddleware, roleCheck(tenantRole), maintenanceController.getMaintenanceRequests);
router.post('/maintenance', authMiddleware, roleCheck(tenantRole), maintenanceController.createMaintenanceRequest);
// Tenants usually can update their own maintenance requests (e.g. cancel)?
// For now, allow view/create.

module.exports = router;
