import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { useLiveFeed, CameraFeed } from '../contexts/LiveFeedContext';
import LoadingSpinner from '../components/LoadingSpinner';
import TrafficHeatmap from '../components/TrafficHeatmap';
import trafficDensityService, { HeatmapPoint, TrafficDensityAnalysis } from '../services/trafficDensityService';
import 'leaflet/dist/leaflet.css';
import './Map.css';

// Fix for default markers in Leaflet with Webpack
delete ((L as any).Icon.Default.prototype as any)._getIconUrl;
(L as any).Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom camera icons based on status
const createCameraIcon = (status: 'Online' | 'Offline' | 'Loading'): any => {
  const color = status === 'Online' ? '#4ade80' : status === 'Loading' ? '#f59e0b' : '#ef4444';

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

const CameraModal: React.FC<CameraModalProps> = ({ camera, isOpen, onClose }) => {
  const [imageError, setImageError] = useState(false);
  const [streamError, setStreamError] = useState(false);

  if (!isOpen) return null;

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
        onClick={(e) => e.stopPropagation()}
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
                <span className={`camera-status-badge ${camera.status.toLowerCase()}`}>
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
                  {camera.historicalImages.slice(0, 4).map((imageUrl, index) => (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`Historical view ${index + 1}`}
                      className="historical-image"
                      onError={(e) => {
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
}) => (
  <div className="map-controls">
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
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
            className={`filter-chip online ${activeFilter === 'Online' ? 'active' : ''}`}
            onClick={() => onFilterChange('Online')}
          >
            <div className="chip-indicator online-indicator"></div>
            <span className="chip-label">Online</span>
          </button>
          <button
            className={`filter-chip loading ${activeFilter === 'Loading' ? 'active' : ''}`}
            onClick={() => onFilterChange('Loading')}
          >
            <div className="chip-indicator loading-indicator"></div>
            <span className="chip-label">Loading</span>
          </button>
          <button
            className={`filter-chip offline ${activeFilter === 'Offline' ? 'active' : ''}`}
            onClick={() => onFilterChange('Offline')}
          >
            <div className="chip-indicator offline-indicator"></div>
            <span className="chip-label">Offline</span>
          </button>
        </div>
      </div>

      {/* Weather Panel */}
      <div className="control-panel weather-panel">
        <div className="panel-header">
          <h3>Weather Layer</h3>
          <button
            className={`toggle-button satellite ${activeWeatherLayer === 'satellite' ? 'active' : ''}`}
            onClick={() => onWeatherToggle(activeWeatherLayer === 'satellite' ? null : 'satellite')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
            </svg>
            Satellite
          </button>
        </div>

        {activeWeatherLayer && (
          <div className="panel-content">
            <div className="slider-control">
              <div className="slider-header">
                <label>Opacity</label>
                <span className="slider-value">{Math.round(weatherOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={weatherOpacity}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                className="modern-slider"
              />
            </div>
          </div>
        )}
      </div>

      {/* Traffic Density Panel */}
      <div className="control-panel traffic-panel">
        <div className="panel-header">
          <h3>Traffic Density</h3>
          <button
            className={`toggle-button heatmap ${heatmapVisible ? 'active' : ''}`}
            onClick={onHeatmapToggle}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 20h20v2H2zm1.64-6.36c.9.9 2.15.9 3.05 0l2.83-2.83c.9-.9.9-2.15 0-3.05-.9-.9-2.15-.9-3.05 0l-2.83 2.83c-.9.9-.9 2.15 0 3.05z"></path>
              <path d="m6.5 17.5-5-5c-.9-.9-.9-2.15 0-3.05L6.34 4.6c.9-.9 2.15-.9 3.05 0 .9.9.9 2.15 0 3.05l-4.84 4.85c-.9.9-2.15.9-3.05 0z"></path>
            </svg>
            Heatmap
          </button>
        </div>

        <div className="panel-content">
          {trafficAnalysis ? (
            <div className="traffic-metrics">
              <div className="metric">
                <div className="metric-value">{trafficAnalysis.totalVehicles}</div>
                <div className="metric-label">Vehicles</div>
              </div>
              <div className="metric">
                <div className={`metric-value ${trafficAnalysis.riskAreas.length > 0 ? 'warning' : ''}`}>
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
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="traffic-metrics">
              <div className="metric">
                <div className="metric-value">-</div>
                <div className="metric-label">Vehicles</div>
              </div>
              <div className="metric">
                <div className="metric-value">-</div>
                <div className="metric-label">Risk Areas</div>
              </div>
              <div className="metric intensity-metric">
                <div className="metric-label">Peak Intensity</div>
                <div className="intensity-bar-modern">
                  <div className="intensity-fill-modern" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Always show heatmap controls when heatmap is visible */}
          {heatmapVisible && (
            <div className="slider-control">
              <div className="slider-header">
                <label>Heatmap Opacity</label>
                <span className="slider-value">{Math.round(heatmapOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={heatmapOpacity}
                onChange={(e) => onHeatmapOpacityChange(parseFloat(e.target.value))}
                className="modern-slider heatmap-slider"
              />

              <div className="traffic-legend">
                <div className="legend-label">Traffic Intensity</div>
                <div className="legend-bar"></div>
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
}> = ({ layer, opacity }) => {
  const getWeatherTileUrl = (layer: WeatherLayer): string => {
    const layerMap: Record<WeatherLayer, string> = {
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
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

  if (!layer || !tileUrl) return null;

  return (
    <TileLayer
      {...({
        url: tileUrl,
        attribution: '© Esri, World Imagery'
      } as any)}
    />
  );
};

// Component to fit map bounds to markers
const FitBounds: React.FC<{ cameras: CameraFeed[] }> = ({ cameras }) => {
  const map = useMap();

  React.useEffect(() => {
    if (cameras.length === 0) return;

    const validCoords = cameras
      .filter(camera => camera.coordinates)
      .map(camera => [camera.coordinates!.lat, camera.coordinates!.lng] as [number, number]);

    if (validCoords.length > 0) {
      map.fitBounds(validCoords, { padding: [20, 20] });
    }
  }, [cameras, map]);

  return null;
};

const Map: React.FC = () => {
  const { cameraFeeds, loading, error, refreshFeeds } = useLiveFeed();
  const [selectedCamera, setSelectedCamera] = useState<CameraFeed | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeWeatherLayer, setActiveWeatherLayer] = useState<WeatherLayer | null>(null);
  const [weatherOpacity, setWeatherOpacity] = useState<number>(0.6);

  // Heatmap state - Enable by default for testing
  const [heatmapVisible, setHeatmapVisible] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.7);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [trafficAnalysis, setTrafficAnalysis] = useState<TrafficDensityAnalysis | null>(null);

  // Filter cameras based on status and coordinates
  const filteredCameras = useMemo(() => {
    return cameraFeeds.filter(camera => {
      const hasCoords = camera.coordinates;
      const matchesFilter = statusFilter === 'all' || camera.status === statusFilter;
      return hasCoords && matchesFilter;
    });
  }, [cameraFeeds, statusFilter]);

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

  // Subscribe to heatmap updates
  useEffect(() => {
    console.log('🔗 Subscribing to traffic density service...');
    const unsubscribe = trafficDensityService.subscribe((data: HeatmapPoint[]) => {
      console.log(`📊 Received heatmap update: ${data.length} points`, {
        sampleData: data.slice(0, 2),
        heatmapVisible,
        heatmapOpacity
      });
      setHeatmapData(data);
      setTrafficAnalysis(trafficDensityService.getTrafficAnalysis());
    });

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

  // Generate simulated traffic data when cameras are available
  useEffect(() => {
    if (cameraFeeds.length > 0) {
      console.log(`🎬 Starting traffic simulation with ${cameraFeeds.length} cameras`);

      const interval = setInterval(() => {
        console.log('🔄 Generating new traffic data...');
        trafficDensityService.generateSimulatedData(cameraFeeds);
      }, 3000); // Update every 3 seconds for better visibility

      // Initial generation with multiple rounds for immediate visibility
      console.log('🏁 Initial traffic data generation...');
      trafficDensityService.generateSimulatedData(cameraFeeds);

      // Generate additional data immediately to ensure heatmap visibility
      setTimeout(() => {
        console.log('🔁 Secondary traffic data generation...');
        trafficDensityService.generateSimulatedData(cameraFeeds);
      }, 500);

      setTimeout(() => {
        console.log('🔁 Tertiary traffic data generation...');
        trafficDensityService.generateSimulatedData(cameraFeeds);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [cameraFeeds]);

  if (loading) {
    return (
      <div className="map-loading">
        <LoadingSpinner size="large" text="Loading camera map..." className="content" />
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
      />

      <div className="map-container">
        <MapContainer
          {...({
            center: [33.6846, -117.8265] as [number, number], // Orange County center
            zoom: 10,
            className: "leaflet-map"
          } as any)}
        >
          <TileLayer
            {...({
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            } as any)}
          />

          {/* Weather Overlay */}
          <WeatherOverlay layer={activeWeatherLayer} opacity={weatherOpacity} />

          {/* Traffic Heatmap */}
          <TrafficHeatmap
            data={heatmapData}
            visible={heatmapVisible}
            opacity={heatmapOpacity}
          />

          <FitBounds cameras={filteredCameras} />

          {filteredCameras.map((camera) => (
            <Marker
              key={camera.id}
              {...({
                position: [camera.coordinates!.lat, camera.coordinates!.lng] as [number, number],
                icon: createCameraIcon(camera.status),
                eventHandlers: {
                  click: () => handleMarkerClick(camera),
                }
              } as any)}
            >
              <Popup>
                <div className="marker-popup">
                  <strong>{camera.location}</strong>
                  <br />
                  <span className={`status-text ${camera.status.toLowerCase()}`}>
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

      {/* Status Legend */}
      <div className="map-legend">
        <h4>Camera Status</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color online"></div>
            <span>Online</span>
          </div>
          <div className="legend-item">
            <div className="legend-color loading"></div>
            <span>Loading</span>
          </div>
          <div className="legend-item">
            <div className="legend-color offline"></div>
            <span>Offline</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Map;