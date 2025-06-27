const incidentModel = require('../models/incident');
const alertModel = require('../models/alert');

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

      return res.status(200).json({
        incidentCount: incidentCount || 0,
        alertCount: alertCount || 0,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Get admin stats error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = adminController;