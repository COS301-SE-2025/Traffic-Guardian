import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../consts/SocketContext';
import './GlobalAlertBadge.css';

const BellIcon = () => (
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
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);

const XIcon = () => (
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
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const CheckIcon = () => (
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
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const DocumentIcon = () => (
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
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const LocationIcon = () => (
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

const UserIcon = () => (
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
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const ActivityIcon = () => (
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

interface ApiIncident {
  Incidents_ID: number;
  Incidents_DateTime: string;
  Incidents_Longitude: number | null;
  Incidents_Latitude: number | null;
  Incident_Severity: 'high' | 'medium' | 'low';
  Incident_Status: 'open' | 'ongoing' | 'resolved' | 'closed';
  Incident_Reporter: string | null;
}

interface RealTimeAlert {
  id: string;
  incident: ApiIncident;
  timestamp: Date;
  acknowledged: boolean;
}

const GlobalAlertBadge: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    realtimeAlerts,
    unreadAlertCount,
    acknowledgeAlert,
    clearAllAlerts,
    markAllAsRead,
  } = useSocket();

  const [showPanel, setShowPanel] = useState(false);

  // Don't show on landing page or account/signup pages
  if (
    location.pathname === '/' ||
    location.pathname === '/account' ||
    location.pathname === '/signup'
  ) {
    return null;
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getSeverityDisplay = (severity: string) => {
    const map = { high: 'Critical', medium: 'Moderate', low: 'Minor' };
    return map[severity as keyof typeof map] || severity;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'HIGH';
      case 'medium':
        return 'MED';
      case 'low':
        return 'LOW';
      default:
        return 'INFO';
    }
  };

  return (
    <>
      {/* Floating Alert Badge */}
      <div className="global-alert-badge" data-testid="global-alert-badge">
        {/* Alerts Button */}
        <button
          className={`global-alerts-btn ${
            unreadAlertCount > 0 ? 'has-alerts' : ''
          }`}
          onClick={() => setShowPanel(true)}
          title={`${unreadAlertCount} unread alerts`}
        >
          <BellIcon />
          {unreadAlertCount > 0 && (
            <span className="global-alert-count">
              {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
            </span>
          )}
        </button>
      </div>

      {/* Alert Panel */}
      {showPanel && (
        <div
          className="global-alert-panel-overlay"
          onClick={() => setShowPanel(false)}
        >
          <div
            className="global-alert-panel"
            onClick={e => e.stopPropagation()}
          >
            <div className="global-alert-panel-header">
              <h3>Real-time Alerts</h3>
              <div className="global-alert-panel-actions">
                {realtimeAlerts.length > 0 && (
                  <>
                    <button className="btn-link-global" onClick={markAllAsRead}>
                      Mark all as read
                    </button>
                    <button
                      className="btn-link-global"
                      onClick={clearAllAlerts}
                    >
                      Clear all
                    </button>
                  </>
                )}
                <button
                  className="btn-close-global"
                  onClick={() => setShowPanel(false)}
                >
                  <XIcon />
                </button>
              </div>
            </div>

            <div className="global-alert-panel-content">
              {realtimeAlerts.length === 0 ? (
                <div className="global-alerts-empty">
                  <BellIcon />
                  <p>No recent alerts</p>
                  <p className="empty-subtitle">
                    New incidents will appear here in real-time
                  </p>
                  <button
                    className="btn-view-incidents"
                    onClick={() => {
                      navigate('/incidents');
                      setShowPanel(false);
                    }}
                  >
                    <DocumentIcon />
                    View All Incidents
                  </button>
                </div>
              ) : (
                <>
                  <div className="global-alerts-list">
                    {realtimeAlerts.slice(0, 10).map((alert: RealTimeAlert) => (
                      <div
                        key={alert.id}
                        className={`global-alert-item ${
                          alert.acknowledged ? 'acknowledged' : 'unread'
                        } severity-${alert.incident.Incident_Severity}`}
                      >
                        <div className="global-alert-content">
                          <div className="global-alert-header">
                            <span
                              className={`global-alert-severity ${alert.incident.Incident_Severity}`}
                            >
                              {getSeverityIcon(
                                alert.incident.Incident_Severity
                              )}{' '}
                              {getSeverityDisplay(
                                alert.incident.Incident_Severity
                              )}
                            </span>
                            <span className="global-alert-time">
                              {formatRelativeTime(alert.timestamp)}
                            </span>
                          </div>
                          <div className="global-alert-details">
                            <div className="global-alert-id">
                              <DocumentIcon />
                              ID: {alert.incident.Incidents_ID}
                            </div>
                            <div className="global-alert-location">
                              {alert.incident.Incidents_Latitude &&
                              alert.incident.Incidents_Longitude ? (
                                <>
                                  <LocationIcon />
                                  Lat: {alert.incident.Incidents_Latitude}, Lng:{' '}
                                  {alert.incident.Incidents_Longitude}
                                </>
                              ) : (
                                <>
                                  <LocationIcon />
                                  Location not specified
                                </>
                              )}
                            </div>
                            <div className="global-alert-reporter">
                              <UserIcon />
                              Reporter:{' '}
                              {alert.incident.Incident_Reporter || 'Unknown'}
                            </div>
                            <div className="global-alert-status">
                              <ActivityIcon />
                              Status: {alert.incident.Incident_Status}
                            </div>
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <button
                            className="btn-acknowledge-global"
                            onClick={() => acknowledgeAlert(alert.id)}
                            title="Mark as read"
                          >
                            <CheckIcon />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="global-alert-panel-footer">
                    <button
                      className="btn-view-all-incidents"
                      onClick={() => {
                        navigate('/incidents');
                        setShowPanel(false);
                      }}
                    >
                      <DocumentIcon />
                      View All Incidents Page
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalAlertBadge;
