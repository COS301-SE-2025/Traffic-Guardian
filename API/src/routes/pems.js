const express = require('express');
const authMiddleware = require('../middleware/auth');
const pemsService = require('../services/pemsService');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware.authenticate);

// Get PEMS traffic data for a specific district
router.get('/district/:districtId', async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);
    
    if (!districtId || districtId < 1 || districtId > 12) {
      return res.status(400).json({ 
        error: 'Invalid district ID. Must be between 1-12.' 
      });
    }

    console.log(`Fetching PEMS data for district ${districtId}...`);
    const pemsData = await pemsService.getTrafficPerformanceData(districtId);
    
    if (!pemsData) {
      return res.status(500).json({ error: 'Failed to fetch PEMS data' });
    }

    console.log(`Successfully fetched PEMS data for district ${districtId}: ${pemsData.detectors?.length || 0} detectors`);
    res.status(200).json(pemsData);
  } catch (error) {
    console.error('PEMS district data error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Get high-risk areas across all districts
router.get('/high-risk-areas', async (req, res) => {
  try {
    console.log('Fetching high-risk areas from all districts...');
    const allDistrictsData = await pemsService.getAllDistrictsData();
    
    // Aggregate high-risk areas from all districts
    const highRiskAreas = [];
    const criticalAlerts = [];
    
    allDistrictsData.forEach(districtData => {
      if (districtData.high_risk_areas) {
        districtData.high_risk_areas.forEach(area => {
          highRiskAreas.push({
            ...area,
            district: districtData.district,
            region_name: districtData.region_name
          });
        });
      }
      
      if (districtData.alerts) {
        districtData.alerts.forEach(alert => {
          if (alert.priority === 'HIGH') {
            criticalAlerts.push({
              ...alert,
              district: districtData.district,
              region_name: districtData.region_name
            });
          }
        });
      }
    });

    // Sort by risk score
    highRiskAreas.sort((a, b) => b.risk_score - a.risk_score);
    criticalAlerts.sort((a, b) => b.risk_score - a.risk_score);

    const response = {
      timestamp: new Date().toISOString(),
      total_high_risk_areas: highRiskAreas.length,
      total_critical_alerts: criticalAlerts.length,
      high_risk_areas: highRiskAreas.slice(0, 20), // Top 20
      critical_alerts: criticalAlerts.slice(0, 15), // Top 15
      system_summary: {
        districts_monitored: allDistrictsData.length,
        avg_system_health: calculateSystemHealth(allDistrictsData),
        total_detectors: allDistrictsData.reduce((sum, d) => sum + (d.summary?.total_detectors || 0), 0)
      }
    };

    console.log(`High-risk areas summary: ${response.total_high_risk_areas} areas, ${response.total_critical_alerts} critical alerts`);
    res.status(200).json(response);
  } catch (error) {
    console.error('High-risk areas error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Get traffic performance summary for dashboard
router.get('/dashboard-summary', async (req, res) => {
  try {
    console.log('Fetching PEMS dashboard summary...');
    
    // Get data for major districts (SF Bay Area, LA, San Diego)
    const majorDistricts = [4, 7, 11];
    const districtPromises = majorDistricts.map(district => 
      pemsService.getTrafficPerformanceData(district)
    );
    
    const districtData = await Promise.all(districtPromises);
    
    // Calculate aggregate metrics
    const totalDetectors = districtData.reduce((sum, d) => sum + (d.summary?.total_detectors || 0), 0);
    const avgSpeed = districtData.reduce((sum, d) => sum + (d.summary?.avg_speed || 0), 0) / districtData.length;
    const totalFlow = districtData.reduce((sum, d) => sum + (d.summary?.total_flow || 0), 0);
    const totalHighRisk = districtData.reduce((sum, d) => sum + (d.summary?.high_risk_count || 0), 0);
    
    // Get all critical areas
    const criticalAreas = [];
    const activeAlerts = [];
    
    districtData.forEach(district => {
      if (district.critical_areas) {
        district.critical_areas.forEach(area => {
          criticalAreas.push({
            ...area,
            district: district.district,
            region: district.region_name
          });
        });
      }
      
      if (district.alerts) {
        district.alerts.forEach(alert => {
          activeAlerts.push({
            ...alert,
            district: district.district,
            region: district.region_name
          });
        });
      }
    });

    // Calculate risk distribution
    const riskDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    districtData.forEach(district => {
      if (district.detectors) {
        district.detectors.forEach(detector => {
          const riskLevel = detector.risk_level?.toLowerCase();
          if (riskDistribution.hasOwnProperty(riskLevel)) {
            riskDistribution[riskLevel]++;
          }
        });
      }
    });

    const dashboardSummary = {
      timestamp: new Date().toISOString(),
      overview: {
        total_detectors: totalDetectors,
        active_detectors: totalDetectors, // Assuming all are active for now
        avg_speed_mph: Math.round(avgSpeed * 10) / 10,
        total_flow_vehicles: Math.round(totalFlow),
        high_risk_count: totalHighRisk,
        system_status: getOverallSystemStatus(districtData)
      },
      risk_analysis: {
        distribution: riskDistribution,
        critical_areas_count: criticalAreas.length,
        active_alerts_count: activeAlerts.length,
        risk_trend: calculateRiskTrend() // Simulated trend
      },
      regional_status: districtData.map(district => ({
        district: district.district,
        region: district.region_name,
        status: district.summary?.system_health || 'UNKNOWN',
        detector_count: district.summary?.total_detectors || 0,
        avg_speed: district.summary?.avg_speed || 0,
        high_risk_count: district.summary?.high_risk_count || 0,
        alerts_count: district.alerts?.length || 0
      })),
      critical_areas: criticalAreas.slice(0, 10),
      recent_alerts: activeAlerts
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 8),
      recommendations: generateDashboardRecommendations(totalHighRisk, activeAlerts.length)
    };

    console.log(`Dashboard summary generated: ${totalDetectors} detectors, ${totalHighRisk} high-risk areas`);
    res.status(200).json(dashboardSummary);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Get real-time alerts for traffic controllers
router.get('/alerts', async (req, res) => {
  try {
    const priority = req.query.priority; // HIGH, MEDIUM, LOW
    const district = req.query.district;
    
    console.log(`Fetching PEMS alerts... Priority: ${priority || 'ALL'}, District: ${district || 'ALL'}`);
    
    let districtData;
    if (district) {
      districtData = [await pemsService.getTrafficPerformanceData(parseInt(district))];
    } else {
      districtData = await pemsService.getAllDistrictsData();
    }
    
    // Collect all alerts
    let allAlerts = [];
    districtData.forEach(district => {
      if (district.alerts) {
        district.alerts.forEach(alert => {
          allAlerts.push({
            ...alert,
            district: district.district,
            region: district.region_name
          });
        });
      }
    });

    // Filter by priority if specified
    if (priority) {
      allAlerts = allAlerts.filter(alert => 
        alert.priority?.toUpperCase() === priority.toUpperCase()
      );
    }

    // Sort by risk score and timestamp
    allAlerts.sort((a, b) => {
      if (b.risk_score !== a.risk_score) {
        return b.risk_score - a.risk_score;
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const alertsSummary = {
      timestamp: new Date().toISOString(),
      total_alerts: allAlerts.length,
      priority_breakdown: {
        high: allAlerts.filter(a => a.priority === 'HIGH').length,
        medium: allAlerts.filter(a => a.priority === 'MEDIUM').length,
        low: allAlerts.filter(a => a.priority === 'LOW').length
      },
      alerts: allAlerts.slice(0, 50) // Limit to 50 most important alerts
    };

    console.log(`Alerts fetched: ${alertsSummary.total_alerts} total, ${alertsSummary.priority_breakdown.high} high priority`);
    res.status(200).json(alertsSummary);
  } catch (error) {
    console.error('PEMS alerts error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Clear PEMS cache (for development/testing)
router.post('/clear-cache', async (req, res) => {
  try {
    pemsService.clearCache();
    res.status(200).json({ 
      message: 'PEMS cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Helper functions
function calculateSystemHealth(districtData) {
  const healthValues = { 'HEALTHY': 1, 'WARNING': 2, 'CRITICAL': 3, 'UNKNOWN': 2 };
  const totalHealth = districtData.reduce((sum, district) => {
    return sum + (healthValues[district.summary?.system_health] || 2);
  }, 0);
  const avgHealth = totalHealth / districtData.length;
  
  if (avgHealth <= 1.3) return 'HEALTHY';
  if (avgHealth <= 2.3) return 'WARNING';
  return 'CRITICAL';
}

function getOverallSystemStatus(districtData) {
  const healthCounts = { 'HEALTHY': 0, 'WARNING': 0, 'CRITICAL': 0 };
  
  districtData.forEach(district => {
    const health = district.summary?.system_health || 'WARNING';
    healthCounts[health]++;
  });
  
  if (healthCounts.CRITICAL > 0) return 'CRITICAL';
  if (healthCounts.WARNING > healthCounts.HEALTHY) return 'WARNING';
  return 'HEALTHY';
}

function calculateRiskTrend() {
  // Simulate risk trend calculation
  // In real implementation, this would analyze historical data
  const trends = ['IMPROVING', 'STABLE', 'WORSENING'];
  return trends[Math.floor(Math.random() * trends.length)];
}

function generateDashboardRecommendations(highRiskCount, alertCount) {
  const recommendations = [];
  
  if (highRiskCount > 20) {
    recommendations.push({
      type: 'RESOURCE_DEPLOYMENT',
      priority: 'HIGH',
      message: `${highRiskCount} high-risk areas detected. Deploy additional patrol units.`,
      action: 'Increase patrol presence in high-risk corridors'
    });
  }
  
  if (alertCount > 15) {
    recommendations.push({
      type: 'INCIDENT_MANAGEMENT',
      priority: 'MEDIUM',
      message: `${alertCount} active alerts. Activate incident management protocols.`,
      action: 'Coordinate with emergency services and traffic management'
    });
  }
  
  recommendations.push({
    type: 'MONITORING',
    priority: 'LOW',
    message: 'Continue standard monitoring and maintain readiness for rapid response.',
    action: 'Monitor traffic patterns and maintain communication systems'
  });
  
  return recommendations;
}

module.exports = router;