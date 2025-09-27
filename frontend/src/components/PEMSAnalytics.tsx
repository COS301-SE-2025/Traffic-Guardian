import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { useUser, Permission } from '../contexts/UserContext';
import ApiService from '../services/apiService';
import LoadingSpinner from './LoadingSpinner';
import WeeklyTrafficTrends from './WeeklyTrafficTrends';
import './PEMSAnalytics.css';

// Type definitions for PEMS data structures
interface PEMSOverview {
  total_detectors: number;
  avg_speed_mph: number;
  high_risk_count: number;
}

interface PEMSRegionalStatus {
  region: string;
  detector_count: number;
  avg_speed: number;
  high_risk_count: number;
  alerts_count: number;
  status: string;
}

interface PEMSRiskAnalysis {
  distribution: {
    critical: number;
    medium: number;
    low: number;
  };
}

interface PEMSDashboardData {
  overview: PEMSOverview;
  regional_status: PEMSRegionalStatus[];
  risk_analysis: PEMSRiskAnalysis;
  timestamp: string;
}

interface PEMSHighRiskArea {
  location: string;
  risk: number;
  flow: number;
  speed: number;
  detector_id: string;
  risk_level: string;
  freeway: string;
  direction: string;
  region_name: string;
  risk_score: number;
}

interface PEMSHighRiskData {
  high_risk_areas: PEMSHighRiskArea[];
}

interface PEMSAlertData {
  priority_breakdown: {
    high: number;
    medium: number;
    low: number;
  };
}

interface PEMSDistrictSummary {
  avg_speed: number;
  total_flow: number;
  avg_risk_score: number;
  total_detectors: number;
  active_detectors: number;
}

interface PEMSDistrictData {
  district: string;
  region_name: string;
  summary: PEMSDistrictSummary;
}

// PEMS Color scheme for consistent visualizations
const PEMS_COLORS = {
  primary: '#F79400',
  secondary: '#0056b3',
  critical: '#f44336',
  warning: '#feac34',
  success: '#4caf50',
  info: '#2196f3',
  light: '#f5f5f5',
  gradient: ['#F79400', '#feac34', '#ff8a5b', '#ffad80'],
};

const RISK_COLORS = {
  CRITICAL: '#f44336',
  HIGH: '#feac34',
  MEDIUM: '#feac34',
  LOW: '#4caf50',
};

const TrendingUpIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    />
  </svg>
);

const AlertIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
);

const ActivityIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const MapIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
    />
  </svg>
);

interface PEMSAnalyticsProps {
  className?: string;
}

