const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Rent payment tracking API
 */

router.get('/', authMiddleware, paymentController.getPayments);
router.post('/', authMiddleware, paymentController.createPayment);
router.put('/:id', authMiddleware, paymentController.updatePayment);

module.exports = router;
