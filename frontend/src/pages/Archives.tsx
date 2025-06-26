import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, Search, Filter, Download, Eye, RotateCcw, Clock, AlertTriangle } from 'lucide-react';
import { useTheme } from '../consts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import './Archives.css';

// Updated TypeScript interfaces to match your backend response
interface IncidentData {
  Incidents_ID: number;
  Incident_Status: string;
  Incident_Reporter: string | null;
  Incident_Severity: 'low' | 'medium' | 'high';
  Incidents_DateTime: string;
  Incidents_Latitude: number | null;
  Incidents_Longitude: number | null;
  Incident_Type?: string;
  Incident_Location?: string;
  Resolution_Notes?: string;
  Duration_Minutes?: number;
}

// Updated to match your backend response
interface ArchiveRecord {
  Archive_Date: string;
  Archive_Incidents: IncidentData;
  Archive_Alerts: any; // null in your data
}

interface Filters {
  search: string;
  severity: string;
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  reporter: string;
}

type ViewMode = 'cards' | 'table';

const Archives: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  const [archives, setArchives] = useState<ArchiveRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    severity: '',
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    reporter: ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const itemsPerPage: number = 10;

  // Load archives from your API
  const loadArchives = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const apiKey = localStorage.getItem('apiKey');
      if (!apiKey) {
        setError('No API key found. Please log in.');
        navigate('/account');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/archives`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Unauthorized: Invalid or missing API key');
          navigate('/account');
          return;
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setArchives(data);
      } else {
        console.warn('API returned non-array data:', data);
        setArchives([]);
        setError('Invalid data format received from server');
      }
    } catch (error: any) {
      setError(`Failed to load archives: ${error.message}`);
      console.error('Archives loading error:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
  loadArchives();
}, [loadArchives]);


  // Client-side filtering logic - updated to work with Archive_Incidents
  const filteredArchives = useMemo((): ArchiveRecord[] => {
    return archives.filter(archive => {
      // Check if Archive_Incidents exists
      if (!archive?.Archive_Incidents) {
        return false;
      }
      
      const data = archive.Archive_Incidents;
      const searchLower = filters.search.toLowerCase();
      
      // Search across multiple fields
      const matchesSearch = !filters.search || 
        data.Incident_Type?.toLowerCase().includes(searchLower) ||
        data.Incident_Reporter?.toLowerCase().includes(searchLower) ||
        data.Resolution_Notes?.toLowerCase().includes(searchLower) ||
        data.Incidents_ID?.toString().includes(searchLower) ||
        data.Incident_Status?.toLowerCase().includes(searchLower);

      const matchesSeverity = !filters.severity || data.Incident_Severity === filters.severity;
      const matchesStatus = !filters.status || data.Incident_Status === filters.status;
      const matchesType = !filters.type || data.Incident_Type?.toLowerCase().includes(filters.type.toLowerCase());
      const matchesReporter = !filters.reporter || data.Incident_Reporter?.toLowerCase().includes(filters.reporter.toLowerCase());

      // Date filtering with null check
      let matchesDateFrom = true;
      let matchesDateTo = true;
      
      if (data.Incidents_DateTime) {
        const incidentDate = new Date(data.Incidents_DateTime);
        matchesDateFrom = !filters.dateFrom || incidentDate >= new Date(filters.dateFrom);
        matchesDateTo = !filters.dateTo || incidentDate <= new Date(filters.dateTo + 'T23:59:59');
      } else if (filters.dateFrom || filters.dateTo) {
        // If date filters are set but incident has no date, exclude it
        matchesDateFrom = false;
        matchesDateTo = false;
      }

      return matchesSearch && matchesSeverity && matchesStatus && matchesType && matchesReporter && matchesDateFrom && matchesDateTo;
    });
  }, [archives, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredArchives.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentArchives = filteredArchives.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const toggleExpanded = (incidentId: number): void => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(incidentId)) {
      newExpanded.delete(incidentId);
    } else {
      newExpanded.add(incidentId);
    }
    setExpandedItems(newExpanded);
  };

  const clearFilters = (): void => {
    setFilters({
      search: '',
      severity: '',
      status: '',
      type: '',
      dateFrom: '',
      dateTo: '',
      reporter: ''
    });
    setCurrentPage(1);
  };

  const exportData = (): void => {
    const dataStr = JSON.stringify(filteredArchives, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archives_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDateTime = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString('en-ZA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString; // Return original if parsing fails
    }
  };

  const getSeverityClass = (severity: string): string => {
    return `severity-${severity}`;
  };

  const formatDuration = (minutes: number): string => {
    if (!minutes) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className={`archives-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
        <div className="loading-message">
          <div className="loading-spinner"></div>
          Loading archived incidents...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`archives-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
        <div className="error-message">
          <AlertTriangle size={24} />
          {error}
          <button onClick={() => loadArchives()} className="retry-button">
            <RotateCcw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`archives-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <h2>
            <Clock size={28} />
            Incident Archives
          </h2>
          <p>
            Historical incident data - Resolved incidents archived after 24 hours
          </p>
        </div>
        <div className="header-actions">
          <span className="records-count">
            {filteredArchives.length} Records
          </span>
          <button onClick={exportData} className="export-button">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-container">
        {/* Basic Filters Row */}
        <div className="basic-filters">
          <div className="search-input-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search incidents..."
              value={filters.search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="search-input"
            />
          </div>

          <select
            value={filters.severity}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
            className="filter-select"
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <select
            value={filters.status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="ongoing">Ongoing</option>
          </select>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="advanced-filter-toggle"
          >
            <Filter size={16} />
            Advanced
            {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="advanced-filters">
            <input
              type="text"
              placeholder="Incident Type"
              value={filters.type}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="text-input"
            />
            <input
              type="date"
              placeholder="From Date"
              value={filters.dateFrom}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="date-input"
            />
            <input
              type="date"
              placeholder="To Date"
              value={filters.dateTo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="date-input"
            />
            <input
              type="text"
              placeholder="Reporter"
              value={filters.reporter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, reporter: e.target.value }))}
              className="text-input"
            />
            <button onClick={clearFilters} className="clear-button">
              <RotateCcw size={16} />
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="view-controls">
        <div className="view-mode-toggle">
          <button
            onClick={() => setViewMode('cards')}
            className={`view-mode-button ${viewMode === 'cards' ? 'active' : ''}`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`view-mode-button ${viewMode === 'table' ? 'active' : ''}`}
          >
            Table
          </button>
        </div>
        <span className="pagination-info">
          Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredArchives.length)} of {filteredArchives.length}
        </span>
      </div>

      {/* Content */}
      {currentArchives.length === 0 ? (
        <div className="no-data-message">
          <Clock size={48} />
          <h3>No archived incidents found</h3>
          <p>Try adjusting your filters or check back later.</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="cards-container">
          {currentArchives.map((archive, index) => {
            // Safety check
            if (!archive?.Archive_Incidents) {
              return (
                <div key={index} className="incident-card">
                  <div className="card-content">
                    <p className="incident-detail">Invalid archive data</p>
                  </div>
                </div>
              );
            }
            
            const incident = archive.Archive_Incidents;
            
            return (
            <div key={`${incident.Incidents_ID}-${index}`} className="incident-card">
              {/* Card Header */}
              <div className="card-header">
                <div className="card-header-left">
                  <div className="incident-id">
                    ID: {incident.Incidents_ID || 'N/A'}
                  </div>
                  <div className={`severity-badge ${getSeverityClass(incident.Incident_Severity || 'low')}`}>
                    {incident.Incident_Severity || 'Unknown'}
                  </div>
                </div>
                <div className="card-header-right">
                  <div>Archived: {formatDateTime(archive.Archive_Date)}</div>
                  {incident.Duration_Minutes && (
                    <div>Duration: {formatDuration(incident.Duration_Minutes)}</div>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="card-content">
                <div>
                  <h4 className="incident-title">
                    {incident.Incident_Type || `Incident #${incident.Incidents_ID}`}
                  </h4>
                  <p className="incident-detail">
                    Status: {incident.Incident_Status || 'Unknown Status'}
                  </p>
                  <p className="incident-detail small">
                    {incident.Incidents_DateTime ? formatDateTime(incident.Incidents_DateTime) : 'No date available'}
                  </p>
                  {(incident.Incidents_Latitude || incident.Incidents_Longitude) && (
                    <p className="incident-detail small">
                      Location: {incident.Incidents_Latitude}, {incident.Incidents_Longitude}
                    </p>
                  )}
                </div>
                <div>
                  <p className="incident-detail">
                    Reporter: {incident.Incident_Reporter || 'Unknown'}
                  </p>
                  {incident.Resolution_Notes && (
                    <p className="incident-detail">
                      {incident.Resolution_Notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Expandable JSON View */}
              <div className="card-footer">
                <button
                  onClick={() => toggleExpanded(incident.Incidents_ID)}
                  className="expand-button"
                >
                  <Eye size={16} />
                  {expandedItems.has(incident.Incidents_ID) ? 'Hide' : 'View'} Technical Details
                  {expandedItems.has(incident.Incidents_ID) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {expandedItems.has(incident.Incidents_ID) && (
                  <pre className="json-view">
                    {JSON.stringify(archive, null, 2)}
                  </pre>
                )}
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        // Table View
        <div className="table-container">
          <table className="incidents-table">
            <thead>
              <tr className="table-header">
                <th>ID</th>
                <th>Status</th>
                <th>Severity</th>
                <th>Date</th>
                <th>Reporter</th>
                <th>Archived</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentArchives.map((archive, index) => {
                // Safety check
                if (!archive?.Archive_Incidents) {
                  return (
                    <tr key={index} className="table-row">
                      <td className="table-cell" colSpan={7}>Invalid archive data</td>
                    </tr>
                  );
                }
                
                const incident = archive.Archive_Incidents;
                
                return (
                <tr key={`${incident.Incidents_ID}-${index}`} className="table-row">
                  <td className="table-cell id">
                    {incident.Incidents_ID || 'N/A'}
                  </td>
                  <td className="table-cell primary">
                    {incident.Incident_Status || 'Unknown'}
                  </td>
                  <td className="table-cell">
                    <span className={`severity-badge ${getSeverityClass(incident.Incident_Severity || 'low')}`}>
                      {incident.Incident_Severity || 'Unknown'}
                    </span>
                  </td>
                  <td className="table-cell secondary">
                    {incident.Incidents_DateTime ? formatDateTime(incident.Incidents_DateTime) : 'N/A'}
                  </td>
                  <td className="table-cell secondary">
                    {incident.Incident_Reporter || 'Unknown'}
                  </td>
                  <td className="table-cell small">
                    {formatDateTime(archive.Archive_Date)}
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => toggleExpanded(incident.Incidents_ID)}
                      className={`table-action-button ${expandedItems.has(incident.Incidents_ID) ? 'active' : ''}`}
                    >
                      <Eye size={14} />
                      {expandedItems.has(incident.Incidents_ID) ? 'Hide' : 'View'}
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            Previous
          </button>
          
          <span className="pagination-info-text">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Archives;