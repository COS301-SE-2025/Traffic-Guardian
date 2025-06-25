import React, { useState, useEffect } from 'react';
import { useTheme } from '../consts/ThemeContext';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import ApiService, { DatabaseIncident, LocationData, CriticalIncidentsData, CategoryData } from '../services/apiService';
import './Analytics.css';

const ChartIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const MapPinIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TagIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

interface LocationHotspot {
  location: string;
  incidents: number;
  avgSeverity: number;
}

const Analytics: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for real data
  const [dbIncidents, setDbIncidents] = useState<DatabaseIncident[]>([]);
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [criticalData, setCriticalData] = useState<CriticalIncidentsData | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryData | null>(null);
  
  // Processed data for charts
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [locationHotspots, setLocationHotspots] = useState<LocationHotspot[]>([]);

  const [summaryStats, setSummaryStats] = useState({
    totalIncidents: 0,
    criticalIncidents: 0,
    trafficIncidents: 0,
    dbIncidents: 0,
  });

  const chartColors = {
    primary: isDarkMode ? '#3b82f6' : '#2563eb',
    secondary: isDarkMode ? '#8b5cf6' : '#7c3aed',
    success: isDarkMode ? '#10b981' : '#059669',
    warning: isDarkMode ? '#f59e0b' : '#d97706',
    danger: isDarkMode ? '#ef4444' : '#dc2626',
    info: isDarkMode ? '#06b6d4' : '#0891b2',
  };

  const categoryColors = [
    chartColors.primary,
    chartColors.secondary,
    chartColors.success,
    chartColors.warning,
    chartColors.danger,
    chartColors.info,
    '#ec4899',
    '#f97316',
    '#84cc16',
    '#06b6d4',
    '#8b5cf6',
    '#f59e0b',
    '#10b981',
  ];

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Starting analytics data load...');
      
      // Check authentication
      if (!ApiService.isAuthenticated()) {
        setError('Please log in to view analytics data');
        console.error('User not authenticated');
        return;
      }

      // Fetch data from all sources
      console.log('Fetching data from database and traffic APIs...');
      const [
        dbData,
        locationsData,
        criticalIncidents,
        categoriesData
      ] = await Promise.all([
        ApiService.fetchIncidents(),
        ApiService.fetchIncidentLocations(),
        ApiService.fetchCriticalIncidents(),
        ApiService.fetchIncidentCategories()
      ]);

      console.log('Data fetched successfully:', {
        dbIncidents: dbData.length,
        locations: locationsData.length,
        critical: criticalIncidents?.Amount,
        categories: categoriesData?.categories.length
      });

      // Process database incidents
      setDbIncidents(dbData);
      const dbTotal = dbData.length;
      const dbCritical = dbData.filter(incident => 
        incident.Incident_Severity === 'high' || incident.Incident_Severity === 'critical'
      ).length;

      console.log('Database stats:', { total: dbTotal, critical: dbCritical });

      // Store raw API data
      setLocationData(locationsData);
      setCriticalData(criticalIncidents);
      setCategoryData(categoriesData);

      // Process category breakdown for charts
      let processedCategories: CategoryBreakdown[] = [];
      if (categoriesData) {
        const totalTrafficIncidents = categoriesData.percentages.reduce((sum, percentage) => sum + percentage, 0);
        
        processedCategories = categoriesData.categories
          .map((category, index) => ({
            category,
            count: categoriesData.percentages[index],
            percentage: totalTrafficIncidents > 0 
              ? Math.round((categoriesData.percentages[index] / totalTrafficIncidents) * 100)
              : 0,
          }))
          .filter(cat => cat.count > 0) // Only show categories with incidents
          .sort((a, b) => b.count - a.count); // Sort by count descending
      }
      setCategoryBreakdown(processedCategories);

      // Process location hotspots
      const processedLocations: LocationHotspot[] = locationsData
        .map(location => ({
          location: location.location,
          incidents: location.amount,
          avgSeverity: 2.0 // Default severity since this data isn't provided by the API
        }))
        .filter(location => location.incidents > 0)
        .sort((a, b) => b.incidents - a.incidents); // Sort by incident count descending

      setLocationHotspots(processedLocations);

      // Calculate traffic totals
      const trafficTotal = locationsData.reduce((sum, location) => sum + location.amount, 0);
      const trafficCritical = criticalIncidents?.Amount || 0;

      // Update summary stats
      const finalStats = {
        totalIncidents: dbTotal + trafficTotal,
        criticalIncidents: dbCritical + trafficCritical,
        trafficIncidents: trafficTotal,
        dbIncidents: dbTotal,
      };

      setSummaryStats(finalStats);
      console.log('Final analytics stats:', finalStats);

    } catch (error) {
      console.error('Error loading analytics data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`analytics-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
        <div className="analytics-loading">
          <div className="loading-spinner"></div>
          <p>Loading analytics data...</p>
          <p style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.5rem' }}>
            Fetching data from database and traffic APIs...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`analytics-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
        <div className="analytics-loading">
          <div style={{ color: chartColors.danger, textAlign: 'center' }}>
            <AlertTriangleIcon />
            <h3>Error Loading Data</h3>
            <p>{error}</p>
            <button 
              onClick={loadAnalyticsData}
              style={{
                padding: '10px 20px',
                backgroundColor: chartColors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`analytics-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="analytics-content">
        <div className="analytics-header">
          <div className="analytics-title">
            <h1>Traffic Analytics Dashboard</h1>
            <p>Real-time traffic incident insights and statistics</p>
          </div>
        </div>

        
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-icon incidents">
              <ChartIcon />
            </div>
            <div className="card-content">
              <h3>Total Incidents</h3>
              <div className="card-value">{summaryStats.totalIncidents}</div>
              <div className="card-subtitle">
                Database: {summaryStats.dbIncidents} | Traffic: {summaryStats.trafficIncidents}
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon critical">
              <AlertTriangleIcon />
            </div>
            <div className="card-content">
              <h3>Critical Incidents</h3>
              <div className="card-value">{summaryStats.criticalIncidents}</div>
              <div className="card-subtitle">High severity incidents</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon response">
              <MapPinIcon />
            </div>
            <div className="card-content">
              <h3>Active Locations</h3>
              <div className="card-value">{locationHotspots.length}</div>
              <div className="card-subtitle">Areas with incidents</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon resolution">
              <TagIcon />
            </div>
            <div className="card-content">
              <h3>Incident Types</h3>
              <div className="card-value">{categoryBreakdown.length}</div>
              <div className="card-subtitle">Different categories</div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Incident Categories */}
          <div className="chart-container half-width">
            <h2>Incident Categories</h2>
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, count }) => `${category}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={categoryColors[index % categoryColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ 
                height: '300px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: isDarkMode ? '#9ca3af' : '#6b7280'
              }}>
                No category data available
              </div>
            )}
          </div>

          {/* Top Incident Locations */}
          <div className="chart-container half-width">
            <h2>Top Incident Locations</h2>
            {locationHotspots.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={locationHotspots.slice(0, 6)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis type="number" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  <YAxis 
                    dataKey="location" 
                    type="category" 
                    stroke={isDarkMode ? '#9ca3af' : '#6b7280'} 
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="incidents" fill={chartColors.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ 
                height: '300px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: isDarkMode ? '#9ca3af' : '#6b7280'
              }}>
                No location data available
              </div>
            )}
          </div>
        </div>

        {/* Location Details List */}
        <div className="chart-container full-width">
          <h2>Location Incident Details</h2>
          {locationHotspots.length > 0 ? (
            <div className="location-list">
              {locationHotspots.map((location, index) => (
                <div key={index} className="location-item">
                  <div className="location-info">
                    <span className="location-rank">#{index + 1}</span>
                    <span className="location-name">{location.location}</span>
                  </div>
                  <div className="location-stats">
                    <span className="incident-count">{location.incidents} incidents</span>
                    <span
                      className={`severity-indicator severity-${
                        location.avgSeverity >= 3
                          ? 'high'
                          : location.avgSeverity >= 2
                          ? 'medium'
                          : 'low'
                      }`}
                    >
                      Avg Severity: {location.avgSeverity.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              padding: '2rem', 
              textAlign: 'center',
              color: isDarkMode ? '#9ca3af' : '#6b7280'
            }}>
              No location data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;