const express = require('express');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Import real California traffic service functions
const { getEnhancedCaliforniaTraffic, get511TrafficEvents, getPeMSTrafficData } = require('../Traffic/caltransTraffic');
const traffic = require('../Traffic/traffic'); // Keep for utility functions

// Get all traffic incidents (main endpoint for analytics) - requires authentication
router.get('/incidents', authMiddleware.authenticate, async (req, res) => {
  try {
    const trafficData = await getEnhancedCaliforniaTraffic();

    if (!trafficData || !Array.isArray(trafficData)) {
      console.error('No traffic data returned from getEnhancedCaliforniaTraffic()');
      return res.status(500).json({ error: 'Failed to fetch traffic data' });
    }

    res.status(200).json(trafficData);
  } catch (error) {
    console.error('Traffic incidents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/criticalIncidents', authMiddleware.authenticate, async (_, res) => {
  try {
    const trafficData = await getEnhancedCaliforniaTraffic();

    if (!trafficData || !Array.isArray(trafficData)) {
      console.error('No criticalIncidents data returned');
      return res.status(500).json({ error: 'Failed to fetch criticalIncidents data' });
    }

    const resp = traffic.criticalIncidents(trafficData);
    res.status(200).json(resp);
  } catch (error) {
    console.error('Traffic incidents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/incidentCategory', authMiddleware.authenticate, async (_, res) => {
  try {
    const trafficData = await getEnhancedCaliforniaTraffic();

    if (!trafficData || !Array.isArray(trafficData)) {
      console.error('No incidentCategory data returned');
      return res.status(500).json({ error: 'Failed to fetch incidentCategory data' });
    }

    const resp = traffic.incidentCategory(trafficData);
    res.status(200).json(resp);
  } catch (error) {
    console.error('Traffic incidents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/incidentLocations', authMiddleware.authenticate, async (_, res) => {
  try {
    const trafficData = await getEnhancedCaliforniaTraffic();

    if (!trafficData || !Array.isArray(trafficData)) {
      console.error('No incidentLocations data returned');
      return res.status(500).json({ error: 'Failed to fetch incidentLocations data' });
    }

    const resp = traffic.incidentLocations(trafficData);
    res.status(200).json(resp);
  } catch (error) {
    console.error('Traffic incidents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Real-time 511 Bay Area incidents endpoint (public access)
router.get('/real-time-incidents', async (_, res) => {
  try {
    const incidents511 = await get511TrafficEvents();

    const response = {
      incidents: incidents511,
      timestamp: new Date().toISOString(),
      source: '511 Bay Area Traffic API',
      count: incidents511.length
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Real-time incidents error:', error);
    res.status(500).json({ error: 'Failed to fetch real-time incidents', details: error.message });
  }
});

// Orange County specific traffic data (public access)
router.get('/orange-county', async (_, res) => {
  try {
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

    res.status(200).json(response);
  } catch (error) {
    console.error('Orange County traffic error:', error);
    res.status(500).json({ error: 'Failed to fetch Orange County traffic data', details: error.message });
  }
});

// Location-based incident retrieval using 511 Bay Area API
router.get('/incidents/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 25 } = req.query; // radius in miles, default 25 miles

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = parseFloat(radius);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(searchRadius)) {
      return res.status(400).json({ error: 'Invalid coordinates or radius provided' });
    }


    // Get real-time 511 traffic events
    const traffic511Events = await get511TrafficEvents();

    // Helper function to calculate distance between two points in miles
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 3959; // Earth's radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    // Filter 511 incidents within the specified radius
    const nearbyIncidents = traffic511Events
      .filter(incident => {
        if (!incident.geometry || !incident.geometry.coordinates) return false;

        const coords = incident.geometry.coordinates;
        let incidentLat, incidentLng;

        // Handle different coordinate formats
        if (Array.isArray(coords) && coords.length >= 2) {
          // Standard [lng, lat] format
          incidentLng = coords[0];
          incidentLat = coords[1];
        } else {
          return false;
        }

        const distance = calculateDistance(latitude, longitude, incidentLat, incidentLng);
        return distance <= searchRadius;
      })
      .map(incident => {
        const coords = incident.geometry.coordinates;
        const incidentLat = coords[1];
        const incidentLng = coords[0];
        const distance = calculateDistance(latitude, longitude, incidentLat, incidentLng);

        return {
          id: incident.properties?.id || 'unknown',
          title: incident.properties?.headline || incident.properties?.event_type || 'Traffic Incident',
          description: incident.properties?.description || 'No details available',
          severity: incident.properties?.severity || 'Unknown',
          eventType: incident.properties?.event_type || incident.properties?.iconCategory || 'Traffic',
          status: incident.properties?.status || 'Active',
          location: incident.properties?.location || 'Location not specified',
          coordinates: {
            latitude: incidentLat,
            longitude: incidentLng
          },
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
          startTime: incident.properties?.created || incident.properties?.start_time,
          lastUpdated: incident.properties?.updated || incident.properties?.last_updated,
          source: '511 Bay Area'
        };
      })
      .sort((a, b) => a.distance - b.distance); // Sort by distance (closest first)

    const response = {
      incidents: nearbyIncidents,
      searchLocation: {
        latitude,
        longitude,
        region: 'California'
      },
      searchRadius: searchRadius,
      count: nearbyIncidents.length,
      timestamp: new Date().toISOString(),
      source: '511 Bay Area Traffic API'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Nearby 511 incidents error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby incidents', details: error.message });
  }
});

// Public traffic data endpoint (limited data for unauthenticated users)
router.get('/public', async (_, res) => {
  try {
    const trafficData = await getEnhancedCaliforniaTraffic();

    // Provide basic traffic data for major California cities
    const publicData = trafficData.map(location => ({
      location: location.location,
      incidentCount: location.incidents.length,
      hasActiveIncidents: location.incidents.length > 0,
      lastUpdate: new Date().toISOString()
    }));

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