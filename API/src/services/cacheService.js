const NodeCache = require('node-cache');

class CacheService {
  constructor() {
    // Different cache instances for different types of data
    this.caches = {
      // Camera data cache - 5 minute TTL
      cameras: new NodeCache({ 
        stdTTL: 300, // 5 minutes
        checkperiod: 60, // Check for expired keys every 60 seconds
        useClones: false, // Better performance, but be careful with object mutations
        maxKeys: 1000 // Limit cache size
      }),
      
      // Camera status cache - 2 minute TTL
      cameraStatus: new NodeCache({ 
        stdTTL: 120, // 2 minutes
        checkperiod: 30,
        useClones: false,
        maxKeys: 5000
      }),
      
      // Dashboard data cache - 10 minute TTL
      dashboard: new NodeCache({ 
        stdTTL: 600, // 10 minutes
        checkperiod: 120,
        useClones: false,
        maxKeys: 100
      }),
      
      // Analytics cache - 15 minute TTL
      analytics: new NodeCache({ 
        stdTTL: 900, // 15 minutes
        checkperiod: 180,
        useClones: false,
        maxKeys: 500
      }),

      // Deduplication cache - 1 hour TTL (for preventing duplicate operations)
      deduplication: new NodeCache({ 
        stdTTL: 3600, // 1 hour
        checkperiod: 300, // Check every 5 minutes
        useClones: false,
        maxKeys: 10000
      }),
    };

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // Setup event listeners for cache statistics
    Object.values(this.caches).forEach(cache => {
      cache.on('set', () => this.stats.sets++);
      cache.on('del', () => this.stats.deletes++);
      cache.on('expired', () => this.stats.deletes++);
    });
  }

  // Generic cache operations
  get(cacheType, key) {
    if (!this.caches[cacheType]) {
      throw new Error(`Invalid cache type: ${cacheType}`);
    }
    
    const value = this.caches[cacheType].get(key);
    if (value !== undefined) {
      this.stats.hits++;
      // Cache hit
      return value;
    } else {
      this.stats.misses++;
      // Cache miss
      return null;
    }
  }

  set(cacheType, key, value, ttl = null) {
    if (!this.caches[cacheType]) {
      throw new Error(`Invalid cache type: ${cacheType}`);
    }
    
    const success = ttl 
      ? this.caches[cacheType].set(key, value, ttl)
      : this.caches[cacheType].set(key, value);
    
    if (success) {
      // Cache set
    }
    
    return success;
  }

  del(cacheType, key) {
    if (!this.caches[cacheType]) {
      throw new Error(`Invalid cache type: ${cacheType}`);
    }
    
    return this.caches[cacheType].del(key);
  }

  // Flush specific cache
  flush(cacheType) {
    if (!this.caches[cacheType]) {
      throw new Error(`Invalid cache type: ${cacheType}`);
    }
    
    this.caches[cacheType].flushAll();
    // Cache flushed
  }

  // Flush all caches
  flushAll() {
    Object.keys(this.caches).forEach(cacheType => {
      this.caches[cacheType].flushAll();
    });
    // All caches flushed
  }

  // Get cache statistics
  getStats() {
    const cacheStats = {};
    Object.keys(this.caches).forEach(cacheType => {
      const cache = this.caches[cacheType];
      cacheStats[cacheType] = {
        keys: cache.keys().length,
        hits: cache.getStats().hits,
        misses: cache.getStats().misses,
        ksize: cache.getStats().ksize,
        vsize: cache.getStats().vsize
      };
    });

    return {
      overall: this.stats,
      caches: cacheStats
    };
  }

  // Deduplication helpers
  isDuplicate(operationType, operationKey, ttl = 3600) {
    const dedupKey = `${operationType}:${operationKey}`;
    return this.get('deduplication', dedupKey) !== null;
  }

  markOperation(operationType, operationKey, ttl = 3600) {
    const dedupKey = `${operationType}:${operationKey}`;
    const timestamp = Date.now();
    return this.set('deduplication', dedupKey, timestamp, ttl);
  }

  // Camera-specific cache methods
  getCameraData(externalId) {
    return this.get('cameras', `camera:${externalId}`);
  }

  setCameraData(externalId, data, ttl = null) {
    return this.set('cameras', `camera:${externalId}`, data, ttl);
  }

  getCameraStatus(cameraId) {
    return this.get('cameraStatus', `status:${cameraId}`);
  }

  setCameraStatus(cameraId, status, ttl = null) {
    return this.set('cameraStatus', `status:${cameraId}`, status, ttl);
  }

  // Dashboard cache methods
  getDashboardData(userId = 'global') {
    return this.get('dashboard', `dashboard:${userId}`);
  }

  setDashboardData(data, userId = 'global', ttl = null) {
    return this.set('dashboard', `dashboard:${userId}`, data, ttl);
  }

  // Bulk operations cache
  getBulkOperationResult(operationHash) {
    return this.get('cameras', `bulk:${operationHash}`);
  }

  setBulkOperationResult(operationHash, result, ttl = 600) { // 10 minutes
    return this.set('cameras', `bulk:${operationHash}`, result, ttl);
  }

  // Cache warming (preload frequently accessed data)
  async warmCache() {
    try {
      // Starting cache warming
      // This could be extended to preload frequently accessed data
      // Cache warming completed
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;