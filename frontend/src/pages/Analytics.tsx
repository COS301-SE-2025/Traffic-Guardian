import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../consts/ThemeContext';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import './Analytics.css';

const CalendarIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ChartIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ClockIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendingDownIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

interface IncidentTrend {
  date: string;
  count: number;
  severity: {
    high: number;
    medium: number;
    low: number;
  };
}

interface ResponseTimeData {
  range: string;
  count: number;
  percentage: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

interface HourlyDistribution {
  hour: number;
  incidents: number;
  avgResponseTime: number;
}

interface LocationHotspot {
  location: string;
  incidents: number;
  avgSeverity: number;
}

interface PerformanceMetric {
  metric: string;
  value: number;
  maxValue: number;
}

const Analytics: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const [incidentTrends, setIncidentTrends] = useState<IncidentTrend[]>([]);
  const [responseTimeData, setResponseTimeData] = useState<ResponseTimeData[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<HourlyDistribution[]>([]);
  const [locationHotspots, setLocationHotspots] = useState<LocationHotspot[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  
  const [summaryStats, setSummaryStats] = useState({
    totalIncidents: 0,
    avgResponseTime: 0,
    resolutionRate: 0,
    criticalIncidents: 0,
    trendsComparison: {
      incidents: 0,
      responseTime: 0,
      resolution: 0
    }
  });

  const chartColors = {
    primary: isDarkMode ? '#3b82f6' : '#2563eb',
    secondary: isDarkMode ? '#8b5cf6' : '#7c3aed',
    success: isDarkMode ? '#10b981' : '#059669',
    warning: isDarkMode ? '#f59e0b' : '#d97706',
    danger: isDarkMode ? '#ef4444' : '#dc2626',
    info: isDarkMode ? '#06b6d4' : '#0891b2'
  };

  const severityColors = {
    high: chartColors.danger,
    medium: chartColors.warning,
    low: chartColors.success
  };

  const categoryColors = [
    chartColors.primary,
    chartColors.secondary,
    chartColors.success,
    chartColors.warning,
    chartColors.danger,
    chartColors.info,
    '#ec4899',
    '#f97316'
  ];

  const loadIncidentTrends = useCallback(async () => {
  const trends: IncidentTrend[] = [];
  const start = new Date(dateRange.startDate);
  const end = new Date(dateRange.endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    trends.push({
      date: d.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 50) + 10,
      severity: {
        high: Math.floor(Math.random() * 10),
        medium: Math.floor(Math.random() * 20),
        low: Math.floor(Math.random() * 20)
      }
    });
  }

  setIncidentTrends(trends);
}, [dateRange]);

const loadResponseTimeDistribution = useCallback(async () => {
  const data: ResponseTimeData[] = [
    { range: '0-5 min', count: 145, percentage: 35 },
    { range: '5-10 min', count: 120, percentage: 29 },
    { range: '10-15 min', count: 85, percentage: 20 },
    { range: '15-20 min', count: 45, percentage: 11 },
    { range: '20+ min', count: 20, percentage: 5 }
  ];
  setResponseTimeData(data);
}, []);

const loadCategoryBreakdown = useCallback(async () => {
  const data: CategoryBreakdown[] = [
    { category: 'Vehicle Accident', count: 156, percentage: 28, trend: 'up' },
    { category: 'Vehicle Breakdown', count: 134, percentage: 24, trend: 'down' },
    { category: 'Traffic Congestion', count: 98, percentage: 18, trend: 'stable' },
    { category: 'Road Debris', count: 67, percentage: 12, trend: 'up' },
    { category: 'Weather Hazard', count: 45, percentage: 8, trend: 'down' },
    { category: 'Construction Zone', count: 34, percentage: 6, trend: 'stable' },
    { category: 'Other', count: 22, percentage: 4, trend: 'up' }
  ];
  setCategoryBreakdown(data);
}, []);

const loadHourlyDistribution = useCallback(async () => {
  const data: HourlyDistribution[] = [];
  for (let hour = 0; hour < 24; hour++) {
    data.push({
      hour,
      incidents: Math.floor(Math.random() * 40) + 5,
      avgResponseTime: Math.floor(Math.random() * 15) + 5
    });
  }
  setHourlyDistribution(data);
}, []);

const loadLocationHotspots = useCallback(async () => {
  const data: LocationHotspot[] = [
    { location: 'N1 Western Bypass', incidents: 89, avgSeverity: 2.4 },
    { location: 'M1 Sandton', incidents: 76, avgSeverity: 2.1 },
    { location: 'R21 OR Tambo', incidents: 65, avgSeverity: 1.8 },
    { location: 'N3 Johannesburg South', incidents: 54, avgSeverity: 2.2 },
    { location: 'N12 East', incidents: 43, avgSeverity: 1.9 }
  ];
  setLocationHotspots(data);
}, []);

const loadPerformanceMetrics = useCallback(async () => {
  const data: PerformanceMetric[] = [
    { metric: 'Detection Speed', value: 92, maxValue: 100 },
    { metric: 'Response Time', value: 85, maxValue: 100 },
    { metric: 'Resolution Rate', value: 78, maxValue: 100 },
    { metric: 'System Uptime', value: 99.5, maxValue: 100 },
    { metric: 'Data Accuracy', value: 94, maxValue: 100 },
    { metric: 'Coverage', value: 87, maxValue: 100 }
  ];
  setPerformanceMetrics(data);
}, []);

const loadSummaryStatistics = useCallback(async () => {
  setSummaryStats({
    totalIncidents: 556,
    avgResponseTime: 8.5,
    resolutionRate: 78,
    criticalIncidents: 45,
    trendsComparison: {
      incidents: 12.5,
      responseTime: -8.3,
      resolution: 5.2
    }
  });
}, []);

const loadAnalyticsData = useCallback(async () => {
  setIsLoading(true);
  try {
    await Promise.all([
      loadIncidentTrends(),
      loadResponseTimeDistribution(),
      loadCategoryBreakdown(),
      loadHourlyDistribution(),
      loadLocationHotspots(),
      loadPerformanceMetrics(),
      loadSummaryStatistics()
    ]);
  } catch (error) {
    console.error('Error loading analytics data:', error);
  } finally {
    setIsLoading(false);
  }
}, [
  loadIncidentTrends,
  loadResponseTimeDistribution,
  loadCategoryBreakdown,
  loadHourlyDistribution,
  loadLocationHotspots,
  loadPerformanceMetrics,
  loadSummaryStatistics
]);


useEffect(() => {
  loadAnalyticsData();
}, [loadAnalyticsData]);


  const handleDateChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type === 'start' ? 'startDate' : 'endDate']: value
    }));
  };

  const formatXAxisTick = (tickItem: string) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatHourTick = (hour: number) => {
    return hour === 0 ? '12AM' : hour === 12 ? '12PM' : hour < 12 ? `${hour}AM` : `${hour - 12}PM`;
  };

  if (isLoading) {
    return (
      <div className={`analytics-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
        <div className="analytics-loading">
          <div className="loading-spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`analytics-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="analytics-content">
        {}
        <div className="analytics-header">
          <div className="analytics-title">
            <h1>Analytics Dashboard</h1>
            <p>Traffic incident insights and performance metrics</p>
          </div>
          
          {}
          <div className="date-range-selector">
            <div className="date-input-group">
              <label>
                <CalendarIcon />
                From:
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateChange('start', e.target.value)}
                max={dateRange.endDate}
              />
            </div>
            <div className="date-input-group">
              <label>
                To:
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateChange('end', e.target.value)}
                min={dateRange.startDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>

        {}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-icon incidents">
              <ChartIcon />
            </div>
            <div className="card-content">
              <h3>Total Incidents</h3>
              <div className="card-value">{summaryStats.totalIncidents}</div>
              <div className={`card-trend ${summaryStats.trendsComparison.incidents >= 0 ? 'up' : 'down'}`}>
                {summaryStats.trendsComparison.incidents >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                {Math.abs(summaryStats.trendsComparison.incidents)}% vs last period
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon response">
              <ClockIcon />
            </div>
            <div className="card-content">
              <h3>Avg Response Time</h3>
              <div className="card-value">{summaryStats.avgResponseTime} min</div>
              <div className={`card-trend ${summaryStats.trendsComparison.responseTime <= 0 ? 'up' : 'down'}`}>
                {summaryStats.trendsComparison.responseTime <= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                {Math.abs(summaryStats.trendsComparison.responseTime)}% vs last period
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon resolution">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="card-content">
              <h3>Resolution Rate</h3>
              <div className="card-value">{summaryStats.resolutionRate}%</div>
              <div className={`card-trend ${summaryStats.trendsComparison.resolution >= 0 ? 'up' : 'down'}`}>
                {summaryStats.trendsComparison.resolution >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                {Math.abs(summaryStats.trendsComparison.resolution)}% vs last period
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon critical">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="card-content">
              <h3>Critical Incidents</h3>
              <div className="card-value">{summaryStats.criticalIncidents}</div>
              <div className="card-subtitle">Requiring immediate attention</div>
            </div>
          </div>
        </div>

        {}
        <div className="charts-grid">
          {}
          <div className="chart-container full-width">
            <h2>Incident Trends Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={incidentTrends}>
                <defs>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={severityColors.high} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={severityColors.high} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={severityColors.medium} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={severityColors.medium} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={severityColors.low} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={severityColors.low} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatXAxisTick}
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                />
                <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: isDarkMode ? '#e5e7eb' : '#111827' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="severity.high" 
                  stackId="1"
                  stroke={severityColors.high}
                  fillOpacity={1}
                  fill="url(#colorHigh)"
                  name="High Severity"
                />
                <Area 
                  type="monotone" 
                  dataKey="severity.medium" 
                  stackId="1"
                  stroke={severityColors.medium}
                  fillOpacity={1}
                  fill="url(#colorMedium)"
                  name="Medium Severity"
                />
                <Area 
                  type="monotone" 
                  dataKey="severity.low" 
                  stackId="1"
                  stroke={severityColors.low}
                  fillOpacity={1}
                  fill="url(#colorLow)"
                  name="Low Severity"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {}
          <div className="chart-container half-width">
            <h2>Response Time Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="range" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill={chartColors.primary} radius={[8, 8, 0, 0]}>
                  {responseTimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {}
          <div className="chart-container half-width">
            <h2>Incident Categories</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {}
          <div className="chart-container full-width">
            <h2>Hourly Incident Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={formatHourTick}
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                />
                <YAxis yAxisId="left" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <YAxis yAxisId="right" orientation="right" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px'
                  }}
                  labelFormatter={(value) => formatHourTick(value as number)}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="incidents" 
                  stroke={chartColors.primary}
                  strokeWidth={2}
                  dot={{ fill: chartColors.primary, r: 4 }}
                  name="Incidents"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="avgResponseTime" 
                  stroke={chartColors.secondary}
                  strokeWidth={2}
                  dot={{ fill: chartColors.secondary, r: 4 }}
                  name="Avg Response Time (min)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {}
          <div className="chart-container half-width">
            <h2>Top Incident Locations</h2>
            <div className="location-list">
              {locationHotspots.map((location, index) => (
                <div key={index} className="location-item">
                  <div className="location-info">
                    <span className="location-rank">#{index + 1}</span>
                    <span className="location-name">{location.location}</span>
                  </div>
                  <div className="location-stats">
                    <span className="incident-count">{location.incidents} incidents</span>
                    <span className={`severity-indicator severity-${location.avgSeverity >= 2 ? 'high' : location.avgSeverity >= 1.5 ? 'medium' : 'low'}`}>
                      Avg Severity: {location.avgSeverity.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {}
          <div className="chart-container half-width" style={{ overflow: 'visible' }}>
            <h2>System Performance Metrics</h2>
            <div style={{ padding: '5px' }}>
              <ResponsiveContainer width="100%" height={450}>
                <RadarChart
                  data={performanceMetrics}
                  outerRadius="55%"                               
                  margin={{ top: 100, right: 100, bottom: 100, left: 100 }}
      >
                  <PolarGrid stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <PolarAngleAxis 
                    dataKey="metric" 
                    stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    tick={{ fontSize: 11 }}
                    tickSize={35}
                    tickLine={false}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    tick={{ fontSize: 11 }}
                    tickCount={5}
                  />
                  <Radar 
                    name="Performance" 
                    dataKey="value" 
                    stroke={chartColors.primary}
                    fill={chartColors.primary}
                    fillOpacity={0.6}
                  />
                  <Tooltip 
                    contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {}
        <div className="trends-table-container">
          <h2>Category Trends</h2>
          <table className="trends-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Incidents</th>
                <th>Percentage</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {categoryBreakdown.map((category, index) => (
                <tr key={index}>
                  <td>{category.category}</td>
                  <td>{category.count}</td>
                  <td>
                    <div className="percentage-bar">
                      <div 
                        className="percentage-fill"
                        style={{ 
                          width: `${category.percentage}%`,
                          backgroundColor: categoryColors[index % categoryColors.length]
                        }}
                      />
                      <span>{category.percentage}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`trend-indicator ${category.trend}`}>
                      {category.trend === 'up' && <TrendingUpIcon />}
                      {category.trend === 'down' && <TrendingDownIcon />}
                      {category.trend === 'stable' && '→'}
                      {category.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;