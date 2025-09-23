const cameraModel = require('../models/camera');

const cameraController = {
  bulkUpsertCameras: async (req, res) => {
    try {
      const { cameras } = req.body;
      if (!cameras || !Array.isArray(cameras)) {
        return res.status(400).json({ error: 'Invalid cameras data' });
      }
      const result = await cameraModel.bulkUpsertCameras(cameras);
      res.json(result);
    } catch (error) {
      console.error('Error upserting cameras:', error);
      res.status(500).json({ error: 'Failed to upsert cameras' });
    }
  },

  recordCameraStatus: async (req, res) => {
    try {
      const result = await cameraModel.recordCameraStatus(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error recording camera status:', error);
      res.status(500).json({ error: 'Failed to record camera status' });
    }
  },

  // NEW: Batch camera status updates - reduces API calls
  recordCameraStatusBatch: async (req, res) => {
    try {
      const { statusUpdates } = req.body;
      
      if (!statusUpdates || !Array.isArray(statusUpdates)) {
        return res.status(400).json({ error: 'Invalid statusUpdates data' });
      }

      if (statusUpdates.length === 0) {
        return res.json({ success: true, processed: 0, message: 'No updates to process' });
      }

      if (statusUpdates.length > 50) {
        return res.status(400).json({ error: 'Too many status updates in batch (max 50)' });
      }

      const result = await cameraModel.recordCameraStatusBatch(statusUpdates);
      res.json(result);
    } catch (error) {
      console.error('Error recording camera status batch:', error);
      res.status(500).json({ error: 'Failed to record camera status batch' });
    }
  },

  getCameraByExternalId: async (req, res) => {
    try {
      const camera = await cameraModel.getCameraByExternalId(req.params.externalId);
      if (camera) {
        res.json(camera);
      } else {
        res.status(404).json({ error: 'Camera not found' });
      }
    } catch (error) {
      console.error('Error fetching camera:', error);
      res.status(500).json({ error: 'Failed to fetch camera' });
    }
  },

  searchArchivedIncidents: async (req, res) => {
    try {
      const result = await cameraModel.searchArchivedIncidents(req.query);
      res.json(result);
    } catch (error) {
      console.error('Error searching archives:', error);
      res.status(500).json({ error: 'Failed to search archives' });
    }
  },

  getCameraAnalytics: async (req, res) => {
    try {
      const result = await cameraModel.getCameraAnalytics(req.query);
      res.json(result);
    } catch (error) {
      console.error('Error fetching camera analytics:', error);
      res.status(500).json({ error: 'Failed to fetch camera analytics' });
    }
  },

  getCameraDashboard: async (req, res) => {
    try {
      const result = await cameraModel.getCameraDashboard();
      res.json(result);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  },

  performMaintenance: async (req, res) => {
    try {
      const result = await cameraModel.performMaintenance();
      res.json(result);
    } catch (error) {
      console.error('Error during maintenance:', error);
      res.status(500).json({ error: 'Maintenance failed' });
    }
  },

  searchCameras: async (req, res) => {
    try {
      const result = await cameraModel.searchCameras(req.query);
      res.json(result);
    } catch (error) {
      console.error('Error searching cameras:', error);
      res.status(500).json({ error: 'Failed to search cameras' });
    }
  },

  scheduledCameraDataUpdate: async () => {
    try {
      console.log('Starting scheduled camera data update...');
      await cameraModel.getCameraDashboard();
      console.log('Scheduled camera data update completed');
    } catch (error) {
      console.error('Error in scheduled camera data update:', error);
    }
  },

  updateTrafficCount: async (req, res) => {
    try {
      const { cameraId, count } = req.body;

      if (!cameraId || count === undefined) {
        return res.status(400).json({ error: 'Camera ID and count are required' });
      }

      if (typeof count !== 'number' || count < 0) {
        return res.status(400).json({ error: 'Count must be a non-negative number' });
      }

      const result = await cameraModel.updateTrafficCount(cameraId, count);
      res.json(result);
    } catch (error) {
      console.error('Error updating traffic count:', error);
      res.status(500).json({ error: 'Failed to update traffic count' });
    }
  },

  // Public endpoint for traffic data (no authentication required)
  getPublicTrafficData: async (req, res) => {
    try {
      const result = await cameraModel.getPublicTrafficData();
      res.json(result);
    } catch (error) {
      console.error('Error fetching public traffic data:', error);
      res.status(500).json({ error: 'Failed to fetch public traffic data' });
    }
  }
};

module.exports = cameraController;