import React, { useState, useEffect, useCallback } from 'react';
import './PEMSTrafficAnalysis.css';

interface PEMSDetector {
  detector_id: string;
  district: number;
  freeway: string;
  direction: string;
  lane_count: number;
  detector_type: string;
  speed: number;
  flow: number;
  occupancy: number;
  density: number;
  vmt: number;
  delay: number;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface PEMSAlert {
  id: string;
  type: string;
  detector_id: string;
  freeway: string;
  direction: string;
  message: string;
  risk_score: number;
  timestamp: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  recommended_action: string;
}

interface CriticalArea {
  freeway: string;
  detector_count: number;
  avg_risk_score: number;
  avg_speed: number;
  total_flow: number;
  risk_level: string;
}

interface PEMSData {
  district: number;
  region_name: string;
  timestamp: string;
  summary: {
    total_detectors: number;
    active_detectors: number;
    avg_speed: number;
    total_flow: number;
    avg_occupancy: number;
    avg_risk_score: number;
    high_risk_count: number;
    system_health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  };
  detectors: PEMSDetector[];
  high_risk_areas: PEMSDetector[];
  critical_areas: CriticalArea[];
  alerts: PEMSAlert[];
  recommendations: Array<{
    type: string;
    priority: string;
    message: string;
    actions: string[];
  }>;
}

const TrendingUpIcon = () => (
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
      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    />
  </svg>
);

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

const GaugeIcon = () => (
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
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const RoadIcon = () => (
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
      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
    />
  </svg>
);

interface Props {
  district?: number;
  onAlertSelect?: (alert: PEMSAlert) => void;
  onDetectorSelect?: (detector: PEMSDetector) => void;
}

const PEMSTrafficAnalysis: React.FC<Props> = ({
  district = 4, // Default to SF Bay Area
  onAlertSelect,
  onDetectorSelect,
}) => {
  const [pemsData, setPemsData] = useState<PEMSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'alerts' | 'detectors' | 'recommendations'
  >('overview');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const API_BASE_URL =
    process.env.REACT_APP_SERVER_URL || 'http://localhost:5000/api';

  const getAuthHeaders = useCallback((): HeadersInit => {
    const apiKey = sessionStorage.getItem('apiKey');
    return {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey || '',
    };
  }, []);

  const fetchPEMSData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/pems/district/${district}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPemsData(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching PEMS data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch PEMS data'
      );
    } finally {
      setLoading(false);
    }
  }, [district, getAuthHeaders, API_BASE_URL]);

  useEffect(() => {
    fetchPEMSData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchPEMSData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPEMSData]);

  const getRiskLevelClass = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'critical':
        return 'risk-critical';
      case 'high':
        return 'risk-high';
      case 'medium':
        return 'risk-medium';
      case 'low':
        return 'risk-low';
      default:
        return 'risk-unknown';
    }
  };

  const getSystemHealthClass = (health: string) => {
    switch (health.toLowerCase()) {
      case 'healthy':
        return 'health-good';
      case 'warning':
        return 'health-warning';
      case 'critical':
        return 'health-critical';
      default:
        return 'health-unknown';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="pems-analysis loading">
        <div className="loading-spinner"></div>
        <p>Loading PEMS Traffic Data...</p>
      </div>
    );
  }

  if (error || !pemsData) {
    return (
      <div className="pems-analysis error">
        <AlertTriangleIcon />
        <h3>PEMS Data Unavailable</h3>
        <p>{error || 'No traffic data available'}</p>
        <button onClick={fetchPEMSData} className="retry-btn">
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="pems-analysis">
      <div className="pems-header">
        <div className="pems-title-section">
          <h2>PEMS Traffic Analysis</h2>
          <div className="pems-region">
            <span className="district-badge">District {pemsData.district}</span>
            <span className="region-name">{pemsData.region_name}</span>
          </div>
        </div>

        <div className="pems-status">
          <div
            className={`system-status ${getSystemHealthClass(
              pemsData.summary.system_health
            )}`}
          >
            <div className="status-indicator"></div>
            <span>System: {pemsData.summary.system_health}</span>
          </div>
          <div className="last-update">
            Last Update: {formatTimestamp(pemsData.timestamp)}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="pems-metrics">
        <div className="metric-card">
          <div className="metric-icon">
            <GaugeIcon />
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {pemsData.summary.total_detectors}
            </div>
            <div className="metric-label">Active Detectors</div>
            <div className="metric-subtitle">
              {pemsData.summary.active_detectors} operational
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <RoadIcon />
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {pemsData.summary.avg_speed.toFixed(1)} mph
            </div>
            <div className="metric-label">Average Speed</div>
            <div className="metric-subtitle">System-wide average</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <TrendingUpIcon />
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {pemsData.summary.total_flow.toLocaleString()}
            </div>
            <div className="metric-label">Vehicle Flow</div>
            <div className="metric-subtitle">Vehicles per hour</div>
          </div>
        </div>

        <div
          className={`metric-card ${getRiskLevelClass(
            pemsData.summary.avg_risk_score > 7
              ? 'HIGH'
              : pemsData.summary.avg_risk_score > 5
              ? 'MEDIUM'
              : 'LOW'
          )}`}
        >
          <div className="metric-icon">
            <AlertTriangleIcon />
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {pemsData.summary.high_risk_count}
            </div>
            <div className="metric-label">High Risk Areas</div>
            <div className="metric-subtitle">
              Risk Score: {pemsData.summary.avg_risk_score.toFixed(1)}/10
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="pems-tabs">
        <button
          className={selectedTab === 'overview' ? 'tab-active' : ''}
          onClick={() => setSelectedTab('overview')}
        >
          Overview
        </button>
        <button
          className={selectedTab === 'alerts' ? 'tab-active' : ''}
          onClick={() => setSelectedTab('alerts')}
        >
          Alerts ({pemsData.alerts.length})
        </button>
        <button
          className={selectedTab === 'detectors' ? 'tab-active' : ''}
          onClick={() => setSelectedTab('detectors')}
        >
          High-Risk Detectors ({pemsData.high_risk_areas.length})
        </button>
        <button
          className={selectedTab === 'recommendations' ? 'tab-active' : ''}
          onClick={() => setSelectedTab('recommendations')}
        >
          Recommendations
        </button>
      </div>

      {/* Tab Content */}
      <div className="pems-content">
        {selectedTab === 'overview' && (
          <div className="overview-section">
            <div className="critical-areas">
              <h3>Critical Traffic Areas</h3>
              {pemsData.critical_areas.length > 0 ? (
                <div className="critical-areas-list">
                  {pemsData.critical_areas.map((area, index) => (
                    <div
                      key={index}
                      className={`critical-area-card ${getRiskLevelClass(
                        area.risk_level
                      )}`}
                    >
                      <div className="area-header">
                        <span className="freeway-name">{area.freeway}</span>
                        <span className="risk-badge">{area.risk_level}</span>
                      </div>
                      <div className="area-metrics">
                        <span>Risk Score: {area.avg_risk_score}/10</span>
                        <span>Avg Speed: {area.avg_speed} mph</span>
                        <span>Detectors: {area.detector_count}</span>
                        <span>Flow: {area.total_flow.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-critical-areas">
                  <p>✅ No critical areas detected at this time</p>
                </div>
              )}
            </div>

            <div className="risk-distribution">
              <h3>Risk Distribution</h3>
              <div className="risk-bars">
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => {
                  const count = pemsData.detectors.filter(
                    d => d.risk_level === level
                  ).length;
                  const percentage = (count / pemsData.detectors.length) * 100;
                  return (
                    <div key={level} className="risk-bar">
                      <div className="risk-label">
                        <span>{level}</span>
                        <span>{count} detectors</span>
                      </div>
                      <div className="risk-progress">
                        <div
                          className={`risk-fill ${getRiskLevelClass(level)}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="risk-percentage">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'alerts' && (
          <div className="alerts-section">
            <div className="alerts-header">
              <h3>Active Traffic Alerts</h3>
              <div className="alert-summary">
                <span className="priority-count high">
                  High:{' '}
                  {pemsData.alerts.filter(a => a.priority === 'HIGH').length}
                </span>
                <span className="priority-count medium">
                  Medium:{' '}
                  {pemsData.alerts.filter(a => a.priority === 'MEDIUM').length}
                </span>
                <span className="priority-count low">
                  Low:{' '}
                  {pemsData.alerts.filter(a => a.priority === 'LOW').length}
                </span>
              </div>
            </div>

            <div className="alerts-list">
              {pemsData.alerts.length > 0 ? (
                pemsData.alerts
                  .sort((a, b) => {
                    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
                    return (
                      priorityOrder[b.priority] - priorityOrder[a.priority]
                    );
                  })
                  .map(alert => (
                    <div
                      key={alert.id}
                      className={`alert-card priority-${alert.priority.toLowerCase()}`}
                      onClick={() => onAlertSelect?.(alert)}
                    >
                      <div className="alert-header">
                        <div className="alert-info">
                          <span className="detector-id">
                            {alert.detector_id}
                          </span>
                          <span className="freeway-direction">
                            {alert.freeway} {alert.direction}
                          </span>
                        </div>
                        <div className="alert-meta">
                          <span className="priority-badge">
                            {alert.priority}
                          </span>
                          <span className="risk-score">
                            Risk: {alert.risk_score.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="alert-message">{alert.message}</div>
                      <div className="alert-action">
                        <strong>Recommended Action:</strong>{' '}
                        {alert.recommended_action}
                      </div>
                      <div className="alert-timestamp">
                        {formatTimestamp(alert.timestamp)}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="no-alerts">
                  <p>✅ No active alerts at this time</p>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'detectors' && (
          <div className="detectors-section">
            <h3>High-Risk Traffic Detectors</h3>
            <div className="detectors-grid">
              {pemsData.high_risk_areas.length > 0 ? (
                pemsData.high_risk_areas.map(detector => (
                  <div
                    key={detector.detector_id}
                    className={`detector-card ${getRiskLevelClass(
                      detector.risk_level
                    )}`}
                    onClick={() => onDetectorSelect?.(detector)}
                  >
                    <div className="detector-header">
                      <span className="detector-id">
                        {detector.detector_id}
                      </span>
                      <span className="risk-level-badge">
                        {detector.risk_level}
                      </span>
                    </div>
                    <div className="detector-location">
                      {detector.freeway} {detector.direction} •{' '}
                      {detector.detector_type}
                    </div>
                    <div className="detector-metrics">
                      <div className="metric-row">
                        <span>Speed:</span>
                        <span
                          className={
                            detector.speed < 20 ? 'metric-warning' : ''
                          }
                        >
                          {detector.speed.toFixed(1)} mph
                        </span>
                      </div>
                      <div className="metric-row">
                        <span>Flow:</span>
                        <span>{detector.flow.toLocaleString()} veh/hr</span>
                      </div>
                      <div className="metric-row">
                        <span>Occupancy:</span>
                        <span
                          className={
                            detector.occupancy > 40 ? 'metric-warning' : ''
                          }
                        >
                          {detector.occupancy.toFixed(1)}%
                        </span>
                      </div>
                      <div className="metric-row">
                        <span>Risk Score:</span>
                        <span className="risk-score-value">
                          {detector.risk_score.toFixed(1)}/10
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-high-risk">
                  <p>✅ No high-risk detectors at this time</p>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'recommendations' && (
          <div className="recommendations-section">
            <h3>Traffic Control Recommendations</h3>
            <div className="recommendations-list">
              {pemsData.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`recommendation-card priority-${rec.priority.toLowerCase()}`}
                >
                  <div className="recommendation-header">
                    <span className="rec-type">
                      {rec.type.replace('_', ' ')}
                    </span>
                    <span className="rec-priority">{rec.priority}</span>
                  </div>
                  <div className="recommendation-message">{rec.message}</div>
                  <div className="recommendation-actions">
                    <strong>Recommended Actions:</strong>
                    <ul>
                      {rec.actions.map((action, actionIndex) => (
                        <li key={actionIndex}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pems-footer">
        <button onClick={fetchPEMSData} className="refresh-btn">
          Refresh Data
        </button>
        <span className="data-source">
          Data Source: Caltrans PEMS District {pemsData.district}
        </span>
      </div>
    </div>
  );
};

export default PEMSTrafficAnalysis;
