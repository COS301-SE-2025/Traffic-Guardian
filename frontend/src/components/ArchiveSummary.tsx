import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/apiService';
import LoadingSpinner from './LoadingSpinner';


interface ArchiveSummaryData {
  totalArchives: number;
  recentCount: number;
  criticalCount: number;
  resolvedCount: number;
  topTypes: Array<{ type: string; count: number }>;
  topSeverities: Array<{ severity: string; count: number }>;
}

interface ArchiveSummaryProps {
  className?: string;
}

const ArchiveSummary: React.FC<ArchiveSummaryProps> = ({ className = '' }) => {
  const [data, setData] = useState<ArchiveSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const processArchiveData = useCallback((archives: unknown[]): ArchiveSummaryData => {
    if (!archives || !Array.isArray(archives) || archives.length === 0) {
      return {
        totalArchives: 0,
        recentCount: 0,
        criticalCount: 0,
        resolvedCount: 0,
        topTypes: [],
        topSeverities: [],
      };
    }

    const totalArchives = archives.length;

    // Group by type and severity
    const typeMap = new Map<string, number>();
    const severityMap = new Map<string, number>();
    let criticalCount = 0;
    let resolvedCount = 0;
    let recentCount = 0;

    // Get date 7 days ago for recent count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    archives.forEach(archive => {
      if (!archive) {
        return;
      }

      // Count by type - ensure it's a valid string
      const type = archive.Archive_Type && typeof archive.Archive_Type === 'string'
        ? archive.Archive_Type.trim()
        : 'Unknown';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);

      // Count by severity - ensure it's a valid string
      const severity = archive.Archive_Severity && typeof archive.Archive_Severity === 'string'
        ? archive.Archive_Severity.toLowerCase().trim()
        : 'unknown';
      severityMap.set(severity, (severityMap.get(severity) || 0) + 1);

      // Count critical/high severity
      if (severity === 'critical' || severity === 'high') {
        criticalCount++;
      }

      // Count resolved/closed
      const status = archive.Archive_Status && typeof archive.Archive_Status === 'string'
        ? archive.Archive_Status.toLowerCase().trim()
        : '';
      if (status === 'resolved' || status === 'closed') {
        resolvedCount++;
      }

      // Count recent (last 7 days) - handle different date formats
      let archiveDate: Date | null = null;
      if (archive.Archive_DateTime) {
        archiveDate = new Date(archive.Archive_DateTime);
      } else if (archive.Archive_Date) {
        archiveDate = new Date(archive.Archive_Date);
      }

      if (archiveDate && !isNaN(archiveDate.getTime()) && archiveDate >= weekAgo) {
        recentCount++;
      }
    });

    // Get top 3 types and severities
    const topTypes = Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const topSeverities = Array.from(severityMap.entries())
      .map(([severity, count]) => ({ severity, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalArchives,
      recentCount,
      criticalCount,
      resolvedCount,
      topTypes,
      topSeverities,
    };
  }, []);

  const fetchArchiveSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch archives directly instead of stats to get accurate data
      const archives = await ApiService.fetchArchives({ limit: 1000 });

      if (archives && archives.length > 0) {
        // Process the archives into summary format
        const summary = processArchiveData(archives);
        setData(summary);
      } else {
        setError('No archive data available');
      }
    } catch (err) {
      console.error('Error fetching archive summary:', err);
      setError('Failed to load archive data');
    } finally {
      setLoading(false);
    }
  }, [processArchiveData]);

  useEffect(() => {
    fetchArchiveSummary();
  }, [fetchArchiveSummary]);

  if (loading) {
    return (
      <div className={`archive-summary-container ${className}`}>
        <div className="archive-summary-header">
          <h3>Archive Summary</h3>
          <div className="archive-summary-subtitle">
            System incident overview
          </div>
        </div>
        <div className="archive-summary-loading">
          <LoadingSpinner size="small" text="Loading archives..." />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`archive-summary-container ${className}`}>
        <div className="archive-summary-header">
          <h3>Archive Summary</h3>
          <div className="archive-summary-subtitle">
            System incident overview
          </div>
        </div>
        <div className="archive-summary-error">
          <div className="error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
          </div>
          <div className="error-message">
            {error || 'No archive data available'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`archive-summary-container ${className}`}>
      <div className="archive-summary-header">
        <h3>Archive Summary</h3>
        <div className="archive-summary-subtitle">
          System incident overview • {data.totalArchives.toLocaleString()} total
        </div>
      </div>

      <div className="archive-summary-content">
        {/* Key Metrics */}
        <div className="summary-metrics">
          <div className="metric-item">
            <div className="metric-icon total">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <div className="metric-content">
              <div className="metric-value">{data.totalArchives.toLocaleString()}</div>
              <div className="metric-label">Total Archives</div>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-icon recent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <div className="metric-content">
              <div className="metric-value">{data.recentCount.toLocaleString()}</div>
              <div className="metric-label">Recent</div>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-icon critical">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/>
                <path d="m12 17 .01 0"/>
              </svg>
            </div>
            <div className="metric-content">
              <div className="metric-value">{data.criticalCount.toLocaleString()}</div>
              <div className="metric-label">Critical</div>
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-icon resolved">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
            </div>
            <div className="metric-content">
              <div className="metric-value">{data.resolvedCount.toLocaleString()}</div>
              <div className="metric-label">Resolved</div>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        <div className="summary-categories">
          <div className="category-section">
            <h4>Top Incident Types</h4>
            <div className="category-list">
              {data.topTypes.map((item, _index) => (
                <div key={item.type} className="category-item">
                  <div className="category-rank">{_index + 1}</div>
                  <div className="category-content">
                    <div className="category-name">{item.type || 'Unknown'}</div>
                    <div className="category-count">{item.count.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="category-section">
            <h4>Severity Levels</h4>
            <div className="category-list">
              {data.topSeverities.map((item) => (
                <div key={item.severity} className="category-item">
                  <div className={`severity-indicator ${item.severity}`} />
                  <div className="category-content">
                    <div className="category-name">{item.severity || 'Unknown'}</div>
                    <div className="category-count">{item.count.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchiveSummary;