import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import './Dashboard.css';

const AlertTriangleIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="alert-triangle-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const CameraIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="camera-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="clock-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="trending-up-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const MapPinIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="map-pin-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="eye-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const ActivityIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="activity-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const UsersIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="users-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const WeatherIcon = ({ condition, isDay }: { condition: string; isDay: boolean }) => {
  if (condition.toLowerCase().includes('sunny') || condition.toLowerCase().includes('clear')) {
    return (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="weather-sunny-icon">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    );
  } else if (condition.toLowerCase().includes('cloud')) {
    return (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="weather-cloud-icon">
        <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
      </svg>
    );
  } else if (condition.toLowerCase().includes('rain')) {
    return (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="weather-rain-icon">
        <path d="M16 13v8m-8-8v8m4-12v8M8 21l1-1 1 1m8 0l1-1 1 1m-8-8l1-1 1 1M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
      </svg>
    );
  } else {
    return (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="weather-default-icon">
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

interface Incident {
  id: number;
  type: string;
  location: string;
  severity: 'Critical' | 'Medium' | 'Low';
  time: string;
  camera: string;
  status: 'Active' | 'Responding' | 'Monitoring';
  duration?: string;
  reportedBy?: string;
  assignedTo?: string;
}

interface Camera {
  id: string;
  name: string;
  status: 'Active' | 'Offline';
  incidents: number;
  lastUpdate?: string;
}

interface Stats {
  totalIncidents: number;
  activeIncidents: number;
  camerasOnline: number;
  totalCameras: number;
  avgResponseTime: string;
  incidentsToday: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'critical';
  timestamp: Date;
}

interface IncidentDetail extends Incident {
  description: string;
  images?: string[];
  responders?: string[];
  timeline?: { time: string; event: string }[];
}

const Dashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherLastUpdate, setWeatherLastUpdate] = useState<Date | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([
    {
      id: 1,
      type: 'Vehicle Accident',
      location: 'N1 Western Bypass Southbound',
      severity: 'Critical',
      time: '12:13',
      camera: 'CAM-N1-03',
      status: 'Active',
      duration: '45 min',
      reportedBy: 'AI Detection',
      assignedTo: 'Response Team Alpha',
    },
    {
      id: 2,
      type: 'Vehicle Breakdown',
      location: 'M1 North - Sandton Junction',
      severity: 'Medium',
      time: '11:45',
      camera: 'CAM-M1-15',
      status: 'Responding',
      duration: '1hr 15min',
      reportedBy: 'Public Report',
      assignedTo: 'Response Team Beta',
    },
    {
      id: 3,
      type: 'Traffic Congestion',
      location: 'R21 - OR Tambo Approach',
      severity: 'Low',
      time: '11:20',
      camera: 'CAM-R21-08',
      status: 'Monitoring',
      duration: '1hr 40min',
      reportedBy: 'AI Detection',
      assignedTo: 'Traffic Control',
    },
  ]);

  const [cameraFeeds] = useState<Camera[]>([
    { id: 'CAM-N1-03', name: 'N1 Western Bypass', status: 'Active', incidents: 1, lastUpdate: '12:15' },
    { id: 'CAM-M1-15', name: 'M1 Sandton Junction', status: 'Active', incidents: 1, lastUpdate: '12:14' },
    { id: 'CAM-R21-08', name: 'R21 OR Tambo', status: 'Active', incidents: 1, lastUpdate: '12:13' },
    { id: 'CAM-N3-12', name: 'N3 Johannesburg South', status: 'Active', incidents: 0, lastUpdate: '12:12' },
    { id: 'CAM-M2-07', name: 'M2 Germiston East', status: 'Offline', incidents: 0, lastUpdate: '11:30' },
  ]);

  const [stats, setStats] = useState<Stats>({
    totalIncidents: 24,
    activeIncidents: 3,
    camerasOnline: 4,
    totalCameras: 5,
    avgResponseTime: '4.2 min',
    incidentsToday: 8,
    systemHealth: 'healthy',
  });

  useEffect(() => {
    const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
    
    console.log('Connecting to Socket.IO server at:', SERVER_URL);
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO server with ID:', newSocket.id);
      addNotification({
        title: 'Connected',
        message: 'Real-time data connection established',
        type: 'success'
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      addNotification({
        title: 'Disconnected',
        message: 'Real-time data connection lost',
        type: 'warning'
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      addNotification({
        title: 'Connection Error',
        message: 'Failed to connect to real-time data service',
        type: 'critical'
      });
    });

     newSocket.on('weatherUpdate', (data: WeatherData[]) => {
      console.log('Received weather update:', data);
      setWeatherData(data);
      setWeatherLoading(false);
      setWeatherLastUpdate(new Date());
      
      addNotification({
        title: 'Weather Updated',
        message: `Weather data updated for ${data.length} locations`,
        type: 'info'
      });
    });

    newSocket.on('trafficUpdate', (data) => {
      console.log('Received traffic update:', data);
    });

    newSocket.on('criticalIncidents', (data) => {
      console.log('Received critical incidents:', data);
    });

    return () => {
      console.log('Cleaning up Socket.IO connection');
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateTimer = setInterval(() => {
      setLastUpdate(new Date());
      const healthStates: ('healthy' | 'warning' | 'error')[] = ['healthy', 'healthy', 'healthy', 'warning'];
      const randomHealth = healthStates[Math.floor(Math.random() * healthStates.length)];
      setStats(prev => ({ ...prev, systemHealth: randomHealth }));
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(updateTimer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getSeverityClass = (severity: string) => {
    return severity.toLowerCase();
  };

  const getStatusClass = (status: string) => {
    return status.toLowerCase();
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now(),
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const handleIncidentAction = async (incidentId: number, action: string) => {
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (action === 'view') {
        // Fetch detailed incident data
        const detailedIncident: IncidentDetail = {
          ...activeIncidents.find(inc => inc.id === incidentId)!,
          description: 'Multi-vehicle collision involving 3 cars on the southbound lane. Emergency services have been dispatched. Traffic is being diverted via Allandale Road off-ramp.',
          images: ['incident-photo-1.jpg', 'incident-photo-2.jpg'],
          responders: ['Paramedic Unit 1', 'Fire Department', 'Traffic Police'],
          timeline: [
            { time: '12:13', event: 'Incident detected by AI system' },
            { time: '12:14', event: 'Emergency services notified' },
            { time: '12:16', event: 'First responders dispatched' },
            { time: '12:20', event: 'Traffic diversion implemented' }
          ]
        };
        setSelectedIncident(detailedIncident);
      } else if (action === 'resolve') {
        // Update incident status
        setActiveIncidents(prev => prev.filter(inc => inc.id !== incidentId));
        setStats(prev => ({ ...prev, activeIncidents: prev.activeIncidents - 1 }));
        
        addNotification({
          title: 'Incident Resolved',
          message: `Incident #${incidentId} has been marked as resolved.`,
          type: 'success'
        });
      }
    } catch (error) {
      addNotification({
        title: 'Error',
        message: 'Failed to process incident action. Please try again.',
        type: 'critical'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'live-feed':
        addNotification({
          title: 'Live Feed',
          message: 'Opening live camera feeds...',
          type: 'info'
        });
        break;
      case 'report-incident':
        addNotification({
          title: 'Report Incident',
          message: 'Opening incident reporting form...',
          type: 'info'
        });
        break;
      case 'analytics':
        addNotification({
          title: 'Analytics',
          message: 'Loading traffic analytics dashboard...',
          type: 'info'
        });
        break;
      case 'archive':
        addNotification({
          title: 'Archive',
          message: 'Opening incident archive...',
          type: 'info'
        });
        break;
    }
  };

  const getSystemHealthStatus = () => {
    switch (stats.systemHealth) {
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
      <div className="notification-panel" data-cy="notification-panel" role="alert">
        {notifications.map((notification) => (
          <div key={notification.id} className={`notification ${notification.type}`} data-cy={`notification-${notification.id}`}>
            <div className="notification-header" data-cy="notification-header">
              <div className="notification-title" data-cy="notification-title">{notification.title}</div>
              <button 
                className="notification-close"
                onClick={() => removeNotification(notification.id)}
                data-cy="notification-close"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
            <div className="notification-content" data-cy="notification-content">{notification.message}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-header" data-cy="dashboard-header" id="dashboard-header">
        <div className="dashboard-title" data-cy="dashboard-title">
          <div>
            <h2 data-cy="dashboard-main-title">Traffic Guardian Dashboard</h2>
            <div className="dashboard-subtitle" data-cy="dashboard-subtitle">Real-time traffic incident monitoring system</div>
          </div>
          <div className="system-status" data-cy="system-status">
            <div className="status-indicator" data-cy="status-indicator">
              <div className={`status-dot ${getSystemHealthStatus().class}`} data-cy="status-dot"></div>
              {getSystemHealthStatus().text}
            </div>
          </div>
        </div>
        <div className="dashboard-header-right" data-cy="dashboard-header-right">
          <div className="header-weather" data-cy="header-weather">
            {weatherLoading ? (
              <div className="weather-loading" data-cy="weather-loading">
                <div className="loading-spinner small" data-cy="weather-loading-spinner"></div>
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
            <div className="dashboard-time-label" data-cy="dashboard-time-label">Current Time</div>
            <div className="dashboard-time-value" data-cy="dashboard-time-value">{formatTime(currentTime)}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content" data-cy="dashboard-content">
        {loading && (
          <div className="loading-overlay" data-cy="loading-overlay" aria-busy="true">
            <div className="loading-spinner" data-cy="loading-spinner"></div>
            <div className="loading-text" data-cy="loading-text">Processing request...</div>
          </div>
        )}

        <div className="stats-grid" data-cy="stats-grid">
          <div className="stat-card" data-cy="stat-card-active-incidents">
            <div className="stat-card-icon" data-cy="stat-card-icon">
              <AlertTriangleIcon />
            </div>
            <div className="stat-card-title" data-cy="stat-card-title">Active Incidents</div>
            <div className="stat-card-value" data-cy="stat-card-value">{stats.activeIncidents}</div>
            <div className="stat-card-subtitle" data-cy="stat-card-subtitle">Requiring immediate attention</div>
            <div className="progress-bar" data-cy="progress-bar">
              <div 
                className="progress-fill critical" 
                style={{ width: `${(stats.activeIncidents / 10) * 100}%` }}
                data-cy="progress-fill"
              ></div>
            </div>
          </div>

          <div className="stat-card" data-cy="stat-card-cameras-online">
            <div className="stat-card-icon" data-cy="stat-card-icon">
              <CameraIcon />
            </div>
            <div className="stat-card-title" data-cy="stat-card-title">Cameras Online</div>
            <div className="stat-card-value" data-cy="stat-card-value">{stats.camerasOnline}/{stats.totalCameras}</div>
            <div className="stat-card-subtitle" data-cy="stat-card-subtitle">{Math.round((stats.camerasOnline / stats.totalCameras) * 100)}% operational</div>
            <div className="progress-bar" data-cy="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(stats.camerasOnline / stats.totalCameras) * 100}%` }}
                data-cy="progress-fill"
              ></div>
            </div>
          </div>

          <div className="stat-card" data-cy="stat-card-avg-response-time">
            <div className="stat-card-icon" data-cy="stat-card-icon">
              <ClockIcon />
            </div>
            <div className="stat-card-title" data-cy="stat-card-title">Avg Response Time</div>
            <div className="stat-card-value" data-cy="stat-card-value">{stats.avgResponseTime}</div>
            <div className="stat-card-subtitle" data-cy="stat-card-subtitle">Last 24 hours</div>
          </div>

          <div className="stat-card" data-cy="stat-card-incidents-today">
            <div className="stat-card-icon" data-cy="stat-card-icon">
              <TrendingUpIcon />
            </div>
            <div className="stat-card-title" data-cy="stat-card-title">Today's Incidents</div>
            <div className="stat-card-value" data-cy="stat-card-value">{stats.incidentsToday}</div>
            <div className="stat-card-subtitle" data-cy="stat-card-subtitle">vs 12 yesterday</div>
          </div>
        </div>