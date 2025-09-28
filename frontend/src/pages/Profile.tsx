import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Profile.css';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../consts/ThemeContext';
<<<<<<< HEAD
import CarLoadingAnimation from '../components/CarLoadingAnimation';
=======
import { useUser } from '../contexts/UserContext';
import LoadingSpinner from '../components/LoadingSpinner';
import dataPrefetchService from '../services/DataPrefetchService';
>>>>>>> Dev

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
  const { logout } = useUser();
  const hasInitialized = useRef(false);
  const [user, setUser] = useState<User>({ name: '', email: '' });
  const [preferences, setPreferences] = useState<Preferences>({
    notifications: true,
    alertLevel: 'medium',
    theme: 'dark',
  });
  const [tempPreferences, setTempPreferences] = useState<Preferences>({
    ...preferences,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidentCount, setIncidentCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  // Efficient function to fetch admin stats in a single API call
  const fetchAdminStats = useCallback(async (apiKey: string) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/admin/stats`,
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch admin stats: ${response.status}`);
      }

      const stats = await response.json();
      setIncidentCount(stats.incidentCount || 0);
      setAlertCount(stats.alertCount || 0);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      // Don't fail the entire profile load if admin stats fail
      setIncidentCount(0);
      setAlertCount(0);
    }
  }, []);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    const fetchProfileData = async () => {
      try {
        const apiKey = sessionStorage.getItem('apiKey');
        const savedTheme = localStorage.getItem('theme');

        if (!apiKey) {
          throw new Error('No API key found. Please log in.');
        }

        const userResponse = await fetch(
          `${process.env.REACT_APP_API_URL}/api/auth/profile`,
          {
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
            },
          },
        );

        if (!userResponse.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const userData = await userResponse.json();
        setUser({
          name: userData.User_Username || 'Unknown',
          email: userData.User_Email || '',
          role: userData.User_Role,
        });

        const prefsResponse = await fetch(
          `${process.env.REACT_APP_API_URL}/api/user/preferences`,
          {
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
            },
          },
        );

        let currentPrefs = {
          notifications: true,
          alertLevel: 'medium',
          theme: savedTheme || 'dark',
        };

        if (prefsResponse.ok) {
          const prefsData = await prefsResponse.json();
          let fetchedPrefs;
          try {
            fetchedPrefs =
              typeof prefsData.preferences === 'string' &&
              prefsData.preferences.trim()
                ? JSON.parse(prefsData.preferences)
                : prefsData.preferences || {};
          } catch (err) {
            console.warn(
              'Profile: Failed to parse preferences, using fallback',
              err,
            );
            fetchedPrefs = {};
          }

          const validTheme =
            fetchedPrefs.theme === 'dark' || fetchedPrefs.theme === 'light'
              ? fetchedPrefs.theme
              : savedTheme || 'dark';
          currentPrefs = {
            notifications: fetchedPrefs.notifications ?? true,
            alertLevel: fetchedPrefs.alertLevel || 'medium',
            theme: validTheme,
          };

          localStorage.setItem('theme', currentPrefs.theme);
        } else {
          console.warn(
            'Profile: Failed to fetch preferences, using saved theme:',
            savedTheme,
          );
          if (savedTheme) {
            currentPrefs = {
              notifications: true,
              alertLevel: 'medium',
              theme: savedTheme,
            };
            localStorage.setItem('theme', currentPrefs.theme);
          }
        }

        setPreferences(currentPrefs);
        setTempPreferences(currentPrefs);

        // Fetch admin data if user is admin - now using efficient single endpoint
        if (userData.User_Role === 'admin') {
          await fetchAdminStats(apiKey);
        }

        toggleDarkMode(currentPrefs.theme === 'dark');
      } catch (err: any) {
        setError(err.message);
        if (
          err.message.includes('unauthorized') ||
          err.message.includes('API key')
        ) {
          navigate('/account');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [fetchAdminStats, navigate, toggleDarkMode]);

  const handlePreferenceChange = (key: keyof Preferences, value: any) => {
    setTempPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSavePreferences = async () => {
    try {
      const apiKey = sessionStorage.getItem('apiKey');
      if (!apiKey) {
        setError('No API key found. Please log in.');
        navigate('/account');
        return;
      }

      if (!user.email) {
        setError('User email not available. Please try again.');
        return;
      }

      const validTheme =
        tempPreferences.theme === 'dark' || tempPreferences.theme === 'light'
          ? tempPreferences.theme
          : 'dark';
      const validatedPrefs = {
        ...tempPreferences,
        theme: validTheme,
      };

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user/preferences`,
        {
          method: 'PUT',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            User_Email: user.email,
            preferences: validatedPrefs,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update preferences');
      }

      const responseData = await response.json();
      let updatedPrefs;
      if (responseData.user && responseData.user.User_Preferences) {
        try {
          updatedPrefs =
            typeof responseData.user.User_Preferences === 'string' &&
            responseData.user.User_Preferences.trim()
              ? JSON.parse(responseData.user.User_Preferences)
              : responseData.user.User_Preferences;
        } catch (err) {
          console.warn(
            'Profile: Failed to parse updated preferences, using temp',
            err,
          );
          updatedPrefs = validatedPrefs;
        }

        updatedPrefs.theme =
          updatedPrefs.theme === 'dark' || updatedPrefs.theme === 'light'
            ? updatedPrefs.theme
            : validatedPrefs.theme;

        setPreferences(updatedPrefs);
        localStorage.setItem('theme', updatedPrefs.theme);
        toggleDarkMode(updatedPrefs.theme === 'dark');
      } else {
        setPreferences(validatedPrefs);
        localStorage.setItem('theme', validatedPrefs.theme);
        toggleDarkMode(validatedPrefs.theme === 'dark');
      }
    } catch (err: any) {
      console.error('Profile: Error saving preferences:', err);
      setError(err.message);
      setTempPreferences({ ...preferences });
    }
  };

  const handleSignOut = () => {
    logout();
    dataPrefetchService.stopPrefetching();
    navigate('/account');
  };

  if (loading) {
<<<<<<< HEAD
    return <CarLoadingAnimation />;
=======
    return (
      <LoadingSpinner
        size="large"
        text="Loading profile..."
        className="content"
      />
    );
>>>>>>> Dev
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
      <div
        className="profile-header"
        data-cy="profile-header"
        id="profile-header"
      >
        <div className="welcome-message" data-cy="welcome-message">
          Welcome back, <strong data-cy="user-name">{user.name}</strong>
          {user.role === 'admin' && (
            <span className="admin-badge" data-cy="admin-badge">
              Admin
            </span>
          )}
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
          <div
            className="preference-item"
            data-cy="preference-item-notifications"
          >
            <label htmlFor="notifications">
              <input
                type="checkbox"
                id="notifications"
                checked={tempPreferences.notifications}
                onChange={e =>
                  handlePreferenceChange('notifications', e.target.checked)
                }
                data-cy="notifications-checkbox"
                aria-label="Receive event notifications"
              />
              Receive event notifications
            </label>
          </div>
          <div className="preference-item" data-cy="theme-item">
            <label htmlFor="theme" data-cy="theme-label">
              Theme:
            </label>
            <select
              id="theme"
              value={tempPreferences.theme}
              onChange={e => handlePreferenceChange('theme', e.target.value)}
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
          <div className="preference-item" data-cy="alert-level-item">
            <label htmlFor="alertLevel" data-cy="alert-level-label">
              Alert Level:
            </label>
            <select
              id="alertLevel"
              value={tempPreferences.alertLevel}
              onChange={e =>
                handlePreferenceChange('alertLevel', e.target.value)
              }
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
            aria-labelledby="admin-section-title"
          >
            <h3 data-testid="admin-section-title" id="admin-section-title">
              Admin Dashboard
            </h3>
            <div className="stats-container" data-testid="stats-container">
              <div className="stats-item" data-testid="stats-incidents">
                <div className="stats-value" id="incidents-count">
                  {incidentCount}
                </div>
                <div className="stats-label" id="incidents-label">
                  Total Incidents
                </div>
              </div>
              <div className="stats-item" data-testid="alerts-sent">
                <div className="stats-value" id="alerts-value">
                  {alertCount}
                </div>
                <div className="stats-label" id="alerts-label">
                  Alerts Sent
                </div>
              </div>
            </div>
            <div className="button-container">
              <Button
                label="Manage Incidents"
                onClick={() => navigate('/incidents')}
                data-testid="manage-incidents-btn"
                aria-label="Go to incident management"
              />
            </div>
          </div>
        )}

        <div className="profile-actions" data-cy="test-actions">
          <Button
            label="Change Password"
            onClick={() => navigate('/change-password')}
            data-testid="change-password-btn"
            aria-label="Go to change password"
          />
          <Button
            label="Sign Out"
            onClick={handleSignOut}
            data-testid="sign-out-btn"
            aria-label="Sign out"
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
