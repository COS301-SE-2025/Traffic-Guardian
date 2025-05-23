const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// All routes in this file require authentication
router.use(authMiddleware.authenticate);

router.put('/preferences', userController.updatePreferences);
router.get('/preferences', userController.getPreferences);

// Import alertController to handle user alerts
const alertController = require('../controllers/alertController');
router.get('/alerts', alertController.getUserAlerts);

module.exports = router;