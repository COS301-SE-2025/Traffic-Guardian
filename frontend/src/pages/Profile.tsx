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
          // Fetch all incidents
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

  if (loading) return <div className="loading-spinner">Loading profile data...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="welcome-message">
          Welcome back, <strong>{user.name}</strong>
          {user.role === 'admin' && <span className="admin-badge">Admin</span>}
        </div>
      </div>

      <div className="profile-container">
        <div className="profile-section">
          <h3>Account Information</h3>
          <div className="info-item">
            <span className="info-label">Username:</span>
            <span className="info-value">{user.name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Email:</span>
            <span className="info-value">{user.email}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Account Type:</span>
            <span className="info-value">{user.role || 'Standard User'}</span>
          </div>
        </div>

        <div className="profile-section">
          <h3>Notification Preferences</h3>
          <div className="preference-item">
            <label>
              <input
                type="checkbox"
                checked={preferences.receiveAlerts}
                onChange={(e) => handlePreferenceChange('receiveAlerts', e.target.checked)}
              />
              Receive incident alerts
            </label>
          </div>
          <div className="preference-item">
            <label>
              <input
                type="checkbox"
                checked={preferences.darkMode}
                onChange={(e) => handlePreferenceChange('darkMode', e.target.checked)}
              />
              Enable dark mode
            </label>
          </div>
          <div className="preference-item">
            <label>Alert Level:</label>
            <select
              value={preferences.alertLevel}
              onChange={(e) => handlePreferenceChange('alertLevel', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {user.role === 'admin' && (
          <div className="profile-section">
            <h3>Admin Dashboard</h3>
            <div className="stats-container">
              <div className="stat-card">
                <div className="stat-value">{incidentCount}</div>
                <div className="stat-label">Total Incidents</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{alertCount}</div>
                <div className="stat-label">Alerts Sent</div>
              </div>
            </div>
            <Button 
              label="Manage Incidents" 
              onClick={() => navigate('/incident-management')} 
            />
          </div>
        )}

        <div className="profile-actions">
          <Button 
            label="Change Password" 
            onClick={() => navigate('/change-password')} 
          />
          <Button 
            label="Sign Out" 
            onClick={handleSignOut}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;