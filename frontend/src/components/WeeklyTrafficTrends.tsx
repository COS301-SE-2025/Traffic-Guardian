import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { useUser, Permission } from '../contexts/UserContext';
import ApiService from '../services/apiService';
import LoadingSpinner from './LoadingSpinner';
import './WeeklyTrafficTrends.css';

interface WeeklyTrendData {
  day: string;
  dayOfWeek: number;
  averageVolume: number;
  peakVolume: number;
  peakHour: number;
  avgSpeed: number;
  incidents: number;
  publicData?: boolean;
}

interface WeeklyTrafficTrendsProps {
  className?: string;
  district?: number;
  showDetailed?: boolean;
}

const WeeklyTrafficTrends: React.FC<WeeklyTrafficTrendsProps> = ({
  className = '',
  district,
  showDetailed = true,
}) => {
  const { hasPermission, isAuthenticated, userRole, canAccessDistrict } = useUser();
  const [weeklyData, setWeeklyData] = useState<WeeklyTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'volume' | 'speed' | 'incidents'>('volume');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');

  const canViewDetailedData = hasPermission(Permission.VIEW_DETAILED_ANALYTICS);
  const canViewPEMSData = hasPermission(Permission.VIEW_PEMS_DATA);
  const showDistrictData = district && (canAccessDistrict(district) || userRole === 'admin' || userRole === 'super_admin');

  const generateDemoData = (isPublic: boolean): WeeklyTrendData[] => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.map((day, index) => ({
      day,
      dayOfWeek: index + 1,
      averageVolume: isPublic ?
        Math.floor(2000 + Math.random() * 1000) :
        Math.floor(3000 + Math.random() * 2000),
      peakVolume: isPublic ?
        Math.floor(3000 + Math.random() * 1500) :
        Math.floor(4500 + Math.random() * 2500),
      peakHour: 8 + Math.floor(Math.random() * 2),
      avgSpeed: isPublic ?
        Math.floor(55 + Math.random() * 10) :
        Math.floor(50 + Math.random() * 20),
      incidents: isPublic ?
        Math.floor(Math.random() * 3) :
        Math.floor(Math.random() * 8),
      publicData: isPublic,
    }));
  };

  const fetchWeeklyTrends = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isAuthenticated && canViewPEMSData) {
        // Authenticated users get real data from API
        let data;
        if (showDistrictData) {
          data = await ApiService.fetchDistrictVolumeByDay(district!);
        } else {
          data = await ApiService.fetchWeeklyTrafficTrends(true, district);
        }

        if (data && data.weeklyTrends) {
          const formattedData = data.weeklyTrends.map((item: any, index: number) => ({
            day: item.day || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index],
            dayOfWeek: item.dayOfWeek || index + 1,
            averageVolume: item.averageVolume || item.volume || 0,
            peakVolume: item.peakVolume || item.volume * 1.3 || 0,
            peakHour: item.peakHour || 8,
            avgSpeed: item.avgSpeed || 65,
            incidents: item.incidents || 0,
            publicData: false,
          }));
          setWeeklyData(formattedData);
        } else {
          // Fallback demo data for authenticated users
          setWeeklyData(generateDemoData(false));
        }
      } else {
        // Public users get demo data directly (no API call)
        setWeeklyData(generateDemoData(true));
      }
    } catch (err) {
      console.error('Error fetching weekly trends:', err);
      setError('Failed to load weekly traffic trends');
      // Show demo data on error
      setWeeklyData(generateDemoData(!isAuthenticated));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, canViewPEMSData, showDistrictData, district]);

  useEffect(() => {
    fetchWeeklyTrends();
  }, [fetchWeeklyTrends]);

  const formatTooltip = (value: any, name: string) => {
    switch (name) {
      case 'averageVolume':
        return [`${value.toLocaleString()} vehicles`, 'Average Volume'];
      case 'peakVolume':
        return [`${value.toLocaleString()} vehicles`, 'Peak Volume'];
      case 'avgSpeed':
        return [`${value} mph`, 'Average Speed'];
      case 'incidents':
        return [`${value} incidents`, 'Incidents'];
      default:
        return [value, name];
    }
  };

  const getMetricData = () => {
    switch (selectedMetric) {
      case 'speed':
        return { dataKey: 'avgSpeed', color: '#feac34', label: 'Average Speed (mph)' };
      case 'incidents':
        return { dataKey: 'incidents', color: '#f44336', label: 'Incidents' };
      default:
        return { dataKey: 'averageVolume', color: '#F79400', label: 'Average Volume' };
    }
  };

  const renderChart = () => {
    const metric = getMetricData();

    switch (chartType) {
      case 'line':
        return (
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={formatTooltip} />
            <Legend />
            <Line
              type="monotone"
              dataKey={metric.dataKey}
              stroke={metric.color}
              strokeWidth={3}
              dot={{ fill: metric.color, strokeWidth: 2, r: 4 }}
              name={metric.label}
            />
            {canViewDetailedData && (
              <Line
                type="monotone"
                dataKey="peakVolume"
                stroke="#0056b3"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Peak Volume"
              />
            )}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={formatTooltip} />
            <Legend />
            <Area
              type="monotone"
              dataKey={metric.dataKey}
              stackId="1"
              stroke={metric.color}
              fill={metric.color}
              fillOpacity={0.6}
              name={metric.label}
            />
          </AreaChart>
        );
      default:
        return (
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={formatTooltip} />
            <Legend />
            <Bar
              dataKey={metric.dataKey}
              fill={metric.color}
              name={metric.label}
            />
            {canViewDetailedData && selectedMetric === 'volume' && (
              <Bar
                dataKey="peakVolume"
                fill="#0056b3"
                fillOpacity={0.7}
                name="Peak Volume"
              />
            )}
          </BarChart>
        );
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={`weekly-traffic-trends ${className}`}>
      <div className="trends-header">
        <div className="trends-title">
          <h3>
            Weekly Traffic Trends {district && `- District ${district}`}
            {!isAuthenticated && <span className="public-badge">Public Data</span>}
          </h3>
          <p className="trends-subtitle">
            {canViewDetailedData
              ? 'Comprehensive traffic volume analysis by day of week'
              : 'Basic traffic volume trends (Monday - Sunday)'
            }
          </p>
        </div>

        <div className="trends-controls">
          <div className="metric-selector">
            <label>Metric:</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
            >
              <option value="volume">Volume</option>
              {canViewDetailedData && (
                <>
                  <option value="speed">Speed</option>
                  <option value="incidents">Incidents</option>
                </>
              )}
            </select>
          </div>

          <div className="chart-type-selector">
            <label>Chart:</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
            >
              <option value="bar">Bar</option>
              <option value="line">Line</option>
              <option value="area">Area</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="trends-error">
          <p>{error}</p>
          <button onClick={fetchWeeklyTrends} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      <div className="trends-chart">
        <ResponsiveContainer width="100%" height={400}>
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {canViewDetailedData && showDetailed && (
        <div className="trends-insights">
          <h4>Weekly Insights</h4>
          <div className="insights-grid">
            {weeklyData.map((data, index) => (
              <div key={index} className="day-insight">
                <h5>{data.day}</h5>
                <div className="insight-metrics">
                  <div className="metric">
                    <span className="metric-label">Avg Volume:</span>
                    <span className="metric-value">{data.averageVolume.toLocaleString()}</span>
                  </div>
                  {canViewDetailedData && (
                    <>
                      <div className="metric">
                        <span className="metric-label">Peak Hour:</span>
                        <span className="metric-value">{data.peakHour}:00</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Avg Speed:</span>
                        <span className="metric-value">{data.avgSpeed} mph</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAuthenticated && (
        <div className="upgrade-notice">
          <p>
            <i className="fas fa-chart-bar" /> <strong>Want more detailed insights?</strong>
            <a href="/account">Sign in</a> to access advanced analytics,
            historical trends, and district-specific data.
          </p>
        </div>
      )}
    </div>
  );
};

export default WeeklyTrafficTrends;