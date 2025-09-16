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

