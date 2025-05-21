const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// All routes in this file require authentication
router.use(authMiddleware.authenticate);

router.put('/preferences', userController.updatePreferences);
router.get('/preferences', userController.getPreferences);

module.exports = router;