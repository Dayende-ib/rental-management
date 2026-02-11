const express = require('express');
const router = express.Router();
const propertyController = require('../../controllers/propertyController');
const tenantController = require('../../controllers/tenantController');
const contractController = require('../../controllers/contractController');
const paymentController = require('../../controllers/paymentController');
const maintenanceController = require('../../controllers/maintenanceController');
const authMiddleware = require('../../middlewares/auth');
const optionalAuth = require('../../middlewares/optionalAuth');
const roleCheck = require('../../middlewares/roleCheck');

// Roles autorisés pour le mobile (tenant)
const tenantRole = ['tenant'];

// Profiles / Me
router.get('/me', authMiddleware, roleCheck(tenantRole), tenantController.getCurrentTenant);

// Properties (View Only - Public/Guest allowed)
router.get('/properties', optionalAuth, propertyController.getProperties);
router.get('/properties/:id', optionalAuth, propertyController.getPropertyById);

// Contracts (View & Manage)
router.get('/contracts', authMiddleware, roleCheck(tenantRole), contractController.getContracts);
router.get('/contracts/:id', authMiddleware, roleCheck(tenantRole), contractController.getContractById);
router.post('/contracts', authMiddleware, roleCheck(tenantRole), contractController.createContractRequest);
router.post('/contracts/:id/accept', authMiddleware, roleCheck(tenantRole), contractController.acceptContract);
router.post('/contracts/:id/reject', authMiddleware, roleCheck(tenantRole), contractController.rejectContract);

// Payments (View & Pay)
router.get('/payments', authMiddleware, roleCheck(tenantRole), paymentController.getPayments);
router.post('/payments/manual', authMiddleware, roleCheck(tenantRole), paymentController.createTenantManualPayment);
// Payment creation/upload proof might be needed for tenants? Assuming tenants can upload proof?
// The original route had uploadPaymentProof.
router.post('/payments/:id/proof', authMiddleware, roleCheck(tenantRole), require('../../middlewares/upload').single('file'), require('../../middlewares/validatePaymentProof'), paymentController.uploadPaymentProof);

// Maintenance (View & Create)
router.get('/maintenance', authMiddleware, roleCheck(tenantRole), maintenanceController.getMaintenanceRequests);
router.post('/maintenance', authMiddleware, roleCheck(tenantRole), maintenanceController.createMaintenanceRequest);
// Tenants usually can update their own maintenance requests (e.g. cancel)?
// For now, allow view/create.

module.exports = router;
