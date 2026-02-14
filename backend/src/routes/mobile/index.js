const express = require('express');
const router = express.Router();
const propertyController = require('../../controllers/propertyController');
const tenantController = require('../../controllers/tenantController');
const contractController = require('../../controllers/contractController');
const paymentController = require('../../controllers/paymentController');
const maintenanceController = require('../../controllers/maintenanceController');
const realtimeController = require('../../controllers/realtimeController');
const authMiddleware = require('../../middlewares/auth');
const authSse = require('../../middlewares/authSse');
const optionalAuth = require('../../middlewares/optionalAuth');
const roleCheck = require('../../middlewares/roleCheck');
const eventBus = require('../../realtime/eventBus');

// Roles autorisés pour le mobile (tenant)
const tenantRole = ['tenant'];

const inferEntityFromPath = (path) => {
    const segment = String(path || '')
        .replace(/^\/+/, '')
        .split('/')[0]
        .toLowerCase();

    switch (segment) {
        case 'properties': return 'properties';
        case 'contracts': return 'contracts';
        case 'payments': return 'payments';
        case 'maintenance': return 'maintenance';
        default: return 'system';
    }
};

router.use((req, res, next) => {
    res.on('finish', () => {
        const method = String(req.method || '').toUpperCase();
        const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
        if (!isMutation || res.statusCode >= 400) return;

        eventBus.publish({
            action: method,
            entity: inferEntityFromPath(req.path),
            path: req.path,
            status: res.statusCode,
            actor_id: req.user?.id || null,
            source: 'mobile',
        });
    });
    next();
});

router.get('/realtime/stream', authSse, roleCheck(tenantRole), realtimeController.stream);

// Profiles / Me
router.get('/me', authMiddleware, roleCheck(tenantRole), tenantController.getCurrentTenant);

// Properties (View Only - Public/Guest allowed)
router.get('/properties', optionalAuth, propertyController.getProperties);
router.get('/properties/:id', optionalAuth, propertyController.getPropertyById);
router.get('/properties/:id/contract-template', authMiddleware, roleCheck(tenantRole), propertyController.getPropertyContractTemplate);

// Contracts (View & Manage)
router.get('/contracts', authMiddleware, roleCheck(tenantRole), contractController.getContracts);
router.get('/contracts/:id', authMiddleware, roleCheck(tenantRole), contractController.getContractById);
router.post('/contracts', authMiddleware, roleCheck(tenantRole), contractController.createContractRequest);
router.post('/contracts/:id/signed-document', authMiddleware, roleCheck(tenantRole), require('../../middlewares/upload').single('file'), require('../../middlewares/validateContractPdf'), contractController.uploadSignedContractDocument);
router.post('/contracts/:id/accept', authMiddleware, roleCheck(tenantRole), contractController.acceptContract);
router.post('/contracts/:id/reject', authMiddleware, roleCheck(tenantRole), contractController.rejectContract);

// Payments (View & Pay)
router.get('/payments', authMiddleware, roleCheck(tenantRole), paymentController.getPayments);
router.get('/payments/overview', authMiddleware, roleCheck(tenantRole), paymentController.getPaymentsOverview);
router.post('/payments/manual', authMiddleware, roleCheck(tenantRole), paymentController.createTenantManualPayment);
router.put('/payments/:id', authMiddleware, roleCheck(tenantRole), paymentController.updatePayment);
router.delete('/payments/:id', authMiddleware, roleCheck(tenantRole), paymentController.deletePayment);
// Payment creation/upload proof might be needed for tenants? Assuming tenants can upload proof?
// The original route had uploadPaymentProof.
router.post('/payments/:id/proof', authMiddleware, roleCheck(tenantRole), require('../../middlewares/upload').single('file'), require('../../middlewares/validatePaymentProof'), paymentController.uploadPaymentProof);

// Maintenance (View & Create)
router.get('/maintenance', authMiddleware, roleCheck(tenantRole), maintenanceController.getMaintenanceRequests);
router.post('/maintenance', authMiddleware, roleCheck(tenantRole), maintenanceController.createMaintenanceRequest);
// Tenants usually can update their own maintenance requests (e.g. cancel)?
// For now, allow view/create.

module.exports = router;
