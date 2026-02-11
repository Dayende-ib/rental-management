const express = require('express');
const router = express.Router();
const propertyController = require('../../controllers/propertyController');
const tenantController = require('../../controllers/tenantController');
const contractController = require('../../controllers/contractController');
const paymentController = require('../../controllers/paymentController');
const maintenanceController = require('../../controllers/maintenanceController');
const userController = require('../../controllers/userController');
const notificationController = require('../../controllers/notificationController');
const authMiddleware = require('../../middlewares/auth');
const roleCheck = require('../../middlewares/roleCheck');
const validatePaymentProof = require('../../middlewares/validatePaymentProof');
const upload = require('../../middlewares/upload');

// Roles autorisés pour le web (backoffice)
const backofficeRoles = ['admin', 'manager'];
const adminRoles = ['admin'];

// Properties
router.get('/properties', authMiddleware, roleCheck(backofficeRoles), propertyController.getProperties);
router.get('/properties/:id', authMiddleware, roleCheck(backofficeRoles), propertyController.getPropertyById);
router.post('/properties', authMiddleware, roleCheck(backofficeRoles), propertyController.createProperty);
router.put('/properties/:id', authMiddleware, roleCheck(backofficeRoles), propertyController.updateProperty);
router.post('/properties/:id/photos', authMiddleware, roleCheck(backofficeRoles), upload.single('file'), validatePaymentProof, propertyController.uploadPropertyPhoto);
router.delete('/properties/:id', authMiddleware, roleCheck(backofficeRoles), propertyController.deleteProperty);

// Tenants
router.get('/tenants', authMiddleware, roleCheck(backofficeRoles), tenantController.getTenants);
router.get('/tenants/:id', authMiddleware, roleCheck(backofficeRoles), tenantController.getTenantById);
router.post('/tenants', authMiddleware, roleCheck(backofficeRoles), tenantController.createTenant);
router.put('/tenants/:id', authMiddleware, roleCheck(backofficeRoles), tenantController.updateTenant);
router.delete('/tenants/:id', authMiddleware, roleCheck(backofficeRoles), tenantController.deleteTenant);

// Contracts
router.get('/contracts', authMiddleware, roleCheck(backofficeRoles), contractController.getContracts);
router.get('/contracts/:id', authMiddleware, roleCheck(backofficeRoles), contractController.getContractById);
router.post('/contracts', authMiddleware, roleCheck(backofficeRoles), contractController.createContract);
router.put('/contracts/:id', authMiddleware, roleCheck(backofficeRoles), contractController.updateContract);
router.delete('/contracts/:id', authMiddleware, roleCheck(backofficeRoles), contractController.deleteContract);

// Payments
router.get('/payments', authMiddleware, roleCheck(backofficeRoles), paymentController.getPayments);
router.post('/payments', authMiddleware, roleCheck(backofficeRoles), paymentController.createPayment);
router.put('/payments/:id', authMiddleware, roleCheck(backofficeRoles), paymentController.updatePayment);
router.post('/payments/:id/proof', authMiddleware, roleCheck(backofficeRoles), upload.single('file'), validatePaymentProof, paymentController.uploadPaymentProof);
router.post('/payments/:id/validate', authMiddleware, roleCheck(backofficeRoles), paymentController.validatePayment);
router.post('/payments/:id/reject', authMiddleware, roleCheck(backofficeRoles), paymentController.rejectPayment);

// Maintenance
router.get('/maintenance', authMiddleware, roleCheck(backofficeRoles), maintenanceController.getMaintenanceRequests);
router.post('/maintenance', authMiddleware, roleCheck(backofficeRoles), maintenanceController.createMaintenanceRequest);
router.put('/maintenance/:id', authMiddleware, roleCheck(backofficeRoles), maintenanceController.updateMaintenanceRequest);

// Users (admin only)
router.get('/users', authMiddleware, roleCheck(adminRoles), userController.listUsers);
router.post('/users', authMiddleware, roleCheck(adminRoles), userController.createUser);
router.delete('/users/:id', authMiddleware, roleCheck(adminRoles), userController.deleteUser);

// Notifications
router.get('/notifications', authMiddleware, roleCheck(backofficeRoles), notificationController.listNotifications);
router.patch('/notifications/:id/read', authMiddleware, roleCheck(backofficeRoles), notificationController.markNotificationRead);

module.exports = router;


