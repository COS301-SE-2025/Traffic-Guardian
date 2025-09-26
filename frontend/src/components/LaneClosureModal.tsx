import React from 'react';
import { motion } from 'framer-motion';
import { LaneClosure } from '../services/laneClosureService';

interface LaneClosureModalProps {
  closure: LaneClosure | null;
  isOpen: boolean;
  onClose: () => void;
}

const LaneClosureModal: React.FC<LaneClosureModalProps> = ({
  closure,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !closure) {
    return null;
  }

  const formatDateTime = (dateTime: string): string => {
    if (!dateTime) {
      return 'Not specified';
    }
    try {
      return new Date(dateTime).toLocaleString();
    } catch (error) {
      return dateTime;
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'low':
        return '#22c55e';
      case 'medium':
        return '#f59e0b';
      case 'high':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return '#dc2626';
      case 'upcoming':
        return '#f59e0b';
      case 'completed':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  return (
    <motion.div
      className="lane-closure-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="lane-closure-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="lane-closure-modal-header">
          <h3>Lane Closure Details</h3>
          <button className="lane-closure-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="lane-closure-modal-content">
          {/* Primary Information */}
          <div className="closure-section">
            <h4>Location & Route</h4>
            <div className="closure-detail-grid">
              <div className="closure-detail-item">
                <span className="closure-detail-label">Route:</span>
                <span className="closure-detail-value">{closure.route}</span>
              </div>
              <div className="closure-detail-item">
                <span className="closure-detail-label">District:</span>
                <span className="closure-detail-value">{closure.district}</span>
              </div>
              <div className="closure-detail-item">
                <span className="closure-detail-label">Landmark:</span>
                <span className="closure-detail-value">{closure.nearbyLandmark}</span>
              </div>
            </div>
          </div>

          {/* Status and Severity */}
          <div className="closure-section">
            <h4>Status & Impact</h4>
            <div className="closure-status-grid">
              <div className="status-item">
                <span className="status-label">Status:</span>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(closure.status) }}
                >
                  {closure.status.toUpperCase()}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Severity:</span>
                <span
                  className="severity-badge"
                  style={{ backgroundColor: getSeverityColor(closure.severity) }}
                >
                  {closure.severity.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Lane Information */}
          <div className="closure-section">
            <h4>Lane Details</h4>
            <div className="closure-detail-grid">
              <div className="closure-detail-item">
                <span className="closure-detail-label">Total Lanes:</span>
                <span className="closure-detail-value">{closure.details.lanesExisting}</span>
              </div>
              <div className="closure-detail-item">
                <span className="closure-detail-label">Lanes Closed:</span>
                <span className="closure-detail-value closure-impact">
                  {closure.details.lanesClosed}
                </span>
              </div>
              <div className="closure-detail-item">
                <span className="closure-detail-label">Closure Type:</span>
                <span className="closure-detail-value">{closure.details.closureType}</span>
              </div>
              <div className="closure-detail-item">
                <span className="closure-detail-label">Facility Type:</span>
                <span className="closure-detail-value">{closure.details.facilityType}</span>
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="closure-section">
            <h4>Work Details</h4>
            <div className="closure-detail-grid">
              <div className="closure-detail-item">
                <span className="closure-detail-label">Work Type:</span>
                <span className="closure-detail-value">{closure.details.workType}</span>
              </div>
              <div className="closure-detail-item">
                <span className="closure-detail-label">Flow Direction:</span>
                <span className="closure-detail-value">{closure.details.flowDirection}</span>
              </div>
              <div className="closure-detail-item">
                <span className="closure-detail-label">CHIN Reportable:</span>
                <span className="closure-detail-value">{closure.details.chinReportable}</span>
              </div>
              <div className="closure-detail-item">
                <span className="closure-detail-label">Closure ID:</span>
                <span className="closure-detail-value">{closure.details.closureId || 'Not provided'}</span>
              </div>
            </div>
          </div>

          {/* Timing Information */}
          <div className="closure-section">
            <h4>Schedule</h4>
            <div className="closure-detail-grid">
              <div className="closure-detail-item">
                <span className="closure-detail-label">Start Time:</span>
                <span className="closure-detail-value">
                  {formatDateTime(closure.details.startDateTime)}
                </span>
              </div>
              <div className="closure-detail-item">
                <span className="closure-detail-label">End Time:</span>
                <span className="closure-detail-value">
                  {formatDateTime(closure.details.endDateTime)}
                </span>
              </div>
              <div className="closure-detail-item">
                <span className="closure-detail-label">Record Timestamp:</span>
                <span className="closure-detail-value">
                  {formatDateTime(closure.recordTimestamp)}
                </span>
              </div>
            </div>
          </div>

          {/* Location Coordinates */}
          <div className="closure-section">
            <h4>Coordinates</h4>
            <div className="closure-detail-grid">
              <div className="closure-detail-item">
                <span className="closure-detail-label">Begin Location:</span>
                <span className="closure-detail-value">
                  {closure.beginLocation.latitude.toFixed(6)}, {closure.beginLocation.longitude.toFixed(6)}
                </span>
              </div>
              <div className="closure-detail-item">
                <span className="closure-detail-label">End Location:</span>
                <span className="closure-detail-value">
                  {closure.endLocation.latitude.toFixed(6)}, {closure.endLocation.longitude.toFixed(6)}
                </span>
              </div>
              <div className="closure-detail-item">
                <span className="closure-detail-label">Begin Direction:</span>
                <span className="closure-detail-value">{closure.beginLocation.direction}</span>
              </div>
              <div className="closure-detail-item">
                <span className="closure-detail-label">End Direction:</span>
                <span className="closure-detail-value">{closure.endLocation.direction}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LaneClosureModal;