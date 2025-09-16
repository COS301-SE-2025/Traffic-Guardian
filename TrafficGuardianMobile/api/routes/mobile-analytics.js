const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./mobile-auth');
const { checkPermission } = require('../middleware/rbac');

// Mock analytics data
const generateMockAnalytics = () => {
  const now = new Date();
  const last7Days = [];
  const last30Days = [];
  
  // Generate data for last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    last7Days.push({
      date: date.toISOString().split('T')[0],
      incidents: Math.floor(Math.random() * 20) + 5,
      accidents: Math.floor(Math.random() * 5) + 1,
      breakdowns: Math.floor(Math.random() * 8) + 2,
      avgResponseTime: Math.floor(Math.random() * 10) + 8, // minutes
      resolved: Math.floor(Math.random() * 15) + 3
    });
  }

  // Generate data for last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    last30Days.push({
      date: date.toISOString().split('T')[0],
      incidents: Math.floor(Math.random() * 25) + 10,
      accidents: Math.floor(Math.random() * 8) + 2,
      breakdowns: Math.floor(Math.random() * 12) + 4,
      avgResponseTime: Math.floor(Math.random() * 15) + 5,
      resolved: Math.floor(Math.random() * 20) + 8
    });
  }

  return { last7Days, last30Days };
};

