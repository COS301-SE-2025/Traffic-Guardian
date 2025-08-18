const incidentModel = require('../models/incident');
const alertModel = require('../models/alert');
const ILM = require("../IncidentLocationMapping/ilmInstance")

const incidentController = {
  createIncident: async (req, res) => {
    try {
      const { 
        Incidents_DateTime, 
        Incidents_Longitude, 
        Incidents_Latitude, 
        Incident_Severity, 
        Incident_Status, 
        Incident_Reporter,
        Incident_CameraID,
        Incident_Description
      } = req.body;
      
      // Validate required fields
      if (!Incidents_DateTime || !Incident_Status) {
        return res.status(400).json({ error: 'Date and time, and status are required' });
      }
      
      // Validate coordinates if provided
      if (Incidents_Latitude && isNaN(parseFloat(Incidents_Latitude))) {
        return res.status(400).json({ error: 'Invalid latitude format' });
      }
      if (Incidents_Longitude && isNaN(parseFloat(Incidents_Longitude))) {
        return res.status(400).json({ error: 'Invalid longitude format' });
      }
      
      // Validate Incident_Severity
      const validSeverities = ['low', 'medium', 'high'];
      if (Incident_Severity && !validSeverities.includes(Incident_Severity)) {
        return res.status(400).json({ error: 'Invalid severity level' });
      }
      
      // Validate Incident_Status
      const validStatuses = ['open', 'ongoing', 'resolved', 'closed'];
      if (!validStatuses.includes(Incident_Status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      // Create incident
      const incident = await incidentModel.createIncident({
        Incidents_DateTime,
        Incidents_Longitude: Incidents_Longitude ? parseFloat(Incidents_Longitude) : null,
        Incidents_Latitude: Incidents_Latitude ? parseFloat(Incidents_Latitude) : null,
        Incident_Severity: Incident_Severity || 'medium',
        Incident_Status,
        Incident_Reporter: Incident_Reporter || (req.user ? req.user.User_Email : null),
        Incident_CameraID: Incident_CameraID ? parseInt(Incident_CameraID) : null,
        Incident_Description: Incident_Description || null
      });
      
      const io = req.app.get('io');
      //io.emit('newAlert', incident);
      ILM.notifyUsersIncident(incident, io);

      return res.status(201).json({
        message: 'Incident created successfully',
        incident
      });
    } catch (error) {
      console.error('Create incident error:', error.message, error.stack);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  },
  getIncident: async (req, res) => {
    try {
      const Incidents_ID = req.params.id;
      const incident = await incidentModel.getIncidentById(Incidents_ID);
      
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      
      return res.status(200).json(incident);
    } catch (error) {
      console.error('Get incident error:', error.message, error.stack);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  },
  updateIncident: async (req, res) => {
    try {
      const Incidents_ID = req.params.id;
      const { 
        Incidents_DateTime, 
        Incidents_Longitude, 
        Incidents_Latitude, 
        Incident_Severity, 
        Incident_Status, 
        Incident_Reporter,
        Incident_CameraID,
        Incident_Description
      } = req.body;
      
      const existingIncident = await incidentModel.getIncidentById(Incidents_ID);
      
      if (!existingIncident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      
      // Validate coordinates if provided
      if (Incidents_Latitude && isNaN(parseFloat(Incidents_Latitude))) {
        return res.status(400).json({ error: 'Invalid latitude format' });
      }
      if (Incidents_Longitude && isNaN(parseFloat(Incidents_Longitude))) {
        return res.status(400).json({ error: 'Invalid longitude format' });
      }
      
      // Make sure we're only sending valid data (not undefined or null)
      const updateData = {
        Incidents_DateTime: Incidents_DateTime || undefined,
        Incident_Severity: Incident_Severity || undefined,
        Incident_Status: Incident_Status || undefined,
        Incident_Reporter: Incident_Reporter || undefined,
        Incident_CameraID: Incident_CameraID ? parseInt(Incident_CameraID) : undefined,
        Incident_Description: Incident_Description || undefined
      };

      // Only add coordinates if they exist and can be parsed
      if (Incidents_Longitude && !isNaN(parseFloat(Incidents_Longitude))) {
        updateData.Incidents_Longitude = parseFloat(Incidents_Longitude);
      }
      
      if (Incidents_Latitude && !isNaN(parseFloat(Incidents_Latitude))) {
        updateData.Incidents_Latitude = parseFloat(Incidents_Latitude);
      }
      
      const updatedIncident = await incidentModel.updateIncident(Incidents_ID, updateData);
      
      return res.status(200).json({
        message: 'Incident updated successfully',
        incident: updatedIncident
      });
    } catch (error) {
      console.error('Update incident error:', error.message, error.stack);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  },
  getIncidents: async (req, res) => {
    try {
      const {
        Incident_Status,
        Incident_Severity,
        Incident_Reporter,
        limit,
        offset
      } = req.query;
      
      const incidents = await incidentModel.getIncidents({
        Incident_Status,
        Incident_Severity,
        Incident_Reporter,
        limit,
        offset
      });
      
      return res.status(200).json(incidents);
    } catch (error) {
      console.error('Get incidents error:', error.message, error.stack);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  },
  getIncidentStats: async (req, res) => {
    try {
      const stats = await incidentModel.getIncidentStats();
      return res.status(200).json(stats);
    } catch (error) {
      console.error('Get incident stats error:', error.message, error.stack);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  },
  getTodayIncidents: async (req, res) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const incidents = await incidentModel.getIncidentsByDateRange({
        startDate: todayStart.toISOString(),
        endDate: todayEnd.toISOString()
      });
      
      return res.status(200).json(incidents);
    } catch (error) {
      console.error('Get today incidents error:', error.message, error.stack);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }
};

module.exports = incidentController;