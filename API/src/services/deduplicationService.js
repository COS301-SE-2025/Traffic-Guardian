const crypto = require('crypto');
const cacheService = require('./cacheService');

class DeduplicationService {
  constructor() {
    this.operationTimeouts = {
      cameraBulkUpsert: 10 * 60 * 1000, // 10 minutes
      cameraStatusUpdate: 5 * 60 * 1000, // 5 minutes
      cameraAnalytics: 15 * 60 * 1000, // 15 minutes
      dashboardData: 10 * 60 * 1000, // 10 minutes
    };
  }

  // Generate hash for camera data to detect duplicates
  generateCameraHash(cameraData) {
    const hashData = {
      externalId: cameraData.Camera_ExternalID,
      roadway: cameraData.Camera_RoadwayName,
      longitude: cameraData.Camera_Longitude,
      latitude: cameraData.Camera_Latitude,
      status: cameraData.Camera_Status,
      hasLiveStream: cameraData.Camera_HasLiveStream,
      imageUrl: cameraData.Camera_ImageURL,
      streamUrl: cameraData.Camera_StreamURL
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  // Generate hash for bulk camera operations
  generateBulkCameraHash(cameras) {
    const sortedCameras = cameras
      .map(camera => this.generateCameraHash(camera))
      .sort();
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(sortedCameras))
      .digest('hex');
  }

  // Generate hash for status updates
  generateStatusHash(cameraId, status, timestamp = null) {
    const hashData = {
      cameraId,
      status,
      // Round timestamp to nearest minute to allow some flexibility
      timestamp: timestamp ? Math.floor(timestamp / 60000) * 60000 : Math.floor(Date.now() / 60000) * 60000
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  // Check if camera bulk operation is duplicate
  async isDuplicateBulkOperation(cameras) {
    try {
      const operationHash = this.generateBulkCameraHash(cameras);
      const operationType = 'cameraBulkUpsert';
      
      // Check if this exact operation was performed recently
      const isDuplicate = cacheService.isDuplicate(operationType, operationHash);
      
      if (isDuplicate) {
        console.log(`Duplicate bulk camera operation detected: ${operationHash}`);
        return { isDuplicate: true, hash: operationHash };
      }
      
      return { isDuplicate: false, hash: operationHash };
    } catch (error) {
      console.error('Error checking duplicate bulk operation:', error);
      return { isDuplicate: false, hash: null };
    }
  }

  // Mark bulk operation as completed
  async markBulkOperationCompleted(operationHash, result) {
    try {
      const operationType = 'cameraBulkUpsert';
      const ttl = this.operationTimeouts[operationType] / 1000; // Convert to seconds
      
      // Mark operation as completed
      cacheService.markOperation(operationType, operationHash, ttl);
      
      // Cache the result for potential reuse
      cacheService.setBulkOperationResult(operationHash, result, ttl);
      
      console.log(`Bulk operation marked as completed: ${operationHash}`);
      return true;
    } catch (error) {
      console.error('Error marking bulk operation as completed:', error);
      return false;
    }
  }

  // Check if camera status update is duplicate
  async isDuplicateStatusUpdate(cameraId, status) {
    try {
      const statusHash = this.generateStatusHash(cameraId, status);
      const operationType = 'cameraStatusUpdate';
      
      const isDuplicate = cacheService.isDuplicate(operationType, statusHash);
      
      if (isDuplicate) {
        console.log(`Duplicate status update detected for camera ${cameraId}: ${status}`);
        return { isDuplicate: true, hash: statusHash };
      }
      
      return { isDuplicate: false, hash: statusHash };
    } catch (error) {
      console.error('Error checking duplicate status update:', error);
      return { isDuplicate: false, hash: null };
    }
  }

  // Mark status update as completed
  async markStatusUpdateCompleted(statusHash) {
    try {
      const operationType = 'cameraStatusUpdate';
      const ttl = this.operationTimeouts[operationType] / 1000;
      
      cacheService.markOperation(operationType, statusHash, ttl);
      console.log(`Status update marked as completed: ${statusHash}`);
      return true;
    } catch (error) {
      console.error('Error marking status update as completed:', error);
      return false;
    }
  }

  // Filter out cameras that haven't changed
  async filterChangedCameras(cameras) {
    const changedCameras = [];
    const skippedCameras = [];
    
    for (const camera of cameras) {
      try {
        // Get cached camera data
        const cachedCamera = cacheService.getCameraData(camera.Camera_ExternalID);
        
        if (cachedCamera) {
          const currentHash = this.generateCameraHash(camera);
          const cachedHash = this.generateCameraHash(cachedCamera);
          
          if (currentHash === cachedHash) {
            skippedCameras.push(camera.Camera_ExternalID);
            continue; // Skip unchanged camera
          }
        }
        
        changedCameras.push(camera);
        
        // Update cache with new camera data
        cacheService.setCameraData(camera.Camera_ExternalID, camera);
        
      } catch (error) {
        console.error(`Error processing camera ${camera.Camera_ExternalID}:`, error);
        // Include camera in changed list if error occurs (better safe than sorry)
        changedCameras.push(camera);
      }
    }
    
    console.log(`Filtered cameras: ${changedCameras.length} changed, ${skippedCameras.length} skipped`);
    
    return {
      changedCameras,
      skippedCameras,
      totalOriginal: cameras.length
    };
  }

  // Check if dashboard data request is duplicate
  async isDuplicateDashboardRequest(userId = 'global') {
    try {
      const operationType = 'dashboardData';
      const operationKey = `dashboard:${userId}`;
      
      const isDuplicate = cacheService.isDuplicate(operationType, operationKey);
      
      if (isDuplicate) {
        console.log(`Duplicate dashboard request detected for user: ${userId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking duplicate dashboard request:', error);
      return false;
    }
  }

  // Mark dashboard request as completed
  async markDashboardRequestCompleted(userId = 'global') {
    try {
      const operationType = 'dashboardData';
      const operationKey = `dashboard:${userId}`;
      const ttl = this.operationTimeouts[operationType] / 1000;
      
      cacheService.markOperation(operationType, operationKey, ttl);
      console.log(`Dashboard request marked as completed for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error marking dashboard request as completed:', error);
      return false;
    }
  }

  // Get deduplication statistics
  getStats() {
    return {
      operationTimeouts: this.operationTimeouts,
      cacheStats: cacheService.getStats()
    };
  }

  // Clear all deduplication data (for maintenance)
  clearDeduplicationData() {
    cacheService.flush('deduplication');
    console.log('Deduplication data cleared');
  }
}

// Singleton instance
const deduplicationService = new DeduplicationService();

module.exports = deduplicationService;