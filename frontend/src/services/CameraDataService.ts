// Robust Camera Data Service - Fault-tolerant design
// Handles network failures gracefully without breaking the UI

interface DatabaseCamera {
  Camera_ID?: number;
  Camera_RoadwayName: string;
  Camera_DirectionOfTravel: string;
  Camera_Longitude: number;
  Camera_Latitude: number;
  Camera_URL: string;
  Camera_District: string;
  Camera_Route: string;
  Camera_County?: string;
  Camera_Milepost?: string;
  Camera_Description?: string;
  Camera_UpdateFrequency: number;
  Camera_HasLiveStream: boolean;
  Camera_Status: 'online' | 'offline' | 'loading' | 'unknown';
  Camera_LastStatusCheck: Date;
  Camera_ImageURL: string;
  Camera_StreamURL?: string;
  Camera_Source: string;
  Camera_ExternalID: string;
  Camera_Metadata: any;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  message: string;
}

class RobustCameraDataService {
  private baseUrl: string;
  private syncQueue: any[] = [];
  private lastSyncTime: number = 0;
  private syncInProgress: boolean = false;
  private readonly MIN_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum between syncs
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const apiKey = sessionStorage.getItem('apiKey') || localStorage.getItem('apiKey');
    return {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey || '',
    };
  }

  // Safe fetch with retry and timeout
  private async safeFetch(url: string, options: RequestInit = {}, retryCount = 0): Promise<Response | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Retry on network errors (but not on 4xx/5xx which are returned responses)
      if (retryCount < this.MAX_RETRY_ATTEMPTS && error instanceof TypeError) {
        console.warn(`Network error, retrying ${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, retryCount)));
        return this.safeFetch(url, options, retryCount + 1);
      }
      
      console.warn('Network request failed after retries:', error);
      return null;
    }
  }

  // Convert CameraFeed to database format (no changes needed here)
  convertCameraFeedToDatabase(feed: any): DatabaseCamera {
    const districtMatch = feed.district.match(/District (\d+)/);
    const districtNumber = districtMatch ? districtMatch[1] : '12';
    const coordinates = feed.coordinates || { lat: 0, lng: 0 };
    const updateFreqMatch = feed.updateFrequency?.match(/(\d+)/);
    const updateFreq = updateFreqMatch ? parseInt(updateFreqMatch[1]) : 15;

    return {
      Camera_RoadwayName: feed.location,
      Camera_DirectionOfTravel: feed.direction || 'Unknown',
      Camera_Longitude: coordinates.lng,
      Camera_Latitude: coordinates.lat,
      Camera_URL: feed.videoUrl || feed.image,
      Camera_District: `District ${districtNumber}`,
      Camera_Route: feed.route,
      Camera_County: feed.county,
      Camera_Milepost: feed.milepost,
      Camera_Description: feed.imageDescription,
      Camera_UpdateFrequency: updateFreq,
      Camera_HasLiveStream: feed.hasLiveStream,
      Camera_Status: feed.status,
      Camera_LastStatusCheck: new Date(),
      Camera_ImageURL: feed.image,
      Camera_StreamURL: feed.videoUrl,
      Camera_Source: 'caltrans',
      Camera_ExternalID: feed.id,
      Camera_Metadata: {
        lastUpdate: feed.lastUpdate,
        historicalImages: feed.historicalImages || [],
        calTransIndex: feed.id.split('-').pop(),
        districtNumber: districtNumber,
        hasHistoricalData: (feed.historicalImages?.length || 0) > 0,
        originalData: {
          id: feed.id,
          district: feed.district,
          updateFrequency: feed.updateFrequency
        }
      }
    };
  }

  // Smart sync - only syncs when needed and handles failures gracefully
  async smartSyncCameras(cameraFeeds: any[]): Promise<SyncResult> {
    const now = Date.now();
    
    // Check if enough time has passed since last sync
    if (now - this.lastSyncTime < this.MIN_SYNC_INTERVAL) {
      return {
        success: true,
        synced: 0,
        failed: 0,
        message: 'Sync skipped - too soon since last sync'
      };
    }

    // Check if sync is already in progress
    if (this.syncInProgress) {
      return {
        success: true,
        synced: 0,
        failed: 0,
        message: 'Sync already in progress'
      };
    }

    try {
      this.syncInProgress = true;
      const cameras = cameraFeeds.map(feed => this.convertCameraFeedToDatabase(feed));
      
      const response = await this.safeFetch(`${this.baseUrl}/api/cameras/bulk-upsert`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ cameras })
      });

      if (!response) {
        // Network error - queue for later
        this.queueForLaterSync(cameras);
        return {
          success: false,
          synced: 0,
          failed: cameras.length,
          message: 'Network unavailable - queued for later sync'
        };
      }

      if (response.status === 429) {
        // Rate limited - queue for later
        this.queueForLaterSync(cameras);
        return {
          success: false,
          synced: 0,
          failed: cameras.length,
          message: 'Rate limited - queued for later sync'
        };
      }

      if (!response.ok) {
        console.warn(`Camera sync failed with status ${response.status}`);
        return {
          success: false,
          synced: 0,
          failed: cameras.length,
          message: `Server error (${response.status}) - sync failed`
        };
      }

      const result = await response.json();
      this.lastSyncTime = now;
      
      return {
        success: true,
        synced: result.upsertedCount || cameras.length,
        failed: 0,
        message: `Successfully synced ${result.upsertedCount || cameras.length} cameras`
      };

    } catch (error) {
      console.warn('Camera sync error:', error);
      return {
        success: false,
        synced: 0,
        failed: cameraFeeds.length,
        message: 'Sync failed due to error'
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Queue cameras for later sync
  private queueForLaterSync(cameras: DatabaseCamera[]): void {
    // Add to queue, removing duplicates by external ID
    const existingIds = new Set(this.syncQueue.map(cam => cam.Camera_ExternalID));
    const newCameras = cameras.filter(cam => !existingIds.has(cam.Camera_ExternalID));
    
    this.syncQueue.push(...newCameras);
    
    // Limit queue size to prevent memory issues
    if (this.syncQueue.length > 1000) {
      this.syncQueue = this.syncQueue.slice(-500); // Keep only the 500 most recent
    }
  }

  // Process queued cameras
  async processQueue(): Promise<SyncResult> {
    if (this.syncQueue.length === 0) {
      return {
        success: true,
        synced: 0,
        failed: 0,
        message: 'No cameras in queue'
      };
    }

    const queuedCameras = [...this.syncQueue];
    this.syncQueue = []; // Clear queue
    
    const response = await this.safeFetch(`${this.baseUrl}/api/cameras/bulk-upsert`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ cameras: queuedCameras })
    });

    if (!response || !response.ok) {
      // Put cameras back in queue if failed
      this.queueForLaterSync(queuedCameras);
      return {
        success: false,
        synced: 0,
        failed: queuedCameras.length,
        message: 'Queue processing failed - cameras re-queued'
      };
    }

    const result = await response.json();
    return {
      success: true,
      synced: result.upsertedCount || queuedCameras.length,
      failed: 0,
      message: `Processed ${result.upsertedCount || queuedCameras.length} cameras from queue`
    };
  }

  // Lightweight status tracking - no database calls on every image load
  async recordCameraStatusBatch(statusUpdates: Array<{
    externalId: string;
    status: 'online' | 'offline' | 'loading';
    responseTime?: number;
    errorMessage?: string;
  }>): Promise<void> {
    // Only attempt if we have a reasonable number of updates
    if (statusUpdates.length === 0 || statusUpdates.length > 50) {
      return;
    }

    const response = await this.safeFetch(`${this.baseUrl}/api/cameras/status-batch`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ statusUpdates })
    });

    // Don't throw errors - this is non-critical
    if (!response || !response.ok) {
      console.warn('Status update failed - continuing without database logging');
    }
  }

  // Get camera by external ID with caching
  async getCameraByExternalId(externalId: string): Promise<DatabaseCamera | null> {
    const response = await this.safeFetch(
      `${this.baseUrl}/api/cameras/external/${encodeURIComponent(externalId)}`, 
      { headers: this.getAuthHeaders() }
    );

    if (!response || !response.ok) {
      return null;
    }

    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  // Get sync status
  getSyncStatus(): {
    lastSyncTime: Date | null;
    queueLength: number;
    syncInProgress: boolean;
  } {
    return {
      lastSyncTime: this.lastSyncTime > 0 ? new Date(this.lastSyncTime) : null,
      queueLength: this.syncQueue.length,
      syncInProgress: this.syncInProgress
    };
  }
}

// Simplified LiveFeed integration
export class LiveFeedDatabaseIntegration {
  private cameraService: RobustCameraDataService;
  private statusQueue: Array<any> = [];
  private queueProcessInterval: NodeJS.Timeout | null = null;

  constructor(baseUrl: string) {
    this.cameraService = new RobustCameraDataService(baseUrl);
    this.startQueueProcessor();
  }

  // Safe camera sync - won't break UI if it fails
  async syncCamerasWithDatabase(cameraFeeds: any[]): Promise<void> {
    try {
      const result = await this.cameraService.smartSyncCameras(cameraFeeds);
      
      // Only log successful syncs to reduce console noise
      if (result.success && result.synced > 0) {
        console.log(`✓ Camera sync: ${result.message}`);
      } else if (!result.success) {
        console.warn(`⚠ Camera sync: ${result.message}`);
      }
      
      // Never throw errors - UI should continue working
    } catch (error) {
      console.warn('Camera sync failed silently - UI continues normally');
    }
  }

  // Lightweight status tracking - queues updates instead of immediate API calls
  async trackCameraStatus(
    feedId: string, 
    status: 'online' | 'offline' | 'loading', 
    responseTime?: number, 
    errorMessage?: string
  ): Promise<void> {
    // Add to queue instead of immediate API call
    this.statusQueue.push({
      externalId: feedId,
      status,
      responseTime,
      errorMessage,
      timestamp: new Date()
    });

    // Limit queue size
    if (this.statusQueue.length > 100) {
      this.statusQueue = this.statusQueue.slice(-50);
    }
  }

  // Process status queue periodically
  private startQueueProcessor(): void {
    this.queueProcessInterval = setInterval(async () => {
      if (this.statusQueue.length > 0) {
        const updates = [...this.statusQueue];
        this.statusQueue = [];
        
        // Process in background - don't block UI
        this.cameraService.recordCameraStatusBatch(updates).catch(() => {
          // Silently handle failures
        });
      }

      // Also process any queued camera syncs
      this.cameraService.processQueue().catch(() => {
        // Silently handle failures
      });
    }, 60000); // Process every minute
  }

  // Get status for debugging
  getStatus() {
    return {
      cameraSync: this.cameraService.getSyncStatus(),
      statusQueueLength: this.statusQueue.length
    };
  }

  // Legacy method for backwards compatibility - replaced by automatic queue processing
  startStatusMonitoring(cameraFeeds: any[], intervalMinutes: number = 5): void {
    console.warn('startStatusMonitoring is deprecated - status monitoring now happens automatically in background');
    // No-op - background processing handles this automatically
  }

  // Legacy method for backwards compatibility 
  stopStatusMonitoring(): void {
    console.warn('stopStatusMonitoring is deprecated - use cleanup() instead');
    this.cleanup();
  }

  cleanup(): void {
    if (this.queueProcessInterval) {
      clearInterval(this.queueProcessInterval);
      this.queueProcessInterval = null;
    }
  }
}

export default RobustCameraDataService;