const express = require('express');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Import real California traffic service functions
const { getEnhancedCaliforniaTraffic, get511TrafficEvents, getPeMSTrafficData } = require('../Traffic/caltransTraffic');
const traffic = require('../Traffic/traffic'); // Keep for utility functions

// Get all traffic incidents (main endpoint for analytics) - requires authentication
router.get('/incidents', authMiddleware.authenticate, async (req, res) => {
  try {
    console.log('Fetching real California traffic data...');
    const trafficData = await getEnhancedCaliforniaTraffic();

    if (!trafficData || !Array.isArray(trafficData)) {
      console.error('No traffic data returned from getEnhancedCaliforniaTraffic()');
      return res.status(500).json({ error: 'Failed to fetch traffic data' });
    }

    console.log(`Successfully fetched traffic data for ${trafficData.length} locations`);
    res.status(200).json(trafficData);
  } catch (error) {
    console.error('Traffic incidents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/criticalIncidents', authMiddleware.authenticate, async (req, res) => {
  try {
    console.log('Fetching real California traffic data for critical incidents...');
    const trafficData = await getEnhancedCaliforniaTraffic();

    if (!trafficData || !Array.isArray(trafficData)) {
      console.error('No criticalIncidents data returned');
      return res.status(500).json({ error: 'Failed to fetch criticalIncidents data' });
    }

    const resp = traffic.criticalIncidents(trafficData);
    console.log(`Successfully fetched criticalIncidents data for ${trafficData.length} locations`);
    res.status(200).json(resp);
  } catch (error) {
    console.error('Traffic incidents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/incidentCategory', authMiddleware.authenticate, async (req, res) => {
  try {
    console.log('Fetching real California traffic data for incident categories...');
    const trafficData = await getEnhancedCaliforniaTraffic();

    if (!trafficData || !Array.isArray(trafficData)) {
      console.error('No incidentCategory data returned');
      return res.status(500).json({ error: 'Failed to fetch incidentCategory data' });
    }

    const resp = traffic.incidentCategory(trafficData);
    console.log(`Successfully fetched incidentCategory data for ${trafficData.length} locations`);
    res.status(200).json(resp);
  } catch (error) {
    console.error('Traffic incidents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/incidentLocations', authMiddleware.authenticate, async (req, res) => {
  try {
    console.log('Fetching real California traffic data for incident locations...');
    const trafficData = await getEnhancedCaliforniaTraffic();

    if (!trafficData || !Array.isArray(trafficData)) {
      console.error('No incidentLocations data returned');
      return res.status(500).json({ error: 'Failed to fetch incidentLocations data' });
    }

    const resp = traffic.incidentLocations(trafficData);
    console.log(`Successfully fetched incidentLocations data for ${trafficData.length} locations`);
    res.status(200).json(resp);
  } catch (error) {
    console.error('Traffic incidents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Real-time 511 Bay Area incidents endpoint (public access)
router.get('/real-time-incidents', async (req, res) => {
  try {
    console.log('Fetching real-time 511 Bay Area incidents...');
    const incidents511 = await get511TrafficEvents();

    const response = {
      incidents: incidents511,
      timestamp: new Date().toISOString(),
      source: '511 Bay Area Traffic API',
      count: incidents511.length
    };

    console.log(`Successfully fetched ${incidents511.length} 511 incidents`);
    res.status(200).json(response);
  } catch (error) {
    console.error('Real-time incidents error:', error);
    res.status(500).json({ error: 'Failed to fetch real-time incidents', details: error.message });
  }
});

// Orange County specific traffic data (public access)
router.get('/orange-county', async (req, res) => {
  try {
    console.log('Fetching Orange County traffic data...');
    const trafficData = await getEnhancedCaliforniaTraffic();

    // Filter for Orange County and nearby areas (LA, San Diego vicinity)
    const orangeCountyData = trafficData.filter(location =>
      ['Los Angeles', 'Long Beach', 'Thousand Oaks', 'Torrance', 'San Diego'].includes(location.location)
    );

    const response = {
      data: orangeCountyData,
      timestamp: new Date().toISOString(),
      region: 'Orange County & Vicinity',
      locations: orangeCountyData.length
    };

    console.log(`Successfully fetched Orange County traffic data for ${orangeCountyData.length} locations`);
    res.status(200).json(response);
  } catch (error) {
    console.error('Orange County traffic error:', error);
    res.status(500).json({ error: 'Failed to fetch Orange County traffic data', details: error.message });
  }
});

// Public traffic data endpoint (limited data for unauthenticated users)
router.get('/public', async (req, res) => {
  try {
    console.log('Fetching public traffic data...');
    const trafficData = await getEnhancedCaliforniaTraffic();

    // Provide basic traffic data for major California cities
    const publicData = trafficData.map(location => ({
      location: location.location,
      incidentCount: location.incidents.length,
      hasActiveIncidents: location.incidents.length > 0,
      lastUpdate: new Date().toISOString()
    }));

    console.log(`Successfully provided public traffic summary for ${publicData.length} locations`);
    res.status(200).json({
      summary: publicData,
      message: 'Sign in for detailed incident information',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Public traffic data error:', error);
    res.status(500).json({ error: 'Failed to fetch public traffic data', details: error.message });
  }
});

module.exports = router;