const express = require('express');
const router = express.Router();
const backgroundJobService = require('../services/backgroundJobService');
const authMiddleware = require('../middleware/auth');
const rateLimiters = require('../middleware/rateLimiter');

// Apply internal rate limiting to all internal routes
router.use('/internal', rateLimiters.internal);

// Internal endpoint for camera data processing (no auth required)
router.post('/internal/cameras/bulk-upsert', async (req, res) => {
  try {
    const { cameras, source = 'internal' } = req.body;

    if (!cameras || !Array.isArray(cameras)) {
      return res.status(400).json({ error: 'Invalid cameras data' });
    }

    // Queue job for background processing
    const jobId = backgroundJobService.enqueueJob('camera_bulk_upsert', {
      cameras,
      source
    }, {
      priority: 'normal',
      maxRetries: 3
    });

    res.json({
      success: true,
      message: 'Camera bulk upsert queued for processing',
      jobId
    });
  } catch (error) {
    console.error('Error queueing camera bulk upsert:', error);
    res.status(500).json({ error: 'Failed to queue camera bulk upsert' });
  }
});

// Internal endpoint for status batch updates (no auth required)
router.post('/internal/cameras/status-batch', async (req, res) => {
  try {
    const { statusUpdates } = req.body;

    if (!statusUpdates || !Array.isArray(statusUpdates)) {
      return res.status(400).json({ error: 'Invalid statusUpdates data' });
    }

    if (statusUpdates.length > 100) {
      return res.status(400).json({ error: 'Too many status updates (max 100)' });
    }

    // Queue job for background processing
    const jobId = backgroundJobService.enqueueJob('camera_status_batch', {
      statusUpdates
    }, {
      priority: 'normal',
      maxRetries: 2
    });

    res.json({
      success: true,
      message: 'Status updates queued for processing',
      jobId
    });
  } catch (error) {
    console.error('Error queueing status batch update:', error);
    res.status(500).json({ error: 'Failed to queue status batch update' });
  }
});

// System health endpoint (no auth required)
router.get('/health', (req, res) => {
  const jobStats = backgroundJobService.getStats();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    backgroundJobs: jobStats,
    uptime: process.uptime()
  });
});

// Admin endpoints below require authentication
router.use(authMiddleware.authenticate);
router.use(rateLimiters.general);

// Get background job statistics
router.get('/jobs/stats', (req, res) => {
  try {
    const stats = backgroundJobService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting job stats:', error);
    res.status(500).json({ error: 'Failed to get job statistics' });
  }
});

// Get queued jobs (for debugging)
router.get('/jobs/queue', (req, res) => {
  try {
    const queuedJobs = backgroundJobService.getQueuedJobs();
    res.json({ jobs: queuedJobs });
  } catch (error) {
    console.error('Error getting queued jobs:', error);
    res.status(500).json({ error: 'Failed to get queued jobs' });
  }
});

// Clear job queue (admin operation)
router.delete('/jobs/queue', rateLimiters.cameraBulk, (req, res) => {
  try {
    const clearedCount = backgroundJobService.clearQueue();
    res.json({
      success: true,
      message: `Cleared ${clearedCount} jobs from queue`
    });
  } catch (error) {
    console.error('Error clearing job queue:', error);
    res.status(500).json({ error: 'Failed to clear job queue' });
  }
});

// Manual data sync trigger (admin operation)
router.post('/sync/:type', rateLimiters.cameraBulk, (req, res) => {
  try {
    const { type } = req.params;

    if (!['dashboard', 'cache'].includes(type)) {
      return res.status(400).json({ error: 'Invalid sync type' });
    }

    const jobId = backgroundJobService.enqueueJob('data_sync', {
      syncType: type
    }, {
      priority: 'high',
      maxRetries: 2
    });

    res.json({
      success: true,
      message: `${type} sync queued for processing`,
      jobId
    });
  } catch (error) {
    console.error('Error triggering manual sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

module.exports = router;