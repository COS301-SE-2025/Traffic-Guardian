const incidentModel = require('../models/incident');
const alertModel = require('../models/alert');
const cacheService = require('../services/cacheService');
const deduplicationService = require('../services/deduplicationService');
const dataCleanupService = require('../services/dataCleanupService');

const adminController = {
  getAdminStats: async (req, res) => {
    try {
      // Check if user is admin
      if (!req.user || req.user.User_Role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Get incident count and total alert count in parallel for better performance
      const [incidentCount, alertCount] = await Promise.all([
        incidentModel.getIncidentCount(),
        alertModel.getTotalAlertCount()
      ]);

      // Get optimization stats
      const cacheStats = cacheService.getStats();
      const deduplicationStats = deduplicationService.getStats();
      const cleanupStatus = dataCleanupService.getStatus();
      const databaseStats = await dataCleanupService.getDatabaseStats();

      return res.status(200).json({
        incidentCount: incidentCount || 0,
        alertCount: alertCount || 0,
        optimization: {
          cache: cacheStats,
          deduplication: deduplicationStats,
          cleanup: cleanupStatus,
          database: databaseStats
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Get admin stats error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Cache management endpoints
  getCacheStats: async (req, res) => {
    try {
      if (!req.user || req.user.User_Role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const stats = cacheService.getStats();
      return res.status(200).json(stats);
    } catch (error) {
      console.error('Get cache stats error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  clearCache: async (req, res) => {
    try {
      if (!req.user || req.user.User_Role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { cacheType } = req.body;
      
      if (cacheType && cacheType !== 'all') {
        cacheService.flush(cacheType);
        return res.status(200).json({ 
          message: `Cache ${cacheType} cleared successfully`,
          timestamp: new Date()
        });
      } else {
        cacheService.flushAll();
        return res.status(200).json({ 
          message: 'All caches cleared successfully',
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Clear cache error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Database cleanup endpoints
  runDatabaseCleanup: async (req, res) => {
    try {
      if (!req.user || req.user.User_Role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const result = await dataCleanupService.runFullCleanup();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Database cleanup error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  getDatabaseStats: async (req, res) => {
    try {
      if (!req.user || req.user.User_Role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const stats = await dataCleanupService.getDatabaseStats();
      return res.status(200).json(stats);
    } catch (error) {
      console.error('Get database stats error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Deduplication management
  getDeduplicationStats: async (req, res) => {
    try {
      if (!req.user || req.user.User_Role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const stats = deduplicationService.getStats();
      return res.status(200).json(stats);
    } catch (error) {
      console.error('Get deduplication stats error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  clearDeduplicationData: async (req, res) => {
    try {
      if (!req.user || req.user.User_Role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      deduplicationService.clearDeduplicationData();
      return res.status(200).json({ 
        message: 'Deduplication data cleared successfully',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Clear deduplication data error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = adminController;