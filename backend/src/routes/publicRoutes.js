const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/properties', publicController.getAvailableProperties);

module.exports = router;
