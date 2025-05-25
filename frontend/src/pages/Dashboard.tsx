import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const AlertTriangleIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const CameraIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
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

const MapPinIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const ActivityIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const UsersIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
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
      assignedTo: 'Response Team Alpha'
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
      assignedTo: 'Response Team Beta'
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
      assignedTo: 'Traffic Control'
    }
  ]);

  const [cameraFeeds, setCameraFeeds] = useState<Camera[]>([
    { id: 'CAM-N1-03', name: 'N1 Western Bypass', status: 'Active', incidents: 1, lastUpdate: '12:15' },
    { id: 'CAM-M1-15', name: 'M1 Sandton Junction', status: 'Active', incidents: 1, lastUpdate: '12:14' },
    { id: 'CAM-R21-08', name: 'R21 OR Tambo', status: 'Active', incidents: 1, lastUpdate: '12:13' },
    { id: 'CAM-N3-12', name: 'N3 Johannesburg South', status: 'Active', incidents: 0, lastUpdate: '12:12' },
    { id: 'CAM-M2-07', name: 'M2 Germiston East', status: 'Offline', incidents: 0, lastUpdate: '11:30' }
  ]);

  const [stats, setStats] = useState<Stats>({
    totalIncidents: 24,
    activeIncidents: 3,
    camerasOnline: 4,
    totalCameras: 5,
    avgResponseTime: '4.2 min',
    incidentsToday: 8,
    systemHealth: 'healthy'
  });

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

  return (
    <div className="dashboard">
      {}
      <div className="notification-panel">
        {notifications.map((notification) => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            <div className="notification-header">
              <div className="notification-title">{notification.title}</div>
              <button 
                className="notification-close"
                onClick={() => removeNotification(notification.id)}
              >
                ×
              </button>
            </div>
            <div className="notification-content">{notification.message}</div>
          </div>
        ))}
      </div>

      {}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <div>
            <h2>Traffic Guardian Dashboard</h2>
            <div className="dashboard-subtitle">Real-time traffic incident monitoring system</div>
          </div>
          <div className="system-status">
            <div className="status-indicator">
              <div className={`status-dot ${getSystemHealthStatus().class}`}></div>
              {getSystemHealthStatus().text}
            </div>
          </div>
        </div>
        <div className="dashboard-time">
          <div className="dashboard-time-label">Current Time</div>
          <div className="dashboard-time-value">{formatTime(currentTime)}</div>
        </div>
      </div>

      {}
      <div className="dashboard-content">
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">Processing request...</div>
          </div>
        )}

        {}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-icon">
              <AlertTriangleIcon />
            </div>
            <div className="stat-card-title">Active Incidents</div>
            <div className="stat-card-value">{stats.activeIncidents}</div>
            <div className="stat-card-subtitle">Requiring immediate attention</div>
            <div className="progress-bar">
              <div 
                className="progress-fill critical" 
                style={{ width: `${(stats.activeIncidents / 10) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon">
              <CameraIcon />
            </div>
            <div className="stat-card-title">Cameras Online</div>
            <div className="stat-card-value">{stats.camerasOnline}/{stats.totalCameras}</div>
            <div className="stat-card-subtitle">{Math.round((stats.camerasOnline / stats.totalCameras) * 100)}% operational</div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(stats.camerasOnline / stats.totalCameras) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon">
              <ClockIcon />
            </div>
            <div className="stat-card-title">Avg Response Time</div>
            <div className="stat-card-value">{stats.avgResponseTime}</div>
            <div className="stat-card-subtitle">Last 24 hours</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon">
              <TrendingUpIcon />
            </div>
            <div className="stat-card-title">Today's Incidents</div>
            <div className="stat-card-value">{stats.incidentsToday}</div>
            <div className="stat-card-subtitle">vs 12 yesterday</div>
          </div>
        </div>

        {}
        <div className="dashboard-main-grid">
          {}
          <div className="incidents-section">
            <div className="incidents-header">
              <h3>Active Incidents</h3>
              <div className="incidents-badge">{stats.activeIncidents} Active</div>
            </div>
            <div className="incidents-list">
              {activeIncidents.map((incident) => (
                <div key={incident.id} className={`incident-item ${getSeverityClass(incident.severity)}`}>
                  <div className="incident-header">
                    <div className="incident-type">
                      <AlertTriangleIcon />
                      {incident.type}
                    </div>
                    <div className={`severity-badge ${getSeverityClass(incident.severity)}`}>
                      {incident.severity}
                    </div>
                  </div>
                  
                  <div className="incident-details">
                    <div className="incident-detail">
                      <MapPinIcon />
                      {incident.location}
                    </div>
                    <div className="incident-detail">
                      <CameraIcon />
                      {incident.camera}
                    </div>
                    <div className="incident-detail">
                      <ClockIcon />
                      Started at {incident.time} ({incident.duration})
                    </div>
                  </div>

                  <div className="incident-metadata">
                    <div className="metadata-item">
                      <div className="metadata-label">Status</div>
                      <div className="metadata-value">{incident.status}</div>
                    </div>
                    <div className="metadata-item">
                      <div className="metadata-label">Reported By</div>
                      <div className="metadata-value">{incident.reportedBy}</div>
                    </div>
                    <div className="metadata-item">
                      <div className="metadata-label">Assigned To</div>
                      <div className="metadata-value">{incident.assignedTo}</div>
                    </div>
                  </div>
                  
                  <div className="incident-actions">
                    <button 
                      className="incident-action"
                      onClick={() => handleIncidentAction(incident.id, 'view')}
                      disabled={loading}
                    >
                      View Details
                    </button>
                    <button 
                      className="incident-action"
                      onClick={() => handleIncidentAction(incident.id, 'resolve')}
                      disabled={loading}
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="last-updated">
              <div className="update-indicator"></div>
              Last updated: {formatTime(lastUpdate)}
            </div>
          </div>

          {}
          <div className="camera-section">
            <div className="camera-header">
              <h3>Camera Status</h3>
            </div>
            <div className="camera-list">
              {cameraFeeds.map((camera) => (
                <div key={camera.id} className="camera-item">
                  <div className="camera-info">
                    <div className={`camera-status-dot ${camera.status.toLowerCase()}`}></div>
                    <div className="camera-details">
                      <h4>{camera.name}</h4>
                      <p>{camera.id}</p>
                    </div>
                  </div>
                  <div className="camera-status">
                    <div className={`camera-status-text ${camera.status.toLowerCase()}`}>
                      {camera.status}
                    </div>
                    {camera.incidents > 0 && (
                      <div className="camera-incidents">
                        {camera.incidents} incident{camera.incidents > 1 ? 's' : ''}
                      </div>
                    )}
                    <div style={{ color: '#999999', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                      Last: {camera.lastUpdate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="last-updated">
              <div className="update-indicator"></div>
              Feeds updating live
            </div>
          </div>
        </div>

        {}
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="actions-grid">
            <button 
              className="action-button" 
              onClick={() => handleQuickAction('live-feed')}
            >
              <EyeIcon />
              <span>Live Feed</span>
            </button>
            <button 
              className="action-button" 
              onClick={() => handleQuickAction('report-incident')}
            >
              <AlertTriangleIcon />
              <span>Report Incident</span>
            </button>
            <button 
              className="action-button" 
              onClick={() => handleQuickAction('analytics')}
            >
              <ActivityIcon />
              <span>Analytics</span>
            </button>
            <button 
              className="action-button" 
              onClick={() => handleQuickAction('archive')}
            >
              <UsersIcon />
              <span>Archive</span>
            </button>
          </div>
        </div>
      </div>

      {}
      {selectedIncident && (
        <div className="modal-overlay" onClick={() => setSelectedIncident(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Incident Details - #{selectedIncident.id}</h3>
              <button 
                className="modal-close" 
                onClick={() => setSelectedIncident(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="incident-metadata">
                <div className="metadata-item">
                  <div className="metadata-label">Type</div>
                  <div className="metadata-value">{selectedIncident.type}</div>
                </div>
                <div className="metadata-item">
                  <div className="metadata-label">Severity</div>
                  <div className="metadata-value">{selectedIncident.severity}</div>
                </div>
                <div className="metadata-item">
                  <div className="metadata-label">Status</div>
                  <div className="metadata-value">{selectedIncident.status}</div>
                </div>
                <div className="metadata-item">
                  <div className="metadata-label">Duration</div>
                  <div className="metadata-value">{selectedIncident.duration}</div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ color: '#ff8c00', marginBottom: '0.5rem' }}>Location</h4>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPinIcon />
                  {selectedIncident.location}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ color: '#ff8c00', marginBottom: '0.5rem' }}>Description</h4>
                <p>{selectedIncident.description}</p>
              </div>

              {selectedIncident.responders && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ color: '#ff8c00', marginBottom: '0.5rem' }}>Response Teams</h4>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {selectedIncident.responders.map((responder, index) => (
                      <li key={index} style={{ 
                        padding: '0.5rem', 
                        backgroundColor: 'rgba(255,255,255,0.05)', 
                        borderRadius: '4px',
                        marginBottom: '0.25rem'
                      }}>
                        {responder}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedIncident.timeline && (
                <div>
                  <h4 style={{ color: '#ff8c00', marginBottom: '0.5rem' }}>Timeline</h4>
                  <div style={{ borderLeft: '2px solid #ff8c00', paddingLeft: '1rem' }}>
                    {selectedIncident.timeline.map((event, index) => (
                      <div key={index} style={{ marginBottom: '1rem', position: 'relative' }}>
                        <div style={{ 
                          position: 'absolute', 
                          left: '-1.5rem', 
                          top: '0.25rem',
                          width: '8px', 
                          height: '8px', 
                          backgroundColor: '#ff8c00', 
                          borderRadius: '50%' 
                        }}></div>
                        <div style={{ fontSize: '0.8rem', color: '#999999', marginBottom: '0.25rem' }}>
                          {event.time}
                        </div>
                        <div>{event.event}</div>
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