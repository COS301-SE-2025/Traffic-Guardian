import React, { useState, useEffect } from 'react';
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

const CloudIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="cloud-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

const WindIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="wind-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 2.82l-2.31 2.31A3 3 0 015 7.28v1.44A3 3 0 006.72 11H12m0 0a3 3 0 013-3 3 3 0 013 3 3 3 0 01-3 3H9m6-6a3 3 0 00-3-3m6 6h2.28A3 3 0 0022 8.72V7.28a3 3 0 00-.69-1.93L19 3.04" />
  </svg>
);

const DropletIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="droplet-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.21 15.32A7.002 7.002 0 0112 3.46a7.002 7.002 0 014.79 11.86c-.79.72-1.85 1.18-3 1.26h-3.58c-1.15-.08-2.21-.54-3-1.26z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="eye-off-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
  </svg>
);

const RefreshIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="refresh-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ThermometerIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-cy="thermometer-icon">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

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

interface WeatherCondition {
  text: string;
  icon: string;
  code: number;
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

interface WeatherCurrent {
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

interface WeatherData {
  location: WeatherLocation;
  current: WeatherCurrent;
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
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherLastUpdate, setWeatherLastUpdate] = useState(new Date());
  
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

  const [cameraFeeds, setCameraFeeds] = useState<Camera[]>([
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

  // Fetch weather data
  const fetchWeatherData = async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    
    try {
      //  might need to adjust this URL based on our backend setup
      const response = await fetch('/api/weather');
      
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }
      
      const data: WeatherData[] = await response.json();
      setWeatherData(data);
      setWeatherLastUpdate(new Date());
      
      addNotification({
        title: 'Weather Updated',
        message: `Weather data refreshed for ${data.length} locations`,
        type: 'success'
      });
    } catch (error) {
      console.error('Weather fetch error:', error);
      setWeatherError('Failed to load weather data');
      
      // Fallback to mock data for demonstration
      const mockWeatherData: WeatherData[] = [
        {
          location: {
            name: 'Johannesburg',
            region: 'Gauteng',
            country: 'South Africa',
            lat: -26.2,
            lon: 28.083,
            tz_id: 'Africa/Johannesburg',
            localtime_epoch: 1749900851,
            localtime: '2025-06-14 13:34'
          },
          current: {
            last_updated_epoch: 1749900600,
            last_updated: '2025-06-14 13:30',
            temp_c: 18.2,
            temp_f: 64.8,
            is_day: 1,
            condition: {
              text: 'Sunny',
              icon: '//cdn.weatherapi.com/weather/64x64/day/113.png',
              code: 1000
            },
            wind_mph: 6.9,
            wind_kph: 11.2,
            wind_degree: 75,
            wind_dir: 'ENE',
            pressure_mb: 1037,
            pressure_in: 30.62,
            precip_mm: 0,
            precip_in: 0,
            humidity: 30,
            cloud: 0,
            feelslike_c: 18.2,
            feelslike_f: 64.8,
            windchill_c: 17.5,
            windchill_f: 63.4,
            heatindex_c: 17.5,
            heatindex_f: 63.4,
            dewpoint_c: -7.2,
            dewpoint_f: 19,
            vis_km: 10,
            vis_miles: 6,
            uv: 4.4,
            gust_mph: 8,
            gust_kph: 12.9
          }
        },
        {
          location: {
            name: 'Sandton',
            region: 'Gauteng',
            country: 'South Africa',
            lat: -26.1,
            lon: 28.05,
            tz_id: 'Africa/Johannesburg',
            localtime_epoch: 1749900851,
            localtime: '2025-06-14 13:34'
          },
          current: {
            last_updated_epoch: 1749900600,
            last_updated: '2025-06-14 13:30',
            temp_c: 19.1,
            temp_f: 66.4,
            is_day: 1,
            condition: {
              text: 'Partly cloudy',
              icon: '//cdn.weatherapi.com/weather/64x64/day/116.png',
              code: 1003
            },
            wind_mph: 7.2,
            wind_kph: 11.6,
            wind_degree: 80,
            wind_dir: 'E',
            pressure_mb: 1036,
            pressure_in: 30.59,
            precip_mm: 0,
            precip_in: 0,
            humidity: 28,
            cloud: 25,
            feelslike_c: 19.1,
            feelslike_f: 66.4,
            windchill_c: 18.2,
            windchill_f: 64.8,
            heatindex_c: 18.2,
            heatindex_f: 64.8,
            dewpoint_c: -6.8,
            dewpoint_f: 19.8,
            vis_km: 10,
            vis_miles: 6,
            uv: 4.2,
            gust_mph: 8.5,
            gust_kph: 13.7
          }
        },
        {
          location: {
            name: 'Rosebank',
            region: 'Gauteng',
            country: 'South Africa',
            lat: -26.14,
            lon: 28.04,
            tz_id: 'Africa/Johannesburg',
            localtime_epoch: 1749900851,
            localtime: '2025-06-14 13:34'
          },
          current: {
            last_updated_epoch: 1749900600,
            last_updated: '2025-06-14 13:30',
            temp_c: 17.8,
            temp_f: 64.0,
            is_day: 1,
            condition: {
              text: 'Clear',
              icon: '//cdn.weatherapi.com/weather/64x64/day/113.png',
              code: 1000
            },
            wind_mph: 6.5,
            wind_kph: 10.5,
            wind_degree: 70,
            wind_dir: 'ENE',
            pressure_mb: 1038,
            pressure_in: 30.65,
            precip_mm: 0,
            precip_in: 0,
            humidity: 32,
            cloud: 5,
            feelslike_c: 17.8,
            feelslike_f: 64.0,
            windchill_c: 17.1,
            windchill_f: 62.8,
            heatindex_c: 17.1,
            heatindex_f: 62.8,
            dewpoint_c: -7.5,
            dewpoint_f: 18.5,
            vis_km: 10,
            vis_miles: 6,
            uv: 4.6,
            gust_mph: 7.8,
            gust_kph: 12.6
          }
        }
      ];
      
      setWeatherData(mockWeatherData);
      setWeatherLastUpdate(new Date());
      
      addNotification({
        title: 'Weather Error',
        message: 'Using cached weather data. Check connection.',
        type: 'warning'
      });
    } finally {
      setWeatherLoading(false);
    }
  };

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

