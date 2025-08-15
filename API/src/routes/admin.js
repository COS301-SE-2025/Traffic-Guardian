const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const rateLimiters = require('../middleware/rateLimiter');
const router = express.Router();

// All admin routes require authentication
router.use(authMiddleware.authenticate);

// Apply rate limiting to admin routes
router.use(rateLimiters.dashboard);

// Admin statistics (includes optimization stats)
router.get('/stats', adminController.getAdminStats);

// Cache management routes
router.get('/cache/stats', adminController.getCacheStats);
router.post('/cache/clear', adminController.clearCache);

// Database management routes
router.get('/database/stats', adminController.getDatabaseStats);
router.post('/database/cleanup', adminController.runDatabaseCleanup);

// Deduplication management routes
router.get('/deduplication/stats', adminController.getDeduplicationStats);
router.post('/deduplication/clear', adminController.clearDeduplicationData);

module.exports = router;