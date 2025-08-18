import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './IncidentManagement.css';

interface Incident {
  Incident_ID: number;
  Incident_Date: string;
  Incident_Location: string;
  Incident_Severity: string;
  Incident_Status: string;
}

const IncidentManagement: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [statusUpdates, setStatusUpdates] = useState<{ [key: number]: string }>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiKey = sessionStorage.getItem('apiKey');
        if (!apiKey) {
          throw new Error('No API key found. Please log in.');
        }

        // Fetch user profile to get role
        const userResponse = await fetch(
          `${process.env.REACT_APP_API_URL}/api/auth/profile`,
          {
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
            },
          }
        );
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data');
        }
        const userData = await userResponse.json();
        setUserRole(userData.User_Role);

        if (userData.User_Role !== 'admin') {
          navigate('/profile');
          return;
        }

        // Fetch incidents
        const incidentsResponse = await fetch(
          `${process.env.REACT_APP_API_URL}/api/incidents`,
          {
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
            },
          }
        );
        if (!incidentsResponse.ok) {
          throw new Error('Failed to fetch incidents');
        }
        const incidentsData = await incidentsResponse.json();
        setIncidents(incidentsData);
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

    fetchData();
  }, [navigate]);

  const handleSelectChange = (incidentId: number, value: string) => {
    setStatusUpdates(prev => ({ ...prev, [incidentId]: value }));
  };

  const handleStatusChange = async (incidentId: number, newStatus: string) => {
    try {
      const apiKey = sessionStorage.getItem('apiKey');
      if (!apiKey) {
        throw new Error('No API key found');
      }
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/incidents/${incidentId}`,
        {
          method: 'PUT',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ Incident_Status: newStatus }),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to update incident status');
      }
      setIncidents(
        incidents.map(incident =>
          incident.Incident_ID === incidentId
            ? { ...incident, Incident_Status: newStatus }
            : incident
        )
      );
      setStatusUpdates(prev => {
        const { [incidentId]: _, ...rest } = prev;
        return rest;
      });
      toast.success('Incident status updated successfully!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (err: any) {
      setError(err.message);
      toast.error(`Error: ${err.message}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toISOString().split('T')[0];
  };

  if (loading) return <div className="loading-message">Loading...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (userRole !== 'admin')
    return <div className="access-denied-message">Access Denied</div>;

  return (
    <div className="incident-management-page">
      <div className="header-container">
        <button className="back-button" onClick={() => navigate('/profile')}>
          Back to Profile
        </button>
        <h2>Incident Management</h2>
      </div>
      <table className="incident-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Location</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map(incident => (
            <tr key={incident.Incident_ID}>
              <td>{incident.Incident_ID}</td>
              <td>{formatDate(incident.Incident_Date)}</td>
              <td>{incident.Incident_Location}</td>
              <td>{incident.Incident_Severity}</td>
              <td>
                <select
                  value={
                    statusUpdates[incident.Incident_ID] ||
                    incident.Incident_Status
                  }
                  onChange={e =>
                    handleSelectChange(incident.Incident_ID, e.target.value)
                  }
                >
                  <option value="open">Open</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="resolved">Resolved</option>
                </select>
              </td>
              <td>
                <button
                  id="update-button"
                  onClick={() =>
                    handleStatusChange(
                      incident.Incident_ID,
                      statusUpdates[incident.Incident_ID] ||
                        incident.Incident_Status
                    )
                  }
                >
                  Update
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ToastContainer
        theme="dark"
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default IncidentManagement;
