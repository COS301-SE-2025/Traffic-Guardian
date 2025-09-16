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

