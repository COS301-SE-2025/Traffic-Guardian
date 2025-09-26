const express = require('express');
const router = express.Router();
const cameraController = require('../controllers/cameraController');
const authMiddleware = require('../middleware/auth');
const rateLimiters = require('../middleware/rateLimiter');

// Public route for traffic data (no authentication required)
router.get('/public/traffic-data', rateLimiters.camera, cameraController.getPublicTrafficData);

// Public route for top cameras by traffic count (no authentication required)
router.get('/public/top-by-traffic', rateLimiters.camera, cameraController.getTopCamerasByTraffic);

// All other routes in this file require authentication
router.use(authMiddleware.authenticate);

// Apply general camera rate limiting to all routes
router.use(rateLimiters.camera);

// Bulk upsert cameras from live feed data (most restrictive)
router.post('/bulk-upsert', rateLimiters.cameraBulk, cameraController.bulkUpsertCameras);

// Record camera status update (moderate limiting)
router.post('/status', rateLimiters.cameraStatus, cameraController.recordCameraStatus);

// Batch camera status updates (moderate limiting) - NEW ENDPOINT
router.post('/status-batch', rateLimiters.cameraStatus, cameraController.recordCameraStatusBatch);

// Get camera by external ID (from CalTrans)
router.get('/external/:externalId', cameraController.getCameraByExternalId);

// Search cameras with filters
router.get('/search', cameraController.searchCameras);

// Get camera analytics
router.get('/analytics', cameraController.getCameraAnalytics);

// Get camera dashboard data (moderate limiting)
router.get('/dashboard', rateLimiters.dashboard, cameraController.getCameraDashboard);

// Search archived incidents
router.get('/archives/search', cameraController.searchArchivedIncidents);

// Perform maintenance (restrictive)
router.post('/maintenance', rateLimiters.cameraBulk, cameraController.performMaintenance);

// Update traffic count for a camera
router.post('/traffic-count', rateLimiters.cameraStatus, cameraController.updateTrafficCount);

module.exports = router;