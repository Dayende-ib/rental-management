const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const notificationController = require('../controllers/notificationController');

router.get('/', authMiddleware, notificationController.getNotifications);
router.patch('/:id/read', authMiddleware, notificationController.markNotificationRead);

module.exports = router;
