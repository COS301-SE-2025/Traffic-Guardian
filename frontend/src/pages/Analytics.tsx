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

  