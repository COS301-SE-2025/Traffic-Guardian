import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Incidents.css';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSocket } from '../consts/SocketContext';

// SVG icon components
const AlertTriangleIcon = () => (
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
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
);

const PlusIcon = () => (
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
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const FilterIcon = () => (
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
      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
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

const EyeIcon = () => (
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
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const EditIcon = () => (
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
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const CameraIcon = () => (
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
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

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

const WifiOffIcon = () => (
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
      d="M3 3l18 18M8.5 8.5c.87-.87 2.04-1.4 3.3-1.4M12 12l9-9M3.5 14.5c0-1.5.6-2.85 1.6-3.85"
    />
  </svg>
);

const WifiIcon = () => (
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
      d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
    />
  </svg>
);

// TypeScript interfaces matching database schema
interface ApiIncident {
  Incidents_ID: number;
  Incidents_DateTime: string;
  Incidents_Longitude: number | null;
  Incidents_Latitude: number | null;
  Incident_Severity: 'high' | 'medium' | 'low';
  Incident_Status: 'open' | 'ongoing' | 'resolved' | 'closed';
  Incident_Reporter: string | null;
  Incident_CameraID?: number | null;
  Incident_Description?: string | null;
}

interface RealTimeAlert {
  id: string;
  incident: ApiIncident;
  timestamp: Date;
  acknowledged: boolean;
}

interface DisplayIncident {
  id: number;
  date: string;
  location: string;
  cameraId: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  status: 'open' | 'ongoing' | 'resolved' | 'closed';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface ManualIncidentForm {
  Incidents_DateTime: string;
  Incidents_Longitude: string;
  Incidents_Latitude: string;
  Incident_Severity: 'high' | 'medium' | 'low';
  Incident_Status: 'open' | 'ongoing' | 'resolved' | 'closed';
  Incident_Reporter: string;
  User_Email: string;
  Incident_CameraID?: string;
  Incident_Description?: string;
}

interface EditIncidentForm {
  Incidents_DateTime: string;
  Incidents_Longitude: string;
  Incidents_Latitude: string;
  Incident_Severity: 'high' | 'medium' | 'low';
  Incident_Status: 'open' | 'ongoing' | 'resolved' | 'closed';
  Incident_Description?: string;
}

interface FilterState {
  search: string;
  status: string;
  severity: string;
  type: string;
  dateFrom: string;
  dateTo: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL;

const Incidents: React.FC = () => {
  const navigate = useNavigate();

  const {
    isConnected,
    realtimeAlerts,
    unreadAlertCount,
    acknowledgeAlert,
    clearAllAlerts,
    markAllAsRead,
  } = useSocket();

  const [incidents, setIncidents] = useState<DisplayIncident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<DisplayIncident[]>(
    [],
  );
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    severity: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showManualForm, setShowManualForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedStatuses, setSelectedStatuses] = useState<
    Record<number, 'open' | 'ongoing' | 'resolved' | 'closed'>
  >({});
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<DisplayIncident | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState<DisplayIncident | null>(null);

  const [manualIncident, setManualIncident] = useState<ManualIncidentForm>({
    Incidents_DateTime: new Date().toISOString().slice(0, 16),
    Incidents_Longitude: '',
    Incidents_Latitude: '',
    Incident_Severity: 'medium',
    Incident_Status: 'open',
    Incident_Reporter: '',
    User_Email: '',
    Incident_CameraID: '',
    Incident_Description: '',
  });

  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof ManualIncidentForm, string>>
  >({});

  const [editForm, setEditForm] = useState<EditIncidentForm>({
    Incidents_DateTime: '',
    Incidents_Longitude: '',
    Incidents_Latitude: '',
    Incident_Severity: 'medium',
    Incident_Status: 'open',
    Incident_Description: '',
  });

  const [editFormErrors, setEditFormErrors] = useState<
    Partial<Record<keyof EditIncidentForm, string>>
  >({});

  const apiRequest = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const apiKey = sessionStorage.getItem('apiKey');
      if (!apiKey) {
        toast.error('Authentication required. Please log in.');
        navigate('/account');
        throw new Error('Authentication required');
      }

      const url = `${API_BASE_URL}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        ...options.headers,
      };

      try {
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
          if (response.status === 401) {
            toast.error('Authentication failed. Please log in again.');
            navigate('/account');
            throw new Error('Authentication failed');
          }
          if (response.status === 404) {
            throw new Error(`Endpoint not found: ${url}`);
          }
          throw new Error(
            `API request failed: ${response.status} ${response.statusText}`,
          );
        }
        return await response.json();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('Unauthorized') ||
          errorMessage.includes('API key') ||
          errorMessage.includes('Authentication failed')
        ) {
          toast.error('Authentication failed. Please log in again.');
          navigate('/account');
          throw new Error('Authentication failed');
        }
        throw error;
      }
    },
    [navigate],
  );

  const loadIncidents = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest('/api/incidents');

      const transformedIncidents: DisplayIncident[] = data.map(
        (incident: ApiIncident) => ({
          id: incident.Incidents_ID || 0,
          date: incident.Incidents_DateTime,
          location:
            incident.Incidents_Latitude && incident.Incidents_Longitude
              ? `Lat: ${incident.Incidents_Latitude}, Lng: ${incident.Incidents_Longitude}`
              : 'Not Available',
          cameraId: incident.Incident_CameraID
            ? String(incident.Incident_CameraID)
            : 'N/A',
          type: incident.Incident_Reporter ? 'Reported Incident' : 'Unknown',
          severity: incident.Incident_Severity,
          status: incident.Incident_Status,
          description: incident.Incident_Description || undefined,
          createdAt: incident.Incidents_DateTime,
          updatedAt: incident.Incidents_DateTime,
        }),
      );

      setIncidents(transformedIncidents);
      setFilteredIncidents(transformedIncidents);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to load incidents: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  const fetchData = useCallback(async () => {
    try {
      // apiRequest handles authentication checks and toasts centrally
      const userResponse = await apiRequest('/api/auth/profile');
      setUserRole(userResponse.User_Role || 'user');

      // Auto-populate reporter name and email from user profile
      const reporterName = userResponse.User_FirstName
        ? `${userResponse.User_FirstName} ${userResponse.User_LastName || ''}`.trim()
        : userResponse.User_Email || userResponse.Username || '';

      setManualIncident(prev => ({
        ...prev,
        Incident_Reporter: reporterName,
        User_Email: userResponse.User_Email || ''
      }));

      await loadIncidents();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Only show toast for non-authentication errors since apiRequest handles auth
      if (!errorMessage.includes('Authentication')) {
        toast.error(`Error: ${errorMessage}`);
      }
      // Navigation is handled by apiRequest for auth errors
    }
  }, [apiRequest, loadIncidents]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (realtimeAlerts.length > 0) {
      const latestAlert = realtimeAlerts[0];
      if (latestAlert && !latestAlert.acknowledged) {
        const newIncident: DisplayIncident = {
          id: latestAlert.incident.Incidents_ID || 0,
          date: latestAlert.incident.Incidents_DateTime,
          location:
            latestAlert.incident.Incidents_Latitude &&
            latestAlert.incident.Incidents_Longitude
              ? `Lat: ${latestAlert.incident.Incidents_Latitude}, Lng: ${latestAlert.incident.Incidents_Longitude}`
              : 'Not Available',
          cameraId: 'N/A',
          type: latestAlert.incident.Incident_Reporter
            ? 'Reported Incident'
            : 'Unknown',
          severity: latestAlert.incident.Incident_Severity,
          status: latestAlert.incident.Incident_Status,
          description: undefined,
          createdAt: latestAlert.incident.Incidents_DateTime,
          updatedAt: latestAlert.incident.Incidents_DateTime,
        };

        setIncidents(prev => {
          const exists = prev.some(inc => inc.id === newIncident.id);
          if (!exists) {
            return [newIncident, ...prev];
          }
          return prev;
        });
      }
    }
  }, [realtimeAlerts]);

  useEffect(() => {
    let filtered = incidents;

    if (filters.search) {
      filtered = filtered.filter(
        incident =>
          incident.location
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          incident.type.toLowerCase().includes(filters.search.toLowerCase()) ||
          incident.id.toString().includes(filters.search),
      );
    }

    if (filters.status) {
      filtered = filtered.filter(
        incident => incident.status === filters.status,
      );
    }

    if (filters.severity) {
      filtered = filtered.filter(
        incident => incident.severity === filters.severity,
      );
    }

    if (filters.type) {
      filtered = filtered.filter(incident => incident.type === filters.type);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(
        incident => new Date(incident.date) >= new Date(filters.dateFrom),
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(
        incident => new Date(incident.date) <= new Date(filters.dateTo),
      );
    }

    setFilteredIncidents(filtered);
    setCurrentPage(1);
  }, [filters, incidents]);

  const handleStatusChange = (
    incidentId: number,
    newStatus: 'open' | 'ongoing' | 'resolved' | 'closed',
  ) => {
    setSelectedStatuses(prev => ({ ...prev, [incidentId]: newStatus }));
  };

  const handleStatusUpdate = async (incidentId: number) => {
    const newStatus = selectedStatuses[incidentId];
    const currentStatus = incidents.find(i => i.id === incidentId)?.status;

    if (!newStatus || newStatus === currentStatus) {return;}

    setIsLoading(true);

    try {
      await apiRequest(`/api/incidents/${incidentId}`, {
        method: 'PUT',
        body: JSON.stringify({ Incident_Status: newStatus }),
      });

      setIncidents(prev =>
        prev.map(inc =>
          inc.id === incidentId ? { ...inc, status: newStatus } : inc,
        ),
      );

      setSelectedStatuses(prev => {
        const { [incidentId]: _, ...rest } = prev;
        return rest;
      });

      toast.success('Status updated successfully', { autoClose: 4000 });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncidentAction = async (incidentId: number, action: string) => {
    try {
      switch (action) {
        case 'view':
          const incident = incidents.find(inc => inc.id === incidentId);
          if (incident) {
            setSelectedIncident(incident);
            setShowDetailsModal(true);
          } else {
            toast.error('Incident not found');
          }
          break;
        case 'edit':
          if (userRole !== 'admin') {
            // Access denied - handled by UI state
            return;
          }
          const editIncident = incidents.find(inc => inc.id === incidentId);
          if (editIncident) {
            setEditingIncident(editIncident);
            // Parse location coordinates if available
            let lat = '', lng = '';
            if (editIncident.location.includes('Lat:') && editIncident.location.includes('Lng:')) {
              const coords = editIncident.location.match(/Lat: ([-\d.]+), Lng: ([-\d.]+)/);
              if (coords) {
                [, lat, lng] = coords;
              }
            }
            setEditForm({
              Incidents_DateTime: editIncident.date,
              Incidents_Longitude: lng,
              Incidents_Latitude: lat,
              Incident_Severity: editIncident.severity,
              Incident_Status: editIncident.status,
              Incident_Description: editIncident.description || '',
            });
            setEditFormErrors({});
            setShowEditModal(true);
          } else {
            toast.error('Incident not found');
          }
          break;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const handleManualIncidentChange = (
    key: keyof ManualIncidentForm,
    value: string | number,
  ) => {
    setManualIncident(prev => ({ ...prev, [key]: value }));

    if (formErrors[key]) {
      setFormErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ManualIncidentForm, string>> = {};

    if (!manualIncident.Incidents_DateTime.trim()) {
      errors.Incidents_DateTime = 'Date and time is required';
    } else {
      // Validate that the date is not in the future
      const selectedDate = new Date(manualIncident.Incidents_DateTime);
      const now = new Date();
      if (selectedDate > now) {
        errors.Incidents_DateTime = 'Incident date cannot be in the future';
      }
    }

    if (!manualIncident.Incident_Reporter.trim()) {
      errors.Incident_Reporter = 'Reporter name is required';
    }

    if (!manualIncident.User_Email.trim()) {
      errors.User_Email = 'Email is required';
    } else {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(manualIncident.User_Email)) {
        errors.User_Email = 'Invalid email format';
      }
    }

    if (manualIncident.Incidents_Latitude) {
      const lat = parseFloat(manualIncident.Incidents_Latitude);
      if (isNaN(lat)) {
        errors.Incidents_Latitude = 'Invalid latitude format';
      } else if (lat < -90 || lat > 90) {
        errors.Incidents_Latitude = 'Latitude must be between -90 and 90';
      }
    }

    if (manualIncident.Incidents_Longitude) {
      const lng = parseFloat(manualIncident.Incidents_Longitude);
      if (isNaN(lng)) {
        errors.Incidents_Longitude = 'Invalid longitude format';
      } else if (lng < -180 || lng > 180) {
        errors.Incidents_Longitude = 'Longitude must be between -180 and 180';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditIncidentChange = (
    key: keyof EditIncidentForm,
    value: string,
  ) => {
    setEditForm(prev => ({ ...prev, [key]: value }));

    if (editFormErrors[key]) {
      setEditFormErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validateEditForm = (): boolean => {
    const errors: Partial<Record<keyof EditIncidentForm, string>> = {};

    if (!editForm.Incidents_DateTime.trim()) {
      errors.Incidents_DateTime = 'Date and time is required';
    }

    if (
      editForm.Incidents_Latitude &&
      isNaN(parseFloat(editForm.Incidents_Latitude))
    ) {
      errors.Incidents_Latitude = 'Invalid latitude format';
    }

    if (
      editForm.Incidents_Longitude &&
      isNaN(parseFloat(editForm.Incidents_Longitude))
    ) {
      errors.Incidents_Longitude = 'Invalid longitude format';
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitEditIncident = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingIncident) {
      toast.error('No incident selected for editing');
      return;
    }

    if (!validateEditForm()) {
      // Form errors are shown inline - no toast needed
      return;
    }

    setIsLoading(true);

    try {
      const apiPayload = {
        Incidents_DateTime: editForm.Incidents_DateTime,
        Incidents_Latitude: editForm.Incidents_Latitude
          ? parseFloat(editForm.Incidents_Latitude)
          : null,
        Incidents_Longitude: editForm.Incidents_Longitude
          ? parseFloat(editForm.Incidents_Longitude)
          : null,
        Incident_Severity: editForm.Incident_Severity,
        Incident_Status: editForm.Incident_Status,
        Incident_Description: editForm.Incident_Description || null,
      };

      await apiRequest(`/api/incidents/${editingIncident.id}`, {
        method: 'PUT',
        body: JSON.stringify(apiPayload),
      });

      // Update the local incidents list
      setIncidents(prev =>
        prev.map(inc =>
          inc.id === editingIncident.id
            ? {
              ...inc,
              date: editForm.Incidents_DateTime,
              location:
                  editForm.Incidents_Latitude && editForm.Incidents_Longitude
                    ? `Lat: ${editForm.Incidents_Latitude}, Lng: ${editForm.Incidents_Longitude}`
                    : 'Not Available',
              severity: editForm.Incident_Severity,
              status: editForm.Incident_Status,
              description: editForm.Incident_Description || undefined,
              updatedAt: new Date().toISOString(),
            }
            : inc,
        ),
      );

      setShowEditModal(false);
      setEditingIncident(null);
      toast.success('Incident updated successfully!', { autoClose: 4000 });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to update incident: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitManualIncident = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Form errors are shown inline - no toast needed
      return;
    }

    setIsLoading(true);

    try {
      const apiPayload = {
        Incidents_DateTime: manualIncident.Incidents_DateTime,
        Incidents_Latitude: manualIncident.Incidents_Latitude
          ? parseFloat(manualIncident.Incidents_Latitude)
          : null,
        Incidents_Longitude: manualIncident.Incidents_Longitude
          ? parseFloat(manualIncident.Incidents_Longitude)
          : null,
        Incident_Severity: manualIncident.Incident_Severity,
        Incident_Status: manualIncident.Incident_Status,
        Incident_Reporter: manualIncident.Incident_Reporter,
        User_Email: manualIncident.User_Email,
        Incident_CameraID: manualIncident.Incident_CameraID
          ? parseInt(manualIncident.Incident_CameraID)
          : null,
        Incident_Description: manualIncident.Incident_Description || null,
      };

      await apiRequest('/api/incidents', {
        method: 'POST',
        body: JSON.stringify(apiPayload),
      });

      // Incident created successfully

      await loadIncidents();

      setManualIncident({
        Incidents_DateTime: new Date().toISOString().slice(0, 16),
        Incidents_Longitude: '',
        Incidents_Latitude: '',
        Incident_Severity: 'medium',
        Incident_Status: 'open',
        Incident_Reporter: '',
        User_Email: '',
        Incident_CameraID: '',
        Incident_Description: '',
      });

      setShowManualForm(false);
      toast.success(
        'Incident reported successfully! All users have been alerted in real-time.',
        {
          autoClose: 5000,
        },
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to submit incident: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {return 'Just now';}
    if (diffMins < 60) {return `${diffMins}m ago`;}
    if (diffHours < 24) {return `${diffHours}h ago`;}
    return `${diffDays}d ago`;
  };

  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentIncidents = filteredIncidents.slice(startIndex, endIndex);

  const getSeverityClass = (severity: string) => severity.toLowerCase();
  const getStatusClass = (status: string) =>
    status.toLowerCase().replace('-', '');

  const getSeverityDisplay = (severity: string) => {
    const map = { high: 'Critical', medium: 'Moderate', low: 'Minor' };
    return map[severity as keyof typeof map] || severity;
  };

  const getStatusDisplay = (status: string) => {
    const map = {
      open: 'Active',
      ongoing: 'Ongoing',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    return map[status as keyof typeof map] || status;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    const dateTimeString = date.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Get timezone abbreviation (PST/PDT)
    const timeZone = date.toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      timeZoneName: 'short',
    }).split(', ')[1];

    return `${dateTimeString} (${timeZone})`;
  };

  if (isLoading && incidents.length === 0) {
    return (
      <LoadingSpinner
        size="large"
        text="Loading incidents..."
        className="content"
      />
    );
  }

  return (
    <div className="incidents-page" data-testid="incidents-container">
      {showAlertsPanel && (
        <div
          className="alerts-panel-overlay"
          onClick={() => setShowAlertsPanel(false)}
        >
          <div className="alerts-panel" onClick={e => e.stopPropagation()}>
            <div className="alerts-panel-header">
              <h3>Recent Alerts</h3>
              <div className="alerts-panel-actions">
                {realtimeAlerts.length > 0 && (
                  <>
                    <button className="btn-link" onClick={markAllAsRead}>
                      Mark all as read
                    </button>
                    <button className="btn-link" onClick={clearAllAlerts}>
                      Clear all
                    </button>
                  </>
                )}
                <button
                  className="btn-close"
                  onClick={() => setShowAlertsPanel(false)}
                >
                  <XIcon />
                </button>
              </div>
            </div>
            <div className="alerts-panel-content">
              {realtimeAlerts.length === 0 ? (
                <div className="alerts-empty">
                  <BellIcon />
                  <p>No recent alerts</p>
                  <p className="empty-subtitle">
                    New incident notifications will appear here
                  </p>
                </div>
              ) : (
                <div className="alerts-list">
                  {realtimeAlerts.map((alert: RealTimeAlert) => (
                    <div
                      key={alert.id}
                      className={`alert-item ${
                        alert.acknowledged ? 'acknowledged' : 'unread'
                      } severity-${alert.incident.Incident_Severity}`}
                    >
                      <div className="alert-content">
                        <div className="alert-header">
                          <span
                            className={`alert-severity ${alert.incident.Incident_Severity}`}
                          >
                            {getSeverityDisplay(
                              alert.incident.Incident_Severity,
                            )}{' '}
                            Incident
                          </span>
                          <span className="alert-time">
                            {formatRelativeTime(alert.timestamp)}
                          </span>
                        </div>
                        <div className="alert-details">
                          <div className="alert-id">
                            ID: {alert.incident.Incidents_ID}
                          </div>
                          <div className="alert-location">
                            {alert.incident.Incidents_Latitude &&
                            alert.incident.Incidents_Longitude
                              ? `Lat: ${alert.incident.Incidents_Latitude}, Lng: ${alert.incident.Incidents_Longitude}`
                              : 'Location not specified'}
                          </div>
                          <div className="alert-reporter">
                            Reporter:{' '}
                            {alert.incident.Incident_Reporter || 'Unknown'}
                          </div>
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          className="btn-acknowledge"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          <CheckIcon />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="incidents-header">
        <div className="incidents-title">
          <div>
            <h2>Incident Management</h2>
            <div className="incidents-subtitle">
              Monitor and manage traffic incidents across California
              <div className="connection-status">
                {isConnected ? (
                  <span className="status-connected">
                    <WifiIcon />
                    Real-time alerts active
                  </span>
                ) : (
                  <span className="status-disconnected">
                    <WifiOffIcon />
                    Real-time alerts disconnected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="incidents-actions">
          <button
            className="btn-manage"
            onClick={() => navigate('/incident-management')}
            data-testid="manage-incidents"
          >
            Manage Incidents
          </button>
          <button
            className={`btn-alerts ${unreadAlertCount > 0 ? 'has-alerts' : ''}`}
            onClick={() => setShowAlertsPanel(true)}
          >
            <BellIcon />
            <span>Alerts</span>
            {unreadAlertCount > 0 && (
              <span className="alert-badge">
                {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
              </span>
            )}
          </button>

          <button
            className="btn-secondary"
            onClick={() =>
              setFilters({
                search: '',
                status: '',
                severity: '',
                type: '',
                dateFrom: '',
                dateTo: '',
              })
            }
          >
            <FilterIcon />
            Clear Filters
          </button>
          <button
            className="rprt-btn-primary"
            onClick={() => setShowManualForm(true)}
          >
            <PlusIcon />
            Report Incident
          </button>
        </div>
      </div>

      <div className="incidents-content">
        <div className="incidents-filters">
          <div className="filter-group">
            <label className="filter-label">Search</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Search by ID, location, or type..."
              value={filters.search}
              onChange={e =>
                setFilters(prev => ({ ...prev, search: e.target.value }))
              }
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              className="filter-select"
              value={filters.status}
              onChange={e =>
                setFilters(prev => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="">All Statuses</option>
              <option value="open">Active</option>
              <option value="ongoing">Ongoing</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Severity</label>
            <select
              className="filter-select"
              value={filters.severity}
              onChange={e =>
                setFilters(prev => ({ ...prev, severity: e.target.value }))
              }
            >
              <option value="">All Severities</option>
              <option value="high">Critical</option>
              <option value="medium">Moderate</option>
              <option value="low">Minor</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Type</label>
            <select
              className="filter-select"
              value={filters.type}
              onChange={e =>
                setFilters(prev => ({ ...prev, type: e.target.value }))
              }
            >
              <option value="">All Types</option>
              <option value="Reported Incident">Reported Incident</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Date From</label>
            <input
              type="date"
              className="filter-input"
              value={filters.dateFrom}
              onChange={e =>
                setFilters(prev => ({ ...prev, dateFrom: e.target.value }))
              }
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Date To</label>
            <input
              type="date"
              className="filter-input"
              value={filters.dateTo}
              onChange={e =>
                setFilters(prev => ({ ...prev, dateTo: e.target.value }))
              }
            />
          </div>
        </div>

        <div
          className={`incidents-list ${
            filteredIncidents.length <= itemsPerPage ? 'small-table' : ''
          }`}
          data-testid="incident-list"
        >
          <div className="incidents-list-header">
            <input
              type="search"
              placeholder="Search incidents..."
              data-testid="search-input"
              style={{ visibility: 'hidden', position: 'absolute' }}
            />
            <h3 className="incidents-list-title">Incidents</h3>
            <div className="incidents-count">
              {filteredIncidents.length} Total
            </div>
          </div>

          <table className="incidents-table" data-testid="incidents-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Type</th>
                <th>Location</th>
                <th>Camera</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentIncidents.map(incident => (
                <tr key={incident.id}>
                  <td data-label="ID">
                    <span className="incident-id">#{incident.id}</span>
                  </td>
                  <td data-label="Date">
                    <div className="incident-time">
                      {formatDateTime(incident.date)}
                    </div>
                  </td>
                  <td data-label="Type">
                    <div className="incident-type">
                      <AlertTriangleIcon />
                      {incident.type}
                    </div>
                  </td>
                  <td data-label="Location">
                    <div className="incident-location">{incident.location}</div>
                  </td>
                  <td data-label="Camera">
                    <div className="incident-camera">
                      <CameraIcon />
                      {incident.cameraId}
                    </div>
                  </td>
                  <td data-label="Severity">
                    <span
                      className={`severity-badge ${getSeverityClass(
                        incident.severity,
                      )}`}
                    >
                      {getSeverityDisplay(incident.severity)}
                    </span>
                  </td>
                  <td data-label="Status">
                    <span
                      className={`status-badge ${getStatusClass(
                        incident.status,
                      )}`}
                    >
                      {getStatusDisplay(incident.status)}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="incident-actions">
                      <button
                        className="action-btn"
                        onClick={() =>
                          handleIncidentAction(incident.id, 'view')
                        }
                        title="View Details"
                        disabled={isLoading}
                      >
                        <EyeIcon />
                      </button>
                      <button
                        className="action-btn"
                        onClick={() =>
                          handleIncidentAction(incident.id, 'edit')
                        }
                        title="Edit"
                        disabled={isLoading || userRole !== 'admin'}
                      >
                        <EditIcon />
                      </button>
                      <div className="status-update-group">
                        <select
                          className="status-select"
                          value={
                            selectedStatuses[incident.id] || incident.status
                          }
                          onChange={e =>
                            handleStatusChange(
                              incident.id,
                              e.target.value as
                                | 'open'
                                | 'ongoing'
                                | 'resolved'
                                | 'closed',
                            )
                          }
                          disabled={isLoading || userRole !== 'admin'}
                        >
                          <option value="open">Active</option>
                          <option value="ongoing">Ongoing</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        <button
                          className="action-btn confirm-btn"
                          onClick={() => handleStatusUpdate(incident.id)}
                          title="Confirm Status Change"
                          disabled={
                            isLoading ||
                            !selectedStatuses[incident.id] ||
                            selectedStatuses[incident.id] === incident.status ||
                            userRole !== 'admin'
                          }
                        >
                          <CheckIcon />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`pagination-btn ${
                    currentPage === page ? 'active' : ''
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                className="pagination-btn"
                onClick={() =>
                  setCurrentPage(prev => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </button>
              <div className="pagination-info">
                Showing {startIndex + 1}-
                {Math.min(endIndex, filteredIncidents.length)} of{' '}
                {filteredIncidents.length}
              </div>
            </div>
          )}
        </div>
      </div>

      {showManualForm && (
        <div className="modal-overlay" onClick={() => setShowManualForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Report New Incident</h3>
              <button
                className="modal-close"
                onClick={() => setShowManualForm(false)}
              >
                <XIcon />
              </button>
            </div>

            <div className="modal-body">
              <form
                className="professional-incident-form"
                onSubmit={handleSubmitManualIncident}
              >
                <div className="form-section">
                  <h4 className="section-title">Incident Details</h4>
                  <p className="section-description">
                    Report a new traffic incident. All required fields must be
                    completed.
                  </p>

                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label className="form-label required">
                        Date and Time
                      </label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={manualIncident.Incidents_DateTime}
                        max={new Date().toISOString().slice(0, 16)}
                        onChange={e =>
                          handleManualIncidentChange(
                            'Incidents_DateTime',
                            e.target.value,
                          )
                        }
                        required
                      />
                      {formErrors.Incidents_DateTime && (
                        <div className="form-error">
                          {formErrors.Incidents_DateTime}
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label required">
                        Reporter Name
                      </label>
                      <input
                        type="text"
                        className="form-input form-input-disabled"
                        placeholder="Auto-populated from your account"
                        value={manualIncident.Incident_Reporter}
                        readOnly
                        disabled
                        required
                      />
                      {formErrors.Incident_Reporter && (
                        <div className="form-error">
                          {formErrors.Incident_Reporter}
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label required">
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="form-input form-input-disabled"
                        placeholder="Auto-populated from your account"
                        value={manualIncident.User_Email}
                        readOnly
                        disabled
                        required
                      />
                      {formErrors.User_Email && (
                        <div className="form-error">
                          {formErrors.User_Email}
                        </div>
                      )}
                      <div className="form-help">
                        Email notifications about this incident will be sent here
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label required">
                        Severity Level
                      </label>
                      <select
                        className="form-select"
                        value={manualIncident.Incident_Severity}
                        onChange={e =>
                          handleManualIncidentChange(
                            'Incident_Severity',
                            e.target.value as 'high' | 'medium' | 'low',
                          )
                        }
                        required
                      >
                        <option value="low">Low - Minor disruption</option>
                        <option value="medium">Medium - Moderate impact</option>
                        <option value="high">High - Critical incident</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label required">
                        Initial Status
                      </label>
                      <select
                        className="form-select"
                        value={manualIncident.Incident_Status}
                        onChange={e =>
                          handleManualIncidentChange(
                            'Incident_Status',
                            e.target.value as
                              | 'open'
                              | 'ongoing'
                              | 'resolved'
                              | 'closed',
                          )
                        }
                        required
                      >
                        <option value="open">Open - Newly reported</option>
                        <option value="ongoing">
                          Ongoing - Being addressed
                        </option>
                        <option value="resolved">Resolved - Issue fixed</option>
                        <option value="closed">Closed - Completed</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Camera ID</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., CALTRANS-D12-123"
                        value={manualIncident.Incident_CameraID || ''}
                        onChange={e =>
                          handleManualIncidentChange(
                            'Incident_CameraID',
                            e.target.value,
                          )
                        }
                      />
                      <div className="form-help">
                        Optional: Camera that detected or is related to the
                        incident
                      </div>
                    </div>

                    <div className="form-group full-width">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-input"
                        placeholder="Describe the incident details, or paste image URLs for evidence..."
                        value={manualIncident.Incident_Description || ''}
                        onChange={e =>
                          handleManualIncidentChange(
                            'Incident_Description',
                            e.target.value,
                          )
                        }
                        rows={4}
                        style={{ resize: 'vertical', minHeight: '80px' }}
                      />
                      <div className="form-help">
                        Optional: Additional details about the incident. You can
                        include image URLs as evidence.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title">Location Information</h4>
                  <p className="section-description">
                    GPS coordinates are optional but help with precise incident
                    location.
                  </p>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Latitude</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., -25.7479"
                        value={manualIncident.Incidents_Latitude}
                        onChange={e =>
                          handleManualIncidentChange(
                            'Incidents_Latitude',
                            e.target.value,
                          )
                        }
                      />
                      {formErrors.Incidents_Latitude && (
                        <div className="form-error">
                          {formErrors.Incidents_Latitude}
                        </div>
                      )}
                      <div className="form-help">
                        Decimal degrees format (negative for South)
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Longitude</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., 28.2293"
                        value={manualIncident.Incidents_Longitude}
                        onChange={e =>
                          handleManualIncidentChange(
                            'Incidents_Longitude',
                            e.target.value,
                          )
                        }
                      />
                      {formErrors.Incidents_Longitude && (
                        <div className="form-error">
                          {formErrors.Incidents_Longitude}
                        </div>
                      )}
                      <div className="form-help">
                        Decimal degrees format (positive for East)
                      </div>
                    </div>
                  </div>

                  <div className="location-helper">
                    <button
                      type="button"
                      className="helper-btn"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            position => {
                              setManualIncident(prev => ({
                                ...prev,
                                Incidents_Latitude:
                                  position.coords.latitude.toString(),
                                Incidents_Longitude:
                                  position.coords.longitude.toString(),
                              }));
                              toast.success('Current location captured', { autoClose: 3000 });
                            },
                            _error => {
                              // Location error handled by form state
                            },
                          );
                        } else {
                          // Geolocation error handled by form state
                        }
                      }}
                    >
                      Use Current Location
                    </button>
                    <span className="helper-text">
                      Or manually enter coordinates from GPS device or map
                    </span>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowManualForm(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="loading-spinner">Submitting...</div>
                    ) : (
                      <>
                        <CheckIcon />
                        Submit Incident Report
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedIncident && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content incident-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Incident Details</h3>
              <button
                className="modal-close"
                onClick={() => setShowDetailsModal(false)}
              >
                <XIcon />
              </button>
            </div>

            <div className="modal-body">
              <div className="incident-details-grid">
                <div className="detail-section">
                  <h4 className="detail-section-title">Basic Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label className="detail-label">Incident ID</label>
                      <span className="detail-value">#{selectedIncident.id}</span>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Date & Time</label>
                      <span className="detail-value">{formatDateTime(selectedIncident.date)}</span>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Type</label>
                      <span className="detail-value">
                        <AlertTriangleIcon />
                        {selectedIncident.type}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Location</label>
                      <span className="detail-value">{selectedIncident.location}</span>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Camera ID</label>
                      <span className="detail-value">
                        <CameraIcon />
                        {selectedIncident.cameraId}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-section-title">Status Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label className="detail-label">Severity Level</label>
                      <span className={`detail-value severity-badge ${getSeverityClass(selectedIncident.severity)}`}>
                        {getSeverityDisplay(selectedIncident.severity)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Current Status</label>
                      <span className={`detail-value status-badge ${getStatusClass(selectedIncident.status)}`}>
                        {getStatusDisplay(selectedIncident.status)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Created</label>
                      <span className="detail-value">{formatDateTime(selectedIncident.createdAt)}</span>
                    </div>
                    <div className="detail-item">
                      <label className="detail-label">Last Updated</label>
                      <span className="detail-value">{formatDateTime(selectedIncident.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {selectedIncident.description && (
                  <div className="detail-section full-width">
                    <h4 className="detail-section-title">Description</h4>
                    <div className="description-content">
                      <p>{selectedIncident.description}</p>
                    </div>
                  </div>
                )}

                <div className="detail-section full-width">
                  <h4 className="detail-section-title">Quick Actions</h4>
                  <div className="detail-actions">
                    <button
                      className="detail-action-btn"
                      onClick={() => {
                        if (selectedIncident.location.includes('Lat:') && selectedIncident.location.includes('Lng:')) {
                          const coords = selectedIncident.location.match(/Lat: ([-\d.]+), Lng: ([-\d.]+)/);
                          if (coords) {
                            const [, lat, lng] = coords;
                            window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                          }
                        } else {
                          toast.info('Location coordinates not available for mapping', { autoClose: 3000 });
                        }
                      }}
                    >
                      View on Map
                    </button>
                    <button
                      className="detail-action-btn"
                      onClick={() => {
                        const incidentText = `Incident #${selectedIncident.id} - ${selectedIncident.type} at ${selectedIncident.location} (${getSeverityDisplay(selectedIncident.severity)} severity, ${getStatusDisplay(selectedIncident.status)} status)`;
                        navigator.clipboard.writeText(incidentText).then(() => {
                          toast.success('Incident details copied to clipboard', { autoClose: 3000 });
                        }).catch(() => {
                          toast.error('Failed to copy to clipboard', { autoClose: 3000 });
                        });
                      }}
                    >
                      Copy Details
                    </button>
                    <button
                      className="detail-action-btn"
                      onClick={() => {
                        setShowDetailsModal(false);
                        setTimeout(() => {
                          handleIncidentAction(selectedIncident.id, 'edit');
                        }, 100);
                      }}
                      disabled={userRole !== 'admin'}
                    >
                      Edit Incident
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingIncident && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Incident #{editingIncident.id}</h3>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                <XIcon />
              </button>
            </div>

            <div className="modal-body">
              <form
                className="professional-incident-form"
                onSubmit={handleSubmitEditIncident}
              >
                <div className="form-section">
                  <h4 className="section-title">Incident Details</h4>
                  <p className="section-description">
                    Update incident information. Only administrators can edit incidents.
                  </p>

                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label className="form-label required">
                        Date and Time
                      </label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={editForm.Incidents_DateTime}
                        onChange={e =>
                          handleEditIncidentChange(
                            'Incidents_DateTime',
                            e.target.value,
                          )
                        }
                        required
                      />
                      {editFormErrors.Incidents_DateTime && (
                        <div className="form-error">
                          {editFormErrors.Incidents_DateTime}
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label required">
                        Severity Level
                      </label>
                      <select
                        className="form-select"
                        value={editForm.Incident_Severity}
                        onChange={e =>
                          handleEditIncidentChange(
                            'Incident_Severity',
                            e.target.value as 'high' | 'medium' | 'low',
                          )
                        }
                        required
                      >
                        <option value="low">Low - Minor disruption</option>
                        <option value="medium">Medium - Moderate impact</option>
                        <option value="high">High - Critical incident</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label required">
                        Status
                      </label>
                      <select
                        className="form-select"
                        value={editForm.Incident_Status}
                        onChange={e =>
                          handleEditIncidentChange(
                            'Incident_Status',
                            e.target.value as
                              | 'open'
                              | 'ongoing'
                              | 'resolved'
                              | 'closed',
                          )
                        }
                        required
                      >
                        <option value="open">Open - Newly reported</option>
                        <option value="ongoing">
                          Ongoing - Being addressed
                        </option>
                        <option value="resolved">Resolved - Issue fixed</option>
                        <option value="closed">Closed - Completed</option>
                      </select>
                    </div>

                    <div className="form-group full-width">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-input"
                        placeholder="Update incident description..."
                        value={editForm.Incident_Description || ''}
                        onChange={e =>
                          handleEditIncidentChange(
                            'Incident_Description',
                            e.target.value,
                          )
                        }
                        rows={4}
                        style={{ resize: 'vertical', minHeight: '80px' }}
                      />
                      <div className="form-help">
                        Optional: Additional details about the incident.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title">Location Information</h4>
                  <p className="section-description">
                    Update GPS coordinates if needed.
                  </p>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Latitude</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., -25.7479"
                        value={editForm.Incidents_Latitude}
                        onChange={e =>
                          handleEditIncidentChange(
                            'Incidents_Latitude',
                            e.target.value,
                          )
                        }
                      />
                      {editFormErrors.Incidents_Latitude && (
                        <div className="form-error">
                          {editFormErrors.Incidents_Latitude}
                        </div>
                      )}
                      <div className="form-help">
                        Decimal degrees format (negative for South)
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Longitude</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., 28.2293"
                        value={editForm.Incidents_Longitude}
                        onChange={e =>
                          handleEditIncidentChange(
                            'Incidents_Longitude',
                            e.target.value,
                          )
                        }
                      />
                      {editFormErrors.Incidents_Longitude && (
                        <div className="form-error">
                          {editFormErrors.Incidents_Longitude}
                        </div>
                      )}
                      <div className="form-help">
                        Decimal degrees format (positive for East)
                      </div>
                    </div>
                  </div>

                  <div className="location-helper">
                    <button
                      type="button"
                      className="helper-btn"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            position => {
                              setEditForm(prev => ({
                                ...prev,
                                Incidents_Latitude:
                                  position.coords.latitude.toString(),
                                Incidents_Longitude:
                                  position.coords.longitude.toString(),
                              }));
                              toast.success('Current location captured', { autoClose: 3000 });
                            },
                            _error => {
                              // Location error handled by form state
                            },
                          );
                        } else {
                          // Geolocation error handled by form state
                        }
                      }}
                    >
                      Use Current Location
                    </button>
                    <span className="helper-text">
                      Or manually enter coordinates from GPS device or map
                    </span>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowEditModal(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="loading-spinner">Updating...</div>
                    ) : (
                      <>
                        <CheckIcon />
                        Update Incident
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Incidents;
