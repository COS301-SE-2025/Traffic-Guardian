const incidentModel = require('../models/incident');
const alertModel = require('../models/alert');
const ILM = require("../IncidentLocationMapping/ilmInstance")

const incidentController = {
  createIncident: async (req, res) => {
    try {
      const { 
      Incident_Date, 
      Incident_Location, 
      Incident_CarID, 
      Incident_Severity, 
      Incident_Status, 
      Incident_Reporter,
      Incidents_Latitude,
      Incidents_Longitude
      } = req.body;

      //console.log("Recieving:" + req.body);
      //console.dir(req.body, {depth: null, colors: true});
      //return res.status(400).json({ error: 'Not adding for now' });

        // Validate required fields
      if (!Incident_Date || !Incident_Location || !Incident_Status) {
        return res.status(400).json({ error: 'Date, Location, and Status are required' });
      }
  
      const incident = await incidentModel.createIncident({
        Incident_Date, 
        Incident_Location, 
        Incident_CarID, 
        Incident_Severity: Incident_Severity || 'medium', 
        Incident_Status, 
        Incident_Reporter: Incident_Reporter || (req.user ? req.user.id : null),
        Incidents_Latitude,
        Incidents_Longitude
      });
      
      const io = req.app.get('io');
      //io.emit('newAlert', incident);
      ILM.notifyUsersIncident(incident, io);

      return res.status(201).json({
        message: 'Incident created successfully',
        incident
      });
    } catch (error) {
      console.error('Create incident error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
    getIncident: async (req, res) => {
    try {
      const Incident_ID = req.params.id;
      const incident = await incidentModel.getIncidentById(Incident_ID);
      
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      
      return res.status(200).json(incident);
    } catch (error) {
      console.error('Get incident error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
    updateIncident: async (req, res) => {
    try {
      const Incident_ID = req.params.id;
      const incidentData = req.body;
      
      // First check if incident exists
      const existingIncident = await incidentModel.getIncidentById(Incident_ID);
      
      if (!existingIncident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      
      // Update the incident
      const updatedIncident = await incidentModel.updateIncident(Incident_ID, incidentData);
      
      return res.status(200).json({
        message: 'Incident updated successfully',
        incident: updatedIncident
      });
    } catch (error) {
      console.error('Update incident error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
    getIncidents: async (req, res) => {
    try {
      // Extract filter parameters from query string
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
      console.error('Get incidents error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = incidentController;