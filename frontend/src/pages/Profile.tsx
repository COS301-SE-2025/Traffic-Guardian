import React, { useState, useEffect } from 'react';
import './Profile.css';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';

interface User {
  name: string;
  email: string;
  role?: string;
}

interface Preferences {
  receiveAlerts: boolean;
  darkMode: boolean;
  alertLevel?: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User>({ name: '', email: '' });
  const [preferences, setPreferences] = useState<Preferences>({ 
    receiveAlerts: true, 
    darkMode: false,
    alertLevel: 'medium'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidentCount, setIncidentCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const apiKey = localStorage.getItem('apiKey');
        if (!apiKey) {
          throw new Error('No API key found. Please log in.');
        }

        // Fetch user profile
        const userResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/profile`, {
          headers: { 
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          },
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const userData = await userResponse.json();
        setUser({
          name: userData.User_Username || 'Unknown',
          email: userData.User_Email || '',
          role: userData.User_Role
        });

        // Fetch user preferences
        const prefsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/user/preferences`, {
          headers: { 
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          },
        });

        if (prefsResponse.ok) {
          const prefsData = await prefsResponse.json();
          setPreferences(prefsData.preferences || {
            receiveAlerts: true,
            darkMode: false,
            alertLevel: 'medium'
          });
        }

        // Fetch incident and alert counts for admins
        if (userData.User_Role === 'admin') {
          const incidentsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/incidents`, {
            headers: { 
              'X-API-Key': apiKey,
              'Content-Type': 'application/json'
            },
          });

          if (!incidentsResponse.ok) {
            throw new Error('Failed to fetch incidents');
          }
          const incidents = await incidentsResponse.json();
          setIncidentCount(incidents.length);

          // Fetch alerts for each incident and sum them
          let totalAlerts = 0;
          for (const incident of incidents) {
            const alertsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/incidents/${incident.Incident_ID}/alerts`, {
              headers: { 
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
              },
            });
            if (alertsResponse.ok) {
              const alerts = await alertsResponse.json();
              totalAlerts += alerts.length;
            }
          }
          setAlertCount(totalAlerts);
        }

      } catch (err: any) {
        setError(err.message);
        if (err.message.includes('unauthorized') || err.message.includes('API key')) {
          navigate('/account');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [navigate]);

  const handlePreferenceChange = async (key: keyof Preferences, value: any) => {
    const updatedPrefs = { ...preferences, [key]: value };
    setPreferences(updatedPrefs);

    try {
      const apiKey = localStorage.getItem('apiKey');
      if (!apiKey) throw new Error('No API key found');

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/preferences`, {
        method: 'PUT',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: updatedPrefs }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('apiKey');
    localStorage.removeItem('user');
    navigate('/account');
  };

  if (loading) return (
    <div className="loading-spinner" data-cy="loading-spinner" aria-busy="true">
      Loading profile data...
    </div>
  );
  if (error) return (
    <div className="error-message" data-cy="error-message" role="alert">
      Error: {error}
    </div>
  );

  return (
    <div className="profile-page" data-cy="profile-page" id="profile-page">
      <div className="profile-header" data-cy="profile-header" id="profile-header">
        <div className="welcome-message" data-cy="welcome-message">
          Welcome back, <strong data-cy="user-name">{user.name}</strong>
          {user.role === 'admin' && <span className="admin-badge" data-cy="admin-badge">Admin</span>}
        </div>
      </div>

      <div className="profile-container" data-cy="profile-container">
        <div className="profile-section" data-cy="account-info-section" id="account-info-section" role="region" aria-labelledby="account-info-title">
          <h3 data-cy="account-info-title" id="account-info-title">Account Information</h3>
          <div className="info-item" data-cy="info-item-username">
            <span className="info-label" data-cy="info-label">Username:</span>
            <span className="info-value" data-cy="info-value">{user.name}</span>
          </div>
          <div className="info-item" data-cy="info-item-email">
            <span className="info-label" data-cy="info-label">Email:</span>
            <span className="info-value" data-cy="info-value">{user.email}</span>
          </div>
          <div className="info-item" data-cy="info-item-account-type">
            <span className="info-label" data-cy="info-label">Account Type:</span>
            <span className="info-value" data-cy="info-value">{user.role || 'Standard User'}</span>
          </div>
        </div>

        <div className="profile-section" data-cy="notification-prefs-section" id="notification-prefs-section" role="region" aria-labelledby="notification-prefs-title">
          <h3 data-cy="notification-prefs-title" id="notification-prefs-title">Notification Preferences</h3>
          <div className="preference-item" data-cy="preference-item-receive-alerts">
            <label htmlFor="receive-alerts">
              <input
                type="checkbox"
                id="receive-alerts"
                checked={preferences.receiveAlerts}
                onChange={(e) => handlePreferenceChange('receiveAlerts', e.target.checked)}
                data-cy="receive-alerts-checkbox"
                aria-label="Receive incident alerts"
              />
              Receive incident alerts
            </label>
          </div>
          <div className="preference-item" data-cy="preference-item-dark-mode">
            <label htmlFor="dark-mode">
              <input
                type="checkbox"
                id="dark-mode"
                checked={preferences.darkMode}
                onChange={(e) => handlePreferenceChange('darkMode', e.target.checked)}
                data-cy="dark-mode-checkbox"
                aria-label="Enable dark mode"
              />
              Enable dark mode
            </label>
          </div>
          <div className="preference-item" data-cy="preference-item-alert-level">
            <label htmlFor="alert-level" data-cy="alert-level-label">Alert Level:</label>
            <select
              id="alert-level"
              value={preferences.alertLevel}
              onChange={(e) => handlePreferenceChange('alertLevel', e.target.value)}
              data-cy="alert-level-select"
              aria-label="Select alert level"
            >
              <option value="low" data-cy="alert-level-option-low">Low</option>
              <option value="medium" data-cy="alert-level-option-medium">Medium</option>
              <option value="high" data-cy="alert-level-option-high">High</option>
            </select>
          </div>
        </div>

        {user.role === 'admin' && (
          <div className="profile-section" data-cy="admin-dashboard-section" id="admin-dashboard-section" role="region" aria-labelledby="admin-dashboard-title">
            <h3 data-cy="admin-dashboard-title" id="admin-dashboard-title">Admin Dashboard</h3>
            <div className="stats-container" data-cy="stats-container">
              <div className="stat-card" data-cy="stat-card-incidents">
                <div className="stat-value" data-cy="stat-value">{incidentCount}</div>
                <div className="stat-label" data-cy="stat-label">Total Incidents</div>
              </div>
              <div className="stat-card" data-cy="stat-card-alerts">
                <div className="stat-value" data-cy="stat-value">{alertCount}</div>
                <div className="stat-label" data-cy="stat-label">Alerts Sent</div>
              </div>
            </div>
            <Button 
              label="Manage Incidents" 
              onClick={() => navigate('/incident-management')} 
              data-cy="manage-incidents-button"
              aria-label="Navigate to incident management"
            />
          </div>
        )}

        <div className="profile-actions" data-cy="profile-actions">
          <Button 
            label="Change Password" 
            onClick={() => navigate('/change-password')} 
            data-cy="change-password-button"
            aria-label="Navigate to change password"
          />
          <Button 
            label="Sign Out" 
            onClick={handleSignOut}
            data-cy="sign-out-button"
            aria-label="Sign out"
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;