const PEMSAnalytics: React.FC<PEMSAnalyticsProps> = ({ className = '' }) => {
  const { hasPermission, isAuthenticated, userRole, user } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<PEMSDashboardData | null>(null);
  const [highRiskData, setHighRiskData] = useState<PEMSHighRiskData | null>(null);
  const [alertsData, setAlertsData] = useState<PEMSAlertData | null>(null);
  const [districtData, setDistrictData] = useState<PEMSDistrictData[]>([]);
  const [selectedView, setSelectedView] = useState<
    'overview' | 'districts' | 'alerts' | 'performance' | 'weekly'
  >('overview');

  // Permission checks
  const canViewPEMS = hasPermission(Permission.VIEW_PEMS_DATA);
  const canViewDetailed = hasPermission(Permission.VIEW_DETAILED_ANALYTICS);
  const canViewDistricts = hasPermission(Permission.VIEW_DISTRICT_SPECIFIC);
  const canExportData = hasPermission(Permission.EXPORT_DATA);

  const fetchPEMSAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data based on permissions
      const promises: Promise<any>[] = [];

      if (isAuthenticated && canViewPEMS) {
        // Authenticated users with PEMS permissions
        promises.push(
          ApiService.fetchPEMSAnalyticsData(userRole, user?.districts),
          canViewDetailed ? ApiService.fetchPEMSDashboardSummary() : Promise.resolve(null),
          canViewDetailed ? ApiService.fetchPEMSHighRiskAreas() : Promise.resolve(null),
          canViewDetailed ? ApiService.fetchPEMSAlerts() : Promise.resolve(null),
        );

        // Add district data if user has district permissions
        if (canViewDistricts && user?.districts) {
          user.districts.forEach(district => {
            promises.push(ApiService.fetchPEMSDistrictData(district));
          });
        } else if (canViewDetailed) {
          // Admin users get major districts
          promises.push(
            ApiService.fetchPEMSDistrictData(4),
            ApiService.fetchPEMSDistrictData(7),
            ApiService.fetchPEMSDistrictData(11),
            ApiService.fetchPEMSDistrictData(3),
            ApiService.fetchPEMSDistrictData(12),
          );
        }
      } else {
        // Public users get standardized basic data
        promises.push(
          Promise.resolve({
            timestamp: new Date().toISOString(),
            overview: {
              total_detectors: 1024,
              active_detectors: 987,
              avg_speed_mph: 62.5,
              total_flow_vehicles: 147500,
              high_risk_count: 15,
              system_status: 'HEALTHY',
            },
            regional_status: [
              { region: 'Los Angeles County', detector_count: 285, avg_speed: 58.2, high_risk_count: 8, alerts_count: 3, status: 'HEALTHY' },
              { region: 'San Francisco Bay Area', detector_count: 198, avg_speed: 61.5, high_risk_count: 4, alerts_count: 2, status: 'HEALTHY' },
              { region: 'Orange County', detector_count: 147, avg_speed: 64.1, high_risk_count: 2, alerts_count: 1, status: 'HEALTHY' },
              { region: 'San Diego County', detector_count: 123, avg_speed: 66.8, high_risk_count: 1, alerts_count: 0, status: 'HEALTHY' },
              { region: 'Sacramento Valley', detector_count: 89, avg_speed: 69.2, high_risk_count: 0, alerts_count: 0, status: 'HEALTHY' },
            ],
            risk_analysis: {
              distribution: {
                critical: 3,
                high: 12,
                medium: 28,
                low: 957,
              },
            },
            publicDemo: true,
          }),
          Promise.resolve(null),
          Promise.resolve(null),
          Promise.resolve(null),
        );
      }

      const results = await Promise.all(promises);

      if (isAuthenticated && canViewPEMS) {
        const [analyticsData, dashboard, highRisk, alerts, ...districts] = results;
        setDashboardData(analyticsData || dashboard);
        setHighRiskData(highRisk);
        setAlertsData(alerts);
        setDistrictData(districts.filter(d => d !== null));
      } else {
        const [basicData] = results;
        setDashboardData(basicData);
        setHighRiskData(null);
        setAlertsData(null);
        setDistrictData([]);
      }
    } catch (err) {
      console.error('Error fetching PEMS analytics:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch PEMS data',
      );
    } finally {
      setLoading(false);
    }
  }, [canViewPEMS, canViewDetailed, canViewDistricts, isAuthenticated, userRole, user?.districts]);

  useEffect(() => {
    fetchPEMSAnalytics();
  }, [fetchPEMSAnalytics]);

  // Transform data for visualizations
  const getRegionalPerformanceData = () => {
    if (!dashboardData?.regional_status) {return [];}

    return dashboardData.regional_status.map((region: PEMSRegionalStatus) => ({
      name: region.region.split(' ').slice(0, 2).join(' '), // Shorten names
      detectors: region.detector_count,
      avgSpeed: region.avg_speed,
      highRisk: region.high_risk_count,
      alerts: region.alerts_count,
      status: region.status,
    }));
  };

  const getRiskDistributionData = () => {
    if (!dashboardData?.risk_analysis?.distribution) {return [];}

    const dist = dashboardData.risk_analysis.distribution;
    return [
      {
        name: 'Critical',
        value: dist.critical || 0,
        color: RISK_COLORS.CRITICAL,
      },
      { name: 'High', value: dist.critical || 0, color: RISK_COLORS.HIGH },
      { name: 'Medium', value: dist.medium || 0, color: RISK_COLORS.MEDIUM },
      { name: 'Low', value: dist.low || 0, color: RISK_COLORS.LOW },
    ];
  };

  const getSpeedFlowData = () => {
    return districtData.map(district => ({
      district: `D${district.district}`,
      region: district.region_name.split(' ').slice(0, 2).join(' '),
      avgSpeed: district.summary?.avg_speed || 0,
      totalFlow: (district.summary?.total_flow || 0) / 1000, // Convert to thousands
      riskScore: district.summary?.avg_risk_score || 0,
      detectors: district.summary?.total_detectors || 0,
    }));
  };

  const getAlertsPriorityData = () => {
    if (!alertsData?.priority_breakdown) {return [];}

    const priorities = alertsData.priority_breakdown;
    return [
      {
        name: 'High Priority',
        value: priorities.high || 0,
        color: RISK_COLORS.CRITICAL,
      },
      {
        name: 'Medium Priority',
        value: priorities.medium || 0,
        color: RISK_COLORS.MEDIUM,
      },
      {
        name: 'Low Priority',
        value: priorities.low || 0,
        color: RISK_COLORS.LOW,
      },
    ];
  };

  const getSystemHealthRadarData = () => {
    if (!districtData.length) {return [];}

    // Transform data for RadarChart - each metric becomes a data point
    const metrics = ['Speed', 'Flow', 'Safety', 'Efficiency'];
    return metrics.map(metric => {
      const dataPoint: any = { metric };
      districtData.slice(0, 5).forEach(district => {
        const districtKey = `D${district.district}`;
        switch (metric) {
          case 'Speed':
            dataPoint[districtKey] =
              ((district.summary?.avg_speed || 0) / 70) * 100;
            break;
          case 'Flow':
            dataPoint[districtKey] = Math.min(
              ((district.summary?.total_flow || 0) / 5000) * 100,
              100,
            );
            break;
          case 'Safety':
            dataPoint[districtKey] =
              100 - ((district.summary?.avg_risk_score || 0) / 10) * 100;
            break;
          case 'Efficiency':
            dataPoint[districtKey] =
              ((district.summary?.active_detectors || 0) /
                (district.summary?.total_detectors || 1)) *
              100;
            break;
        }
      });
      return dataPoint;
    });
  };

  if (loading) {
    return (
      <LoadingSpinner
        size="large"
        text="Loading PEMS analytics..."
        className="content"
      />
    );
  }

  if (error) {
    return (
      <div className="pems-analytics-error">
        <AlertIcon />
        <h3>Unable to Load PEMS Analytics</h3>
        <p>{error}</p>
        <button onClick={fetchPEMSAnalytics} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`pems-analytics ${className}`}>
      <div className="analytics-header">
        <h2>
          <ActivityIcon />
          PEMS Traffic Analytics
          {!isAuthenticated && <span className="public-badge">Public View</span>}
          {isAuthenticated && <span className="user-role-badge">{userRole.toUpperCase()}</span>}
        </h2>
        <div className="analytics-tabs">
          <button
            className={selectedView === 'overview' ? 'active' : ''}
            onClick={() => setSelectedView('overview')}
          >
            Overview
          </button>
          <button
            className={selectedView === 'weekly' ? 'active' : ''}
            onClick={() => setSelectedView('weekly')}
          >
            Weekly Trends
          </button>
          {canViewDistricts && (
            <button
              className={selectedView === 'districts' ? 'active' : ''}
              onClick={() => setSelectedView('districts')}
            >
              Regional Analysis
            </button>
          )}
          {canViewDetailed && (
            <button
              className={selectedView === 'alerts' ? 'active' : ''}
              onClick={() => setSelectedView('alerts')}
            >
              Alerts & Risk
            </button>
          )}
          {canViewDetailed && (
            <button
              className={selectedView === 'performance' ? 'active' : ''}
              onClick={() => setSelectedView('performance')}
            >
              Performance Metrics
            </button>
          )}
        </div>
        {canExportData && (
          <button className="export-button">
            Export Data
          </button>
        )}
      </div>

      <div className="analytics-content">
        {selectedView === 'overview' && (
          <div className="overview-section">
            <div className="analytics-summary-cards">
              <div className="summary-card">
                <div className="card-icon primary">
                  <ActivityIcon />
                </div>
                <div className="card-content">
                  <h3>{dashboardData?.overview?.total_detectors || 0}</h3>
                  <p>Active Detectors</p>
                  <span className="card-subtitle">
                    Monitoring California highways
                  </span>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon success">
                  <TrendingUpIcon />
                </div>
                <div className="card-content">
                  <h3>
                    {dashboardData?.overview?.avg_speed_mph?.toFixed(1) || 0}{' '}
                    mph
                  </h3>
                  <p>Average Speed</p>
                  <span className="card-subtitle">
                    System-wide traffic flow
                  </span>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon warning">
                  <AlertIcon />
                </div>
                <div className="card-content">
                  <h3>{dashboardData?.overview?.high_risk_count || 0}</h3>
                  <p>High Risk Areas</p>
                  <span className="card-subtitle">Requiring attention</span>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon info">
                  <MapIcon />
                </div>
                <div className="card-content">
                  <h3>{dashboardData?.regional_status?.length || 0}</h3>
                  <p>Districts</p>
                  <span className="card-subtitle">California regions</span>
                </div>
              </div>
            </div>

            <div className="analytics-charts-grid">
              <div className="chart-container">
                <h3>Traffic Risk Distribution</h3>
                <p className="chart-description">
                  Current distribution of traffic risk levels across all
                  monitored detectors. Critical and high-risk areas require
                  immediate attention from traffic controllers.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getRiskDistributionData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getRiskDistributionData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3>Regional Performance Comparison</h3>
                <p className="chart-description">
                  Performance metrics across California districts showing
                  detector count and average speeds. Higher speeds generally
                  indicate better traffic flow.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getRegionalPerformanceData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar
                      yAxisId="left"
                      dataKey="detectors"
                      fill={PEMS_COLORS.primary}
                      name="Detectors"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="avgSpeed"
                      fill={PEMS_COLORS.secondary}
                      name="Avg Speed (mph)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'districts' && (
          <div className="districts-section">
            <div className="section-description">
              <h3>Regional Traffic Analysis</h3>
              <p>
                Detailed analysis of traffic patterns across California
                districts. This data helps traffic controllers understand
                regional differences and allocate resources effectively.
              </p>
            </div>

            <div className="analytics-charts-grid">
              <div className="chart-container full-width">
                <h3>Speed vs Flow Analysis</h3>
                <p className="chart-description">
                  Relationship between traffic speed and vehicle flow across
                  districts. Optimal performance shows high speed with moderate
                  flow rates.
                </p>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={getSpeedFlowData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" />
                    <YAxis />
                    <Tooltip
                      labelFormatter={value => `Region: ${value}`}
                      formatter={(value: any, name: string) => [
                        name === 'totalFlow'
                          ? `${value}k vehicles/hr`
                          : `${value} mph`,
                        name === 'totalFlow' ? 'Traffic Flow' : 'Average Speed',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgSpeed"
                      stackId="1"
                      stroke={PEMS_COLORS.primary}
                      fill={PEMS_COLORS.primary}
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalFlow"
                      stackId="2"
                      stroke={PEMS_COLORS.secondary}
                      fill={PEMS_COLORS.secondary}
                      fillOpacity={0.4}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3>System Health Radar</h3>
                <p className="chart-description">
                  Multi-dimensional view of district performance including
                  speed, flow, safety, and efficiency metrics.
                </p>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={getSystemHealthRadarData()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    {districtData.slice(0, 5).map((district, index) => (
                      <Radar
                        key={`D${district.district}`}
                        name={`District ${district.district}`}
                        dataKey={`D${district.district}`}
                        stroke={
                          PEMS_COLORS.gradient[
                            index % PEMS_COLORS.gradient.length
                          ]
                        }
                        fill={
                          PEMS_COLORS.gradient[
                            index % PEMS_COLORS.gradient.length
                          ]
                        }
                        fillOpacity={0.1}
                      />
                    ))}
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'alerts' && (
          <div className="alerts-section">
            <div className="section-description">
              <h3>Alert Analysis & Risk Management</h3>
              <p>
                Real-time alert distribution and critical area identification
                for proactive traffic management.
              </p>
            </div>

            <div className="analytics-charts-grid">
              <div className="chart-container">
                <h3>Alert Priority Distribution</h3>
                <p className="chart-description">
                  Current breakdown of active alerts by priority level.
                  High-priority alerts require immediate response.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getAlertsPriorityData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {getAlertsPriorityData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3>High-Risk Areas by Region</h3>
                <p className="chart-description">
                  Number of high-risk areas and active alerts per region,
                  helping prioritize resource deployment.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getRegionalPerformanceData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="highRisk"
                      fill={RISK_COLORS.HIGH}
                      name="High Risk Areas"
                    />
                    <Bar
                      dataKey="alerts"
                      fill={RISK_COLORS.CRITICAL}
                      name="Active Alerts"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {highRiskData?.high_risk_areas && highRiskData.high_risk_areas.length > 0 && (
              <div className="high-risk-areas-list">
                <h3>Critical Areas Requiring Attention</h3>
                <div className="risk-areas-grid">
                  {highRiskData?.high_risk_areas
                    .slice(0, 6)
                    .map((area: PEMSHighRiskArea, index: number) => (
                      <div key={index} className="risk-area-card">
                        <div className="area-header">
                          <span className="detector-id">
                            {area.detector_id}
                          </span>
                          <span
                            className={`risk-badge ${area.risk_level?.toLowerCase()}`}
                          >
                            {area.risk_level}
                          </span>
                        </div>
                        <div className="area-location">
                          {area.freeway} {area.direction} • {area.region_name}
                        </div>
                        <div className="area-metrics">
                          <span>
                            Risk Score: {area.risk_score?.toFixed(1)}/10
                          </span>
                          <span>Speed: {area.speed?.toFixed(1)} mph</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedView === 'performance' && (
          <div className="performance-section">
            <div className="section-description">
              <h3>Traffic Performance Metrics</h3>
              <p>
                Detailed performance analysis showing traffic flow efficiency
                and system utilization across the network.
              </p>
            </div>

            <div className="analytics-charts-grid">
              <div className="chart-container full-width">
                <h3>Detector Performance Timeline</h3>
                <p className="chart-description">
                  Traffic detector performance across regions showing speed and
                  occupancy trends.
                </p>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={getSpeedFlowData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="avgSpeed"
                      stroke={PEMS_COLORS.primary}
                      strokeWidth={3}
                      name="Average Speed (mph)"
                    />
                    <Line
                      type="monotone"
                      dataKey="riskScore"
                      stroke={RISK_COLORS.HIGH}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Risk Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="performance-insights">
                <h3>Key Performance Insights</h3>
                <div className="insights-list">
                  <div className="insight-item">
                    <div className="insight-icon success">
                      <TrendingUpIcon />
                    </div>
                    <div className="insight-content">
                      <h4>System Efficiency</h4>
                      <p>
                        {dashboardData?.overview?.total_detectors || 0}{' '}
                        detectors are actively monitoring California highways
                        with an average speed of{' '}
                        {dashboardData?.overview?.avg_speed_mph?.toFixed(1) ||
                          0}{' '}
                        mph.
                      </p>
                    </div>
                  </div>

                  <div className="insight-item">
                    <div className="insight-icon warning">
                      <AlertIcon />
                    </div>
                    <div className="insight-content">
                      <h4>Risk Assessment</h4>
                      <p>
                        {dashboardData?.overview?.high_risk_count || 0} areas
                        currently require attention, with{' '}
                        {alertsData?.priority_breakdown?.high || 0}{' '}
                        high-priority alerts active.
                      </p>
                    </div>
                  </div>

                  <div className="insight-item">
                    <div className="insight-icon info">
                      <MapIcon />
                    </div>
                    <div className="insight-content">
                      <h4>Regional Coverage</h4>
                      <p>
                        Monitoring spans{' '}
                        {dashboardData?.regional_status?.length || 0} major
                        California districts with comprehensive coverage of
                        urban and suburban highways.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'weekly' && (
          <div className="weekly-section">
            <div className="section-description">
              <h3>Weekly Traffic Volume Trends</h3>
              <p>
                {isAuthenticated && canViewDetailed
                  ? 'Comprehensive weekly traffic analysis with detailed volume patterns, speed data, and incident correlation across Monday through Sunday.'
                  : 'Basic weekly traffic volume trends showing general patterns from Monday through Sunday. Sign in for detailed analytics and historical data.'
                }
              </p>
            </div>

            <WeeklyTrafficTrends
              className="embedded-weekly-trends"
              district={user?.districts?.[0]}
              showDetailed={canViewDetailed}
            />

            {!isAuthenticated && (
              <div className="upgrade-prompt">
                <h4>📈 Unlock Advanced Weekly Analytics</h4>
                <p>Sign in to access:</p>
                <ul>
                  <li>✓ Historical trend comparison</li>
                  <li>✓ Speed and incident correlation</li>
                  <li>✓ District-specific analysis</li>
                  <li>✓ Peak hour identification</li>
                  <li>✓ Data export capabilities</li>
                </ul>
                <a href="/account" className="upgrade-cta">
                  Sign In for Full Access
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="analytics-footer">
        <div className="last-update">
          Last Updated:{' '}
          {dashboardData?.timestamp
            ? (() => {
              const date = new Date(dashboardData.timestamp);
              const dateTimeString = date.toLocaleString('en-US', {
                timeZone: 'America/Los_Angeles',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const timeZone = date.toLocaleDateString('en-US', {
                timeZone: 'America/Los_Angeles',
                timeZoneName: 'short',
              }).split(', ')[1];
              return `${dateTimeString} (${timeZone})`;
            })()
            : 'Unknown'}
        </div>
        <button onClick={fetchPEMSAnalytics} className="refresh-button">
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default PEMSAnalytics;
