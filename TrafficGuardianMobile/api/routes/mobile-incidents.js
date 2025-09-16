const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./mobile-auth');
const { checkPermission } = require('../middleware/rbac');

// Mock incidents database
let incidents = [
  {
    id: 1,
    type: 'accident',
    severity: 'high',
    location: {
      latitude: -26.2041,
      longitude: 28.0473,
      address: 'N1 Highway, Johannesburg',
      landmark: 'Near Woodmead Drive'
    },
    description: 'Multi-vehicle collision blocking two lanes',
    reportedBy: {
      userId: 3,
      name: 'John Citizen',
      type: 'citizen'
    },
    assignedTo: {
      userId: 2,
      name: 'Emergency Responder',
      estimatedArrival: '15 minutes'
    },
    status: 'active',
    priority: 1,
    estimatedClearanceTime: '45 minutes',
    affectedLanes: 2,
    trafficImpact: 'severe',
    emergencyServices: ['ambulance', 'traffic_police'],
    images: [],
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:35:00Z',
    resolvedAt: null
  },
  {
    id: 2,
    type: 'breakdown',
    severity: 'medium',
    location: {
      latitude: -25.7479,
      longitude: 28.2293,
      address: 'M1 Highway, Pretoria',
      landmark: 'Between Lynnwood and Menlyn'
    },
    description: 'Vehicle breakdown in emergency lane',
    reportedBy: {
      userId: 3,
      name: 'Jane Smith',
      type: 'citizen'
    },
    assignedTo: null,
    status: 'reported',
    priority: 3,
    estimatedClearanceTime: '20 minutes',
    affectedLanes: 0,
    trafficImpact: 'minimal',
    emergencyServices: ['tow_truck'],
    images: [],
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
    resolvedAt: null
  }
];

// Get incidents near user location
router.get('/nearby', authenticateToken, checkPermission('view_public_data'), (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query; // radius in km

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);
    const searchRadius = parseFloat(radius);

    // Filter incidents within radius
    const nearbyIncidents = incidents.filter(incident => {
      const distance = calculateDistance(
        userLat, userLng,
        incident.location.latitude, incident.location.longitude
      );
      return distance <= searchRadius;
    }).map(incident => {
      // Return only public data for regular users
      if (req.user.role === 'citizen') {
        return {
          id: incident.id,
          type: incident.type,
          severity: incident.severity,
          location: incident.location,
          description: incident.description,
          status: incident.status,
          trafficImpact: incident.trafficImpact,
          estimatedClearanceTime: incident.estimatedClearanceTime,
          createdAt: incident.createdAt
        };
      }
      // Return full data for responders
      return incident;
    });

    res.json({
      incidents: nearbyIncidents,
      total: nearbyIncidents.length,
      radius: searchRadius,
      userLocation: { latitude: userLat, longitude: userLng }
    });

  } catch (error) {
    console.error('Get nearby incidents error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby incidents' });
  }
});

// Report new incident
router.post('/report', authenticateToken, checkPermission('report_incidents'), (req, res) => {
  try {
    const {
      type,
      severity,
      location,
      description,
      images = [],
      emergencyServices = []
    } = req.body;

    // Validation
    if (!type || !severity || !location || !description) {
      return res.status(400).json({
        error: 'Required fields missing',
        required: ['type', 'severity', 'location', 'description']
      });
    }

    if (!location.latitude || !location.longitude) {
      return res.status(400).json({
        error: 'Location coordinates are required'
      });
    }

    // Determine priority based on severity and type
    let priority = 3; // default
    if (severity === 'high' || type === 'accident') priority = 1;
    else if (severity === 'medium') priority = 2;

    // Determine traffic impact
    let trafficImpact = 'minimal';
    if (type === 'accident' && severity === 'high') trafficImpact = 'severe';
    else if (type === 'accident' || severity === 'medium') trafficImpact = 'moderate';

    const newIncident = {
      id: incidents.length + 1,
      type,
      severity,
      location: {
        ...location,
        address: location.address || 'Address not provided'
      },
      description,
      reportedBy: {
        userId: req.user.userId,
        name: req.user.name || 'Anonymous',
        type: req.user.role
      },
      assignedTo: null,
      status: 'reported',
      priority,
      estimatedClearanceTime: null,
      affectedLanes: 0,
      trafficImpact,
      emergencyServices,
      images,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null
    };

    incidents.push(newIncident);

    // In the real app, we would trigger notifications to nearby responders here
    
    res.status(201).json({
      message: 'Incident reported successfully',
      incident: newIncident
    });

  } catch (error) {
    console.error('Report incident error:', error);
    res.status(500).json({ error: 'Failed to report incident' });
  }
});

