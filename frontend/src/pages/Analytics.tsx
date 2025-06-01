import React, { useState, useEffect } from 'react';
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
  RadarAxisAngle,
  RadarAxisTick,
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

useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Simulate API calls - replace with actual API endpoints
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
  };

  // Simulated data loaders - replace with actual API calls
  const loadIncidentTrends = async () => {
    // Generate sample data for the selected date range
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
  };

  const loadResponseTimeDistribution = async () => {
    const data: ResponseTimeData[] = [
      { range: '0-5 min', count: 145, percentage: 35 },
      { range: '5-10 min', count: 120, percentage: 29 },
      { range: '10-15 min', count: 85, percentage: 20 },
      { range: '15-20 min', count: 45, percentage: 11 },
      { range: '20+ min', count: 20, percentage: 5 }
    ];
    setResponseTimeData(data);
  };

  const loadCategoryBreakdown = async () => {
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
  };

  const loadHourlyDistribution = async () => {
    const data: HourlyDistribution[] = [];
    for (let hour = 0; hour < 24; hour++) {
      data.push({
        hour,
        incidents: Math.floor(Math.random() * 40) + 5,
        avgResponseTime: Math.floor(Math.random() * 15) + 5
      });
    }
    setHourlyDistribution(data);
  };

  const loadLocationHotspots = async () => {
    const data: LocationHotspot[] = [
      { location: 'N1 Western Bypass', incidents: 89, avgSeverity: 2.4 },
      { location: 'M1 Sandton', incidents: 76, avgSeverity: 2.1 },
      { location: 'R21 OR Tambo', incidents: 65, avgSeverity: 1.8 },
      { location: 'N3 Johannesburg South', incidents: 54, avgSeverity: 2.2 },
      { location: 'N12 East', incidents: 43, avgSeverity: 1.9 }
    ];
    setLocationHotspots(data);
  };

  const loadPerformanceMetrics = async () => {
    const data: PerformanceMetric[] = [
      { metric: 'Detection Speed', value: 92, maxValue: 100 },
      { metric: 'Response Time', value: 85, maxValue: 100 },
      { metric: 'Resolution Rate', value: 78, maxValue: 100 },
      { metric: 'System Uptime', value: 99.5, maxValue: 100 },
      { metric: 'Data Accuracy', value: 94, maxValue: 100 },
      { metric: 'Coverage', value: 87, maxValue: 100 }
    ];
    setPerformanceMetrics(data);
  };

  const loadSummaryStatistics = async () => {
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
  };

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

        