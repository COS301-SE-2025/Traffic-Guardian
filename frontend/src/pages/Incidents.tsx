import React, { useState, useEffect, useRef } from 'react';
import './Incidents.css';

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

const SearchIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const API_KEY = process.env.REACT_APP_API_KEY || 'YOUR_API_KEY_HERE';

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

const Incidents: React.FC = () => {
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
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
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

  const loadIncidents = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest('/incidents');
      
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
    } catch (error) {
      setError('Failed to load incidents. Please check your connection.');
      console.error('Load incidents error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

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

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      severity: '',
      type: '',
      dateFrom: '',
      dateTo: ''
    });
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
        setError('Only image files (JPEG, PNG, GIF, WebP) are allowed');
        return false;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
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
      setError('Please correct the errors below');
      return;
    }

    setIsLoading(true);
    setError('');

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


      const response = await apiRequest('/incidents', {
        method: 'POST',
        body: JSON.stringify(apiPayload)
      });

      console.log('Incident created:', response);


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

      setSuccessMessage('Incident reported successfully!');
      setShowManualForm(false);


      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
      setError('Failed to submit incident. Please try again.');
      console.error('Submit incident error:', error);
    } finally {
      setIsLoading(false);
    }
  };