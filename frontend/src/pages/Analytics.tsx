import React, { useState, useEffect, useCallback } from 'react';
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
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ApiService, {
  DatabaseIncident,
  LocationData,
  ArchiveAnalytics,
  ArchiveData,
} from '../services/apiService';
import './Analytics.css';
import io from 'socket.io-client';
import PEMSAnalytics from '../components/PEMSAnalytics';
import LaneClosureAnalytics from '../components/LaneClosureAnalytics';

// Fix Leaflet default icon issue
delete ((L as any).Icon.Default.prototype as any)._getIconUrl;
(L as any).Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const ChartIcon = () => (
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

const AlertTriangleIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
);

const MapPinIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const TagIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
    />
  </svg>
);

const ArchiveIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
    />
  </svg>
);

const ClockIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const _TrendingUpIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    />
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

interface SeverityBreakdown {
  severity: string;
  count: number;
  percentage: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

interface IncidentLocation {
  latitude: number;
  longitude: number;
  severity: string;
  count: number;
  location?: string;
}

const Analytics: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_socket, _setSocket] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'incidents' | 'pems' | 'closures'>('incidents');

  // Existing traffic data state
  const [categoryBreakdown, setCategoryBreakdown] = useState<
    CategoryBreakdown[]
  >([]);
  const [locationHotspots, setLocationHotspots] = useState<LocationHotspot[]>(
    [],
  );

  // New chart data state
  const [severityBreakdown, setSeverityBreakdown] = useState<SeverityBreakdown[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [incidentLocations, setIncidentLocations] = useState<IncidentLocation[]>([]);

  // Archive analytics state
  const [archiveAnalytics, setArchiveAnalytics] =
    useState<ArchiveAnalytics | null>(null);
  const [recentArchives, setRecentArchives] = useState<ArchiveData[]>([]);

  const [summaryStats, setSummaryStats] = useState({
    totalIncidents: 0,
    criticalIncidents: 0,
    trafficIncidents: 0,
    dbIncidents: 0,
    // Archive stats
    totalArchives: 0,
    archivesThisMonth: 0,
    averageArchiveTime: 0,
    archiveStorageSize: 0,
  });

  const chartColors = {
    primary: isDarkMode ? '#3b82f6' : '#2563eb',
    secondary: isDarkMode ? '#8b5cf6' : '#7c3aed',
    success: isDarkMode ? '#10b981' : '#059669',
    warning: isDarkMode ? '#feac34' : '#F79400',
    danger: isDarkMode ? '#ef4444' : '#dc2626',
    info: isDarkMode ? '#06b6d4' : '#0891b2',
    archive: isDarkMode ? '#feac34' : '#F79400',
  };

  const categoryColors = [
    chartColors.primary,
    chartColors.secondary,
    chartColors.success,
    chartColors.warning,
    chartColors.danger,
    chartColors.info,
    chartColors.archive,
    '#ec4899',
    '#feac34',
    '#84cc16',
    '#06b6d4',
    '#8b5cf6',
    '#feac34',
    '#10b981',
  ];

  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check authentication
      if (!ApiService.isAuthenticated()) {
        setError('Please log in to view analytics data');
        return;
      }
      const [
        dbData,
        locationsData,
        criticalIncidents,
        categoriesData,
        archiveAnalyticsData,
      ] = await Promise.all([
        ApiService.fetchIncidents(),
        ApiService.fetchIncidentLocations(),
        ApiService.fetchCriticalIncidents(),
        ApiService.fetchIncidentCategories(),
        ApiService.fetchArchiveAnalytics(),
      ]);

      // Process database incidents for stats
      const dbTotal = dbData.length;
      const dbCritical = dbData.filter(
        (incident: DatabaseIncident) =>
          incident.Incident_Severity === 'high' ||
          incident.Incident_Severity === 'critical',
      ).length;

      // Process category breakdown for charts
      let processedCategories: CategoryBreakdown[] = [];
      if (categoriesData) {
        const totalTrafficIncidents = categoriesData.percentages.reduce(
          (sum: number, percentage: number) => sum + percentage,
          0,
        );

        processedCategories = categoriesData.categories
          .map((category: string, index: number) => ({
            category,
            count: categoriesData.percentages[index],
            percentage:
              totalTrafficIncidents > 0
                ? Math.round(
                  (categoriesData.percentages[index] /
                      totalTrafficIncidents) *
                      100,
                )
                : 0,
          }))
          .filter((cat: CategoryBreakdown) => cat.count > 0)
          .sort(
            (a: CategoryBreakdown, b: CategoryBreakdown) => b.count - a.count,
          );
      }
      setCategoryBreakdown(processedCategories);

      // Process severity breakdown from database incidents
      const severityGroups = dbData.reduce((acc: { [key: string]: number }, incident: DatabaseIncident) => {
        const severity = incident.Incident_Severity || 'unknown';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      }, {});

      const processedSeverity: SeverityBreakdown[] = Object.entries(severityGroups)
        .map(([severity, count]) => ({
          severity: severity.charAt(0).toUpperCase() + severity.slice(1),
          count: count as number,
          percentage: Math.round(((count as number) / dbTotal) * 100),
        }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

      setSeverityBreakdown(processedSeverity);

      // Process status breakdown from database incidents
      const statusGroups = dbData.reduce((acc: { [key: string]: number }, incident: DatabaseIncident) => {
        const status = incident.Incident_Status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const processedStatus: StatusBreakdown[] = Object.entries(statusGroups)
        .map(([status, count]) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          count: count as number,
          percentage: Math.round(((count as number) / dbTotal) * 100),
        }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

      setStatusBreakdown(processedStatus);

      // Process incident locations using real coordinates from database
      const locationGroups = dbData.reduce((acc: { [key: string]: { lat: number, lng: number, severities: { [key: string]: number } } }, incident: DatabaseIncident) => {
        // Ensure coordinates are valid numbers
        const lat = Number(incident.Incidents_Latitude);
        const lng = Number(incident.Incidents_Longitude);

        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          const key = `${lat},${lng}`;
          const severity = incident.Incident_Severity || 'unknown';

          if (!acc[key]) {
            acc[key] = {
              lat: lat,
              lng: lng,
              severities: {},
            };
          }
          acc[key].severities[severity] = (acc[key].severities[severity] || 0) + 1;
        }
        return acc;
      }, {});

      const processedIncidentLocations: IncidentLocation[] = Object.entries(locationGroups)
        .map(([_key, data]) => {
          const totalCount = Object.values(data.severities).reduce((sum, count) => sum + count, 0);
          const dominantSeverity = Object.entries(data.severities).reduce((a, b) =>
            data.severities[a[0]] > data.severities[b[0]] ? a : b,
          )[0];

          // Ensure lat and lng are valid numbers
          const lat = Number(data.lat);
          const lng = Number(data.lng);

          return {
            latitude: lat,
            longitude: lng,
            severity: dominantSeverity,
            count: totalCount,
            location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, // Use coordinates as location identifier
          };
        })
        .filter(loc => loc.count > 0 && !isNaN(loc.latitude) && !isNaN(loc.longitude));

      setIncidentLocations(processedIncidentLocations);

      // Process location hotspots
      const processedLocationHotspots: LocationHotspot[] = locationsData
        .map((location: LocationData) => ({
          location: location.location,
          incidents: location.amount,
          avgSeverity: 2.0,
        }))
        .filter((location: LocationHotspot) => location.incidents > 0)
        .sort(
          (a: LocationHotspot, b: LocationHotspot) => b.incidents - a.incidents,
        );

      setLocationHotspots(processedLocationHotspots);

      // Set archive analytics
      if (archiveAnalyticsData) {
        setArchiveAnalytics(archiveAnalyticsData);
        setRecentArchives(archiveAnalyticsData.recentArchives);
      }

      // Calculate traffic totals
      const trafficTotal = locationsData.reduce(
        (sum: number, location: LocationData) => sum + location.amount,
        0,
      );
      const trafficCritical = criticalIncidents?.Amount || 0;

      // Calculate archive stats for this month
      const thisMonth = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
      const archivesThisMonth =
        archiveAnalyticsData?.archivesByMonth.find((m: any) => m.month === thisMonth)
          ?.count || 0;

      // Update summary stats including archives
      const finalStats = {
        totalIncidents: dbTotal + trafficTotal,
        criticalIncidents: dbCritical + trafficCritical,
        trafficIncidents: trafficTotal,
        dbIncidents: dbTotal,
        totalArchives: archiveAnalyticsData?.totalArchives || 0,
        archivesThisMonth,
        averageArchiveTime: archiveAnalyticsData?.averageArchiveTime || 0,
        archiveStorageSize: archiveAnalyticsData?.storageMetrics.totalSize || 0,
      };

      setSummaryStats(finalStats);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load analytics data',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadArchiveAnalytics = useCallback(async () => {
    try {
      const archiveAnalyticsData = await ApiService.fetchArchiveAnalytics();
      if (archiveAnalyticsData) {
        setArchiveAnalytics(archiveAnalyticsData);
        setRecentArchives(archiveAnalyticsData.recentArchives);

        // Update archive-related summary stats
        const thisMonth = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        });
        const archivesThisMonth =
          archiveAnalyticsData.archivesByMonth.find((m: any) => m.month === thisMonth)
            ?.count || 0;

        setSummaryStats(prev => ({
          ...prev,
          totalArchives: archiveAnalyticsData.totalArchives,
          archivesThisMonth,
          averageArchiveTime: archiveAnalyticsData.averageArchiveTime,
          archiveStorageSize: archiveAnalyticsData.storageMetrics.totalSize,
        }));
      }
    } catch (error) {
      console.error('Error loading archive analytics:', error);
    }
  }, []);

  useEffect(() => {
    // Initialise socket connection
    const socketConnection = io(process.env.REACT_APP_API_URL!);
    _setSocket(socketConnection);

    // Socket event listeners for real-time updates
    socketConnection.on('archiveCreated', (_archiveData: ArchiveData) => {
      // Refresh archive analytics with debounce
      setTimeout(() => loadArchiveAnalytics(), 1000);
    });

    socketConnection.on('archiveStatsUpdate', (stats: any) => {
      // Update archive analytics if needed
      setArchiveAnalytics(prev => (prev ? { ...prev, ...stats } : prev));
    });

    socketConnection.on('newAlert', (_incident: any) => {
      // This might lead to new archives being created
      setTimeout(() => loadArchiveAnalytics(), 2000); // Delay to allow archiving process
    });

    loadAnalyticsData();

    return () => {
      socketConnection.disconnect();
    };
  }, [loadAnalyticsData, loadArchiveAnalytics]); // Add function dependencies

  // Helper function to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) {return '0 Bytes';}
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to format archive time
  const _formatArchiveTime = (days: number): string => {
    if (days < 1) {return 'Less than 1 day';}
    if (days === 1) {return '1 day';}
    return `${Math.round(days)} days`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`analytics-container ${
          isDarkMode ? 'dark-mode' : 'light-mode'
        }`}
      >
        <div className="analytics-loading">
          <div className="loading-spinner" />
          <p>Loading analytics data...</p>
          <p
            style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.5rem' }}
          >
            Fetching data from database, traffic APIs, and archive systems...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`analytics-container ${
          isDarkMode ? 'dark-mode' : 'light-mode'
        }`}
      >
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
                marginTop: '10px',
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
    <div
      className={`analytics-container ${
        isDarkMode ? 'dark-mode' : 'light-mode'
      }`}
    >
      <div className="analytics-content">
        <div className="analytics-header">
          <div className="analytics-title">
            <h1>Traffic Analytics Dashboard</h1>
            <p>
              Real-time traffic incident insights, PEMS data analytics, lane closure impact analysis,
              and archive management
            </p>
            <div className="analytics-tabs">
              <button
                className={activeTab === 'incidents' ? 'active' : ''}
                onClick={() => setActiveTab('incidents')}
              >
                Incident Analytics
              </button>
              <button
                className={activeTab === 'pems' ? 'active' : ''}
                onClick={() => setActiveTab('pems')}
              >
                PEMS Analytics
              </button>
              <button
                className={activeTab === 'closures' ? 'active' : ''}
                onClick={() => setActiveTab('closures')}
              >
                Lane Closures
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'incidents' && (
          <>
            {/* Enhanced Summary Cards including Archive Stats */}
            <div className="summary-cards">
              <div className="summary-card">
                <div className="card-icon incidents">
                  <ChartIcon />
                </div>
                <div className="card-content">
                  <h3>Total Incidents</h3>
                  <div className="card-value">
                    {summaryStats.totalIncidents}
                  </div>
                  <div className="card-subtitle">
                    Database: {summaryStats.dbIncidents} | Traffic:{' '}
                    {summaryStats.trafficIncidents}
                  </div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon critical">
                  <AlertTriangleIcon />
                </div>
                <div className="card-content">
                  <h3>Critical Incidents</h3>
                  <div className="card-value">
                    {summaryStats.criticalIncidents}
                  </div>
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

              {/* New Archive-related cards */}
              <div className="summary-card archive-card">
                <div className="card-icon archive">
                  <ArchiveIcon />
                </div>
                <div className="card-content">
                  <h3>Total Archives</h3>
                  <div className="card-value">{summaryStats.totalArchives}</div>
                  <div className="card-subtitle">
                    This month: {summaryStats.archivesThisMonth}
                  </div>
                </div>
              </div>

              <div className="summary-card archive-card">
                <div className="card-icon archive-time">
                  <ClockIcon />
                </div>
                <div className="card-content">
                  <h3>Archive Storage</h3>
                  <div className="card-value">
                    {formatBytes(summaryStats.archiveStorageSize)}
                  </div>
                  <div className="card-subtitle">Total archived data</div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
              {/* Incident Severity */}
              <div className="chart-container half-width">
                <h2>Incident Severity</h2>
                {severityBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={severityBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ severity, count }) => `${severity}: ${count}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {severityBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={categoryColors[index % categoryColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                          border: `1px solid ${
                            isDarkMode ? '#374151' : '#e5e7eb'
                          }`,
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      height: '300px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                    }}
                  >
                    No severity data available
                  </div>
                )}
              </div>

              {/* Incident Status */}
              <div className="chart-container half-width">
                <h2>Incident Status</h2>
                {statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, count }) => `${status}: ${count}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {statusBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={categoryColors[index % categoryColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                          border: `1px solid ${
                            isDarkMode ? '#374151' : '#e5e7eb'
                          }`,
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      height: '300px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                    }}
                  >
                    No status data available
                  </div>
                )}
              </div>


              {/* Incident Location Map */}
              <div className="chart-container full-width">
                <h2>Incident Location Distribution</h2>
                {incidentLocations.length > 0 ? (
                  <div style={{ height: '500px', borderRadius: '8px', overflow: 'hidden' }}>
                    <MapContainer
                      center={[incidentLocations[0].latitude, incidentLocations[0].longitude]}
                      zoom={10}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {incidentLocations.map((location, index) => {
                        const severityColor =
                          location.severity === 'high' ? '#ef4444' :
                          location.severity === 'medium' ? '#feac34' :
                          '#10b981';

                        const icon = new (L as any).Icon({
                          iconUrl: `data:image/svg+xml;base64,${btoa(`
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
                              <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8z" fill="${severityColor}" stroke="#fff" stroke-width="1.5"/>
                              <circle cx="12" cy="8" r="3" fill="#fff"/>
                            </svg>
                          `)}`,
                          iconSize: [32, 32],
                          iconAnchor: [16, 32],
                          popupAnchor: [0, -32],
                        });

                        return (
                          <Marker
                            key={index}
                            position={[location.latitude, location.longitude]}
                            icon={icon}
                          >
                            <Popup>
                              <div style={{ padding: '8px' }}>
                                <strong>Incident Location</strong><br/>
                                <strong>Coordinates:</strong> {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}<br/>
                                <strong>Incidents:</strong> {location.count}<br/>
                                <strong>Severity:</strong> <span style={{
                                  color: severityColor,
                                  fontWeight: 'bold',
                                  textTransform: 'capitalize'
                                }}>{location.severity}</span>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  </div>
                ) : (
                  <div
                    style={{
                      height: '400px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                    }}
                  >
                    No location coordinate data available
                  </div>
                )}
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap',
                  justifyContent: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                    <span style={{ fontSize: '14px' }}>High Severity</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#feac34' }}></div>
                    <span style={{ fontSize: '14px' }}>Medium Severity</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                    <span style={{ fontSize: '14px' }}>Low Severity</span>
                  </div>
                </div>
              </div>

              {/* Archive Analytics Section */}
              {archiveAnalytics && (
                <>
                  {/* Archive Trends Over Time */}
                  <div className="chart-container full-width">
                    <h2>Archive Volume Trends</h2>
                    {archiveAnalytics.archivesByMonth.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={archiveAnalytics.archivesByMonth}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                          />
                          <XAxis
                            dataKey="month"
                            stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDarkMode
                                ? '#1f2937'
                                : '#ffffff',
                              border: `1px solid ${
                                isDarkMode ? '#374151' : '#e5e7eb'
                              }`,
                              borderRadius: '8px',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke={chartColors.archive}
                            fill={chartColors.archive}
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div
                        style={{
                          height: '300px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isDarkMode ? '#9ca3af' : '#6b7280',
                        }}
                      >
                        No archive trend data available
                      </div>
                    )}
                  </div>

                  {/* Archive Status & Severity Distribution */}
                  <div className="chart-container half-width">
                    <h2>Archive Status Distribution</h2>
                    {Object.keys(archiveAnalytics.archivesByStatus).length >
                    0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={Object.entries(
                                archiveAnalytics.archivesByStatus,
                              ).map(([status, count]) => ({
                                status,
                                count,
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ status, count }) => `${status}: ${count}`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {Object.entries(
                                archiveAnalytics.archivesByStatus,
                              ).map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    categoryColors[index % categoryColors.length]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: isDarkMode
                                  ? '#1f2937'
                                  : '#ffffff',
                                border: `1px solid ${
                                  isDarkMode ? '#374151' : '#e5e7eb'
                                }`,
                                borderRadius: '8px',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div
                          style={{
                            height: '300px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isDarkMode ? '#9ca3af' : '#6b7280',
                          }}
                        >
                        No archive status data available
                        </div>
                      )}
                  </div>

                  {/* Archive Severity Distribution */}
                  <div className="chart-container half-width">
                    <h2>Archive Severity Distribution</h2>
                    {Object.keys(archiveAnalytics.archivesBySeverity).length >
                    0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={Object.entries(
                              archiveAnalytics.archivesBySeverity,
                            ).map(([severity, count]) => ({
                              severity,
                              count,
                            }))}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                            />
                            <XAxis
                              dataKey="severity"
                              stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: isDarkMode
                                  ? '#1f2937'
                                  : '#ffffff',
                                border: `1px solid ${
                                  isDarkMode ? '#374151' : '#e5e7eb'
                                }`,
                                borderRadius: '8px',
                              }}
                            />
                            <Bar
                              dataKey="count"
                              fill={chartColors.warning}
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div
                          style={{
                            height: '300px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isDarkMode ? '#9ca3af' : '#6b7280',
                          }}
                        >
                        No archive severity data available
                        </div>
                      )}
                  </div>
                </>
              )}
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
                        <span className="location-name">
                          {location.location}
                        </span>
                      </div>
                      <div className="location-stats">
                        <span className="incident-count">
                          {location.incidents} incidents
                        </span>
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
                <div
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                  }}
                >
                  No location data available
                </div>
              )}
            </div>

            {/* Recent Archives List */}
            {recentArchives.length > 0 && (
              <div className="chart-container full-width">
                <h2>Recent Archives</h2>
                <div className="archive-list">
                  {recentArchives.map((archive, _index) => (
                    <div key={archive.Archive_ID} className="archive-item">
                      <div className="archive-info">
                        <span className="archive-id">
                          #{archive.Archive_ID}
                        </span>
                        <span className="archive-type">
                          {archive.Archive_Type}
                        </span>
                        <span className="archive-date">
                          {new Date(
                            archive.Archive_DateTime,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="archive-stats">
                        <span
                          className={`severity-indicator severity-${archive.Archive_Severity}`}
                        >
                          {archive.Archive_Severity}
                        </span>
                        <span
                          className={`status-indicator status-${archive.Archive_Status}`}
                        >
                          {archive.Archive_Status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Archive Locations Analysis */}
            {archiveAnalytics &&
              archiveAnalytics.archivesByLocation.length > 0 && (
              <div className="chart-container full-width">
                <h2>Top Archive Locations</h2>
                <div className="location-list">
                  {archiveAnalytics.archivesByLocation.map(
                    (location, index) => (
                      <div key={index} className="location-item">
                        <div className="location-info">
                          <span className="location-rank">#{index + 1}</span>
                          <span className="location-name">
                            {location.location}
                          </span>
                        </div>
                        <div className="location-stats">
                          <span className="incident-count">
                            {location.count} archives
                          </span>
                          <span className="archive-indicator">
                            <ArchiveIcon />
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* PEMS Analytics Tab */}
        {activeTab === 'pems' && (
          <div className="pems-analytics-section">
            <PEMSAnalytics />
          </div>
        )}

        {/* Lane Closures Analytics Tab */}
        {activeTab === 'closures' && (
          <div className="lane-closures-analytics-section">
            <LaneClosureAnalytics />
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
