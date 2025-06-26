const express = require('express');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Import traffic service functions from our existing Traffic folder
const { getTraffic } = require('../Traffic/traffic');
const traffic = require('../Traffic/traffic');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Get all traffic incidents (main endpoint for analytics)
router.get('/incidents', async (req, res) => {
  try {
    console.log('Fetching traffic data...');
    const trafficData = await getTraffic();
    
    if (!trafficData) {
      console.error('No traffic data returned from getTraffic()');
      return res.status(500).json({ error: 'Failed to fetch traffic data' });
    }
    
    console.log(`Successfully fetched traffic data for ${trafficData.length} locations`);
    res.status(200).json(trafficData);
  } catch (error) {
    console.error('Traffic incidents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/criticalIncidents', async (req, res) => {
  try {
    console.log('Fetching traffic data...');
    const trafficData = await getTraffic();
    const resp = traffic.criticalIncidents(trafficData);
    
    if (!trafficData) {
      console.error('No criticalIncidents data returned');
      return res.status(500).json({ error: 'Failed to fetch criticalIncidents data' });
    }
    
    console.log(`Successfully fetched criticalIncidents data for ${trafficData.length} locations`);
    res.status(200).json(resp);
  } catch (error) {
    console.error('Traffic incidents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/incidentCategory', async (req, res) => {
  try {
    console.log('Fetching traffic data...');
    const trafficData = await getTraffic();
    const resp = traffic.incidentCategory(trafficData);
    
    if (!trafficData) {
      console.error('No incidentCategory data returned');
      return res.status(500).json({ error: 'Failed to fetch incidentCategory data' });
    }
    
    console.log(`Successfully fetched incidentCategory data for ${trafficData.length} locations`);
    res.status(200).json(resp);
  } catch (error) {
    console.error('Traffic incidents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/incidentLocations', async (req, res) => {
  try {
    console.log('Fetching traffic data...');
    const trafficData = await getTraffic();
    const resp = traffic.incidentLocations(trafficData);
    
    if (!trafficData) {
      console.error('No incidentLocations data returned');
      return res.status(500).json({ error: 'Failed to fetch incidentLocations data' });
    }
    
    console.log(`Successfully fetched incidentLocations data for ${trafficData.length} locations`);
    res.status(200).json(resp);
  } catch (error) {
    console.error('Traffic incidents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;