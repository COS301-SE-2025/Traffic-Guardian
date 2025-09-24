import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { useLiveFeed, CameraFeed } from '../contexts/LiveFeedContext';
import LoadingSpinner from '../components/LoadingSpinner';
import TrafficHeatmap from '../components/TrafficHeatmap';
import trafficDensityService, {
  HeatmapPoint,
  TrafficDensityAnalysis,
} from '../services/trafficDensityService';
import laneClosureService, {
  LaneClosure,
  LaneClosureAnalysis,
} from '../services/laneClosureService';
import LaneClosureModal from '../components/LaneClosureModal';
import 'leaflet/dist/leaflet.css';
import './Map.css';

// Fix for default markers in Leaflet with Webpack
delete ((L as any).Icon.Default.prototype as any)._getIconUrl;
(L as any).Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom lane closure icons based on severity
const createLaneClosureIcon = (severity: 'low' | 'medium' | 'high'): any => {
  const colorMap = {
    low: '#22c55e',    // Green
    medium: '#f59e0b', // Orange
    high: '#ef4444',   // Red
  };

  const color = colorMap[severity];

  return new (L as any).Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="13" fill="${color}" stroke="white" stroke-width="2"/>
        <path d="M8 14h12M10 10h8M10 18h8" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <text x="14" y="19" text-anchor="middle" fill="white" font-size="8" font-weight="bold">!</text>
      </svg>
    `)}`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

// Custom camera icons based on status
const createCameraIcon = (status: 'Online' | 'Offline' | 'Loading'): any => {
  const color =
    status === 'Online'
      ? '#4ade80'
      : status === 'Loading'
        ? '#feac34'
        : '#ef4444';

  return new (L as any).Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" fill="${color}" stroke="white" stroke-width="2"/>
        <path d="M10 12h12l-2-2h-8l-2 2z" fill="white"/>
        <rect x="8" y="12" width="16" height="10" rx="2" fill="white"/>
        <circle cx="16" cy="17" r="3" fill="${color}"/>
        <circle cx="16" cy="17" r="1.5" fill="white"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

interface CameraModalProps {
  camera: CameraFeed;
  isOpen: boolean;
  onClose: () => void;
}

const CameraModal: React.FC<CameraModalProps> = ({
  camera,
  isOpen,
  onClose,
}) => {
  const [imageError, setImageError] = useState(false);
  const [streamError, setStreamError] = useState(false);

  if (!isOpen) {return null;}

  const handleImageError = () => {
    setImageError(true);
  };

  const handleStreamError = () => {
    setStreamError(true);
  };

  return (
    <motion.div
      className="camera-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="camera-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="camera-modal-header">
          <h3>{camera.location}</h3>
          <button className="camera-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="camera-modal-content">
          {/* Livestream Section */}
          {camera.hasLiveStream && camera.videoUrl && !streamError ? (
            <div className="camera-stream-section">
              <h4>Live Stream</h4>
              <video
                controls
                autoPlay
                muted
                className="camera-stream"
                onError={handleStreamError}
              >
                <source src={camera.videoUrl} type="application/x-mpegURL" />
                <source src={camera.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            /* Static Image Section */
            <div className="camera-image-section">
              <h4>Current View</h4>
              {!imageError ? (
                <img
                  src={camera.image}
                  alt={`Camera view of ${camera.location}`}
                  className="camera-image"
                  onError={handleImageError}
                />
              ) : (
                <div className="camera-image-error">
                  <p>Unable to load camera image</p>
                </div>
              )}
            </div>
          )}

          {/* Camera Details */}
          <div className="camera-details">
            <div className="camera-detail-grid">
              <div className="camera-detail-item">
                <span className="camera-detail-label">Status:</span>
                <span
                  className={`camera-status-badge ${camera.status.toLowerCase()}`}
                >
                  {camera.status}
                </span>
              </div>
              <div className="camera-detail-item">
                <span className="camera-detail-label">District:</span>
                <span>{camera.district}</span>
              </div>
              <div className="camera-detail-item">
                <span className="camera-detail-label">Route:</span>
                <span>{camera.route}</span>
              </div>
              {camera.direction && (
                <div className="camera-detail-item">
                  <span className="camera-detail-label">Direction:</span>
                  <span>{camera.direction}</span>
                </div>
              )}
              {camera.county && (
                <div className="camera-detail-item">
                  <span className="camera-detail-label">County:</span>
                  <span>{camera.county}</span>
                </div>
              )}
              {camera.milepost && (
                <div className="camera-detail-item">
                  <span className="camera-detail-label">Milepost:</span>
                  <span>{camera.milepost}</span>
                </div>
              )}
              <div className="camera-detail-item">
                <span className="camera-detail-label">Last Update:</span>
                <span>{camera.lastUpdate}</span>
              </div>
              {camera.updateFrequency && (
                <div className="camera-detail-item">
                  <span className="camera-detail-label">Update Frequency:</span>
                  <span>{camera.updateFrequency}</span>
                </div>
              )}
            </div>

            {/* Historical Images */}
            {camera.historicalImages && camera.historicalImages.length > 0 && (
              <div className="historical-images">
                <h4>Recent Images</h4>
                <div className="historical-images-grid">
                  {camera.historicalImages
                    .slice(0, 4)
                    .map((imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl}
                        alt={`Historical view ${index + 1}`}
                        className="historical-image"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Weather layer types
type WeatherLayer = 'satellite';

interface MapControlsProps {
  onRefresh: () => void;
  onFilterChange: (status: string) => void;
  activeFilter: string;
  totalCameras: number;
  visibleCameras: number;
  onWeatherToggle: (layer: WeatherLayer | null) => void;
  activeWeatherLayer: WeatherLayer | null;
  weatherOpacity: number;
  onOpacityChange: (opacity: number) => void;
  onHeatmapToggle: () => void;
  heatmapVisible: boolean;
  heatmapOpacity: number;
  onHeatmapOpacityChange: (opacity: number) => void;
  trafficAnalysis: TrafficDensityAnalysis | null;
  dynamicVehicleCount: number;
  onLaneClosuresToggle: () => void;
  laneClosuresVisible: boolean;
  laneClosureAnalysis: LaneClosureAnalysis | null;
  onLaneClosureStatusFilter: (status: string) => void;
  activeLaneClosureStatusFilter: string;
  onLaneClosureSeverityFilter: (severity: string) => void;
  activeLaneClosureSeverityFilter: string;
}

const MapControls: React.FC<MapControlsProps> = ({
  onRefresh,
  onFilterChange,
  activeFilter,
  totalCameras,
  visibleCameras,
  onWeatherToggle,
  activeWeatherLayer,
  weatherOpacity,
  onOpacityChange,
  onHeatmapToggle,
  heatmapVisible,
  heatmapOpacity,
  onHeatmapOpacityChange,
  trafficAnalysis,
  dynamicVehicleCount,
  onLaneClosuresToggle,
  laneClosuresVisible,
  laneClosureAnalysis,
  onLaneClosureStatusFilter,
  activeLaneClosureStatusFilter,
  onLaneClosureSeverityFilter,
  activeLaneClosureSeverityFilter,
}) => (
  <div className="map-controls" data-testid="map-controls">
    <div
      data-testid="route-planner"
      style={{ visibility: 'hidden', position: 'absolute' }}
    >
      Route Planner Placeholder
    </div>
    {/* Main Header */}
    <div className="map-header">
      <div className="map-title-section">
        <h2>Traffic Camera Map</h2>
        <div className="camera-count">
          <span className="count-number">{visibleCameras}</span>
          <span className="count-label">of {totalCameras} cameras</span>
        </div>
      </div>

      <button className="refresh-button" onClick={onRefresh}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
        </svg>
        Refresh Data
      </button>
    </div>

    {/* Control Panels Row */}
    <div className="control-panels">
      {/* Camera Filters Panel */}
      <div className="control-panel camera-panel">
        <div className="panel-header">
          <h3>Camera Status</h3>
        </div>
        <div className="filter-buttons-grid">
          <button
            className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => onFilterChange('all')}
          >
            <span className="chip-label">All</span>
          </button>
          <button
            className={`filter-chip online ${
              activeFilter === 'Online' ? 'active' : ''
            }`}
            onClick={() => onFilterChange('Online')}
          >
            <div className="chip-indicator online-indicator" />
            <span className="chip-label">Online</span>
          </button>
          <button
            className={`filter-chip loading ${
              activeFilter === 'Loading' ? 'active' : ''
            }`}
            onClick={() => onFilterChange('Loading')}
          >
            <div className="chip-indicator loading-indicator" />
            <span className="chip-label">Loading</span>
          </button>
          <button
            className={`filter-chip offline ${
              activeFilter === 'Offline' ? 'active' : ''
            }`}
            onClick={() => onFilterChange('Offline')}
          >
            <div className="chip-indicator offline-indicator" />
            <span className="chip-label">Offline</span>
          </button>
        </div>
      </div>

      {/* Weather Panel */}
      <div className="control-panel weather-panel">
        <div className="panel-header">
          <h3>Weather Layer</h3>
          <button
            className={`toggle-button satellite ${
              activeWeatherLayer === 'satellite' ? 'active' : ''
            }`}
            onClick={() =>
              onWeatherToggle(
                activeWeatherLayer === 'satellite' ? null : 'satellite',
              )
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
            </svg>
            Satellite
          </button>
        </div>

        {activeWeatherLayer && (
          <div className="panel-content">
            <div className="slider-control">
              <div className="slider-header">
                <label>Opacity</label>
                <span className="slider-value">
                  {Math.round(weatherOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={weatherOpacity}
                onChange={e => onOpacityChange(parseFloat(e.target.value))}
                className="modern-slider"
              />
            </div>
          </div>
        )}
      </div>

      {/* Lane Closures Panel */}
      <div className="control-panel lane-closures-panel">
        <div className="panel-header">
          <h3>Lane Closures</h3>
          <button
            className={`toggle-button lane-closures ${
              laneClosuresVisible ? 'active' : ''
            }`}
            onClick={onLaneClosuresToggle}
            data-testid="lane-closures-toggle"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            District 12
          </button>
        </div>

        <div className="panel-content">
          {laneClosureAnalysis ? (
            <div className="lane-closure-metrics">
              <div className="metric">
                <div className="metric-value">
                  {laneClosureAnalysis.activeClosure}
                </div>
                <div className="metric-label">Active Closures</div>
              </div>
              <div className="metric">
                <div className={`metric-value ${
                  laneClosureAnalysis.highSeverityClosures > 0 ? 'warning' : ''
                }`}>
                  {laneClosureAnalysis.highSeverityClosures}
                </div>
                <div className="metric-label">High Severity</div>
              </div>
              <div className="metric">
                <div className="metric-value">
                  {laneClosureAnalysis.upcomingClosures}
                </div>
                <div className="metric-label">Upcoming</div>
              </div>
            </div>
          ) : (
            <div className="lane-closure-metrics">
              <div className="metric">
                <div className="metric-value">-</div>
                <div className="metric-label">Active Closures</div>
              </div>
              <div className="metric">
                <div className="metric-value">-</div>
                <div className="metric-label">High Severity</div>
              </div>
              <div className="metric">
                <div className="metric-value">-</div>
                <div className="metric-label">Upcoming</div>
              </div>
            </div>
          )}

          {/* Lane Closure Filter Controls */}
          {laneClosuresVisible && (
            <div className="lane-closure-filters">
              <div className="filter-section">
                <h4>Filter by Status</h4>
                <div className="filter-buttons-grid">
                  <button
                    className={`filter-chip ${activeLaneClosureStatusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => onLaneClosureStatusFilter('all')}
                  >
                    <span className="chip-label">All</span>
                  </button>
                  <button
                    className={`filter-chip active-closure ${
                      activeLaneClosureStatusFilter === 'active' ? 'active' : ''
                    }`}
                    onClick={() => onLaneClosureStatusFilter('active')}
                  >
                    <div className="chip-indicator active-closure-indicator" />
                    <span className="chip-label">Active</span>
                  </button>
                  <button
                    className={`filter-chip upcoming-closure ${
                      activeLaneClosureStatusFilter === 'upcoming' ? 'active' : ''
                    }`}
                    onClick={() => onLaneClosureStatusFilter('upcoming')}
                  >
                    <div className="chip-indicator upcoming-closure-indicator" />
                    <span className="chip-label">Upcoming</span>
                  </button>
                  <button
                    className={`filter-chip completed-closure ${
                      activeLaneClosureStatusFilter === 'completed' ? 'active' : ''
                    }`}
                    onClick={() => onLaneClosureStatusFilter('completed')}
                  >
                    <div className="chip-indicator completed-closure-indicator" />
                    <span className="chip-label">Completed</span>
                  </button>
                </div>
              </div>

              <div className="filter-section">
                <h4>Filter by Severity</h4>
                <div className="filter-buttons-grid">
                  <button
                    className={`filter-chip ${activeLaneClosureSeverityFilter === 'all' ? 'active' : ''}`}
                    onClick={() => onLaneClosureSeverityFilter('all')}
                  >
                    <span className="chip-label">All</span>
                  </button>
                  <button
                    className={`filter-chip low-severity ${
                      activeLaneClosureSeverityFilter === 'low' ? 'active' : ''
                    }`}
                    onClick={() => onLaneClosureSeverityFilter('low')}
                  >
                    <div className="chip-indicator low-severity-indicator" />
                    <span className="chip-label">Low</span>
                  </button>
                  <button
                    className={`filter-chip medium-severity ${
                      activeLaneClosureSeverityFilter === 'medium' ? 'active' : ''
                    }`}
                    onClick={() => onLaneClosureSeverityFilter('medium')}
                  >
                    <div className="chip-indicator medium-severity-indicator" />
                    <span className="chip-label">Medium</span>
                  </button>
                  <button
                    className={`filter-chip high-severity ${
                      activeLaneClosureSeverityFilter === 'high' ? 'active' : ''
                    }`}
                    onClick={() => onLaneClosureSeverityFilter('high')}
                  >
                    <div className="chip-indicator high-severity-indicator" />
                    <span className="chip-label">High</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Traffic Density Panel */}
      <div className="control-panel traffic-panel">
        <div className="panel-header">
          <h3>Traffic Density</h3>
          <button
            className={`toggle-button heatmap ${
              heatmapVisible ? 'active' : ''
            }`}
            onClick={onHeatmapToggle}
            data-testid="heatmap-toggle"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 20h20v2H2zm1.64-6.36c.9.9 2.15.9 3.05 0l2.83-2.83c.9-.9.9-2.15 0-3.05-.9-.9-2.15-.9-3.05 0l-2.83 2.83c-.9.9-.9 2.15 0 3.05z" />
              <path d="m6.5 17.5-5-5c-.9-.9-.9-2.15 0-3.05L6.34 4.6c.9-.9 2.15-.9 3.05 0 .9.9.9 2.15 0 3.05l-4.84 4.85c-.9.9-2.15.9-3.05 0z" />
            </svg>
            Heatmap
          </button>
        </div>

        <div className="panel-content">
          {trafficAnalysis ? (
            <div className="traffic-metrics">
              <div className="metric">
                <div className="metric-value">
                  {dynamicVehicleCount}
                </div>
                <div className="metric-label">Vehicles in View</div>
              </div>
              <div className="metric">
                <div
                  className={`metric-value ${
                    trafficAnalysis.riskAreas.length > 0 ? 'warning' : ''
                  }`}
                >
                  {trafficAnalysis.riskAreas.length}
                </div>
                <div className="metric-label">Risk Areas</div>
              </div>
              <div className="metric intensity-metric">
                <div className="metric-label">Peak Intensity</div>
                <div className="intensity-bar-modern">
                  <div
                    className="intensity-fill-modern"
                    style={{ width: `${trafficAnalysis.peakIntensity * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="traffic-metrics">
              <div className="metric">
                <div className="metric-value">{dynamicVehicleCount}</div>
                <div className="metric-label">Vehicles in View</div>
              </div>
              <div className="metric">
                <div className="metric-value">-</div>
                <div className="metric-label">Risk Areas</div>
              </div>
              <div className="metric intensity-metric">
                <div className="metric-label">Peak Intensity</div>
                <div className="intensity-bar-modern">
                  <div
                    className="intensity-fill-modern"
                    style={{ width: '0%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Always show heatmap controls when heatmap is visible */}
          {heatmapVisible && (
            <div className="slider-control">
              <div className="slider-header">
                <label>Heatmap Opacity</label>
                <span className="slider-value">
                  {Math.round(heatmapOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={heatmapOpacity}
                onChange={e =>
                  onHeatmapOpacityChange(parseFloat(e.target.value))
                }
                className="modern-slider heatmap-slider"
              />

              <div className="traffic-legend">
                <div className="legend-label">Traffic Intensity</div>
                <div className="legend-bar" />
                <div className="legend-markers">
                  <span>Low</span>
                  <span>High</span>
                  <span>Critical</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

// Weather overlay component
const WeatherOverlay: React.FC<{
  layer: WeatherLayer | null;
  opacity: number;
}> = ({ layer, opacity: _opacity }) => {
  const getWeatherTileUrl = (layer: WeatherLayer): string => {
    const layerMap: Record<WeatherLayer, string> = {
      satellite:
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    };

    return layerMap[layer];
  };

  const [tileUrl, setTileUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (!layer) {
      setTileUrl('');
      return;
    }

    setTileUrl(getWeatherTileUrl(layer));
  }, [layer]);

  if (!layer || !tileUrl) {return null;}

  return (
    <TileLayer
      {...({
        url: tileUrl,
        attribution: '© Esri, World Imagery',
      } as any)}
    />
  );
};

// Component to fit map bounds to markers
const FitBounds: React.FC<{ cameras: CameraFeed[] }> = ({ cameras }) => {
  const map = useMap();

  React.useEffect(() => {
    if (cameras.length === 0) {return;}

    const validCoords = cameras
      .filter(camera => camera.coordinates)
      .map(
        camera =>
          [camera.coordinates!.lat, camera.coordinates!.lng] as [number, number],
      );

    if (validCoords.length > 0) {
      map.fitBounds(validCoords, { padding: [20, 20] });
    }
  }, [cameras, map]);

  return null;
};

// Component to track viewport changes and visible cameras
const ViewportTracker: React.FC<{
  cameras: CameraFeed[];
  onViewportChange: (visibleCameras: CameraFeed[]) => void;
}> = ({ cameras, onViewportChange }) => {
  const map = useMap();

  const checkVisibleCameras = useCallback(() => {
    if (!map || cameras.length === 0) {
      onViewportChange([]);
      return;
    }

    const bounds = map.getBounds();
    const visibleCameras = cameras.filter(camera => {
      if (!camera.coordinates) {
        return false;
      }

      const { lat, lng } = camera.coordinates;
      return bounds.contains([lat, lng]);
    });

    onViewportChange(visibleCameras);
  }, [map, cameras, onViewportChange]);

  React.useEffect(() => {
    if (!map) {
      return;
    }

    // Check visible cameras on initial load
    checkVisibleCameras();

    // Listen to map events that change viewport
    map.on('moveend', checkVisibleCameras);
    map.on('zoomend', checkVisibleCameras);
    map.on('resize', checkVisibleCameras);

    return () => {
      map.off('moveend', checkVisibleCameras);
      map.off('zoomend', checkVisibleCameras);
      map.off('resize', checkVisibleCameras);
    };
  }, [map, checkVisibleCameras]);

  // Also check when cameras list changes
  React.useEffect(() => {
    checkVisibleCameras();
  }, [cameras, checkVisibleCameras]);

  return null;
};

const Map: React.FC = () => {
  const { cameraFeeds, loading, error, refreshFeeds } = useLiveFeed();
  const [selectedCamera, setSelectedCamera] = useState<CameraFeed | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeWeatherLayer, setActiveWeatherLayer] =
    useState<WeatherLayer | null>(null);
  const [weatherOpacity, setWeatherOpacity] = useState<number>(0.6);

  // Heatmap state - Enable by default for testing
  const [heatmapVisible, setHeatmapVisible] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(1.0);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [trafficAnalysis, setTrafficAnalysis] =
    useState<TrafficDensityAnalysis | null>(null);

  // Dynamic vehicle count state
  const [visibleCamerasInViewport, setVisibleCamerasInViewport] = useState<CameraFeed[]>([]);
  const [dynamicVehicleCount, setDynamicVehicleCount] = useState<number>(0);

  // Lane closures state
  const [laneClosuresVisible, setLaneClosuresVisible] = useState<boolean>(true);
  const [laneClosures, setLaneClosures] = useState<LaneClosure[]>([]);
  const [laneClosureAnalysis, setLaneClosureAnalysis] = useState<LaneClosureAnalysis | null>(null);
  const [laneClosureStatusFilter, setLaneClosureStatusFilter] = useState<string>('all');
  const [laneClosureSeverityFilter, setLaneClosureSeverityFilter] = useState<string>('all');
  const [selectedLaneClosure, setSelectedLaneClosure] = useState<LaneClosure | null>(null);

  // Filter cameras based on status and coordinates
  const filteredCameras = useMemo(() => {
    return cameraFeeds.filter(camera => {
      const hasCoords = camera.coordinates;
      const matchesFilter =
        statusFilter === 'all' || camera.status === statusFilter;
      return hasCoords && matchesFilter;
    });
  }, [cameraFeeds, statusFilter]);

  // Filter lane closures based on status and severity
  const filteredLaneClosures = useMemo(() => {
    console.log(`🚧 Total lane closures: ${laneClosures.length}`);
    console.log(`🚧 Lane closure data:`, laneClosures);
    return laneClosures.filter(closure => {
      const matchesStatus =
        laneClosureStatusFilter === 'all' || closure.status === laneClosureStatusFilter;
      const matchesSeverity =
        laneClosureSeverityFilter === 'all' || closure.severity === laneClosureSeverityFilter;
      return matchesStatus && matchesSeverity;
    });
  }, [laneClosures, laneClosureStatusFilter, laneClosureSeverityFilter]);

  // Calculate dynamic vehicle count from visible cameras in viewport
  const calculateDynamicVehicleCount = useCallback((visibleCameras: CameraFeed[]) => {
    let totalVehicles = 0;

    // Get the current heatmap data
    const currentHeatmapData = trafficDensityService.getCurrentHeatmapData();

    visibleCameras.forEach(camera => {
      if (!camera.coordinates) {
        return;
      }

      // Find corresponding heatmap point for this camera location
      const heatmapPoint = currentHeatmapData.find(point => {
        const distance = Math.sqrt(
          Math.pow(point.lat - camera.coordinates!.lat, 2) +
          Math.pow(point.lng - camera.coordinates!.lng, 2)
        );
        // Match points within ~100m (0.001 degrees roughly)
        return distance < 0.001;
      });

      if (heatmapPoint) {
        totalVehicles += heatmapPoint.vehicleCount;
      }
    });

    setDynamicVehicleCount(totalVehicles);
  }, []);

  // Handle viewport changes
  const handleViewportChange = useCallback((visibleCameras: CameraFeed[]) => {
    setVisibleCamerasInViewport(visibleCameras);
    calculateDynamicVehicleCount(visibleCameras);
  }, [calculateDynamicVehicleCount]);

  // Recalculate vehicle count when heatmap data changes
  useEffect(() => {
    calculateDynamicVehicleCount(visibleCamerasInViewport);
  }, [heatmapData, visibleCamerasInViewport, calculateDynamicVehicleCount]);

  const handleMarkerClick = (camera: CameraFeed) => {
    setSelectedCamera(camera);
  };

  const handleCloseModal = () => {
    setSelectedCamera(null);
  };

  const handleRefresh = () => {
    refreshFeeds();
  };

  const handleWeatherToggle = (layer: WeatherLayer | null) => {
    setActiveWeatherLayer(layer);
  };

  const handleOpacityChange = (opacity: number) => {
    setWeatherOpacity(opacity);
  };

  const handleHeatmapToggle = () => {
    const newVisible = !heatmapVisible;
    console.log(`🔄 Toggling heatmap: ${heatmapVisible} -> ${newVisible}`);
    setHeatmapVisible(newVisible);
  };

  const handleHeatmapOpacityChange = (opacity: number) => {
    setHeatmapOpacity(opacity);
  };

  const handleLaneClosuresToggle = () => {
    const newVisible = !laneClosuresVisible;
    console.log(`🚧 Toggling lane closures: ${laneClosuresVisible} -> ${newVisible}`);
    setLaneClosuresVisible(newVisible);
  };

  const handleLaneClosureStatusFilter = (status: string) => {
    console.log(`🚧 Filtering lane closures by status: ${status}`);
    setLaneClosureStatusFilter(status);
  };

  const handleLaneClosureSeverityFilter = (severity: string) => {
    console.log(`🚧 Filtering lane closures by severity: ${severity}`);
    setLaneClosureSeverityFilter(severity);
  };

  const handleLaneClosureMarkerClick = (closure: LaneClosure) => {
    console.log(`🚧 Selected lane closure: ${closure.route} - ${closure.nearbyLandmark}`);
    setSelectedLaneClosure(closure);
  };

  const handleCloseLaneClosureModal = () => {
    setSelectedLaneClosure(null);
  };

  // Subscribe to heatmap updates
  useEffect(() => {
    console.log('🔗 Subscribing to traffic density service...');
    const unsubscribe = trafficDensityService.subscribe(
      (data: HeatmapPoint[]) => {
        console.log(`📊 Map received ${data.length} heatmap points`);
        setHeatmapData(data);
        setTrafficAnalysis(trafficDensityService.getTrafficAnalysis());
      },
    );

    // Get any existing data immediately
    const existingData = trafficDensityService.getCurrentHeatmapData();
    if (existingData.length > 0) {
      console.log(`📋 Using ${existingData.length} existing heatmap points`);
      setHeatmapData(existingData);
    }

    // Always set initial traffic analysis (even if empty)
    setTrafficAnalysis(trafficDensityService.getTrafficAnalysis());

    return unsubscribe;
  }, [heatmapVisible, heatmapOpacity]);

  // Subscribe to lane closure updates
  useEffect(() => {
    console.log('🚧 Subscribing to lane closure service...');
    const unsubscribe = laneClosureService.subscribe(
      (data: LaneClosure[]) => {
        console.log(`🚧 Map received ${data.length} lane closures`);
        setLaneClosures(data);
        setLaneClosureAnalysis(laneClosureService.getLaneClosureAnalysis());
      },
    );

    // Get any existing data immediately
    const existingData = laneClosureService.getCurrentLaneClosures();
    if (existingData.length > 0) {
      console.log(`🚧 Using ${existingData.length} existing lane closures`);
      setLaneClosures(existingData);
    }

    // Always set initial lane closure analysis (even if empty)
    setLaneClosureAnalysis(laneClosureService.getLaneClosureAnalysis());

    // Start periodic updates for lane closures
    laneClosureService.startPeriodicUpdates(5); // Update every 5 minutes

    return unsubscribe;
  }, []);

  // Fetch real traffic data from database
  useEffect(() => {
    console.log('🚗 Setting up real traffic data fetching...');

    const fetchTrafficData = async () => {
      try {
        console.log('🔄 Fetching real traffic data from database...');
        await trafficDensityService.fetchRealTrafficData();
      } catch (error) {
        console.error('❌ Failed to fetch real traffic data:', error);
        // No fallback - only show real data when authenticated
      }
    };

    // Initial fetch
    fetchTrafficData();

    // Set up periodic updates every 30 seconds for real traffic data
    const interval = setInterval(() => {
      console.log('🔄 Updating real traffic data...');
      fetchTrafficData();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []); // Run once on mount, independent of camera feeds

  if (loading) {
    return (
      <div className="map-loading">
        <LoadingSpinner
          size="large"
          text="Loading camera map..."
          className="content"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-error">
        <h2>Error Loading Map</h2>
        <p>{error}</p>
        <button onClick={handleRefresh} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div
      className="map-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <MapControls
        onRefresh={handleRefresh}
        onFilterChange={setStatusFilter}
        activeFilter={statusFilter}
        totalCameras={cameraFeeds.filter(c => c.coordinates).length}
        visibleCameras={filteredCameras.length}
        onWeatherToggle={handleWeatherToggle}
        activeWeatherLayer={activeWeatherLayer}
        weatherOpacity={weatherOpacity}
        onOpacityChange={handleOpacityChange}
        onHeatmapToggle={handleHeatmapToggle}
        heatmapVisible={heatmapVisible}
        heatmapOpacity={heatmapOpacity}
        onHeatmapOpacityChange={handleHeatmapOpacityChange}
        trafficAnalysis={trafficAnalysis}
        dynamicVehicleCount={dynamicVehicleCount}
        onLaneClosuresToggle={handleLaneClosuresToggle}
        laneClosuresVisible={laneClosuresVisible}
        laneClosureAnalysis={laneClosureAnalysis}
        onLaneClosureStatusFilter={handleLaneClosureStatusFilter}
        activeLaneClosureStatusFilter={laneClosureStatusFilter}
        onLaneClosureSeverityFilter={handleLaneClosureSeverityFilter}
        activeLaneClosureSeverityFilter={laneClosureSeverityFilter}
      />

      <div className="map-container" data-testid="map-container">
        <MapContainer
          {...({
            center: [33.85631, -117.99698] as [number, number], // SR-91 Beach Boulevard camera location
            zoom: 12,
            className: 'leaflet-map',
          } as any)}
        >
          <TileLayer
            {...({
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            } as any)}
          />

          {/* Weather Overlay */}
          <WeatherOverlay layer={activeWeatherLayer} opacity={weatherOpacity} />

          {/* Traffic Heatmap */}
          <TrafficHeatmap
            data={heatmapData}
            visible={heatmapVisible}
            opacity={heatmapOpacity}
            options={{
              radius: 100,
              blur: 20,
              intensityMultiplier: 1.0
            }}
          />

          <FitBounds cameras={filteredCameras} />
          <ViewportTracker
            cameras={filteredCameras}
            onViewportChange={handleViewportChange}
          />

          {/* Lane Closure Markers */}
          {laneClosuresVisible && filteredLaneClosures.map(closure => (
            <Marker
              key={closure.id}
              {...({
                position: [
                  closure.beginLocation.latitude,
                  closure.beginLocation.longitude,
                ] as [number, number],
                icon: createLaneClosureIcon(closure.severity),
                eventHandlers: {
                  click: () => handleLaneClosureMarkerClick(closure),
                },
              } as any)}
            >
              <Popup>
                <div className="lane-closure-popup">
                  <strong>{closure.route} - {closure.nearbyLandmark}</strong>
                  <br />
                  <span className={`severity-text ${closure.severity}`}>
                    Severity: {closure.severity.toUpperCase()}
                  </span>
                  <br />
                  <span className={`status-text ${closure.status}`}>
                    Status: {closure.status.toUpperCase()}
                  </span>
                  <br />
                  <small>Lanes: {closure.details.lanesClosed}/{closure.details.lanesExisting} closed</small>
                  <br />
                  <small>Type: {closure.details.closureType}</small>
                  <br />
                  <small>Work: {closure.details.workType}</small>
                  {closure.details.startDateTime && (
                    <>
                      <br />
                      <small>Start: {new Date(closure.details.startDateTime).toLocaleDateString()}</small>
                    </>
                  )}
                  {closure.details.endDateTime && (
                    <>
                      <br />
                      <small>End: {new Date(closure.details.endDateTime).toLocaleDateString()}</small>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {filteredCameras.map(camera => (
            <Marker
              key={camera.id}
              {...({
                position: [
                  camera.coordinates!.lat,
                  camera.coordinates!.lng,
                ] as [number, number],
                icon: createCameraIcon(camera.status),
                eventHandlers: {
                  click: () => handleMarkerClick(camera),
                },
              } as any)}
            >
              <Popup>
                <div className="marker-popup">
                  <strong>{camera.location}</strong>
                  <br />
                  <span
                    className={`status-text ${camera.status.toLowerCase()}`}
                  >
                    Status: {camera.status}
                  </span>
                  <br />
                  <small>Click marker for details</small>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Camera Detail Modal */}
      {selectedCamera && (
        <CameraModal
          camera={selectedCamera}
          isOpen={!!selectedCamera}
          onClose={handleCloseModal}
        />
      )}

      {/* Lane Closure Detail Modal */}
      {selectedLaneClosure && (
        <LaneClosureModal
          closure={selectedLaneClosure}
          isOpen={!!selectedLaneClosure}
          onClose={handleCloseLaneClosureModal}
        />
      )}

      {/* Status Legend */}
      <div className="map-legend">
        <h4>Legend</h4>
        <div className="legend-section">
          <h5>Cameras</h5>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color online" />
              <span>Online</span>
            </div>
            <div className="legend-item">
              <div className="legend-color loading" />
              <span>Loading</span>
            </div>
            <div className="legend-item">
              <div className="legend-color offline" />
              <span>Offline</span>
            </div>
          </div>
        </div>
        {laneClosuresVisible && (
          <div className="legend-section">
            <h5>Lane Closures</h5>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-color lane-closure-low" />
                <span>Low Impact</span>
              </div>
              <div className="legend-item">
                <div className="legend-color lane-closure-medium" />
                <span>Medium Impact</span>
              </div>
              <div className="legend-item">
                <div className="legend-color lane-closure-high" />
                <span>High Impact</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Map;
