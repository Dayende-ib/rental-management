const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const authMiddleware = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');


/**
 * @swagger
 * tags:
 *   name: Tenants
 *   description: Tenant management API
 */

const staffRoles = ['admin', 'manager', 'staff'];

/**
 * @swagger
 * /api/tenants:
 *   get:
 *     summary: Returns the list of all tenants (Staff only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The list of tenants
 *       403:
 *         description: Forbidden
 */
router.get('/', authMiddleware, roleCheck(staffRoles), tenantController.getTenants);

/**
 * @swagger
 * /api/tenants/me:
 *   get:
 *     summary: Get current tenant profile
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current tenant profile
 */
router.get('/me', authMiddleware, tenantController.getCurrentTenant);

/**
 * @swagger
 * /api/tenants/{id}:
 *   get:
 *     summary: Get tenant by ID (Staff or Owner only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', authMiddleware, roleCheck(staffRoles), tenantController.getTenantById);

/**
 * @swagger
 * /api/tenants:
 *   post:
 *     summary: Create a new tenant (Staff only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authMiddleware, roleCheck(staffRoles), tenantController.createTenant);

/**
 * @swagger
 * /api/tenants/{id}:
 *   put:
 *     summary: Update tenant (Staff only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authMiddleware, roleCheck(staffRoles), tenantController.updateTenant);

/**
 * @swagger
 * /api/tenants/{id}:
 *   delete:
 *     summary: Delete tenant (Staff only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authMiddleware, roleCheck(staffRoles), tenantController.deleteTenant);

module.exports = router;