  // Initial weather fetch
  useEffect(() => {
    fetchWeatherData();
    
    // Auto-refresh weather every 10 minutes
    const weatherInterval = setInterval(() => {
      fetchWeatherData();
    }, 600000);
    
    return () => clearInterval(weatherInterval);
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

  const renderWeatherIcon = (condition: WeatherCondition) => {
    // Use the API icon if available, otherwise fallback to local icons
    if (condition.icon) {
      return (
        <img 
          src={`https:${condition.icon}`} 
          alt={condition.text}
          className="weather-icon"
          onError={(e) => {
            // Fallback to local icon if API icon fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    
    // Fallback local icons based on condition code
    switch (condition.code) {
      case 1000: // Clear/Sunny
        return <div className="weather-icon">☀️</div>;
      case 1003: // Partly cloudy
        return <div className="weather-icon">⛅</div>;
      case 1006: // Cloudy
        return <div className="weather-icon">☁️</div>;
      case 1009: // Overcast
        return <div className="weather-icon">☁️</div>;
      default:
        return <div className="weather-icon">🌤️</div>;
    }
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
        <div className="dashboard-time" data-cy="dashboard-time">
          <div className="dashboard-time-label" data-cy="dashboard-time-label">Current Time</div>
          <div className="dashboard-time-value" data-cy="dashboard-time-value">{formatTime(currentTime)}</div>
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

        {/* Weather Section */}
        <div className="weather-section" data-cy="weather-section" id="weather-section">
          <div className="weather-header" data-cy="weather-header">
            <h3 data-cy="weather-title">Regional Weather Conditions</h3>
            <button 
              className="weather-refresh-btn"
              onClick={fetchWeatherData}
              disabled={weatherLoading}
              data-cy="weather-refresh"
              aria-label="Refresh weather data"
            >
              <RefreshIcon />
              Refresh
            </button>
          </div>
          
          {weatherLoading ? (
            <div className="weather-loading" data-cy="weather-loading">
              <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
              Updating weather data...
            </div>
          ) : weatherError ? (
            <div className="weather-error" data-cy="weather-error">
              <AlertTriangleIcon />
              {weatherError}
            </div>
          ) : (
            <div className="weather-grid" data-cy="weather-grid">
              {weatherData.map((weather, index) => (
                <div key={index} className="weather-card" data-cy={`weather-card-${index}`}>
                  <div className="weather-card-header" data-cy="weather-card-header">
                    <div className="weather-location" data-cy="weather-location">
                      <h4 className="weather-location-name" data-cy="weather-location-name">
                        {weather.location.name}
                      </h4>
                      <p className="weather-location-region" data-cy="weather-location-region">
                        {weather.location.region}
                      </p>
                    </div>
                    {renderWeatherIcon(weather.current.condition)}
                  </div>
                  
                  <div className="weather-main" data-cy="weather-main">
                    <div className="weather-temp" data-cy="weather-temp">
                      {Math.round(weather.current.temp_c)}°C
                    </div>
                    <div className="weather-condition" data-cy="weather-condition">
                      <div className="weather-condition-text" data-cy="weather-condition-text">
                        {weather.current.condition.text}
                      </div>
                      <div className="weather-feels-like" data-cy="weather-feels-like">
                        Feels like {Math.round(weather.current.feelslike_c)}°C
                      </div>
                    </div>
                  </div>
                  
                  <div className="weather-details" data-cy="weather-details">
                    <div className="weather-detail-item" data-cy="weather-detail-humidity">
                      <div className="weather-detail-label" data-cy="weather-detail-label">
                        <DropletIcon />
                        Humidity
                      </div>
                      <div className="weather-detail-value" data-cy="weather-detail-value">
                        {weather.current.humidity}%
                      </div>
                    </div>
                    
                    <div className="weather-detail-item" data-cy="weather-detail-wind">
                      <div className="weather-detail-label" data-cy="weather-detail-label">
                        <WindIcon />
                        Wind
                      </div>
                      <div className="weather-detail-value" data-cy="weather-detail-value">
                        {Math.round(weather.current.wind_kph)} km/h {weather.current.wind_dir}
                      </div>
                    </div>
                    
                    <div className="weather-detail-item" data-cy="weather-detail-visibility">
                      <div className="weather-detail-label" data-cy="weather-detail-label">
                        <EyeIcon />
                        Visibility
                      </div>
                      <div className="weather-detail-value" data-cy="weather-detail-value">
                        {weather.current.vis_km} km
                      </div>
                    </div>
                    
                    <div className="weather-detail-item" data-cy="weather-detail-pressure">
                      <div className="weather-detail-label" data-cy="weather-detail-label">
                        <ThermometerIcon />
                        Pressure
                      </div>
                      <div className="weather-detail-value" data-cy="weather-detail-value">
                        {weather.current.pressure_mb} mb
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="weather-last-updated" data-cy="weather-last-updated">
            <div className="weather-update-indicator" data-cy="weather-update-indicator"></div>
            Weather last updated: {formatTime(weatherLastUpdate)}
          </div>
        </div>

        <div className="dashboard-main-grid" data-cy="dashboard-main-grid">
          <div className="incidents-section" data-cy="incidents-section" id="incidents-section">
            <div className="incidents-header" data-cy="incidents-header">
              <h3 data-cy="incidents-title">Active Incidents</h3>
              <div className="incidents-badge" data-cy="incidents-badge">{stats.activeIncidents} Active</div>
            </div>
            <div className="incidents-list" data-cy="incidents-list">
              {activeIncidents.map((incident) => (
                <div key={incident.id} className={`incident-item ${getSeverityClass(incident.severity)}`} data-cy={`incident-item-${incident.id}`}>
                  <div className="incident-header" data-cy="incident-header">
                    <div className="incident-type" data-cy="incident-type">
                      <AlertTriangleIcon />
                      {incident.type}
                    </div>
                    <div className={`severity-badge ${getSeverityClass(incident.severity)}`} data-cy="severity-badge">
                      {incident.severity}
                    </div>
                  </div>
                  
                  <div className="incident-details" data-cy="incident-details">
                    <div className="incident-detail" data-cy="incident-detail-location">
                      <MapPinIcon />
                      {incident.location}
                    </div>
                    <div className="incident-detail" data-cy="incident-detail-camera">
                      <CameraIcon />
                      {incident.camera}
                    </div>
                    <div className="incident-detail" data-cy="incident-detail-time">
                      <ClockIcon />
                      Started at {incident.time} ({incident.duration})
                    </div>
                  </div>

                  <div className="incident-metadata" data-cy="incident-metadata">
                    <div className="metadata-item" data-cy="metadata-status">
                      <div className="metadata-label">Status</div>
                      <div className={`status-badge ${getStatusClass(incident.status)}`} data-cy="metadata-value-status">{incident.status}</div>
                    </div>
                    <div className="metadata-item" data-cy="metadata-reported-by">
                      <div className="metadata-label">Reported By</div>
                      <div className="metadata-value">{incident.reportedBy}</div>
                    </div>
                    <div className="metadata-item" data-cy="metadata-assigned-to">
                      <div className="metadata-label">Assigned To</div>
                      <div className="metadata-value">{incident.assignedTo}</div>
                    </div>
                  </div>
                  
                  <div className="incident-actions" data-cy="incident-actions">
                    <button 
                      className="incident-action"
                      onClick={() => handleIncidentAction(incident.id, 'view')}
                      disabled={loading}
                      data-cy="incident-action-view"
                      aria-busy={loading}
                      aria-label={`View details for incident ${incident.id}`}
                    >
                      View Details
                    </button>
                    <button 
                      className="incident-action"
                      onClick={() => handleIncidentAction(incident.id, 'resolve')}
                      disabled={loading}
                      data-cy="incident-action-resolve"
                      aria-busy={loading}
                      aria-label={`Mark incident ${incident.id} as resolved`}
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="last-updated" data-cy="last-updated-incidents">
              <div className="update-indicator" data-cy="update-indicator"></div>
              Last updated: {formatTime(lastUpdate)}
            </div>
          </div>

          <div className="camera-section" data-cy="camera-section" id="camera-section">
            <div className="camera-header" data-cy="camera-header">
              <h3 data-cy="camera-title">Camera Status</h3>
            </div>
            <div className="camera-list" data-cy="camera-list">
              {cameraFeeds.map((camera) => (
                <div key={camera.id} className="camera-item" data-cy={`camera-item-${camera.id}`}>
                  <div className="camera-info" data-cy="camera-info">
                    <div className={`camera-status-dot ${camera.status.toLowerCase()}`} data-cy="camera-status-dot"></div>
                    <div className="camera-details" data-cy="camera-details">
                      <h4 data-cy="camera-name">{camera.name}</h4>
                      <p data-cy="camera-id">{camera.id}</p>
                    </div>
                  </div>
                  <div className="camera-status" data-cy="camera-status">
                    <div className={`camera-status-text ${camera.status.toLowerCase()}`} data-cy="camera-status-text">
                      {camera.status}
                    </div>
                    {camera.incidents > 0 && (
                      <div className="camera-incidents" data-cy="camera-incidents">
                        {camera.incidents} incident{camera.incidents > 1 ? 's' : ''}
                      </div>
                    )}
                    <div style={{ color: 'var(--form-help-text)', fontSize: '0.7rem', marginTop: '0.25rem' }} data-cy="camera-last-update">
                      Last: {camera.lastUpdate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="last-updated" data-cy="last-updated-cameras">
              <div className="update-indicator" data-cy="update-indicator"></div>
              Feeds updating live
            </div>
          </div>
        </div>

        <div className="quick-actions" data-cy="quick-actions" id="quick-actions">
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

      {selectedIncident && (
        <div className="modal-overlay" data-cy="modal-overlay" role="dialog" aria-labelledby="modal-title" onClick={() => setSelectedIncident(null)}>
          <div className="modal-content" data-cy="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" data-cy="modal-header">
              <h3 className="modal-title" data-cy="modal-title" id="modal-title">Incident Details - #{selectedIncident.id}</h3>
              <button 
                className="modal-close" 
                onClick={() => setSelectedIncident(null)}
                data-cy="modal-close"
                aria-label="Close incident details modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body" data-cy="modal-body">
              <div className="incident-metadata" data-cy="modal-incident-metadata">
                <div className="metadata-item" data-cy="modal-metadata-type">
                  <div className="metadata-label">Type</div>
                  <div className="metadata-value">{selectedIncident.type}</div>
                </div>
                <div className="metadata-item" data-cy="modal-metadata-severity">
                  <div className="metadata-label">Severity</div>
                  <div className={`severity-badge ${getSeverityClass(selectedIncident.severity)}`}>{selectedIncident.severity}</div>
                </div>
                <div className="metadata-item" data-cy="modal-metadata-status">
                  <div className="metadata-label">Status</div>
                  <div className={`status-badge ${getStatusClass(selectedIncident.status)}`}>{selectedIncident.status}</div>
                </div>
                <div className="metadata-item" data-cy="modal-metadata-duration">
                  <div className="metadata-label">Duration</div>
                  <div className="metadata-value">{selectedIncident.duration}</div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }} data-cy="modal-location">
                <h4 style={{ color: 'var(--form-section-title)', marginBottom: '0.5rem' }} data-cy="modal-location-title">Location</h4>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} data-cy="modal-location-content">
                  <MapPinIcon />
                  {selectedIncident.location}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }} data-cy="modal-description">
                <h4 style={{ color: 'var(--form-section-title)', marginBottom: '0.5rem' }} data-cy="modal-description-title">Description</h4>
                <p data-cy="modal-description-content">{selectedIncident.description}</p>
              </div>

              {selectedIncident.responders && (
                <div style={{ marginBottom: '1.5rem' }} data-cy="modal-responders">
                  <h4 style={{ color: 'var(--form-section-title)', marginBottom: '0.5rem' }} data-cy="modal-responders-title">Response Teams</h4>
                  <ul style={{ listStyle: 'none', padding: 0 }} data-cy="modal-responders-list">
                    {selectedIncident.responders.map((responder, index) => (
                      <li 
                        key={index} 
                        style={{ 
                          padding: '0.5rem', 
                          backgroundColor: 'var(--uploaded-file-bg)', 
                          borderRadius: '4px',
                          marginBottom: '0.25rem'
                        }}
                        data-cy={`modal-responder-${index}`}
                      >
                        {responder}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedIncident.timeline && (
                <div data-cy="modal-timeline">
                  <h4 style={{ color: 'var(--form-section-title)', marginBottom: '0.5rem' }} data-cy="modal-timeline-title">Timeline</h4>
                  <div style={{ borderLeft: '2px solid var(--form-section-title)', paddingLeft: '1rem' }} data-cy="modal-timeline-content">
                    {selectedIncident.timeline.map((event, index) => (
                      <div key={index} style={{ marginBottom: '1rem', position: 'relative' }} data-cy={`modal-timeline-event-${index}`}>
                        <div style={{ 
                          position: 'absolute', 
                          left: '-1.5rem', 
                          top: '0.25rem',
                          width: '8px', 
                          height: '8px', 
                          backgroundColor: 'var(--form-section-title)', 
                          borderRadius: '50%' 
                        }} data-cy="timeline-indicator"></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--form-help-text)', marginBottom: '0.25rem' }} data-cy="timeline-time">
                          {event.time}
                        </div>
                        <div data-cy="timeline-event">{event.event}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;