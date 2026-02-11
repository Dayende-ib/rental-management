const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const documentController = require('../controllers/documentController');

router.get('/', authMiddleware, documentController.getDocuments);
router.post('/', authMiddleware, upload.single('file'), documentController.uploadDocument);

module.exports = router;
