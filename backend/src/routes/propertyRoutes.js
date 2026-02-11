const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const authMiddleware = require('../middlewares/auth');
const validatePaymentProof = require('../middlewares/validatePaymentProof');
const upload = require('../middlewares/upload');
const roleCheck = require('../middlewares/roleCheck');


const optionalAuth = require('../middlewares/optionalAuth');

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: Property management API
 */

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Returns the list of properties (filtered for guests, all for backoffice)
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: The list of properties
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Property'
 */
router.get('/', optionalAuth, propertyController.getProperties);


/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Get property by ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The property description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       404:
 *         description: Property not found
 */
router.get('/:id', propertyController.getPropertyById);

const backofficeRoles = ['admin', 'manager'];

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a new property (backoffice only)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authMiddleware, roleCheck(backofficeRoles), propertyController.createProperty);

/**
 * @swagger
 * /api/properties/{id}:
 *   put:
 *     summary: Update property by ID (backoffice only)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authMiddleware, roleCheck(backofficeRoles), propertyController.updateProperty);

/**
 * @swagger
 * /api/properties/{id}/photos:
 *   post:
 *     summary: Upload a property photo (backoffice only)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/photos', authMiddleware, roleCheck(backofficeRoles), upload.single('file'), validatePaymentProof, propertyController.uploadPropertyPhoto);

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: Remove property by ID (backoffice only)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authMiddleware, roleCheck(backofficeRoles), propertyController.deleteProperty);


module.exports = router;


