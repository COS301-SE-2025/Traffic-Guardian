import React, { useState, useEffect } from 'react';
import './Dashboard.css';

// Icon components (unchanged)
const AlertTriangleIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const CameraIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764TIncidents764a1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
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

  // Example useEffect to update currentTime
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Render the dashboard
  return (
    <div className="dashboard">
      <h1>Traffic Guardian Dashboard</h1>
      <div className="stats">
        <div className="stat-card">
          <AlertTriangleIcon />
          <h3>Total Incidents</h3>
          <p>{stats.totalIncidents}</p>
        </div>
        <div className="stat-card">
          <CameraIcon />
          <h3>Cameras Online</h3>
          <p>{stats.camerasOnline}/{stats.totalCameras}</p>
        </div>
        <div className="stat-card">
          <ClockIcon />
          <h3>Avg Response Time</h3>
          <p>{stats.avgResponseTime}</p>
        </div>
        <div className="stat-card">
          <TrendingUpIcon />
          <h3>Incidents Today</h3>
          <p>{stats.incidentsToday}</p>
        </div>
      </div>

      <h2>Active Incidents</h2>
      <div className="incidents">
        {activeIncidents.map((incident) => (
          <div key={incident.id} className="incident-card">
            <h3>{incident.type}</h3>
            <p><MapPinIcon /> {incident.location}</p>
            <p><EyeIcon /> {incident.camera}</p>
            <p><ClockIcon /> {incident.time} ({incident.duration})</p>
            <p>Status: {incident.status}</p>
            <p>Severity: {incident.severity}</p>
            <p>Reported By: {incident.reportedBy}</p>
            <p>Assigned To: {incident.assignedTo}</p>
          </div>
        ))}
      </div>

      <h2>Camera Feeds</h2>
      <div className="camera-feeds">
        {cameraFeeds.map((camera) => (
          <div key={camera.id} className="camera-card">
            <h3>{camera.name}</h3>
            <p>Status: {camera.status}</p>
            <p>Incidents: {camera.incidents}</p>
            <p>Last Update: {camera.lastUpdate}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Export as default
export default Dashboard;