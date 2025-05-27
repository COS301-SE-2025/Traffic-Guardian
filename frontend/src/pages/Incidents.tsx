import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Incidents.css';

// SVG icon components
const AlertTriangleIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const PlusIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const FilterIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
  </svg>
);

const UploadIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const CheckIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const EyeIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EditIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const CameraIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

interface ApiIncident {
  Incident_ID?: number;
  Incident_Date: string;
  Incident_Location: string;
  Incident_CameraID: string;
  Incident_Type: string;
  Incident_Severity: 'high' | 'medium' | 'low';
  Incident_Status: 'open' | 'in-progress' | 'resolved';
  Incident_Description?: string;
  created_at?: string;
  updated_at?: string;
}

interface DisplayIncident {
  id: number;
  date: string;
  location: string;
  cameraId: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'resolved';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface ManualIncidentForm {
  Incident_Date: string;
  Incident_Location: string;
  Incident_CameraID: string;
  Incident_Type: string;
  Incident_Severity: 'high' | 'medium' | 'low';
  Incident_Status: 'open' | 'in-progress' | 'resolved';
  Incident_Description: string;
  reporterName: string;
  reporterContact: string;
  coordinates: { lat: string; lng: string };
  weatherConditions: string;
  trafficImpact: 'none' | 'minor' | 'moderate' | 'severe';
  injuriesReported: 'yes' | 'no' | 'unknown';
  images: File[];
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
  const [incidents, setIncidents] = useState<DisplayIncident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<DisplayIncident[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    severity: '',
    type: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showManualForm, setShowManualForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedStatuses, setSelectedStatuses] = useState<Record<number, 'open' | 'in-progress' | 'resolved'>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [manualIncident, setManualIncident] = useState<ManualIncidentForm>({
    Incident_Date: new Date().toISOString().split('T')[0],
    Incident_Location: '',
    Incident_CameraID: '',
    Incident_Type: 'Vehicle Accident',
    Incident_Severity: 'medium',
    Incident_Status: 'open',
    Incident_Description: '',
    reporterName: '',
    reporterContact: '',
    coordinates: { lat: '', lng: '' },
    weatherConditions: '',
    trafficImpact: 'minor',
    injuriesReported: 'unknown',
    images: []
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ManualIncidentForm, string>>>({});

  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) {
      throw new Error('No API key found. Please log in.');
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
          throw new Error('Unauthorized: Invalid or missing API key');
        }
        if (response.status === 404) {
          throw new Error(`Endpoint not found: ${url}`);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error: any) {
      if (error.message.includes('Unauthorized') || error.message.includes('API key')) {
        navigate('/account');
      }
      throw error;
    }
  };

  const loadIncidents = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest('/api/incidents');
      
      const transformedIncidents: DisplayIncident[] = data.map((incident: ApiIncident) => ({
        id: incident.Incident_ID || 0,
        date: incident.Incident_Date,
        location: incident.Incident_Location,
        cameraId: incident.Incident_CameraID,
        type: incident.Incident_Type,
        severity: incident.Incident_Severity,
        status: incident.Incident_Status,
        description: incident.Incident_Description,
        createdAt: incident.created_at || incident.Incident_Date,
        updatedAt: incident.updated_at || incident.Incident_Date
      }));

      setIncidents(transformedIncidents);
      setFilteredIncidents(transformedIncidents);
    } catch (error: any) {
      toast.error(`Failed to load incidents: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiKey = localStorage.getItem('apiKey');
        if (!apiKey) {
          toast.error('No API key found. Please log in.');
          navigate('/account');
          return;
        }
        await loadIncidents();
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
        if (error.message.includes('Unauthorized')) {
          navigate('/account');
        }
      }
    };

    fetchData();
  }, [navigate]);

  useEffect(() => {
    let filtered = incidents;

    if (filters.search) {
      filtered = filtered.filter(incident =>
        incident.location.toLowerCase().includes(filters.search.toLowerCase()) ||
        incident.type.toLowerCase().includes(filters.search.toLowerCase()) ||
        incident.id.toString().includes(filters.search)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(incident => incident.status === filters.status);
    }

    if (filters.severity) {
      filtered = filtered.filter(incident => incident.severity === filters.severity);
    }

    if (filters.type) {
      filtered = filtered.filter(incident => incident.type === filters.type);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(incident => incident.date >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(incident => incident.date <= filters.dateTo);
    }

    setFilteredIncidents(filtered);
    setCurrentPage(1);
  }, [filters, incidents]);

  const handleStatusChange = (incidentId: number, newStatus: 'open' | 'in-progress' | 'resolved') => {
    setSelectedStatuses(prev => ({ ...prev, [incidentId]: newStatus }));
  };

  const handleStatusUpdate = async (incidentId: number) => {
    const newStatus = selectedStatuses[incidentId];
    const currentStatus = incidents.find(i => i.id === incidentId)?.status;
    
    if (!newStatus || newStatus === currentStatus) return;

    setIsLoading(true);
    
    try {
      await apiRequest(`/api/incidents/${incidentId}`, {
        method: 'PUT',
        body: JSON.stringify({ Incident_Status: newStatus })
      });

      setIncidents(prev =>
        prev.map(inc => 
          inc.id === incidentId ? { ...inc, status: newStatus } : inc
        )
      );

      setSelectedStatuses(prev => {
        const { [incidentId]: _, ...rest } = prev;
        return rest;
      });

      toast.success('Status updated successfully');
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncidentAction = async (incidentId: number, action: string) => {
    try {
      switch (action) {
        case 'view':
          const incident = await apiRequest(`/api/incidents/${incidentId}`);
          console.log('Viewing incident:', incident);
          break;
        case 'edit':
          console.log(`Editing incident ${incidentId}`);
          break;
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleManualIncidentChange = (key: keyof ManualIncidentForm, value: any) => {
    setManualIncident(prev => ({ ...prev, [key]: value }));
    
    if (formErrors[key]) {
      setFormErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ManualIncidentForm, string>> = {};

    if (!manualIncident.Incident_Location.trim()) {
      errors.Incident_Location = 'Location is required';
    }
    if (!manualIncident.Incident_CameraID.trim()) {
      errors.Incident_CameraID = 'Camera ID is required';
    }
    if (!manualIncident.Incident_Description.trim()) {
      errors.Incident_Description = 'Description is required';
    }
    if (!manualIncident.reporterName.trim()) {
      errors.reporterName = 'Reporter name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter(file => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only image files (JPEG, PNG, GIF, WebP) are allowed');
        return false;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return false;
      }

      return true;
    });

    setManualIncident(prev => ({
      ...prev,
      images: [...prev.images, ...newFiles]
    }));
  };

  const removeFile = (index: number) => {
    setManualIncident(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    handleFileUpload(e.dataTransfer.files);
  };

  const handleSubmitManualIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please correct the errors in the form');
      return;
    }

    setIsLoading(true);

    try {
      const apiPayload: Omit<ApiIncident, 'Incident_ID' | 'created_at' | 'updated_at'> = {
        Incident_Date: manualIncident.Incident_Date,
        Incident_Location: manualIncident.Incident_Location,
        Incident_CameraID: manualIncident.Incident_CameraID,
        Incident_Type: manualIncident.Incident_Type,
        Incident_Severity: manualIncident.Incident_Severity,
        Incident_Status: manualIncident.Incident_Status,
        Incident_Description: manualIncident.Incident_Description
      };

      await apiRequest('/api/incidents', {
        method: 'POST',
        body: JSON.stringify(apiPayload)
      });

      await loadIncidents();

      setManualIncident({
        Incident_Date: new Date().toISOString().split('T')[0],
        Incident_Location: '',
        Incident_CameraID: '',
        Incident_Type: 'Vehicle Accident',
        Incident_Severity: 'medium',
        Incident_Status: 'open',
        Incident_Description: '',
        reporterName: '',
        reporterContact: '',
        coordinates: { lat: '', lng: '' },
        weatherConditions: '',
        trafficImpact: 'minor',
        injuriesReported: 'unknown',
        images: []
      });

      setShowManualForm(false);
      toast.success('Incident reported successfully!');
    } catch (error: any) {
      toast.error(`Failed to submit incident: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentIncidents = filteredIncidents.slice(startIndex, endIndex);

  const getSeverityClass = (severity: string) => severity.toLowerCase();
  const getStatusClass = (status: string) => status.toLowerCase().replace('-', '');

  const getSeverityDisplay = (severity: string) => {
    const map = { high: 'Critical', medium: 'Medium', low: 'Low' };
    return map[severity as keyof typeof map] || severity;
  };

  const getStatusDisplay = (status: string) => {
    const map = { open: 'Active', 'in-progress': 'In Progress', resolved: 'Resolved' };
    return map[status as keyof typeof map] || status;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-ZA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="incidents-page">
      <div className="incidents-header">
        <div className="incidents-title">
          <div>
            <h2>Incident Management</h2>
            <div className="incidents-sidebar">Monitor and manage traffic incidents across Gauteng</div>
          </div>
        </div>
        <div className="incidents-actions">
          <button className="btn-secondary" onClick={() => setFilters({
            search: '',
            status: '',
            severity: '',
            type: '',
            dateFrom: '',
            dateTo: ''
          })}>
            <FilterIcon />
            Clear Filters
          </button>
          <button className="btn-primary" onClick={() => setShowManualForm(true)}>
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
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              className="filter-select"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="open">Active</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Severity</label>
            <select
              className="filter-select"
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
            >
              <option value="">All Severities</option>
              <option value="high">Critical</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Type</label>
            <select
              className="filter-select"
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="">All Types</option>
              <option value="Vehicle Accident">Vehicle Accident</option>
              <option value="Vehicle Breakdown">Vehicle Breakdown</option>
              <option value="Traffic Congestion">Traffic Congestion</option>
              <option value="Road Debris">Road Debris</option>
              <option value="Weather Hazard">Weather Hazard</option>
              <option value="Construction Zone">Construction Zone</option>
              <option value="Emergency Vehicle">Emergency Vehicle</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Date From</label>
            <input
              type="date"
              className="filter-input"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Date To</label>
            <input
              type="date"
              className="filter-input"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
        </div>

        <div className={`incidents-list ${filteredIncidents.length <= itemsPerPage ? 'small-table' : ''}`}>
          <div className="incidents-list-header">
            <h3 className="incidents-list-title">Incidents</h3>
            <div className="incidents-count">{filteredIncidents.length} Total</div>
          </div>

          <table className="incidents-table">
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
              {currentIncidents.map((incident) => (
                <tr key={incident.id}>
                  <td data-label="ID">
                    <span className="incident-id">#{incident.id}</span>
                  </td>
                  <td data-label="Date">
                    <div className="incident-time">{formatDateTime(incident.date)}</div>
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
                    <span className={`severity-badge ${getSeverityClass(incident.severity)}`}>
                      {getSeverityDisplay(incident.severity)}
                    </span>
                  </td>
                  <td data-label="Status">
                    <span className={`status-badge ${getStatusClass(incident.status)}`}>
                      {getStatusDisplay(incident.status)}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="incident-actions">
                      <button 
                        className="action-btn"
                        onClick={() => handleIncidentAction(incident.id, 'view')}
                        title="View Details"
                        disabled={isLoading}
                      >
                        <EyeIcon />
                      </button>
                      <button 
                        className="action-btn"
                        onClick={() => handleIncidentAction(incident.id, 'edit')}
                        title="Edit"
                        disabled={isLoading}
                      >
                        <EditIcon />
                      </button>
                      <div className="status-update-group">
                        <select
                          className="status-select"
                          value={selectedStatuses[incident.id] || incident.status}
                          onChange={(e) => handleStatusChange(
                            incident.id, 
                            e.target.value as 'open' | 'in-progress' | 'resolved'
                          )}
                          disabled={isLoading}
                        >
                          <option value="open">Active</option>
                          <option value="in-progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                        <button
                          className="action-btn confirm-btn"
                          onClick={() => handleStatusUpdate(incident.id)}
                          title="Confirm Status Change"
                          disabled={
                            isLoading ||
                            !selectedStatuses[incident.id] ||
                            selectedStatuses[incident.id] === incident.status
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
                  className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
              <div className="pagination-info">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredIncidents.length)} of {filteredIncidents.length}
              </div>
            </div>
          )}
        </div>
      </div>

      {showManualForm && (
        <div className="modal-overlay" onClick={() => setShowManualForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Report New Incident</h3>
              <button 
                className="modal-close"
                onClick={() => setShowManualForm(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <form className="incident-form" onSubmit={handleSubmitManualIncident}>
                <div className="form-section">
                  <h4 className="section-title">Incident Information</h4>
                  <div className="form-grid two-columns">
                    <div className="form-group">
                      <label className="form-label required">Incident Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={manualIncident.Incident_Date}
                        onChange={(e) => handleManualIncidentChange('Incident_Date', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label required">Camera ID</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., CAM-N1-03"
                        value={manualIncident.Incident_CameraID}
                        onChange={(e) => handleManualIncidentChange('Incident_CameraID', e.target.value)}
                        required
                      />
                      {formErrors.Incident_CameraID && <div className="form-error">{formErrors.Incident_CameraID}</div>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Location</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., N1 Western Bypass Southbound"
                      value={manualIncident.Incident_Location}
                      onChange={(e) => handleManualIncidentChange('Incident_Location', e.target.value)}
                      required
                    />
                    {formErrors.Incident_Location && <div className="form-error">{formErrors.Incident_Location}</div>}
                  </div>

                  <div className="form-grid two-columns">
                    <div className="form-group">
                      <label className="form-label required">Incident Type</label>
                      <select
                        className="form-select"
                        value={manualIncident.Incident_Type}
                        onChange={(e) => handleManualIncidentChange('Incident_Type', e.target.value)}
                        required
                      >
                        <option value="Vehicle Accident">Vehicle Accident</option>
                        <option value="Vehicle Breakdown">Vehicle Breakdown</option>
                        <option value="Traffic Congestion">Traffic Congestion</option>
                        <option value="Road Debris">Road Debris</option>
                        <option value="Weather Hazard">Weather Hazard</option>
                        <option value="Construction Zone">Construction Zone</option>
                        <option value="Emergency Vehicle">Emergency Vehicle</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label required">Severity</label>
                      <select
                        className="form-select"
                        value={manualIncident.Incident_Severity}
                        onChange={(e) => handleManualIncidentChange('Incident_Severity', e.target.value as 'high' | 'medium' | 'low')}
                        required
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High (Critical)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Description</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Detailed description of the incident..."
                      value={manualIncident.Incident_Description}
                      onChange={(e) => handleManualIncidentChange('Incident_Description', e.target.value)}
                      required
                      rows={3}
                    />
                    {formErrors.Incident_Description && <div className="form-error">{formErrors.Incident_Description}</div>}
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title">Location Details</h4>
                  <div className="form-grid two-columns">
                    <div className="form-group">
                      <label className="form-label">Latitude</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="-25.7479"
                        value={manualIncident.coordinates.lat}
                        onChange={(e) => handleManualIncidentChange('coordinates', { ...manualIncident.coordinates, lat: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Longitude</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="28.2293"
                        value={manualIncident.coordinates.lng}
                        onChange={(e) => handleManualIncidentChange('coordinates', { ...manualIncident.coordinates, lng: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title">Additional Details</h4>
                  <div className="form-grid three-columns">
                    <div className="form-group">
                      <label className="form-label">Weather Conditions</label>
                      <select
                        className="form-select"
                        value={manualIncident.weatherConditions}
                        onChange={(e) => handleManualIncidentChange('weatherConditions', e.target.value)}
                      >
                        <option value="">Select weather</option>
                        <option value="Clear">Clear</option>
                        <option value="Cloudy">Cloudy</option>
                        <option value="Rainy">Rainy</option>
                        <option value="Foggy">Foggy</option>
                        <option value="Windy">Windy</option>
                        <option value="Storm">Storm</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Traffic Impact</label>
                      <select
                        className="form-select"
                        value={manualIncident.trafficImpact}
                        onChange={(e) => handleManualIncidentChange('trafficImpact', e.target.value as 'none' | 'minor' | 'moderate' | 'severe')}
                      >
                        <option value="none">None</option>
                        <option value="minor">Minor</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Injuries Reported</label>
                      <select
                        className="form-select"
                        value={manualIncident.injuriesReported}
                        onChange={(e) => handleManualIncidentChange('injuriesReported', e.target.value as 'yes' | 'no' | 'unknown')}
                      >
                        <option value="unknown">Unknown</option>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title">Reporter Information</h4>
                  <div className="form-grid two-columns">
                    <div className="form-group">
                      <label className="form-label required">Reporter Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Full name"
                        value={manualIncident.reporterName}
                        onChange={(e) => handleManualIncidentChange('reporterName', e.target.value)}
                        required
                      />
                      {formErrors.reporterName && <div className="form-error">{formErrors.reporterName}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Contact Information</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Phone number or email"
                        value={manualIncident.reporterContact}
                        onChange={(e) => handleManualIncidentChange('reporterContact', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title">Photos & Documentation</h4>
                  <div 
                    className="file-upload"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="file-upload-content">
                      <UploadIcon />
                      <div className="file-upload-text">
                        Drag and drop images here, or{' '}
                        <button 
                          type="button"
                          className="file-upload-btn"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          browse files
                        </button>
                      </div>
                      <div className="form-help">
                        Supported formats: JPEG, PNG, GIF, WebP (max 5MB each)
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="file-upload-input"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                  </div>

                  {manualIncident.images.length > 0 && (
                    <div className="uploaded-files">
                      {manualIncident.images.map((file, index) => (
                        <div key={index} className="uploaded-file">
                          <span className="file-name">{file.name}</span>
                          <button
                            type="button"
                            className="file-remove"
                            onClick={() => removeFile(index)}
                          >
                            <XIcon />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                      <>
                        <div className="loading-spinner" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckIcon />
                        Submit Incident
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
};

export default Incidents;