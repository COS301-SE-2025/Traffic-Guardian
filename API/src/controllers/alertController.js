const alertModel = require('../models/alert');
const incidentModel = require('../models/incident');

const alertController = {
  createAlert: async (req, res) => {
    try {      const { 
        Alert_IncidentID, 
        Alert_Message, 
        Alert_Type, 
        Alert_Severity, 
        Alert_Recipients 
      } = req.body;
      
      // Validate required fields
      if (!Alert_IncidentID || !Alert_Type || !Alert_Severity) {
        return res.status(400).json({ error: 'Incident ID, type, and severity are required' });
      }
      
      // Check if incident exists
      const incident = await incidentModel.getIncidentById(Alert_IncidentID);
      
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
        // Create alert for the incident
      const alert = await alertModel.createAlert({
        Alert_IncidentID,
        Alert_Message,
        Alert_Type,
        Alert_Severity: Alert_Severity || 'medium',
        Alert_Recipients,
        Alert_Status: 'pending'
      });
      
      // Here you would typically trigger some notification mechanism
      // (email, SMS, push notification, etc.)
      // This is simplified for the example
      
      return res.status(201).json({
        message: 'Alert created successfully',
        alert
      });
    } catch (error) {
      console.error('Create alert error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },    getAlertsByIncident: async (req, res) => {
    try {
      const Alert_IncidentID = req.params.id;
      
      // Check if incident exists
      const incident = await incidentModel.getIncidentById(Alert_IncidentID);
      
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      
      // Get alerts for the incident
      const alerts = await alertModel.getAlertsByIncidentId(Alert_IncidentID);
      
      return res.status(200).json(alerts);
    } catch (error) {
      console.error('Get alerts error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },updateAlertStatus: async (req, res) => {
    try {
      const Alert_ID = req.params.id;
      const { Alert_Status } = req.body;
      
      if (!Alert_Status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      // Update alert status
      const updatedAlert = await alertModel.updateAlertStatus(Alert_ID, Alert_Status);
      
      if (!updatedAlert) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      
      return res.status(200).json({
        message: 'Alert status updated successfully',
        alert: updatedAlert
      });
    } catch (error) {
      console.error('Update alert status error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
    getUserAlerts: async (req, res) => {
    try {
      const userId = req.user.User_ID;
      
      // Get active alerts for the user
      const alerts = await alertModel.getActiveAlerts(userId);
      
      return res.status(200).json(alerts);
    } catch (error) {
      console.error('Get user alerts error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = alertController;