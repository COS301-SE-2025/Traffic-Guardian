import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, Filter, Calendar, Download, Eye, RotateCcw, Clock, AlertTriangle } from 'lucide-react';
import './Archives.css';

// TypeScript interfaces
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

interface ArchiveRecord {
  Archive_ID: number;
  Archive_Date: string;
  Incident_Data: IncidentData;
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

// Mock data structure based on your JSON examples
const mockArchiveData: ArchiveRecord[] = [
  {
    Archive_ID: 1,
    Archive_Date: "2024-07-21T12:30:00Z",
    Incident_Data: {
      Incidents_ID: 1,
      Incident_Status: "resolved",
      Incident_Reporter: "System Auto",
      Incident_Severity: "medium",
      Incidents_DateTime: "2024-07-20T00:00:00",
      Incidents_Latitude: -26.2041,
      Incidents_Longitude: 28.0473,
      Incident_Type: "Traffic Congestion",
      Incident_Location: "M1 Highway, Johannesburg",
      Resolution_Notes: "Traffic cleared after 2 hours",
      Duration_Minutes: 120
    }
  },
  {
    Archive_ID: 2,
    Archive_Date: "2024-07-21T14:45:00Z",
    Incident_Data: {
      Incidents_ID: 2,
      Incident_Status: "resolved",
      Incident_Reporter: "Traffic Officer 101",
      Incident_Severity: "high",
      Incidents_DateTime: "2024-07-20T08:15:00",
      Incidents_Latitude: -25.7479,
      Incidents_Longitude: 28.2293,
      Incident_Type: "Vehicle Accident",
      Incident_Location: "N1 Highway, Pretoria",
      Resolution_Notes: "Vehicles towed, road cleared",
      Duration_Minutes: 180
    }
  },
  {
    Archive_ID: 3,
    Archive_Date: "2024-07-22T09:15:00Z",
    Incident_Data: {
      Incidents_ID: 3,
      Incident_Status: "resolved",
      Incident_Reporter: "Camera System",
      Incident_Severity: "low",
      Incidents_DateTime: "2024-07-21T16:30:00",
      Incidents_Latitude: -26.1269,
      Incidents_Longitude: 27.9069,
      Incident_Type: "Minor Obstruction",
      Incident_Location: "R21 Highway, Kempton Park",
      Resolution_Notes: "Debris removed by maintenance crew",
      Duration_Minutes: 45
    }
  }
];

const Archives: React.FC = () => {
  const [archives, setArchives] = useState<ArchiveRecord[]>(mockArchiveData);
  const [loading, setLoading] = useState<boolean>(false);
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

  // Filter logic
  const filteredArchives = useMemo((): ArchiveRecord[] => {
    return archives.filter(archive => {
      const data = archive.Incident_Data;
      const searchLower = filters.search.toLowerCase();
      
      // Search across multiple fields
      const matchesSearch = !filters.search || 
        data.Incident_Location?.toLowerCase().includes(searchLower) ||
        data.Incident_Type?.toLowerCase().includes(searchLower) ||
        data.Incident_Reporter?.toLowerCase().includes(searchLower) ||
        data.Resolution_Notes?.toLowerCase().includes(searchLower);

      const matchesSeverity = !filters.severity || data.Incident_Severity === filters.severity;
      const matchesStatus = !filters.status || data.Incident_Status === filters.status;
      const matchesType = !filters.type || data.Incident_Type === filters.type;
      const matchesReporter = !filters.reporter || data.Incident_Reporter?.toLowerCase().includes(filters.reporter.toLowerCase());

      // Date filtering
      const incidentDate = new Date(data.Incidents_DateTime);
      const matchesDateFrom = !filters.dateFrom || incidentDate >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo || incidentDate <= new Date(filters.dateTo + 'T23:59:59');

      return matchesSearch && matchesSeverity && matchesStatus && matchesType && matchesReporter && matchesDateFrom && matchesDateTo;
    });
  }, [archives, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredArchives.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentArchives = filteredArchives.slice(startIndex, startIndex + itemsPerPage);

  const toggleExpanded = (archiveId: number): void => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(archiveId)) {
      newExpanded.delete(archiveId);
    } else {
      newExpanded.add(archiveId);
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
    return new Date(dateString).toLocaleString('en-ZA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityClass = (severity: string): string => {
    const classMap: Record<string, string> = {
      low: 'severity-low',
      medium: 'severity-medium',
      high: 'severity-high'
    };
    return classMap[severity] || 'severity-low';
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return <div className="loading-message">Loading archived incidents...</div>;
  }

  return (
    <div className="archives-container">
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
            value={filters.type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="Traffic Congestion">Traffic Congestion</option>
            <option value="Vehicle Accident">Vehicle Accident</option>
            <option value="Minor Obstruction">Minor Obstruction</option>
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
      {viewMode === 'cards' ? (
        <div className="cards-container">
          {currentArchives.map((archive) => (
            <div key={archive.Archive_ID} className="incident-card">
              {/* Card Header */}
              <div className="card-header">
                <div className="card-header-left">
                  <div className="incident-id">
                    ID: {archive.Incident_Data.Incidents_ID}
                  </div>
                  <div className={`severity-badge ${getSeverityClass(archive.Incident_Data.Incident_Severity)}`}>
                    {archive.Incident_Data.Incident_Severity}
                  </div>
                </div>
                <div className="card-header-right">
                  <div>Archived: {formatDateTime(archive.Archive_Date)}</div>
                  <div>Duration: {formatDuration(archive.Incident_Data.Duration_Minutes || 0)}</div>
                </div>
              </div>

              {/* Card Content */}
              <div className="card-content">
                <div>
                  <h4 className="incident-title">
                    {archive.Incident_Data.Incident_Type}
                  </h4>
                  <p className="incident-detail">
                    📍 {archive.Incident_Data.Incident_Location}
                  </p>
                  <p className="incident-detail small">
                    {formatDateTime(archive.Incident_Data.Incidents_DateTime)}
                  </p>
                </div>
                <div>
                  <p className="incident-detail">
                    👤 Reporter: {archive.Incident_Data.Incident_Reporter || 'Unknown'}
                  </p>
                  <p className="incident-detail">
                    {archive.Incident_Data.Resolution_Notes}
                  </p>
                </div>
              </div>

              {/* Expandable JSON View */}
              <div className="card-footer">
                <button
                  onClick={() => toggleExpanded(archive.Archive_ID)}
                  className="expand-button"
                >
                  <Eye size={16} />
                  {expandedItems.has(archive.Archive_ID) ? 'Hide' : 'View'} Technical Details
                  {expandedItems.has(archive.Archive_ID) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {expandedItems.has(archive.Archive_ID) && (
                  <pre className="json-view">
                    {JSON.stringify(archive.Incident_Data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Table View
        <div className="table-container">
          <table className="incidents-table">
            <thead>
              <tr className="table-header">
                <th>ID</th>
                <th>Type</th>
                <th>Location</th>
                <th>Severity</th>
                <th>Duration</th>
                <th>Archived</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentArchives.map((archive) => (
                <tr key={archive.Archive_ID} className="table-row">
                  <td className="table-cell id">
                    {archive.Incident_Data.Incidents_ID}
                  </td>
                  <td className="table-cell primary">
                    {archive.Incident_Data.Incident_Type}
                  </td>
                  <td className="table-cell secondary">
                    {archive.Incident_Data.Incident_Location}
                  </td>
                  <td className="table-cell">
                    <span className={`severity-badge ${getSeverityClass(archive.Incident_Data.Incident_Severity)}`}>
                      {archive.Incident_Data.Incident_Severity}
                    </span>
                  </td>
                  <td className="table-cell secondary">
                    {formatDuration(archive.Incident_Data.Duration_Minutes || 0)}
                  </td>
                  <td className="table-cell small">
                    {formatDateTime(archive.Archive_Date)}
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => toggleExpanded(archive.Archive_ID)}
                      className={`table-action-button ${expandedItems.has(archive.Archive_ID) ? 'active' : ''}`}
                    >
                      <Eye size={14} />
                      {expandedItems.has(archive.Archive_ID) ? 'Hide' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
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