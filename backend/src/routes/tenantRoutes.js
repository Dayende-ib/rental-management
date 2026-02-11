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

const backofficeRoles = ['admin', 'manager'];

/**
 * @swagger
 * /api/tenants:
 *   get:
 *     summary: Returns the list of all tenants (backoffice only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The list of tenants
 *       403:
 *         description: Forbidden
 */
router.get('/', authMiddleware, roleCheck(backofficeRoles), tenantController.getTenants);

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
 *     summary: Get tenant by ID (backoffice or Owner only)
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
router.get('/:id', authMiddleware, roleCheck(backofficeRoles), tenantController.getTenantById);

/**
 * @swagger
 * /api/tenants:
 *   post:
 *     summary: Create a new tenant (backoffice only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authMiddleware, roleCheck(backofficeRoles), tenantController.createTenant);

/**
 * @swagger
 * /api/tenants/{id}:
 *   put:
 *     summary: Update tenant (backoffice only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authMiddleware, roleCheck(backofficeRoles), tenantController.updateTenant);

/**
 * @swagger
 * /api/tenants/{id}:
 *   delete:
 *     summary: Delete tenant (backoffice only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authMiddleware, roleCheck(backofficeRoles), tenantController.deleteTenant);

module.exports = router;



