const express = require('express');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Import traffic service functions from our existing Traffic folder
const { getTraffic } = require('../Traffic/traffic');

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

module.exports = router;