import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useTheme } from '../consts/ThemeContext';
import laneClosureService, { LaneClosure } from '../services/laneClosureService';
import LaneClosureHeatmap from './LaneClosureHeatmap';
import './LaneClosureAnalytics.css';

interface AnalyticsProps {
  className?: string;
}

interface RouteImpactData {
  route: string;
  totalClosures: number;
  avgDuration: number;
  avgImpact: number;
  totalLanesAffected: number;
}

interface TimePatternData {
  hour: number;
  weekday: number;
  weekend: number;
  total: number;
}

interface SeverityTrendData {
  date: string;
  low: number;
  medium: number;
  high: number;
  total: number;
}

interface DurationAnalysisData {
  range: string;
  count: number;
  avgImpact: number;
}

const LaneClosureAnalytics: React.FC<AnalyticsProps> = ({ className = '' }) => {
  const { isDarkMode } = useTheme();
  const [laneClosures, setLaneClosures] = useState<LaneClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'patterns' | 'impact' | 'routes'>('overview');

  const colors = {
    primary: isDarkMode ? '#3b82f6' : '#2563eb',
    secondary: isDarkMode ? '#8b5cf6' : '#7c3aed',
    success: isDarkMode ? '#10b981' : '#059669',
    warning: isDarkMode ? '#f59e0b' : '#d97706',
    danger: isDarkMode ? '#ef4444' : '#dc2626',
    info: isDarkMode ? '#06b6d4' : '#0891b2',
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const closures = await laneClosureService.fetchLaneClosures();
        setLaneClosures(closures);
      } catch (error) {
        console.error('Error fetching lane closures:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const unsubscribe = laneClosureService.subscribe(setLaneClosures);
    return unsubscribe;
  }, []);

  // Generate comprehensive historical data for analytics
  const historicalData = useMemo(() => {
    const historical: LaneClosure[] = [];
    const now = new Date();
    const routes = ['I-405', 'SR-1', 'SR-73', 'I-5', 'SR-55', 'SR-91', 'SR-22', 'SR-133', 'SR-74'];
    const severities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];

    // Generate 3 months of data
    for (let d = 0; d < 90; d++) {
      const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // More closures on weekends and during construction season
      const seasonMultiplier = [2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3][date.getMonth()]; // Peak summer
      const baseClosures = (isWeekend ? 12 : 8) * (seasonMultiplier / 5);
      const dailyClosures = Math.floor(baseClosures + Math.random() * 5);

      for (let i = 0; i < dailyClosures; i++) {
        // Realistic hour distribution
        let hour: number;
        const rand = Math.random();
        if (rand < 0.4) {
          // 40% night work (9PM - 6AM)
          hour = Math.random() < 0.7 ?
            Math.floor(21 + Math.random() * 3) : // 9-11 PM
            Math.floor(Math.random() * 6); // 12-5 AM
        } else if (rand < 0.7) {
          // 30% day work (6AM - 6PM)
          hour = Math.floor(6 + Math.random() * 12);
        } else {
          // 30% evening work (6PM - 9PM)
          hour = Math.floor(18 + Math.random() * 3);
        }

        const startDate = new Date(date);
        startDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

        // Duration varies by severity and work type
        const severity = severities[Math.floor(Math.random() * severities.length)];
        const baseDuration = severity === 'high' ? 8 : severity === 'medium' ? 4 : 2;
        const duration = baseDuration + Math.random() * baseDuration;
        const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

        const route = routes[Math.floor(Math.random() * routes.length)];
        const isFreeway = route.startsWith('I-');

        const lanesExisting = isFreeway ?
          4 + Math.floor(Math.random() * 4) : // 4-7 lanes for freeways
          2 + Math.floor(Math.random() * 3);   // 2-4 lanes for highways

        const maxClosed = severity === 'high' ?
          Math.ceil(lanesExisting * 0.8) :
          severity === 'medium' ?
          Math.ceil(lanesExisting * 0.5) :
          Math.ceil(lanesExisting * 0.3);

        const lanesClosed = Math.max(1, Math.floor(Math.random() * maxClosed) + 1);

        const workTypes = ['Construction', 'Maintenance', 'Emergency Repair', 'Inspection', 'Utility Work'];

        historical.push({
          id: `hist-${d}-${i}`,
          recordTimestamp: startDate.toISOString(),
          beginLocation: {
            latitude: 33.5 + Math.random() * 0.3,
            longitude: -117.7 + Math.random() * 0.3,
            elevation: Math.random() * 500,
            direction: ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
          },
          endLocation: {
            latitude: 33.5 + Math.random() * 0.3,
            longitude: -117.7 + Math.random() * 0.3,
            elevation: Math.random() * 500,
            direction: ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
          },
          route,
          district: '12',
          nearbyLandmark: `Generated landmark ${Math.floor(Math.random() * 100)}`,
          details: {
            closureId: `HIST-${d}-${i}`,
            logNumber: `H${d}${String(i).padStart(3, '0')}`,
            index: `${i}`,
            startDateTime: startDate.toISOString(),
            endDateTime: endDate.toISOString(),
            lanesExisting,
            lanesClosed,
            closureType: lanesClosed >= lanesExisting ? 'Full Closure' : 'Lane',
            facilityType: isFreeway ? 'Freeway' : 'Highway',
            workType: workTypes[Math.floor(Math.random() * workTypes.length)],
            chinReportable: Math.random() > 0.6 ? 'Yes' : 'No',
            flowDirection: ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
          },
          status: date < now ? 'completed' : date.getTime() - now.getTime() < 24 * 60 * 60 * 1000 ? 'active' : 'upcoming',
          severity,
        });
      }
    }

    return [...laneClosures, ...historical];
  }, [laneClosures]);

  // Route impact analysis
  const routeImpactData = useMemo((): RouteImpactData[] => {
    const routeMap = new Map<string, {
      closures: LaneClosure[];
      totalDuration: number;
      totalImpact: number;
      totalLanes: number;
    }>();

    historicalData.forEach(closure => {
      const route = closure.route;
      if (!routeMap.has(route)) {
        routeMap.set(route, { closures: [], totalDuration: 0, totalImpact: 0, totalLanes: 0 });
      }

      const routeData = routeMap.get(route)!;
      routeData.closures.push(closure);

      const startTime = new Date(closure.details.startDateTime).getTime();
      const endTime = new Date(closure.details.endDateTime).getTime();
      const duration = (endTime - startTime) / (1000 * 60 * 60); // hours

      const severityMultiplier = closure.severity === 'high' ? 3 : closure.severity === 'medium' ? 2 : 1;
      const laneImpact = closure.details.lanesClosed / Math.max(closure.details.lanesExisting, 1);
      const impact = severityMultiplier * laneImpact * duration;

      routeData.totalDuration += duration;
      routeData.totalImpact += impact;
      routeData.totalLanes += closure.details.lanesClosed;
    });

    return Array.from(routeMap.entries())
      .map(([route, data]) => ({
        route,
        totalClosures: data.closures.length,
        avgDuration: data.totalDuration / data.closures.length,
        avgImpact: data.totalImpact / data.closures.length,
        totalLanesAffected: data.totalLanes,
      }))
      .sort((a, b) => b.totalClosures - a.totalClosures);
  }, [historicalData]);

  // Time pattern analysis
  const timePatternData = useMemo((): TimePatternData[] => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      weekday: 0,
      weekend: 0,
      total: 0,
    }));

    historicalData.forEach(closure => {
      const startDate = new Date(closure.details.startDateTime);
      const hour = startDate.getHours();
      const isWeekend = startDate.getDay() === 0 || startDate.getDay() === 6;

      hourlyData[hour].total++;
      if (isWeekend) {
        hourlyData[hour].weekend++;
      } else {
        hourlyData[hour].weekday++;
      }
    });

    return hourlyData;
  }, [historicalData]);

  // Severity trend analysis
  const severityTrendData = useMemo((): SeverityTrendData[] => {
    const trendMap = new Map<string, { low: number; medium: number; high: number; total: number }>();

    historicalData.forEach(closure => {
      const date = new Date(closure.details.startDateTime).toISOString().split('T')[0];
      if (!trendMap.has(date)) {
        trendMap.set(date, { low: 0, medium: 0, high: 0, total: 0 });
      }

      const dayData = trendMap.get(date)!;
      dayData[closure.severity]++;
      dayData.total++;
    });

    return Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days
  }, [historicalData]);

  // Duration analysis
  const durationAnalysisData = useMemo((): DurationAnalysisData[] => {
    const ranges = [
      { min: 0, max: 2, label: '0-2h' },
      { min: 2, max: 4, label: '2-4h' },
      { min: 4, max: 8, label: '4-8h' },
      { min: 8, max: 12, label: '8-12h' },
      { min: 12, max: 24, label: '12-24h' },
      { min: 24, max: Infinity, label: '24h+' },
    ];

    return ranges.map(range => {
      const closuresInRange = historicalData.filter(closure => {
        const duration = (new Date(closure.details.endDateTime).getTime() -
                         new Date(closure.details.startDateTime).getTime()) / (1000 * 60 * 60);
        return duration >= range.min && duration < range.max;
      });

      const avgImpact = closuresInRange.length > 0 ?
        closuresInRange.reduce((sum, closure) => {
          const severityMultiplier = closure.severity === 'high' ? 3 : closure.severity === 'medium' ? 2 : 1;
          const laneImpact = closure.details.lanesClosed / Math.max(closure.details.lanesExisting, 1);
          return sum + severityMultiplier * laneImpact;
        }, 0) / closuresInRange.length : 0;

      return {
        range: range.label,
        count: closuresInRange.length,
        avgImpact: avgImpact * 100, // Convert to percentage
      };
    });
  }, [historicalData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const active = historicalData.filter(c => c.status === 'active').length;
    const upcoming = historicalData.filter(c => c.status === 'upcoming').length;
    const highSeverity = historicalData.filter(c => c.severity === 'high').length;

    const totalLaneHours = historicalData.reduce((sum, closure) => {
      const duration = (new Date(closure.details.endDateTime).getTime() -
                       new Date(closure.details.startDateTime).getTime()) / (1000 * 60 * 60);
      return sum + (closure.details.lanesClosed * duration);
    }, 0);

    const avgDuration = historicalData.length > 0 ?
      historicalData.reduce((sum, closure) => {
        const duration = (new Date(closure.details.endDateTime).getTime() -
                         new Date(closure.details.startDateTime).getTime()) / (1000 * 60 * 60);
        return sum + duration;
      }, 0) / historicalData.length : 0;

    return {
      totalClosures: historicalData.length,
      activeClosures: active,
      upcomingClosures: upcoming,
      highSeverityClosures: highSeverity,
      totalLaneHours: Math.round(totalLaneHours),
      avgDuration: avgDuration,
      uniqueRoutes: new Set(historicalData.map(c => c.route)).size,
    };
  }, [historicalData]);

  if (loading) {
    return (
      <div className={`lane-closure-analytics ${className} loading`}>
        <div className="loading-spinner"></div>
        <p>Loading lane closure analytics...</p>
      </div>
    );
  }

  return (
    <div className={`lane-closure-analytics ${className} ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="analytics-header">
        <h2>Lane Closure Analytics Dashboard</h2>
        <p>Comprehensive analysis of lane closure patterns, impact, and trends across District 12</p>

        <div className="analytics-tabs">
          <button
            className={selectedView === 'overview' ? 'active' : ''}
            onClick={() => setSelectedView('overview')}
          >
            Overview
          </button>
          <button
            className={selectedView === 'patterns' ? 'active' : ''}
            onClick={() => setSelectedView('patterns')}
          >
            Time Patterns
          </button>
          <button
            className={selectedView === 'impact' ? 'active' : ''}
            onClick={() => setSelectedView('impact')}
          >
            Impact Analysis
          </button>
          <button
            className={selectedView === 'routes' ? 'active' : ''}
            onClick={() => setSelectedView('routes')}
          >
            Route Analysis
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon primary">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="card-content">
            <h3>Total Closures</h3>
            <div className="card-value">{summaryStats.totalClosures}</div>
            <div className="card-subtitle">Last 90 days</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon warning">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="card-content">
            <h3>Active Closures</h3>
            <div className="card-value">{summaryStats.activeClosures}</div>
            <div className="card-subtitle">Currently ongoing</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon danger">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="card-content">
            <h3>High Impact</h3>
            <div className="card-value">{summaryStats.highSeverityClosures}</div>
            <div className="card-subtitle">High severity closures</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon info">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="card-content">
            <h3>Lane Hours</h3>
            <div className="card-value">{summaryStats.totalLaneHours.toLocaleString()}</div>
            <div className="card-subtitle">Total lanes × hours affected</div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      {selectedView === 'overview' && (
        <div className="overview-section">
          <LaneClosureHeatmap showControls={true} />

          <div className="charts-grid">
            <div className="chart-container">
              <h3>Closure Duration Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={durationAnalysisData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="range" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill={colors.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3>Severity Trends (Last 30 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={severityTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis
                    dataKey="date"
                    stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                    }}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Area type="monotone" dataKey="high" stackId="1" stroke={colors.danger} fill={colors.danger} />
                  <Area type="monotone" dataKey="medium" stackId="1" stroke={colors.warning} fill={colors.warning} />
                  <Area type="monotone" dataKey="low" stackId="1" stroke={colors.success} fill={colors.success} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {selectedView === 'patterns' && (
        <div className="patterns-section">
          <LaneClosureHeatmap showControls={false} />

          <div className="charts-grid">
            <div className="chart-container full-width">
              <h3>Hourly Closure Patterns: Weekday vs Weekend</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timePatternData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis
                    dataKey="hour"
                    stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    tickFormatter={(hour) => hour === 0 ? '12AM' : hour === 12 ? '12PM' : hour < 12 ? `${hour}AM` : `${hour-12}PM`}
                  />
                  <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                    }}
                    labelFormatter={(hour) => `${hour}:00`}
                  />
                  <Line type="monotone" dataKey="weekday" stroke={colors.primary} strokeWidth={3} name="Weekday" />
                  <Line type="monotone" dataKey="weekend" stroke={colors.secondary} strokeWidth={3} name="Weekend" />
                  <Line type="monotone" dataKey="total" stroke={colors.info} strokeWidth={2} strokeDasharray="5 5" name="Total" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {selectedView === 'impact' && (
        <div className="impact-section">
          <div className="charts-grid">
            <div className="chart-container">
              <h3>Impact vs Duration Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={durationAnalysisData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="range" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                    }}
                    formatter={(value, name) => [
                      name === 'avgImpact' ? `${typeof value === 'number' ? value.toFixed(1) : value}%` : value,
                      name === 'avgImpact' ? 'Avg Impact' : 'Count'
                    ]}
                  />
                  <Bar dataKey="avgImpact" fill={colors.warning} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3>Severity Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Low', value: historicalData.filter(c => c.severity === 'low').length, color: colors.success },
                      { name: 'Medium', value: historicalData.filter(c => c.severity === 'medium').length, color: colors.warning },
                      { name: 'High', value: historicalData.filter(c => c.severity === 'high').length, color: colors.danger },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[colors.success, colors.warning, colors.danger].map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {selectedView === 'routes' && (
        <div className="routes-section">
          <div className="charts-grid">
            <div className="chart-container full-width">
              <h3>Route Impact Analysis</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={routeImpactData.slice(0, 8)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis type="number" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <YAxis dataKey="route" type="category" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} width={60} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="totalClosures" fill={colors.primary} name="Total Closures" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3>Average Duration by Route</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={routeImpactData.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="route" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`${typeof value === 'number' ? value.toFixed(1) : value} hours`, 'Avg Duration']}
                  />
                  <Bar dataKey="avgDuration" fill={colors.secondary} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3>Lanes Affected by Route</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={routeImpactData.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="route" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="totalLanesAffected" fill={colors.warning} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaneClosureAnalytics;