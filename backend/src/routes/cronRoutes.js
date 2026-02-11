const express = require('express');
const router = express.Router();
const cronController = require('../controllers/cronController');

// Simple secret key protection (optional but recommended)
const checkCronSecret = (req, res, next) => {
    // Check for a custom header, e.g., 'x-cron-secret' or just allow localhost
    // For now, open or check env var
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers['x-cron-secret'] !== secret) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

router.post('/daily', checkCronSecret, cronController.runDailyTasks);

module.exports = router;
