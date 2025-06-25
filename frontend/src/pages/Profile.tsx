import React, { useState, useEffect } from 'react';
import './Profile.css';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../consts/ThemeContext';

interface User {
  name: string;
  email: string;
  role?: string;
}

interface Preferences {
  notifications: boolean;
  alertLevel: string;
  theme: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { toggleDarkMode } = useTheme();
  const [user, setUser] = useState<User>({ name: '', email: '' });
  const [preferences, setPreferences] = useState<Preferences>({
    notifications: true,
    alertLevel: 'medium',
    theme: 'dark',
  });
  const [tempPreferences, setTempPreferences] = useState<Preferences>({ ...preferences });
  const [savedPreferences, setSavedPreferences] = useState<Preferences | null>(null);
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

        const userResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/profile`, {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const userData = await userResponse.json();
        setUser({
          name: userData.User_Username || 'Unknown',
          email: userData.User_Email || '',
          role: userData.User_Role,
        });

        const prefsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/user/preferences`, {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (prefsResponse.ok) {
          const prefsData = await prefsResponse.json();
          const fetchedPrefs = typeof prefsData.preferences === 'string'
            ? JSON.parse(prefsData.preferences)
            : prefsData.preferences || {};

          const currentPrefs = Object.keys(fetchedPrefs).length === 0 && savedPreferences
            ? savedPreferences
            : fetchedPrefs;

          setPreferences(currentPrefs);
          setTempPreferences(currentPrefs);
          toggleDarkMode(currentPrefs.theme === 'dark');
        } else {
          throw new Error('Failed to fetch preferences');
        }

        if (userData.User_Role === 'admin') {
          const incidentsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/incidents`, {
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
            },
          });

          if (!incidentsResponse.ok) {
            throw new Error('Failed to fetch incidents');
          }
          const incidents = await incidentsResponse.json();
          setIncidentCount(incidents.length);

          let totalAlerts = 0;
          for (const incident of incidents) {
            const alertsResponse = await fetch(
              `${process.env.REACT_APP_API_URL}/api/incidents/${incident.Incident_ID}/alerts`,
              {
                headers: {
                  'X-API-Key': apiKey,
                  'Content-Type': 'application/json',
                },
              }
            );
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
  }, [navigate, toggleDarkMode, savedPreferences]);

  const handlePreferenceChange = (key: keyof Preferences, value: any) => {
    setTempPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSavePreferences = async () => {
    try {
      const apiKey = localStorage.getItem('apiKey');
      if (!apiKey) {
        setError('No API key found. Please log in.');
        navigate('/account');
        return;
      }

      if (!user.email) {
        setError('User email not available. Please try again.');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/preferences`, {
        method: 'PUT',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          User_Email: user.email,
          preferences: tempPreferences,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update preferences');
      }

      const responseData = await response.json();
      if (responseData.user && responseData.user.User_Preferences) {
        const updatedPrefs = typeof responseData.user.User_Preferences === 'string'
          ? JSON.parse(responseData.user.User_Preferences)
          : responseData.user.User_Preferences;
        setPreferences(updatedPrefs);
        setSavedPreferences(updatedPrefs);
        toggleDarkMode(updatedPrefs.theme === 'dark');
      } else {
        setPreferences(tempPreferences);
        setSavedPreferences(tempPreferences);
        toggleDarkMode(tempPreferences.theme === 'dark');
      }
    } catch (err: any) {
      setError(err.message);
      setTempPreferences({ ...preferences });
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('apiKey');
    localStorage.removeItem('userEmail');
    navigate('/account');
  };

  if (loading) {
    return (
      <div className="loading-spinner" data-cy="loading-spinner" aria-busy="true">
        Loading profile data...
      </div>
    );
  }
  if (error) {
    return (
      <div className="error-message" data-cy="error-message" role="alert">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="profile-page" data-cy="profile-page" id="profile-page">
      <div className="profile-header" data-cy="profile-header" id="profile-header">
        <div className="welcome-message" data-cy="welcome-message">
          Welcome back, <strong data-cy="user-name">{user.name}</strong>
          {user.role === 'admin' && <span className="admin-badge" data-cy="admin-badge">Admin</span>}
        </div>
      </div>

      <div className="profile-container" data-cy="profile-container">
        <div
          className="profile-section"
          data-cy="account-info-section"
          id="account-info-section"
          role="region"
          aria-labelledby="account-info-title"
        >
          <h3 data-cy="account-info-title" id="account-info-title">
            Account Information
          </h3>
          <div className="info-item" data-cy="info-item-username">
            <span className="info-label" data-cy="info-label">
              Username:
            </span>
            <span className="info-value" data-cy="info-value">
              {user.name}
            </span>
          </div>
          <div className="info-item" data-cy="info-item-email">
            <span className="info-label" data-cy="info-label">
              Email:
            </span>
            <span className="info-value" data-cy="info-value">
              {user.email}
            </span>
          </div>
          <div className="info-item" data-cy="info-item-account-type">
            <span className="info-label" data-cy="info-label">
              Account Type:
            </span>
            <span className="info-value" data-cy="info-value">
              {user.role || 'Standard User'}
            </span>
          </div>
        </div>

        <div
          className="profile-section"
          data-cy="notification-prefs-section"
          id="notification-prefs-section"
          role="region"
          aria-labelledby="notification-prefs-title"
        >
          <h3 data-cy="notification-prefs-title" id="notification-prefs-title">
            Notification Preferences
          </h3>
          <div className="preference-item" data-cy="preference-item-notifications">
            <label htmlFor="notifications">
              <input
                type="checkbox"
                id="notifications"
                checked={tempPreferences.notifications}
                onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                data-cy="notifications-checkbox"
                aria-label="Receive incident notifications"
              />
              Receive incident notifications
            </label>
          </div>
          <div className="preference-item" data-cy="preference-item-theme">
            <label htmlFor="theme" data-cy="theme-label">
              Theme:
            </label>
            <select
              id="theme"
              value={tempPreferences.theme}
              onChange={(e) => handlePreferenceChange('theme', e.target.value)}
              data-cy="theme-select"
              aria-label="Select theme"
            >
              <option value="dark" data-cy="theme-option-dark">
                Dark
              </option>
              <option value="light" data-cy="theme-option-light">
                Light
              </option>
            </select>
          </div>
          <div className="preference-item" data-cy="preference-item-alert-level">
            <label htmlFor="alert-level" data-cy="alert-level-label">
              Alert Level:
            </label>
            <select
              id="alert-level"
              value={tempPreferences.alertLevel}
              onChange={(e) => handlePreferenceChange('alertLevel', e.target.value)}
              data-cy="alert-level-select"
              aria-label="Select alert level"
            >
              <option value="low" data-cy="alert-level-option-low">
                Low
              </option>
              <option value="medium" data-cy="alert-level-option-medium">
                Medium
              </option>
              <option value="high" data-cy="alert-level-option-high">
                High
              </option>
            </select>
          </div>
          <div className="preference-item" data-cy="preference-save">
            <Button
              label="Save Preferences"
              onClick={handleSavePreferences}
              data-cy="save-preferences-button"
              aria-label="Save preferences"
            />
          </div>
        </div>

        {user.role === 'admin' && (
          <div
            className="profile-section"
            data-cy="admin-dashboard-section"
            id="admin-dashboard-section"
            role="region"
            aria-labelledby="admin-dashboard-title"
          >
            <h3 data-cy="admin-dashboard-title" id="admin-dashboard-title">
              Admin Dashboard
            </h3>
            <div className="stats-container" data-cy="stats-container">
              <div className="stat-card" data-cy="stat-card-incidents">
                <div className="stat-value" data-cy="stat-value">
                  {incidentCount}
                </div>
                <div className="stat-label" data-cy="stat-label">
                  Total Incidents
                </div>
              </div>
              <div className="stat-card" data-cy="stat-card-alerts">
                <div className="stat-value" data-cy="stat-value">
                  {alertCount}
                </div>
                <div className="stat-label" data-cy="stat-label">
                  Alerts Sent
                </div>
              </div>
            </div>
            <div className="button-wrapper">
              <Button
                label="Manage Incidents"
                onClick={() => navigate('/incidents')}
                data-cy="manage-incidents-button"
                aria-label="Navigate to incident management"
              />
            </div>
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