// Get public traffic analytics (for citizens)
router.get('/public', authenticateToken, checkPermission('view_public_data'), (req, res) => {
  try {
    const { timeframe = '7d', area } = req.query;
    const analytics = generateMockAnalytics();
    
    let data = analytics.last7Days;
    if (timeframe === '30d') {
      data = analytics.last30Days;
    }

    // Calculate summary statistics
    const totalIncidents = data.reduce((sum, day) => sum + day.incidents, 0);
    const totalAccidents = data.reduce((sum, day) => sum + day.accidents, 0);
    const totalBreakdowns = data.reduce((sum, day) => sum + day.breakdowns, 0);
    const avgResponseTime = data.reduce((sum, day) => sum + day.avgResponseTime, 0) / data.length;
    const totalResolved = data.reduce((sum, day) => sum + day.resolved, 0);

    // Public friendly insights
    const insights = {
      safetyTrend: totalAccidents < (data.length * 3) ? 'improving' : 'concerning',
      busyHours: ['07:00-09:00', '17:00-19:00'],
      commonLocations: [
        'N1 Highway (Johannesburg)',
        'M1 Highway (Pretoria)', 
        'R21 Highway (OR Tambo)',
        'N3 Highway (Germiston)'
      ],
      weekdayPattern: 'Higher incidents on weekdays, particularly Monday and Friday'
    };

    const response = {
      timeframe,
      period: `Last ${timeframe === '30d' ? '30' : '7'} days`,
      summary: {
        totalIncidents,
        totalAccidents,
        totalBreakdowns,
        avgResponseTime: Math.round(avgResponseTime),
        resolutionRate: Math.round((totalResolved / totalIncidents) * 100)
      },
      dailyData: data,
      insights,
      lastUpdated: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Get public analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Get personal analytics (user's incident reports and activity)
router.get('/personal', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { timeframe = '30d' } = req.query;

    // Mock personal data - in real app, query from database
    const personalStats = {
      incidentsReported: Math.floor(Math.random() * 5) + 1,
      avgResponseTimeForMyReports: Math.floor(Math.random() * 12) + 8,
      myReportsResolved: Math.floor(Math.random() * 4) + 1,
      helpfulnessScore: Math.floor(Math.random() * 20) + 80, // Out of 100
      frequentRoutes: [
        { name: 'Home to Work', incidentsFree: 85 },
        { name: 'Work to Mall', incidentsFree: 92 },
        { name: 'Home to Airport', incidentsFree: 78 }
      ],
      monthlyActivity: generatePersonalActivity(30)
    };

    // Calculate achievements
    const achievements = [];
    if (personalStats.incidentsReported >= 3) {
      achievements.push({ 
        name: 'Community Helper', 
        description: 'Reported multiple incidents to help others',
        icon: 'shield-check'
      });
    }
    if (personalStats.helpfulnessScore >= 85) {
      achievements.push({ 
        name: 'Accurate Reporter', 
        description: 'Your reports are consistently accurate and helpful',
        icon: 'star'
      });
    }

    const response = {
      timeframe,
      userId,
      stats: personalStats,
      achievements,
      tips: [
        'Report incidents as soon as it\'s safe to do so',
        'Include clear photos when possible',
        'Provide accurate location information',
        'Follow up on your reports if status changes'
      ],
      lastUpdated: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Get personal analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch personal analytics' });
  }
});

// Get route optimisation data
router.get('/routes', authenticateToken, checkPermission('view_public_data'), (req, res) => {
  try {
    const { origin, destination } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ 
        error: 'Origin and destination coordinates are required' 
      });
    }

    // Mock route data with incident information
    const routes = [
      {
        id: 1,
        name: 'Primary Route (N1)',
        distance: '24.5 km',
        estimatedTime: '28 minutes',
        incidentCount: 2,
        trafficLevel: 'moderate',
        fuelCost: 'R45.50',
        tolls: 'R12.00',
        incidents: [
          { type: 'accident', severity: 'medium', location: 'km 15' },
          { type: 'roadwork', severity: 'low', location: 'km 22' }
        ],
        recommendation: 'Current best option with moderate traffic'
      },
      {
        id: 2,
        name: 'Alternative Route (M1)',
        distance: '27.8 km',
        estimatedTime: '25 minutes',
        incidentCount: 0,
        trafficLevel: 'light',
        fuelCost: 'R48.20',
        tolls: 'R0.00',
        incidents: [],
        recommendation: 'Fastest route with no incidents'
      },
      {
        id: 3,
        name: 'Scenic Route (R21)',
        distance: '31.2 km',
        estimatedTime: '35 minutes',
        incidentCount: 1,
        trafficLevel: 'light',
        fuelCost: 'R52.10',
        tolls: 'R8.00',
        incidents: [
          { type: 'breakdown', severity: 'low', location: 'km 18' }
        ],
        recommendation: 'Longer but peaceful drive'
      }
    ];

    const response = {
      origin,
      destination,
      routes,
      recommendedRoute: routes.find(r => r.id === 2), // Route with no incidents
      lastUpdated: new Date().toISOString(),
      weatherImpact: {
        current: 'clear',
        visibility: 'good',
        roadConditions: 'dry'
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Get route analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch route data' });
  }
});

// Get area safety score
router.get('/safety-score', authenticateToken, checkPermission('view_public_data'), (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    // Mock safety analysis
    const safetyScore = Math.floor(Math.random() * 30) + 70; // 70-100
    const riskFactors = [];
    
    if (safetyScore < 80) {
      riskFactors.push('High traffic volume during peak hours');
    }
    if (safetyScore < 85) {
      riskFactors.push('Construction work in area');
    }
    if (Math.random() > 0.7) {
      riskFactors.push('Weather conditions may affect visibility');
    }

    const analysis = {
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      radius: parseFloat(radius),
      safetyScore,
      scoreCategory: safetyScore >= 90 ? 'excellent' : safetyScore >= 80 ? 'good' : safetyScore >= 70 ? 'fair' : 'poor',
      riskFactors,
      recentIncidents: Math.floor(Math.random() * 5),
      avgResponseTime: Math.floor(Math.random() * 8) + 7,
      recommendations: [
        'Avoid peak hours (7-9 AM, 5-7 PM) if possible',
        'Keep emergency contacts readily available',
        'Maintain safe following distance',
        'Stay updated on traffic conditions'
      ],
      historicalTrend: 'stable', // improving, stable, declining
      lastUpdated: new Date().toISOString()
    };

    res.json(analysis);

  } catch (error) {
    console.error('Get safety score error:', error);
    res.status(500).json({ error: 'Failed to calculate safety score' });
  }
});

// Get responder analytics (for field responders)
router.get('/responder', authenticateToken, checkPermission('update_incidents'), (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const responderStats = {
      incidentsHandled: Math.floor(Math.random() * 20) + 15,
      avgResponseTime: Math.floor(Math.random() * 5) + 8,
      avgResolutionTime: Math.floor(Math.random() * 15) + 25,
      successRate: Math.floor(Math.random() * 10) + 90,
      incidentTypes: {
        accidents: Math.floor(Math.random() * 8) + 5,
        breakdowns: Math.floor(Math.random() * 10) + 8,
        debris: Math.floor(Math.random() * 3) + 1,
        weather: Math.floor(Math.random() * 2) + 1
      },
      performanceMetrics: {
        rating: 4.7,
        commendations: Math.floor(Math.random() * 3) + 1,
        efficiency: 92
      }
    };

    const response = {
      timeframe,
      responderId: req.user.userId,
      stats: responderStats,
      weeklyPerformance: generateResponderPerformance(7),
      goals: {
        responseTime: 'Under 10 minutes',
        resolutionTime: 'Under 30 minutes',
        successRate: 'Above 95%'
      },
      lastUpdated: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Get responder analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch responder analytics' });
  }
});

// Helper functions
function generatePersonalActivity(days) {
  const activity = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    activity.push({
      date: date.toISOString().split('T')[0],
      reportsSubmitted: Math.floor(Math.random() * 2),
      routesChecked: Math.floor(Math.random() * 5) + 1,
      alertsReceived: Math.floor(Math.random() * 3)
    });
  }
  return activity;
}

function generateResponderPerformance(days) {
  const performance = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    performance.push({
      date: date.toISOString().split('T')[0],
      incidentsHandled: Math.floor(Math.random() * 5) + 1,
      avgResponseTime: Math.floor(Math.random() * 5) + 7,
      avgResolutionTime: Math.floor(Math.random() * 10) + 20,
      rating: 4.5 + (Math.random() * 0.5)
    });
  }
  return performance;
}

module.exports = router;