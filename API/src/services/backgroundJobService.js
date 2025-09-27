const cameraModel = require('../models/camera');
const deduplicationService = require('./deduplicationService');
const cacheService = require('./cacheService');

class BackgroundJobService {
  constructor() {
    this.jobQueue = [];
    this.isProcessing = false;
    this.processingInterval = null;
    this.stats = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      lastProcessed: null
    };
  }

  // Start the background job processor
  start() {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, 60000); // Process every 60 seconds - cost optimized

    // Also process immediately
    setImmediate(() => this.processQueue());
  }

  // Stop the background job processor
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  // Add a job to the queue
  enqueueJob(type, data, options = {}) {
    const job = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      options: {
        maxRetries: options.maxRetries || 3,
        retryDelay: options.retryDelay || 5000,
        priority: options.priority || 'normal',
        ...options
      },
      attempts: 0,
      createdAt: new Date(),
      status: 'queued'
    };

    this.jobQueue.push(job);
    this.stats.totalJobs++;

    // Sort by priority (high -> normal -> low)
    this.jobQueue.sort((a, b) => {
      const priorities = { high: 3, normal: 2, low: 1 };
      return priorities[b.options.priority] - priorities[a.options.priority];
    });

    return job.id;
  }

  // Process the job queue
  async processQueue() {
    if (this.isProcessing || this.jobQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const job = this.jobQueue.shift();
      if (!job) {
        return;
      }

      job.status = 'processing';
      job.attempts++;

      try {
        await this.executeJob(job);
        job.status = 'completed';
        this.stats.completedJobs++;
        this.stats.lastProcessed = new Date();
      } catch (error) {
        console.error(`❌ Job failed: ${job.type} (${job.id})`, error.message);

        if (job.attempts < job.options.maxRetries) {
          job.status = 'retry_scheduled';
          // Re-queue with delay
          setTimeout(() => {
            this.jobQueue.unshift(job);
          }, job.options.retryDelay);
        } else {
          job.status = 'failed';
          job.error = error.message;
          this.stats.failedJobs++;
          console.error(`💀 Job permanently failed: ${job.type} (${job.id})`);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Execute a specific job based on its type
  async executeJob(job) {
    switch (job.type) {
      case 'camera_bulk_upsert':
        return await this.handleCameraBulkUpsert(job);

      case 'camera_status_batch':
        return await this.handleCameraStatusBatch(job);

      case 'cache_cleanup':
        return await this.handleCacheCleanup(job);

      case 'data_sync':
        return await this.handleDataSync(job);

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  // Handle camera bulk upsert jobs
  async handleCameraBulkUpsert(job) {
    const { cameras, source = 'background' } = job.data;

    if (!cameras || !Array.isArray(cameras) || cameras.length === 0) {
      throw new Error('Invalid camera data for bulk upsert');
    }

    // Check for duplicate operations
    const duplicateCheck = await deduplicationService.isDuplicateBulkOperation(cameras);

    if (duplicateCheck.isDuplicate) {
      // Return cached result if available
      const cachedResult = cacheService.getBulkOperationResult(duplicateCheck.hash);
      if (cachedResult) {
        return cachedResult;
      }
    }

    // Filter changed cameras to reduce database load
    const filterResult = await deduplicationService.filterChangedCameras(cameras);

    if (filterResult.changedCameras.length === 0) {
      const result = {
        success: true,
        upsertedCount: 0,
        skippedCount: filterResult.skippedCameras.length,
        message: 'No cameras needed updating',
        source
      };

      // Mark operation as completed
      if (duplicateCheck.hash) {
        await deduplicationService.markBulkOperationCompleted(duplicateCheck.hash, result);
      }

      return result;
    }

    // Execute bulk upsert
    const result = await cameraModel.bulkUpsertCameras(filterResult.changedCameras);

    // Mark operation as completed
    if (duplicateCheck.hash) {
      await deduplicationService.markBulkOperationCompleted(duplicateCheck.hash, result);
    }

    return {
      ...result,
      skippedCount: filterResult.skippedCameras.length,
      source
    };
  }

  // Handle camera status batch updates
  async handleCameraStatusBatch(job) {
    const { statusUpdates } = job.data;

    if (!statusUpdates || !Array.isArray(statusUpdates) || statusUpdates.length === 0) {
      throw new Error('Invalid status updates for batch processing');
    }

    return await cameraModel.recordCameraStatusBatch(statusUpdates);
  }

  // Handle cache cleanup
  async handleCacheCleanup(job) {
    const { cacheType = 'all' } = job.data;

    if (cacheType === 'all') {
      cacheService.flush();
    } else {
      cacheService.flush(cacheType);
    }

    return { success: true, message: `Cache cleanup completed for: ${cacheType}` };
  }

  // Handle data synchronization
  async handleDataSync(job) {
    const { syncType } = job.data;

    switch (syncType) {
      case 'dashboard':
        // Refresh dashboard cache
        const dashboardData = await cameraModel.getCameraDashboard();
        cacheService.setDashboardData(dashboardData);
        return { success: true, message: 'Dashboard data synchronized' };

      default:
        throw new Error(`Unknown sync type: ${syncType}`);
    }
  }

  // Get job statistics
  getStats() {
    return {
      ...this.stats,
      queueLength: this.jobQueue.length,
      isProcessing: this.isProcessing,
      processingEnabled: !!this.processingInterval
    };
  }

  // Get queued jobs (for debugging)
  getQueuedJobs() {
    return this.jobQueue.map(job => ({
      id: job.id,
      type: job.type,
      status: job.status,
      attempts: job.attempts,
      maxRetries: job.options.maxRetries,
      priority: job.options.priority,
      createdAt: job.createdAt
    }));
  }

  // Clear all jobs (for maintenance)
  clearQueue() {
    const clearedCount = this.jobQueue.length;
    this.jobQueue = [];
    return clearedCount;
  }

  // Schedule recurring camera data sync
  scheduleCameraDataSync() {
    // Schedule dashboard sync every 30 minutes (cost optimized)
    setInterval(() => {
      this.enqueueJob('data_sync', { syncType: 'dashboard' }, { priority: 'high' });
    }, 30 * 60 * 1000);

    // Schedule cache cleanup every 2 hours (cost optimized)
    setInterval(() => {
      this.enqueueJob('cache_cleanup', { cacheType: 'expired' }, { priority: 'low' });
    }, 2 * 60 * 60 * 1000);
  }
}

// Create singleton instance
const backgroundJobService = new BackgroundJobService();

module.exports = backgroundJobService;