import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import ApiService, {
  IncidentStats,
  TrafficIncident,
} from '../services/apiService';
import CarLoadingAnimation from '../components/CarLoadingAnimation';
import './Dashboard.css';

interface CriticalIncidentsData {
  Data: string;
  Amount: number;
}

interface LocationData {
  location: string;
  amount: number;
}

const AlertTriangleIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    data-cy="alert-triangle-icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
);

const _CameraIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    data-cy="camera-icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const ClockIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    data-cy="clock-icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const TrendingUpIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    data-cy="trending-up-icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    />
  </svg>
);

const MapPinIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    data-cy="map-pin-icon"
  >
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

const EyeIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    data-cy="eye-icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const ActivityIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    data-cy="activity-icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const UsersIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    data-cy="users-icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const WeatherIcon = ({
  condition,
  isDay,
}: {
  condition: string;
  isDay: boolean;
}) => {
  if (
    condition.toLowerCase().includes('sunny') ||
    condition.toLowerCase().includes('clear')
  ) {
    return (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        data-cy="weather-sunny-icon"
      >
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    );
  } else if (condition.toLowerCase().includes('cloud')) {
    return (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        data-cy="weather-cloud-icon"
      >
        <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
      </svg>
    );
  } else if (condition.toLowerCase().includes('rain')) {
    return (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        data-cy="weather-rain-icon"
      >
        <path d="M16 13v8m-8-8v8m4-12v8M8 21l1-1 1 1m8 0l1-1 1 1m-8-8l1-1 1 1M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
      </svg>
    );
  } else {
    return (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        data-cy="weather-default-icon"
      >
        <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
      </svg>
    );
  }
};

interface WeatherCondition {
  text: string;
  icon: string;
  code: number;
}

interface CurrentWeather {
  last_updated_epoch: number;
  last_updated: string;
  temp_c: number;
  temp_f: number;
  is_day: number;
  condition: WeatherCondition;
  wind_mph: number;
  wind_kph: number;
  wind_degree: number;
  wind_dir: string;
  pressure_mb: number;
  pressure_in: number;
  precip_mm: number;
  precip_in: number;
  humidity: number;
  cloud: number;
  feelslike_c: number;
  feelslike_f: number;
  windchill_c: number;
  windchill_f: number;
  heatindex_c: number;
  heatindex_f: number;
  dewpoint_c: number;
  dewpoint_f: number;
  vis_km: number;
  vis_miles: number;
  uv: number;
  gust_mph: number;
  gust_kph: number;
}

interface WeatherLocation {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  tz_id: string;
  localtime_epoch: number;
  localtime: string;
}

interface WeatherData {
  location: WeatherLocation;
  current: CurrentWeather;
}

interface UserStats {
  totalOnline: number;
  topRegion: {
    region: string | null;
    userCount: number;
  };
  timeline: Array<{
    timestamp: string;
    action: 'connect' | 'disconnect';
    userID: string;
    totalUsers: number;
  }>;
  regionCounts: Array<{
    region: string;
    userCount: number;
  }>;
}

interface TodaysIncidents {
  count: number;
  date: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'critical';
  timestamp: Date;
}

/** Minimal type for the 'newAlert' socket payload to avoid implicit any */
type NewAlertPayload = { Incident_Location: string; [key: string]: unknown };

const Dashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Real data state
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherLastUpdate, setWeatherLastUpdate] = useState<Date | null>(null);

  const [userStats, setUserStats] = useState<UserStats>({
    totalOnline: 0,
    topRegion: { region: null, userCount: 0 },
    timeline: [],
    regionCounts: [],
  });

  const [incidentStats, setIncidentStats] = useState<IncidentStats | null>(
    null
  );
  const [todaysIncidents, setTodaysIncidents] = useState<TodaysIncidents>({
    count: 0,
    date: '',
  });
  const [trafficData, setTrafficData] = useState<TrafficIncident[]>([]);
  const [criticalIncidents, setCriticalIncidents] =
    useState<CriticalIncidentsData | null>(null);
  const [_incidentLocations, _setIncidentLocations] = useState<any[]>([]);

  const [systemHealth, setSystemHealth] = useState<
    'healthy' | 'warning' | 'error'
  >('healthy');

  const [realtimeEvents, setRealtimeEvents] = useState<string[]>([]);
  const [usersOnline, setUsersOnline] = useState<number>(0);
  const [activeIncidents, setActiveIncidents] = useState<number>(0);
  const [criticalIncidentsCount, setCriticalIncidentsCount] =
    useState<number>(0);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp'>) => {
      const newNotification: Notification = {
        ...notification,
        id: Date.now(),
        timestamp: new Date(),
      };
      setNotifications(prev => [...prev, newNotification]);

      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 5000);
    },
    []
  );

  const addEvent = useCallback((eventText: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const eventWithTime = `[${timestamp}] ${eventText}`;
    setRealtimeEvents(prev => [eventWithTime, ...prev.slice(0, 49)]); // Keep last 50 events
  }, []);

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        const stats = await ApiService.fetchIncidentStats();
        if (stats) {
          setIncidentStats(stats);
        }

        const todaysData = await ApiService.fetchTodaysIncidents();
        if (todaysData) {
          setTodaysIncidents({
            count: todaysData.count,
            date: todaysData.date,
          });
        }

        const traffic = await ApiService.fetchTrafficIncidents();
        setTrafficData(traffic);

        const critical = await ApiService.fetchCriticalIncidents();
        setCriticalIncidents(critical);

        const locations = await ApiService.fetchIncidentLocations();
        _setIncidentLocations(locations);
      } catch (error) {
        console.error('Error loading initial data:', error);
        addNotification({
          title: 'Data Load Error',
          message: 'Failed to load some dashboard data',
          type: 'warning',
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [addNotification]);

  // Socket.io connection
  useEffect(() => {
    const SERVER_URL =
      process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      // Send authentication info if available
      const userToken = localStorage.getItem('token');
      const userInfo = localStorage.getItem('userInfo');
      
      if (userToken && userInfo) {
        newSocket.emit('authenticate', { 
          token: userToken, 
          userInfo: JSON.parse(userInfo) 
        });
      }
      
      // Request current stats immediately after connection
      newSocket.emit('request-stats');
      
      addNotification({
        title: 'Connected',
        message: 'Real-time data connection established',
        type: 'success',
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            const pos = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            newSocket.emit('new-location', pos);
            addEvent(
              `Location shared: ${pos.latitude.toFixed(
                4
              )}, ${pos.longitude.toFixed(4)}`
            );
          },
          error => {
            addEvent('Location sharing: Permission denied or unavailable');
          }
        );
      }
    });

    newSocket.on('disconnect', () => {
      addNotification({
        title: 'Disconnected',
        message: 'Real-time data connection lost',
        type: 'warning',
      });
    });

    // Typed: error is an Error
    newSocket.on('connect_error', (error: Error) => {
      console.error('Socket.IO connection error:', error);
      addNotification({
        title: 'Connection Error',
        message: 'Failed to connect to real-time data service',
        type: 'critical',
      });
    });

    // Real-time data handlers
    newSocket.on('weatherUpdate', (data: WeatherData[]) => {
      setWeatherData(data);
      setWeatherLoading(false);
      setWeatherLastUpdate(new Date());
    });

    newSocket.on('userStatsUpdate', (data: UserStats) => {
      setUserStats(data);
    });

    newSocket.on('todaysIncidentsUpdate', (data: TodaysIncidents) => {
      setTodaysIncidents(data);
    });

    newSocket.on('trafficUpdate', (data: TrafficIncident[]) => {
      setTrafficData(data);
    });

    newSocket.on('criticalIncidents', (data: CriticalIncidentsData) => {
      setCriticalIncidents(data);
    });

    newSocket.on('incidentLocations', (data: LocationData[]) => {
      _setIncidentLocations(data);
    });

    // Typed: incident payload for newAlert
    newSocket.on('newAlert', (incident: NewAlertPayload) => {
      addNotification({
        title: 'New Incident',
        message: `Incident reported: ${incident.Incident_Location}`,
        type: 'critical',
      });
    });

    newSocket.on('new-traffic', (data: any) => {
      addEvent(JSON.stringify(data, null, 2));
    });

    newSocket.on('new-incident', (data: any) => {
      addEvent(JSON.stringify(data, null, 2));
    });

    newSocket.on('amt-users-online', (data: number) => {
      setUsersOnline(data);
      addEvent('Users online: ' + data);
    });

    // Add listeners for connection events
    newSocket.on('user-connected', (data: any) => {
      addEvent(`User connected: ${data.userId || 'Unknown'}`);
    });

    newSocket.on('user-disconnected', (data: any) => {
      addEvent(`User disconnected: ${data.userId || 'Unknown'}`);
    });

    newSocket.on('amt-active-incidents', (data: number) => {
      setActiveIncidents(data);
      addEvent('Active incidents: ' + data);
    });

    newSocket.on('amt-critical-incidents', (data: number) => {
      setCriticalIncidentsCount(data);
      addEvent('Critical incidents: ' + data);
    });

    // Set up periodic stats request as fallback
    const statsInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('request-stats');
      }
    }, 30000); // Request stats every 30 seconds

    return () => {
      clearInterval(statsInterval);
      newSocket.close();
    };
  }, [addNotification, addEvent]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateTimer = setInterval(() => {
      setLastUpdate(new Date());
      // Determine system health based on data freshness and connection status
      const now = Date.now();
      const weatherAge = weatherLastUpdate
        ? now - weatherLastUpdate.getTime()
        : Infinity;

      if (weatherAge > 2 * 60 * 60 * 1000) {
        // 2 hours
        setSystemHealth('error');
      } else if (weatherAge > 60 * 60 * 1000) {
        // 1 hour
        setSystemHealth('warning');
      } else {
        setSystemHealth('healthy');
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(updateTimer);
  }, [weatherLastUpdate]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // Debug function - can be called from browser console as window.debugDashboard()
  React.useEffect(() => {
    (window as any).debugDashboard = () => {
      console.log('🐛 Dashboard Debug Info:');
      console.log('- Users Online:', usersOnline);
      console.log('- Active Incidents:', activeIncidents);
      console.log('- Critical Incidents:', criticalIncidentsCount);
      console.log('- Realtime Events Count:', realtimeEvents?.length || 0);
      console.log('- Auth Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      console.log('- User Info:', localStorage.getItem('userInfo') ? 'Present' : 'Missing');
      console.log('- SERVER_URL:', process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');
    };
  }, [usersOnline, activeIncidents, criticalIncidentsCount, realtimeEvents]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'live-feed':
        addNotification({
          title: 'Live Feed',
          message: 'Opening live camera feeds...',
          type: 'info',
        });
        break;
      case 'report-incident':
        addNotification({
          title: 'Report Incident',
          message: 'Opening incident reporting form...',
          type: 'info',
        });
        break;
      case 'analytics':
        addNotification({
          title: 'Analytics',
          message: 'Loading traffic analytics dashboard...',
          type: 'info',
        });
        break;
      case 'archive':
        addNotification({
          title: 'Archive',
          message: 'Opening incident archive...',
          type: 'info',
        });
        break;
    }
  };

  const getSystemHealthStatus = () => {
    switch (systemHealth) {
      case 'healthy':
        return { text: 'All Systems Operational', class: 'healthy' };
      case 'warning':
        return { text: 'Minor Issues Detected', class: 'warning' };
      case 'error':
        return { text: 'System Errors Present', class: 'error' };
      default:
        return { text: 'Status Unknown', class: 'error' };
    }
  };

  // Get primary weather location (first in the array, usually Johannesburg)
  const getPrimaryWeather = (): WeatherData | null => {
    return weatherData.length > 0 ? weatherData[0] : null;
  };

  return (
    <div className="dashboard" data-cy="dashboard" id="dashboard">
      <div
        className="notification-panel"
        data-cy="notification-panel"
        role="alert"
      >
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`notification ${notification.type}`}
            data-cy={`notification-${notification.id}`}
          >
            <div className="notification-header" data-cy="notification-header">
              <div className="notification-title" data-cy="notification-title">
                {notification.title}
              </div>
              <button
                className="notification-close"
                onClick={() => removeNotification(notification.id)}
                data-cy="notification-close"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
            <div
              className="notification-content"
              data-cy="notification-content"
            >
              {notification.message}
            </div>
          </div>
        ))}
      </div>

      <div
        className="dashboard-header"
        data-cy="dashboard-header"
        id="dashboard-header"
      >
        <div className="dashboard-title" data-cy="dashboard-title">
          <div>
            <h2 data-cy="dashboard-main-title">Traffic Guardian Dashboard</h2>
            <div className="dashboard-subtitle" data-cy="dashboard-subtitle">
              Real-time traffic incident monitoring system
            </div>
          </div>
          <div className="system-status" data-cy="system-status">
            <div className="status-indicator" data-cy="status-indicator">
              <div
                className={`status-dot ${getSystemHealthStatus().class}`}
                data-cy="status-dot"
              ></div>
              {getSystemHealthStatus().text}
            </div>
          </div>
        </div>
        <div
          className="dashboard-header-right"
          data-cy="dashboard-header-right"
        >
          <div className="header-weather" data-cy="header-weather">
            {weatherLoading ? (
              <div className="weather-loading" data-cy="weather-loading">
                <div
                  className="loading-spinner small"
                  data-cy="weather-loading-spinner"
                ></div>
                <span>Loading weather...</span>
              </div>
            ) : getPrimaryWeather() ? (
              <div className="weather-summary" data-cy="weather-summary">
                <div className="weather-icon" data-cy="weather-icon">
                  <WeatherIcon
                    condition={getPrimaryWeather()!.current.condition.text}
                    isDay={getPrimaryWeather()!.current.is_day === 1}
                  />
                </div>
                <div className="weather-info" data-cy="weather-info">
                  <div className="weather-temp" data-cy="weather-temp">
                    {Math.round(getPrimaryWeather()!.current.temp_c)}°C
                  </div>
                  <div className="weather-location" data-cy="weather-location">
                    {getPrimaryWeather()!.location.name}
                  </div>
                </div>
              </div>
            ) : (
              <div className="weather-error" data-cy="weather-error">
                <span>Weather unavailable</span>
              </div>
            )}
          </div>

          <div className="dashboard-time" data-cy="dashboard-time">
            <div
              className="dashboard-time-label"
              data-cy="dashboard-time-label"
            >
              Current Time
            </div>
            <div
              className="dashboard-time-value"
              data-cy="dashboard-time-value"
            >
              {formatTime(currentTime)}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content" data-cy="dashboard-content">
        {loading && <CarLoadingAnimation />}

        <div className="stats-grid" data-cy="stats-grid">
          {/* User Statistics */}
          <div className="stat-card" data-cy="stat-card-users-online">
            <div className="stat-card-icon" data-cy="stat-card-icon">
              <UsersIcon />
            </div>
            <div className="stat-card-title" data-cy="stat-card-title">
              Users Online
            </div>
            <div className="stat-card-value" data-cy="stat-card-value">
              {userStats.totalOnline}
            </div>
            <div className="stat-card-subtitle" data-cy="stat-card-subtitle">
              Currently connected
            </div>
          </div>

          {/* Active Incidents */}
          <div className="stat-card" data-cy="stat-card-active-incidents">
            <div className="stat-card-icon" data-cy="stat-card-icon">
              <AlertTriangleIcon />
            </div>
            <div className="stat-card-title" data-cy="stat-card-title">
              Active Incidents
            </div>
            <div className="stat-card-value" data-cy="stat-card-value">
              {incidentStats?.active || 0}
            </div>
            <div className="stat-card-subtitle" data-cy="stat-card-subtitle">
              Requiring attention
            </div>
            <div className="progress-bar" data-cy="progress-bar">
              <div
                className="progress-fill critical"
                style={{
                  width: `${Math.min(
                    ((incidentStats?.active || 0) / 10) * 100,
                    100
                  )}%`,
                }}
                data-cy="progress-fill"
              ></div>
            </div>
          </div>

          {/* Critical Incidents */}
          <div className="stat-card" data-cy="stat-card-critical-incidents">
            <div className="stat-card-icon" data-cy="stat-card-icon">
              <TrendingUpIcon />
            </div>
            <div className="stat-card-title" data-cy="stat-card-title">
              Critical Incidents
            </div>
            <div className="stat-card-value" data-cy="stat-card-value">
              {criticalIncidents?.Amount || 0}
            </div>
            <div className="stat-card-subtitle" data-cy="stat-card-subtitle">
              High severity events
            </div>
          </div>

          {/* Today's Incidents */}
          <div className="stat-card" data-cy="stat-card-incidents-today">
            <div className="stat-card-icon" data-cy="stat-card-icon">
              <ClockIcon />
            </div>
            <div className="stat-card-title" data-cy="stat-card-title">
              Today's Incidents
            </div>
            <div className="stat-card-value" data-cy="stat-card-value">
              {todaysIncidents.count}
            </div>
            <div className="stat-card-subtitle" data-cy="stat-card-subtitle">
              {todaysIncidents.date}
            </div>
          </div>
        </div>

        {/* User Statistics Section */}
        <div className="user-section" data-cy="user-section" id="user-section">
          <div className="user-header" data-cy="user-header">
            <h3 data-cy="user-title">User Activity</h3>
            <div className="user-last-update" data-cy="user-last-update">
              Last updated: {formatTime(lastUpdate)}
            </div>
          </div>

          <div className="user-grid" data-cy="user-grid">
            <div className="user-card" data-cy="user-card-top-region">
              <div className="user-card-header" data-cy="user-card-header">
                <div className="user-stat-title" data-cy="user-stat-title">
                  Top Region
                </div>
                <MapPinIcon />
              </div>
              <div className="user-main-stat" data-cy="user-main-stat">
                {userStats.topRegion.region || 'No data'}
              </div>
              <div className="user-sub-stat" data-cy="user-sub-stat">
                {userStats.topRegion.userCount} users
              </div>
            </div>

            <div className="user-card" data-cy="user-card-timeline">
              <div className="user-card-header" data-cy="user-card-header">
                <div className="user-stat-title" data-cy="user-stat-title">
                  Recent Activity
                </div>
                <ActivityIcon />
              </div>
              <div className="user-timeline" data-cy="user-timeline">
                {userStats.timeline.slice(-5).map((event, index) => (
                  <div
                    key={index}
                    className="timeline-item"
                    data-cy={`timeline-item-${index}`}
                  >
                    <span
                      className={`timeline-action ${event.action}`}
                      data-cy="timeline-action"
                    >
                      {event.action === 'connect' ? '➕' : '➖'}
                    </span>
                    <span className="timeline-text" data-cy="timeline-text">
                      User {event.action}ed ({event.totalUsers} online)
                    </span>
                    <span className="timeline-time" data-cy="timeline-time">
                      {new Date(event.timestamp).toLocaleTimeString('en-ZA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
                {userStats.timeline.length === 0 && (
                  <div className="timeline-empty" data-cy="timeline-empty">
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Weather Section */}
        <div
          className="weather-section"
          data-cy="weather-section"
          id="weather-section"
        >
          <div className="weather-header" data-cy="weather-header">
            <h3 data-cy="weather-title">Weather Conditions</h3>
            {weatherLastUpdate && (
              <div
                className="weather-last-update"
                data-cy="weather-last-update"
              >
                Last updated: {formatTime(weatherLastUpdate)}
              </div>
            )}
          </div>

          {weatherLoading ? (
            <div
              className="weather-loading-section"
              data-cy="weather-loading-section"
            >
              <div
                className="loading-spinner"
                data-cy="weather-section-spinner"
              ></div>
              <div
                className="loading-text"
                data-cy="weather-section-loading-text"
              >
                Loading weather data...
              </div>
            </div>
          ) : weatherData.length > 0 ? (
            <div className="weather-grid" data-cy="weather-grid">
              {weatherData.slice(0, 6).map((weather, index) => (
                <div
                  key={index}
                  className="weather-card"
                  data-cy={`weather-card-${index}`}
                >
                  <div
                    className="weather-card-header"
                    data-cy="weather-card-header"
                  >
                    <div
                      className="weather-location-name"
                      data-cy="weather-location-name"
                    >
                      {weather.location.name}
                    </div>
                    <div
                      className="weather-icon-large"
                      data-cy="weather-icon-large"
                    >
                      <WeatherIcon
                        condition={weather.current.condition.text}
                        isDay={weather.current.is_day === 1}
                      />
                    </div>
                  </div>

                  <div
                    className="weather-main-temp"
                    data-cy="weather-main-temp"
                  >
                    {Math.round(weather.current.temp_c)}°C
                  </div>

                  <div
                    className="weather-condition"
                    data-cy="weather-condition"
                  >
                    {weather.current.condition.text}
                  </div>

                  <div className="weather-details" data-cy="weather-details">
                    <div
                      className="weather-detail-item"
                      data-cy="weather-detail-humidity"
                    >
                      <span className="weather-detail-label">Humidity</span>
                      <span className="weather-detail-value">
                        {weather.current.humidity}%
                      </span>
                    </div>
                    <div
                      className="weather-detail-item"
                      data-cy="weather-detail-wind"
                    >
                      <span className="weather-detail-label">Wind</span>
                      <span className="weather-detail-value">
                        {weather.current.wind_kph} km/h{' '}
                        {weather.current.wind_dir}
                      </span>
                    </div>
                    <div
                      className="weather-detail-item"
                      data-cy="weather-detail-pressure"
                    >
                      <span className="weather-detail-label">Pressure</span>
                      <span className="weather-detail-value">
                        {weather.current.pressure_mb} mb
                      </span>
                    </div>
                    <div
                      className="weather-detail-item"
                      data-cy="weather-detail-visibility"
                    >
                      <span className="weather-detail-label">Visibility</span>
                      <span className="weather-detail-value">
                        {weather.current.vis_km} km
                      </span>
                    </div>
                  </div>

                  <div
                    className="weather-update-time"
                    data-cy="weather-update-time"
                  >
                    Updated: {weather.current.last_updated}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="weather-error-section"
              data-cy="weather-error-section"
            >
              <div
                className="weather-error-message"
                data-cy="weather-error-message"
              >
                Unable to load weather data. Please check your connection.
              </div>
            </div>
          )}
        </div>

        {/* Traffic Incidents Section */}
        <div className="dashboard-main-grid" data-cy="dashboard-main-grid">
          <div
            className="incidents-section"
            data-cy="incidents-section"
            id="incidents-section"
          >
            <div className="incidents-header" data-cy="incidents-header">
              <h3 data-cy="incidents-title">Live Traffic Incidents</h3>
              <div className="incidents-badge" data-cy="incidents-badge">
                {trafficData.length} Locations
              </div>
            </div>
            <div className="incidents-list" data-cy="incidents-list">
              {trafficData.map((location, index) => (
                <div
                  key={index}
                  className="incident-item"
                  data-cy={`incident-item-${index}`}
                >
                  <div className="incident-header" data-cy="incident-header">
                    <div className="incident-type" data-cy="incident-type">
                      <MapPinIcon />
                      {location.location}
                    </div>
                    <div
                      className="severity-badge medium"
                      data-cy="severity-badge"
                    >
                      {location.incidents.length} Incidents
                    </div>
                  </div>

                  <div className="incident-details" data-cy="incident-details">
                    {location.incidents
                      .slice(0, 3)
                      .map((incident, incIndex) => (
                        <div
                          key={incIndex}
                          className="incident-detail"
                          data-cy="incident-detail-item"
                        >
                          <AlertTriangleIcon />
                          <span>{incident.properties.iconCategory}</span>
                          <span
                            className="magnitude-badge"
                            data-cy="magnitude-badge"
                          >
                            Severity: {incident.properties.magnitudeOfDelay}
                          </span>
                        </div>
                      ))}
                    {location.incidents.length > 3 && (
                      <div
                        className="incident-detail"
                        data-cy="incident-detail-more"
                      >
                        <span>
                          +{location.incidents.length - 3} more incidents
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {trafficData.length === 0 && (
                <div className="incident-item" data-cy="incident-empty">
                  <div className="incident-header">
                    <div className="incident-type">
                      <AlertTriangleIcon />
                      No Traffic Data
                    </div>
                  </div>
                  <div className="incident-details">
                    <div className="incident-detail">
                      Waiting for traffic updates...
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="last-updated" data-cy="last-updated-incidents">
              <div
                className="update-indicator"
                data-cy="update-indicator"
              ></div>
              Last updated: {formatTime(lastUpdate)}
            </div>
          </div>

          <div
            className="regional-stats-section"
            data-cy="regional-stats-section"
            id="regional-stats-section"
          >
            <div className="regional-header" data-cy="regional-header">
              <h3 data-cy="regional-title">Regional Activity</h3>
            </div>
            <div className="regional-list" data-cy="regional-list">
              {userStats.regionCounts
                .filter(region => region.userCount > 0)
                .sort((a, b) => b.userCount - a.userCount)
                .map((region, index) => (
                  <div
                    key={index}
                    className="regional-item"
                    data-cy={`regional-item-${region.region}`}
                  >
                    <div className="regional-info" data-cy="regional-info">
                      <div
                        className="regional-details"
                        data-cy="regional-details"
                      >
                        <h4 data-cy="regional-name">{region.region}</h4>
                        <p data-cy="regional-users">
                          {region.userCount} active users
                        </p>
                      </div>
                    </div>
                    <div className="regional-stats" data-cy="regional-stats">
                      <div
                        className="progress-bar small"
                        data-cy="progress-bar-small"
                      >
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(
                              (region.userCount /
                                Math.max(userStats.totalOnline, 1)) *
                                100,
                              100
                            )}%`,
                          }}
                          data-cy="progress-fill-regional"
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              {userStats.regionCounts.filter(r => r.userCount > 0).length ===
                0 && (
                <div className="regional-item" data-cy="regional-empty">
                  <div className="regional-info">
                    <div className="regional-details">
                      <h4>No Regional Data</h4>
                      <p>Waiting for user location data...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="last-updated" data-cy="last-updated-regional">
              <div
                className="update-indicator"
                data-cy="update-indicator"
              ></div>
              Real-time updates
            </div>
          </div>
        </div>

        <div
          className="realtime-events-section"
          data-cy="realtime-events-section"
          id="realtime-events-section"
        >
          <div className="realtime-header" data-cy="realtime-header">
            <h3 data-cy="realtime-title">Real-time System Events</h3>
            <div className="realtime-stats" data-cy="realtime-stats">
              <div className="stat-pill" data-cy="stat-pill-users">
                👥 {usersOnline} online
                {usersOnline === 0 && (
                  <span style={{ fontSize: '10px', color: '#999', marginLeft: '5px' }}>
                    (no data)
                  </span>
                )}
              </div>
              <div className="stat-pill" data-cy="stat-pill-incidents">
                {activeIncidents} active
              </div>
              <div className="stat-pill critical" data-cy="stat-pill-critical">
                {criticalIncidentsCount} critical
              </div>
            </div>
          </div>

          <div className="events-panel" data-cy="events-panel">
            <div className="events-header" data-cy="events-header">
              <span>Live Event Feed</span>
              <button
                className="clear-events-btn"
                onClick={() => setRealtimeEvents([])}
                data-cy="clear-events-btn"
                aria-label="Clear event history"
              >
                Clear
              </button>
            </div>

            <div className="events-list" data-cy="events-list">
              {realtimeEvents.length > 0 ? (
                realtimeEvents.map((event, index) => (
                  <div
                    key={index}
                    className="event-item"
                    data-cy={`event-item-${index}`}
                  >
                    <pre className="event-content" data-cy="event-content">
                      {event}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="events-empty" data-cy="events-empty">
                  <span> Waiting for real-time events...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="quick-actions"
          data-cy="quick-actions"
          id="quick-actions"
        >
          <h3 data-cy="quick-actions-title">Quick Actions</h3>
          <div className="actions-grid" data-cy="actions-grid">
            <button
              className="action-button"
              onClick={() => handleQuickAction('live-feed')}
              data-cy="action-button-live-feed"
              aria-label="Open live camera feeds"
            >
              <EyeIcon />
              <span>Live Feed</span>
            </button>
            <button
              className="action-button"
              onClick={() => handleQuickAction('report-incident')}
              data-cy="action-button-report-incident"
              aria-label="Report a new incident"
            >
              <AlertTriangleIcon />
              <span>Report Incident</span>
            </button>
            <button
              className="action-button"
              onClick={() => handleQuickAction('analytics')}
              data-cy="action-button-analytics"
              aria-label="View traffic analytics"
            >
              <ActivityIcon />
              <span>Analytics</span>
            </button>
            <button
              className="action-button"
              onClick={() => handleQuickAction('archive')}
              data-cy="action-button-archive"
              aria-label="View incident archive"
            >
              <UsersIcon />
              <span>Archive</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
