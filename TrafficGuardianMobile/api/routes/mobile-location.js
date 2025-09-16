const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./mobile-auth');
const { checkPermission } = require('../middleware/rbac');

// Mock geocoding service (in production, we would need Google Maps API or similar)
const mockGeocode = (address) => {
  // This would normally call a real geocoding service
  const mockLocations = {
    'johannesburg': { lat: -26.2041, lng: 28.0473 },
    'pretoria': { lat: -25.7479, lng: 28.2293 },
    'sandton': { lat: -26.1076, lng: 28.0567 },
    'centurion': { lat: -25.8601, lng: 28.1883 }
  };
  
  const key = Object.keys(mockLocations).find(k => 
    address.toLowerCase().includes(k)
  );
  
  return key ? mockLocations[key] : null;
};

// Reverse geocoding (coordinates to address)
router.post('/reverse-geocode', authenticateToken, (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    // Mock reverse geocoding - in production use a real service
    const mockAddresses = [
      {
        formatted_address: 'N1 Highway, Johannesburg, Gauteng, South Africa',
        components: {
          route: 'N1 Highway',
          locality: 'Johannesburg',
          administrative_area_level_1: 'Gauteng',
          country: 'South Africa',
          postal_code: '2000'
        },
        place_id: 'mock_place_1'
      },
      {
        formatted_address: 'Sandton Drive, Sandton, Gauteng, South Africa', 
        components: {
          route: 'Sandton Drive',
          locality: 'Sandton',
          administrative_area_level_1: 'Gauteng',
          country: 'South Africa',
          postal_code: '2146'
        },
        place_id: 'mock_place_2'
      }
    ];

    // Return a random address for demo purposes
    const address = mockAddresses[Math.floor(Math.random() * mockAddresses.length)];

    res.json({
      location: { latitude, longitude },
      address,
      accuracy: 'high',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode location' });
  }
});

// Forward geocoding (address to coordinates)
router.post('/geocode', authenticateToken, (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ 
        error: 'Address is required' 
      });
    }

    const coordinates = mockGeocode(address);
    
    if (!coordinates) {
      return res.status(404).json({ 
        error: 'Address not found' 
      });
    }

    res.json({
      address,
      location: {
        latitude: coordinates.lat,
        longitude: coordinates.lng
      },
      accuracy: 'high',
      place_id: `mock_${Date.now()}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({ error: 'Failed to geocode address' });
  }
});

// Get nearby places/landmarks
router.get('/nearby-places', authenticateToken, (req, res) => {
  try {
    const { latitude, longitude, radius = 2, type = 'all' } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    // Mock nearby places
    const places = [
      {
        id: 'place_1',
        name: 'Sandton City Mall',
        type: 'shopping_mall',
        distance: 1.2,
        address: '83 Rivonia Rd, Sandhurst, Sandton',
        coordinates: { lat: -26.1076, lng: 28.0567 },
        isLandmark: true
      },
      {
        id: 'place_2', 
        name: 'OR Tambo International Airport',
        type: 'airport',
        distance: 1.8,
        address: 'O.R. Tambo Airport Rd, Kempton Park',
        coordinates: { lat: -26.1367, lng: 28.2411 },
        isLandmark: true
      },
      {
        id: 'place_3',
        name: 'Woodmead Drive Off-Ramp',
        type: 'highway_exit',
        distance: 0.5,
        address: 'N1 Highway, Woodmead',
        coordinates: { lat: -26.0820, lng: 28.0830 },
        isLandmark: false
      },
      {
        id: 'place_4',
        name: 'Gautrain Sandton Station', 
        type: 'transit_station',
        distance: 1.0,
        address: '5th St, Sandton',
        coordinates: { lat: -26.1076, lng: 28.0567 },
        isLandmark: true
      }
    ];

    // Filter by radius
    const nearbyPlaces = places.filter(place => place.distance <= parseFloat(radius));

    // Filter by type if specified
    const filteredPlaces = type === 'all' ? nearbyPlaces : 
      nearbyPlaces.filter(place => place.type === type);

    res.json({
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      radius: parseFloat(radius),
      places: filteredPlaces,
      total: filteredPlaces.length,
      availableTypes: ['shopping_mall', 'airport', 'highway_exit', 'transit_station', 'hospital', 'police_station']
    });

  } catch (error) {
    console.error('Get nearby places error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby places' });
  }
});

// Update user location (for tracking and emergency services)
router.post('/update', authenticateToken, (req, res) => {
  try {
    const { latitude, longitude, accuracy, heading, speed } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    // In a real app, we would store this in a database with expiration
    const locationUpdate = {
      userId: req.user.userId,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      accuracy: accuracy || null,
      heading: heading || null,
      speed: speed || null,
      timestamp: new Date().toISOString()
    };

    // Here we would save to database and potentially trigger location based alerts

    res.json({
      message: 'Location updated successfully',
      location: locationUpdate,
      nearbyIncidents: Math.floor(Math.random() * 3), // Mock nearby incident count
      safetyAlerts: [] // Mock safety alerts array
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get traffic cameras near location
router.get('/traffic-cameras', authenticateToken, checkPermission('view_public_data'), (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    // Mock traffic cameras
    const cameras = [
      {
        id: 'cam_001',
        name: 'N1 Highway - Woodmead',
        location: { lat: -26.0820, lng: 28.0830 },
        status: 'online',
        direction: 'northbound',
        highway: 'N1',
        kilometerMark: 45.2,
        lastUpdate: new Date().toISOString(),
        hasLiveStream: true,
        imageUrl: 'https://example.com/cam_001.jpg'
      },
      {
        id: 'cam_002', 
        name: 'M1 Highway - Sandton',
        location: { lat: -26.1076, lng: 28.0567 },
        status: 'online',
        direction: 'southbound',
        highway: 'M1',
        kilometerMark: 12.8,
        lastUpdate: new Date().toISOString(),
        hasLiveStream: true,
        imageUrl: 'https://example.com/cam_002.jpg'
      },
      {
        id: 'cam_003',
        name: 'R21 Highway - OR Tambo',
        location: { lat: -26.1367, lng: 28.2411 },
        status: 'maintenance',
        direction: 'eastbound',
        highway: 'R21',
        kilometerMark: 8.5,
        lastUpdate: new Date().toISOString(),
        hasLiveStream: false,
        imageUrl: null
      }
    ];

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);
    const searchRadius = parseFloat(radius);

    // Filter cameras within radius (simplified distance calculation)
    const nearbyCameras = cameras.filter(camera => {
      const distance = Math.sqrt(
        Math.pow(camera.location.lat - userLat, 2) + 
        Math.pow(camera.location.lng - userLng, 2)
      ) * 111; // Rough conversion to km
      return distance <= searchRadius;
    });

    res.json({
      location: { latitude: userLat, longitude: userLng },
      radius: searchRadius,
      cameras: nearbyCameras,
      total: nearbyCameras.length,
      onlineCameras: nearbyCameras.filter(c => c.status === 'online').length
    });

  } catch (error) {
    console.error('Get traffic cameras error:', error);
    res.status(500).json({ error: 'Failed to fetch traffic cameras' });
  }
});

// Get route between two points with traffic information
router.post('/route', authenticateToken, checkPermission('view_public_data'), (req, res) => {
  try {
    const { origin, destination, avoidIncidents = true } = req.body;

    if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) {
      return res.status(400).json({ 
        error: 'Origin and destination coordinates are required' 
      });
    }

    // Mock route calculation
    const route = {
      distance: {
        value: 25400, // meters
        text: '25.4 km'
      },
      duration: {
        value: 1680, // seconds
        text: '28 mins'
      },
      polyline: 'mock_polyline_string', // In real app, this would be encoded polyline
      steps: [
        {
          instruction: 'Head north on your current road',
          distance: '0.5 km',
          duration: '2 mins'
        },
        {
          instruction: 'Turn right onto N1 Highway',
          distance: '18.2 km', 
          duration: '20 mins'
        },
        {
          instruction: 'Take exit 45 toward Sandton',
          distance: '2.1 km',
          duration: '3 mins'
        },
        {
          instruction: 'Continue to destination',
          distance: '4.6 km',
          duration: '3 mins'
        }
      ],
      trafficConditions: {
        overall: 'moderate',
        incidents: avoidIncidents ? 0 : 2,
        averageSpeed: 65, // km/h
        congestionLevel: 'medium'
      },
      alternatives: [
        {
          name: 'Via M1 Highway',
          distance: '27.8 km',
          duration: '25 mins',
          trafficLevel: 'light'
        }
      ]
    };

    res.json({
      origin,
      destination,
      route,
      calculatedAt: new Date().toISOString(),
      avoidedIncidents: avoidIncidents
    });

  } catch (error) {
    console.error('Calculate route error:', error);
    res.status(500).json({ error: 'Failed to calculate route' });
  }
});

// Emergency location sharing
router.post('/emergency-share', authenticateToken, (req, res) => {
  try {
    const { latitude, longitude, emergencyType, additionalInfo, contacts } = req.body;

    if (!latitude || !longitude || !emergencyType) {
      return res.status(400).json({ 
        error: 'Location and emergency type are required' 
      });
    }

    // In a real app, this would trigger emergency services notification
    const emergencyShare = {
      shareId: `emergency_${Date.now()}`,
      userId: req.user.userId,
      location: { latitude, longitude },
      emergencyType,
      additionalInfo: additionalInfo || '',
      sharedWith: contacts || [],
      timestamp: new Date().toISOString(),
      status: 'active',
      estimatedResponseTime: '8-12 minutes'
    };

    // Mock emergency response
    res.json({
      message: 'Emergency location shared successfully',
      emergency: emergencyShare,
      instructions: [
        'Stay calm and remain at your location if safe to do so',
        'Emergency services have been notified',
        'Your location is being shared with selected contacts',
        'Keep your phone on and charged'
      ],
      emergencyNumber: '10111' // South African emergency number
    });

  } catch (error) {
    console.error('Emergency share error:', error);
    res.status(500).json({ error: 'Failed to share emergency location' });
  }
});

module.exports = router;