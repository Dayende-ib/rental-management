const express = require('express');
const router = express.Router();
const propertyController = require('../../controllers/propertyController');
const tenantController = require('../../controllers/tenantController');
const contractController = require('../../controllers/contractController');
const paymentController = require('../../controllers/paymentController');
const maintenanceController = require('../../controllers/maintenanceController');
const authMiddleware = require('../../middlewares/auth');
const roleCheck = require('../../middlewares/roleCheck');
const validatePaymentProof = require('../../middlewares/validatePaymentProof');
const upload = require('../../middlewares/upload');

// Roles autorisés pour le web (staff)
const staffRoles = ['admin', 'manager', 'staff'];

// Properties
router.get('/properties', authMiddleware, roleCheck(staffRoles), propertyController.getProperties);
router.get('/properties/:id', authMiddleware, roleCheck(staffRoles), propertyController.getPropertyById);
router.post('/properties', authMiddleware, roleCheck(staffRoles), propertyController.createProperty);
router.put('/properties/:id', authMiddleware, roleCheck(staffRoles), propertyController.updateProperty);
router.post('/properties/:id/photos', authMiddleware, roleCheck(staffRoles), upload.single('file'), validatePaymentProof, propertyController.uploadPropertyPhoto);
router.delete('/properties/:id', authMiddleware, roleCheck(staffRoles), propertyController.deleteProperty);

// Tenants
router.get('/tenants', authMiddleware, roleCheck(staffRoles), tenantController.getTenants);
router.get('/tenants/:id', authMiddleware, roleCheck(staffRoles), tenantController.getTenantById);
router.post('/tenants', authMiddleware, roleCheck(staffRoles), tenantController.createTenant);
router.put('/tenants/:id', authMiddleware, roleCheck(staffRoles), tenantController.updateTenant);
router.delete('/tenants/:id', authMiddleware, roleCheck(staffRoles), tenantController.deleteTenant);

// Contracts
router.get('/contracts', authMiddleware, roleCheck(staffRoles), contractController.getContracts);
router.get('/contracts/:id', authMiddleware, roleCheck(staffRoles), contractController.getContractById);
router.post('/contracts', authMiddleware, roleCheck(staffRoles), contractController.createContract);
router.put('/contracts/:id', authMiddleware, roleCheck(staffRoles), contractController.updateContract);
router.delete('/contracts/:id', authMiddleware, roleCheck(staffRoles), contractController.deleteContract);

// Payments
router.get('/payments', authMiddleware, roleCheck(staffRoles), paymentController.getPayments);
router.post('/payments', authMiddleware, roleCheck(staffRoles), paymentController.createPayment);
router.put('/payments/:id', authMiddleware, roleCheck(staffRoles), paymentController.updatePayment);
router.post('/payments/:id/proof', authMiddleware, roleCheck(staffRoles), upload.single('file'), validatePaymentProof, paymentController.uploadPaymentProof);

// Maintenance
router.get('/maintenance', authMiddleware, roleCheck(staffRoles), maintenanceController.getMaintenanceRequests);
router.post('/maintenance', authMiddleware, roleCheck(staffRoles), maintenanceController.createMaintenanceRequest);
router.put('/maintenance/:id', authMiddleware, roleCheck(staffRoles), maintenanceController.updateMaintenanceRequest);

module.exports = router;
