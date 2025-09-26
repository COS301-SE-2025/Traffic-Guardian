import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  Eye,
  RotateCcw,
  Clock,
  AlertTriangle,
  FileText,
  Camera,
  Tag,
} from 'lucide-react';
import { useTheme } from '../consts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import './Archives.css';

// TypeScript interfaces to match ArchivesV2 table structure
interface ArchiveIncidentData {
  status: string;
  datetime: string;
  reporter: string;
  severity: 'low' | 'medium' | 'high';
  camera_id: number | null;
  camera_info: {
    note: string;
    camera_id: number | null;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  incident_id: number;
  archived_timestamp: string;
}

interface ArchiveRecord {
  Archive_ID: number;
  Archive_Date: string;
  Archive_Type: string;
  Archive_IncidentID: number | null;
  Archive_CameraID: number | null;
  Archive_IncidentData: ArchiveIncidentData;
  Archive_AlertsData: any[];
  Archive_Severity: 'low' | 'medium' | 'high';
  Archive_Status: string;
  Archive_DateTime: string;
  Archive_SearchText: string;
  Archive_Tags: string[];
  Archive_Metadata: {
    archived_at: string;
    camera_found: boolean;
    camera_district: string | null;
    original_incident_id: number;
  };
}

interface Filters {
  search: string;
  severity: string;
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  reporter: string;
  camera_id: string;
  tags: string;
}

type ViewMode = 'cards' | 'table' | 'detailed';

const Archives: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { isAuthenticated } = useUser();
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
    reporter: '',
    camera_id: '',
    tags: '',
  });
  const [showAdvancedFilters, setShowAdvancedFilters] =
    useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const itemsPerPage = 12;

  // Load archives from ArchivesV2 API with abort signal for cleanup
  const loadArchives = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError('');

        const apiKey = sessionStorage.getItem('apiKey');
        if (!apiKey) {
          setError('No API key found. Please log in.');
          navigate('/account');
          return;
        }

        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/archives`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey,
            },
            signal, // Add abort signal for cleanup
          },
        );

        if (!response.ok) {
          if (response.status === 401) {
            setError('Unauthorized: Invalid or missing API key');
            navigate('/account');
            return;
          }
          throw new Error(
            `API request failed: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setArchives(data);
        } else {
          console.warn('API returned non-array data:', data);
          setArchives([]);
          setError('Invalid data format received from server');
        }
      } catch (error: any) {
        // Ignore aborted requests when navigating away
        if (error.name === 'AbortError') {
          return;
        }
        setError(`Failed to load archives: ${error.message}`);
        console.error('Archives loading error:', error);
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadArchives(controller.signal);

    // Cleanup function to abort request when component unmounts or navigates away
    return () => {
      controller.abort();
    };
  }, [loadArchives]);

  // Client-side filtering logic for ArchivesV2 structure
  const filteredArchives = useMemo((): ArchiveRecord[] => {
    return archives.filter(archive => {
      const searchLower = filters.search.toLowerCase();

      // Search across multiple fields including the searchable text field
      const matchesSearch =
        !filters.search ||
        archive.Archive_SearchText?.toLowerCase().includes(searchLower) ||
        archive.Archive_IncidentData?.reporter
          ?.toLowerCase()
          .includes(searchLower) ||
        archive.Archive_ID?.toString().includes(searchLower) ||
        archive.Archive_Type?.toLowerCase().includes(searchLower);

      const matchesSeverity =
        !filters.severity || archive.Archive_Severity === filters.severity;
      const matchesStatus =
        !filters.status || archive.Archive_Status === filters.status;
      const matchesType =
        !filters.type ||
        archive.Archive_Type?.toLowerCase().includes(
          filters.type.toLowerCase(),
        );
      const matchesReporter =
        !filters.reporter ||
        archive.Archive_IncidentData?.reporter
          ?.toLowerCase()
          .includes(filters.reporter.toLowerCase());
      const matchesCameraId =
        !filters.camera_id ||
        archive.Archive_CameraID?.toString() === filters.camera_id;

      // Tag filtering
      const matchesTags =
        !filters.tags ||
        archive.Archive_Tags?.some(tag =>
          tag.toLowerCase().includes(filters.tags.toLowerCase()),
        );

      // Date filtering
      let matchesDateFrom = true;
      let matchesDateTo = true;

      if (archive.Archive_DateTime) {
        const archiveDate = new Date(archive.Archive_DateTime);
        matchesDateFrom =
          !filters.dateFrom || archiveDate >= new Date(filters.dateFrom);
        matchesDateTo =
          !filters.dateTo ||
          archiveDate <= new Date(filters.dateTo + 'T23:59:59');
      } else if (filters.dateFrom || filters.dateTo) {
        matchesDateFrom = false;
        matchesDateTo = false;
      }

      return (
        matchesSearch &&
        matchesSeverity &&
        matchesStatus &&
        matchesType &&
        matchesReporter &&
        matchesCameraId &&
        matchesTags &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [archives, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredArchives.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentArchives = filteredArchives.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

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
      reporter: '',
      camera_id: '',
      tags: '',
    });
    setCurrentPage(1);
  };

  const exportData = (): void => {
    const dataStr = JSON.stringify(filteredArchives, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archives_export_${
      new Date().toISOString().split('T')[0]
    }.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDateTime = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getSeverityClass = (severity: string): string => {
    return `severity-${severity}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'incident':
        return <AlertTriangle size={16} />;
      case 'alert':
        return <Clock size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  // Show sign-in prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className={`archives-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
        <div className="archives-signin-container">
          <div className="archives-signin-content">
            <div className="signin-header">
              <Clock size={48} />
              <h2>Incident Archives</h2>
              <p>Access Comprehensive Historical Data</p>
            </div>
            <div className="signin-description">
              <p>Sign in or create an account to access:</p>
              <ul>
                <li>Complete incident archive history</li>
                <li>Advanced search and filtering capabilities</li>
                <li>Detailed metadata and analytics</li>
                <li>Export functionality for research and reports</li>
                <li>Time-series analysis and trend identification</li>
                <li>Geographic clustering and correlation data</li>
              </ul>
            </div>
            <div className="signin-footer">
              <p>Join our platform to unlock powerful traffic data analysis tools</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={`archives-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
      >
        <div className="loading-message">
          <div className="loading-spinner" />
          Loading archived data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`archives-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
      >
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
          <p>Historical incident data with searchable metadata and analytics</p>
        </div>
        <div className="header-actions">
          <span className="records-count">
            {filteredArchives.length} / {archives.length} Records
          </span>
          <button onClick={exportData} className="export-button">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Filters - Enhanced for ArchivesV2 */}
      <div className="filters-container">
        {/* Basic Filters Row */}
        <div className="basic-filters">
          <div className="search-input-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search archives (ID, type, reporter, description)..."
              value={filters.search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFilters(prev => ({ ...prev, search: e.target.value }))
              }
              className="search-input"
            />
          </div>

          <select
            value={filters.type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFilters(prev => ({ ...prev, type: e.target.value }))
            }
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="incident">Incidents</option>
            <option value="alert">Alerts</option>
          </select>

          <select
            value={filters.severity}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFilters(prev => ({ ...prev, severity: e.target.value }))
            }
            className="filter-select"
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <select
            value={filters.status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFilters(prev => ({ ...prev, status: e.target.value }))
            }
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="ongoing">Ongoing</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="advanced-filter-toggle"
          >
            <Filter size={16} />
            Advanced
            {showAdvancedFilters ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>
        </div>

        {/* Advanced Filters - Enhanced for searchable metadata */}
        {showAdvancedFilters && (
          <div className="advanced-filters">
            <div className="filter-section">
              <label>Date Range:</label>
              <input
                type="date"
                placeholder="From Date"
                value={filters.dateFrom}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters(prev => ({ ...prev, dateFrom: e.target.value }))
                }
                className="date-input"
              />
              <input
                type="date"
                placeholder="To Date"
                value={filters.dateTo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters(prev => ({ ...prev, dateTo: e.target.value }))
                }
                className="date-input"
              />
            </div>

            <div className="filter-section">
              <label>Metadata Filters:</label>
              <input
                type="text"
                placeholder="Reporter (AI System, Controller, etc.)"
                value={filters.reporter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters(prev => ({ ...prev, reporter: e.target.value }))
                }
                className="text-input"
              />
              <input
                type="text"
                placeholder="Camera ID (1, 2, 4, etc.)"
                value={filters.camera_id}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters(prev => ({ ...prev, camera_id: e.target.value }))
                }
                className="text-input"
              />
              <input
                type="text"
                placeholder="Tags (incident, high, archived_from_incidents)"
                value={filters.tags}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters(prev => ({ ...prev, tags: e.target.value }))
                }
                className="text-input"
              />
            </div>

            <div className="filter-actions">
              <button onClick={clearFilters} className="clear-button">
                <RotateCcw size={16} />
                Clear All
              </button>
              <div className="search-help-text">
                Advanced filtering and analytics features coming soon
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="view-controls">
        <div className="view-mode-toggle">
          <button
            onClick={() => setViewMode('cards')}
            className={`view-mode-button ${
              viewMode === 'cards' ? 'active' : ''
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`view-mode-button ${
              viewMode === 'table' ? 'active' : ''
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`view-mode-button ${
              viewMode === 'detailed' ? 'active' : ''
            }`}
          >
            Detailed
          </button>
        </div>
        <span className="pagination-info">
          Showing {startIndex + 1}-
          {Math.min(startIndex + itemsPerPage, filteredArchives.length)} of{' '}
          {filteredArchives.length}
        </span>
      </div>

      {/* Content */}
      {currentArchives.length === 0 ? (
        <div className="no-data-message">
          <Clock size={48} />
          <h3>No archived data found</h3>
          <p>Try adjusting your filters or check back later.</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="cards-container">
          {currentArchives.map(archive => (
            <div key={archive.Archive_ID} className="archive-card">
              {/* Card Header */}
              <div className="card-header">
                <div className="card-header-left">
                  <div className="archive-id">
                    {getTypeIcon(archive.Archive_Type)}#{archive.Archive_ID}
                  </div>
                  <div
                    className={`severity-badge ${getSeverityClass(
                      archive.Archive_Severity,
                    )}`}
                  >
                    {archive.Archive_Severity}
                  </div>
                </div>
                <div className="card-header-right">
                  <div className="archive-type">{archive.Archive_Type}</div>
                  {archive.Archive_CameraID && (
                    <div className="camera-info">
                      <Camera size={14} />
                      Cam {archive.Archive_CameraID}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="card-content">
                <h4 className="archive-title">
                  {archive.Archive_IncidentData?.reporter || 'Unknown'} Report
                </h4>
                <p className="archive-detail">
                  Status: {archive.Archive_Status} •{' '}
                  {formatDateTime(archive.Archive_DateTime)}
                </p>
                <p className="archive-coordinates">
                  {archive.Archive_IncidentData?.coordinates?.latitude},{' '}
                  {archive.Archive_IncidentData?.coordinates?.longitude}
                </p>

                {/* Tags */}
                {archive.Archive_Tags && archive.Archive_Tags.length > 0 && (
                  <div className="tags-container">
                    <Tag size={14} />
                    {archive.Archive_Tags.map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="archive-search-text">
                  {archive.Archive_SearchText}
                </p>
              </div>

              {/* Card Footer */}
              <div className="card-footer">
                <div className="archive-meta">
                  Archived: {formatDateTime(archive.Archive_Date)}
                </div>
                <button
                  onClick={() => toggleExpanded(archive.Archive_ID)}
                  className="expand-button"
                >
                  <Eye size={16} />
                  {expandedItems.has(archive.Archive_ID) ? 'Hide' : 'View'} Data
                  {expandedItems.has(archive.Archive_ID) ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>

                {expandedItems.has(archive.Archive_ID) && (
                  <div className="expanded-content">
                    <div className="json-section">
                      <h5>Incident Data:</h5>
                      <pre className="json-view">
                        {JSON.stringify(archive.Archive_IncidentData, null, 2)}
                      </pre>
                    </div>
                    <div className="json-section">
                      <h5>Metadata:</h5>
                      <pre className="json-view">
                        {JSON.stringify(archive.Archive_Metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <div className="table-container">
          <table className="archives-table">
            <thead>
              <tr className="table-header">
                <th>ID</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Reporter</th>
                <th>Camera</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentArchives.map(archive => (
                <tr key={archive.Archive_ID} className="table-row">
                  <td className="table-cell id">#{archive.Archive_ID}</td>
                  <td className="table-cell">
                    {getTypeIcon(archive.Archive_Type)}
                    {archive.Archive_Type}
                  </td>
                  <td className="table-cell">
                    <span
                      className={`severity-badge ${getSeverityClass(
                        archive.Archive_Severity,
                      )}`}
                    >
                      {archive.Archive_Severity}
                    </span>
                  </td>
                  <td className="table-cell">{archive.Archive_Status}</td>
                  <td className="table-cell">
                    {archive.Archive_IncidentData?.reporter || 'Unknown'}
                  </td>
                  <td className="table-cell">
                    {archive.Archive_CameraID
                      ? `#${archive.Archive_CameraID}`
                      : 'N/A'}
                  </td>
                  <td className="table-cell small">
                    {formatDateTime(archive.Archive_DateTime)}
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => toggleExpanded(archive.Archive_ID)}
                      className={`table-action-button ${
                        expandedItems.has(archive.Archive_ID) ? 'active' : ''
                      }`}
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Detailed View - Perfect for your partner to work with metadata
        <div className="detailed-container">
          {currentArchives.map(archive => (
            <div key={archive.Archive_ID} className="detailed-card">
              <div className="detailed-header">
                <h3>
                  {getTypeIcon(archive.Archive_Type)}
                  Archive #{archive.Archive_ID} - {archive.Archive_Type}
                  <span
                    className={`severity-badge ${getSeverityClass(
                      archive.Archive_Severity,
                    )}`}
                  >
                    {archive.Archive_Severity}
                  </span>
                </h3>
                <div className="detailed-meta">
                  Archived: {formatDateTime(archive.Archive_Date)} • Status:{' '}
                  {archive.Archive_Status}
                </div>
              </div>

              <div className="detailed-content">
                <div className="metadata-grid">
                  <div className="metadata-section">
                    <h4>Core Data</h4>
                    <p>
                      <strong>Original Incident ID:</strong>{' '}
                      {archive.Archive_IncidentID || 'N/A'}
                    </p>
                    <p>
                      <strong>Camera ID:</strong>{' '}
                      {archive.Archive_CameraID || 'N/A'}
                    </p>
                    <p>
                      <strong>Reporter:</strong>{' '}
                      {archive.Archive_IncidentData?.reporter || 'Unknown'}
                    </p>
                    <p>
                      <strong>Incident Date:</strong>{' '}
                      {formatDateTime(archive.Archive_DateTime)}
                    </p>
                  </div>

                  <div className="metadata-section">
                    <h4>Location</h4>
                    <p>
                      <strong>Coordinates:</strong>
                    </p>
                    <p>
                      Lat:{' '}
                      {archive.Archive_IncidentData?.coordinates?.latitude ||
                        'N/A'}
                    </p>
                    <p>
                      Lng:{' '}
                      {archive.Archive_IncidentData?.coordinates?.longitude ||
                        'N/A'}
                    </p>
                    <p>
                      <strong>Camera Found:</strong>{' '}
                      {archive.Archive_Metadata?.camera_found ? 'Yes' : 'No'}
                    </p>
                  </div>

                  <div className="metadata-section">
                    <h4>Tags & Search</h4>
                    <p>
                      <strong>Search Text:</strong> {archive.Archive_SearchText}
                    </p>
                    <div className="tags-display">
                      {archive.Archive_Tags?.map((tag, index) => (
                        <span key={index} className="metadata-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="search-analytics-section">
                  <h4>Advanced Analytics</h4>
                  <div className="analytics-features">
                    <p>Comprehensive analytics capabilities:</p>
                    <div className="feature-grid">
                      <div className="feature-item">Time-series analysis</div>
                      <div className="feature-item">Geographic clustering</div>
                      <div className="feature-item">Trend analysis</div>
                      <div className="feature-item">Camera correlation</div>
                      <div className="feature-item">Custom queries</div>
                      <div className="feature-item">Performance metrics</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
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
