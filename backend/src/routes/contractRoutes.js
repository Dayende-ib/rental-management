const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const authMiddleware = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Contracts
 *   description: Lease contract management API
 */

router.get('/', authMiddleware, contractController.getContracts);
router.get('/:id', authMiddleware, contractController.getContractById);
router.post('/', authMiddleware, contractController.createContract);
router.put('/:id', authMiddleware, contractController.updateContract);
router.delete('/:id', authMiddleware, contractController.deleteContract);

module.exports = router;
