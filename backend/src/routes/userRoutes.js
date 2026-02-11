const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const userController = require('../controllers/userController');

router.get('/', authMiddleware, userController.getUsers);
router.delete('/:id', authMiddleware, userController.deleteUser);

module.exports = router;
