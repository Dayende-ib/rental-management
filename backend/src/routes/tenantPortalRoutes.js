const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const validatePaymentProof = require('../middlewares/validatePaymentProof');
const tenantPortalController = require('../controllers/tenantPortalController');

router.get('/payments', authMiddleware, tenantPortalController.getTenantPayments);
router.post('/payments/:id/proof', authMiddleware, upload.single('file'), validatePaymentProof, tenantPortalController.uploadTenantPaymentProof);
router.get('/maintenance', authMiddleware, tenantPortalController.getTenantMaintenance);
router.post('/maintenance', authMiddleware, tenantPortalController.createTenantMaintenance);

module.exports = router;
