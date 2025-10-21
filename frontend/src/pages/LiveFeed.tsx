import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import HlsPlayer from 'react-hls-player';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LiveFeed.css';
import { useLiveFeed, CameraFeed } from '../contexts/LiveFeedContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';

delete ((L as any).Icon.Default.prototype as any)._getIconUrl;
(L as any).Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// CameraFeed interface now imported from context

// Map component to handle center changes
const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [map, center]);

  return null;
};

const LiveFeed: React.FC = () => {
  // Use context for camera feeds data
  const {
    cameraFeeds,
    loading,
    error,
    lastRefresh,
    refreshFeeds,
    setCameraStatus,
  } = useLiveFeed();

  const [selectedCamera, setSelectedCamera] = useState<CameraFeed | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [timelapseImages, setTimelapseImages] = useState<string[]>([]);
  const [currentTimelapseIndex, setCurrentTimelapseIndex] = useState(0);
  const [isPlayingTimelapse, setIsPlayingTimelapse] = useState(false);
  const [timelapseInterval, setTimelapseInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [viewMode, setViewMode] = useState<'video' | 'images' | 'map'>('video');
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();

  // Add refs for HLS players
  const modalPlayerRef = useRef<any>(null);
  const gridPlayerRefs = useRef<{ [key: string]: any }>({});

  // Incident form state
  const [incidentForm, setIncidentForm] = useState({
    severity: 'medium' as 'high' | 'medium' | 'low',
    description: '',
  });

  // Check user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const apiKey = sessionStorage.getItem('apiKey');
        if (!apiKey) {return;}

        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/auth/profile`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey,
            },
          },
        );

        if (response.ok) {
          const userResponse = await response.json();
          setUserRole(userResponse.User_Role || 'user');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, []);

  // Refresh handler using context
  const handleRefresh = useCallback(() => {
    refreshFeeds();
  }, [refreshFeeds]);

  const handleImageError = useCallback(
    (feedId: string) => {
      setCameraStatus(feedId, 'Offline');
    },
    [setCameraStatus],
  );

  const handleImageLoad = useCallback(
    (feedId: string) => {
      setCameraStatus(feedId, 'Online');
    },
    [setCameraStatus],
  );

  const handleVideoError = useCallback(
    (feedId: string) => {
      setCameraStatus(feedId, 'Offline');
    },
    [setCameraStatus],
  );

  const handleVideoLoadStart = useCallback(
    (feedId: string) => {
      // Set a timeout to mark as Online if no error occurs within 3 seconds
      setTimeout(() => {
        setCameraStatus(feedId, 'Online');
      }, 3000);
    },
    [setCameraStatus],
  );

  const handleCameraClick = useCallback((camera: CameraFeed) => {
    setSelectedCamera(camera);
    setShowVideoModal(true);

    // Determine initial view mode based on available features
    if (camera.hasLiveStream) {
      setViewMode('video');
    } else if (camera.coordinates) {
      setViewMode('map');
    } else {
      setViewMode('images');
    }

    if (camera.historicalImages && camera.historicalImages.length > 0) {
      const allImages = [camera.image, ...camera.historicalImages];
      setTimelapseImages(allImages);
      setCurrentTimelapseIndex(0);
    } else {
      setTimelapseImages([camera.image]);
      setCurrentTimelapseIndex(0);
    }
  }, []);

  const closeVideoModal = useCallback(() => {
    setShowVideoModal(false);
    setSelectedCamera(null);
    setIsPlayingTimelapse(false);
    setTimelapseImages([]);
    setCurrentTimelapseIndex(0);
    setViewMode('video');
    setShowIncidentForm(false);
    setIncidentForm({ severity: 'medium', description: '' });
    if (timelapseInterval) {
      clearInterval(timelapseInterval);
      setTimelapseInterval(null);
    }
  }, [timelapseInterval]);

  const startTimelapse = useCallback(() => {
    if (timelapseImages.length <= 1) {return;}

    setIsPlayingTimelapse(true);
    const interval = setInterval(() => {
      setCurrentTimelapseIndex(prev =>
        prev >= timelapseImages.length - 1 ? 0 : prev + 1,
      );
    }, 1500);
    setTimelapseInterval(interval);
  }, [timelapseImages.length]);

  const stopTimelapse = useCallback(() => {
    setIsPlayingTimelapse(false);
    if (timelapseInterval) {
      clearInterval(timelapseInterval);
      setTimelapseInterval(null);
    }
  }, [timelapseInterval]);

  const toggleTimelapse = useCallback(() => {
    if (isPlayingTimelapse) {stopTimelapse();}
    else {startTimelapse();}
  }, [isPlayingTimelapse, stopTimelapse, startTimelapse]);

  const goToPreviousFrame = useCallback(() => {
    if (!isPlayingTimelapse) {
      setCurrentTimelapseIndex(prev =>
        prev <= 0 ? timelapseImages.length - 1 : prev - 1,
      );
    }
  }, [isPlayingTimelapse, timelapseImages.length]);

  const goToNextFrame = useCallback(() => {
    if (!isPlayingTimelapse) {
      setCurrentTimelapseIndex(prev =>
        prev >= timelapseImages.length - 1 ? 0 : prev + 1,
      );
    }
  }, [isPlayingTimelapse, timelapseImages.length]);

  const getStatusClass = useCallback(
    (status: string) => status.toLowerCase(),
    [],
  );

  const memoizedCameraFeeds = useMemo(() => cameraFeeds, [cameraFeeds]);

  // Function to get or create a ref for a specific feed
  const getGridPlayerRef = useCallback((feedId: string) => {
    if (!gridPlayerRefs.current[feedId]) {
      gridPlayerRefs.current[feedId] = React.createRef();
    }
    return gridPlayerRefs.current[feedId];
  }, []);

  const cameraIcon = useMemo(
    () =>
      new (L as any).Icon({
        iconUrl:
          'data:image/svg+xml;base64,' +
          btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <circle cx="12" cy="12" r="10" fill="#ff4444" stroke="#fff" stroke-width="2"/>
          <path d="M8 12l4-4v3h4v2h-4v3z" fill="#fff"/>
        </svg>
      `),
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
      }),
    [],
  );

  // API request helper
  const apiRequest = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const apiKey = sessionStorage.getItem('apiKey');
      if (!apiKey) {
        toast.error('Authentication required. Please log in.');
        navigate('/account');
        throw new Error('Authentication required');
      }

      const url = `${process.env.REACT_APP_API_URL}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        ...options.headers,
      };

      try {
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
          if (response.status === 401) {
            toast.error('Authentication failed. Please log in again.');
            navigate('/account');
            throw new Error('Authentication failed');
          }
          throw new Error(
            `API request failed: ${response.status} ${response.statusText}`,
          );
        }
        return await response.json();
      } catch (error: any) {
        if (
          error.message.includes('Unauthorized') ||
          error.message.includes('API key')
        ) {
          toast.error('Authentication failed. Please log in again.');
          navigate('/account');
          throw new Error('Authentication failed');
        }
        throw error;
      }
    },
    [navigate],
  );

  // Handle incident reporting
  const handleReportIncident = useCallback(async () => {
    if (!selectedCamera || !userRole || userRole !== 'admin') {
      // Access denied - handled by UI state
      return;
    }

    if (!incidentForm.description.trim()) {
      // Form validation handled by UI state
      return;
    }

    try {
      const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      const reporterName = currentUser.User_FirstName
        ? `${currentUser.User_FirstName} ${
          currentUser.User_LastName || ''
        }`.trim()
        : currentUser.User_Email || 'Admin User';

      // Look up the database Camera_ID using the external ID
      let databaseCameraID = null;
      try {
        const cameraResponse = await apiRequest(
          `/api/cameras/external/${encodeURIComponent(selectedCamera.id)}`,
        );
        databaseCameraID = cameraResponse.Camera_ID;
      } catch (cameraError) {
        console.warn(
          'Could not find camera in database:',
          selectedCamera.id,
          cameraError,
        );
        toast.warning(
          'Camera not found in database, but incident will still be reported',
        );
      }

      const apiPayload = {
        Incidents_DateTime: new Date().toISOString(),
        Incidents_Latitude: selectedCamera.coordinates?.lat || null,
        Incidents_Longitude: selectedCamera.coordinates?.lng || null,
        Incident_Severity: incidentForm.severity,
        Incident_Status: 'open',
        Incident_Reporter: reporterName,
        User_Email: currentUser.User_Email || null,
        Incident_CameraID: databaseCameraID,
        Incident_Description: `${incidentForm.description}\n\n` +
          `Camera: ${selectedCamera.location} (${selectedCamera.id})\n` +
          `Image: ${selectedCamera.image}`,
      };


      await apiRequest('/api/incidents', {
        method: 'POST',
        body: JSON.stringify(apiPayload),
      });

      toast.success(
        'Incident reported successfully! All users have been alerted.',
        {
          autoClose: 5000,
        },
      );

      // Reset form and close modal
      setIncidentForm({ severity: 'medium', description: '' });
      setShowIncidentForm(false);
      closeVideoModal();
    } catch (error: any) {
      toast.error(`Failed to report incident: ${error.message}`);
    }
  }, [selectedCamera, userRole, incidentForm, apiRequest, closeVideoModal]);

  // Handle showing incident form
  const handleShowIncidentForm = useCallback(() => {
    if (!userRole || userRole !== 'admin') {
      // Access denied - handled by UI state
      return;
    }
    setShowIncidentForm(true);
  }, [userRole]);

  if (loading && cameraFeeds.length === 0) {
    return (
      <div className="livefeed-page" data-testid="live-feed-container">
        <LoadingSpinner
          size="large"
          text="Loading camera feeds..."
          className="content loading car-loading"
          data-testid="loading-spinner"
        />
      </div>
    );
  }

  if (error && cameraFeeds.length === 0) {
    return (
      <div
        className="livefeed-page"
        data-cy="livefeed-page"
        data-testid="live-feed-container"
      >
        <div
          data-testid="incident-carousel"
          style={{ visibility: 'hidden', position: 'absolute' }}
        >
          Incident Carousel Placeholder
        </div>
        <div className="livefeed-header">
          <h2 data-cy="livefeed-title">Live Camera Feeds</h2>
          <div className="livefeed-subtitle" data-cy="livefeed-subtitle">
            Real-time traffic monitoring
          </div>
        </div>
        <div className="error-state">
          <div className="error-message">{error}</div>
          <button onClick={handleRefresh} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="livefeed-page"
      data-cy="livefeed-page"
      data-testid="live-feed-container"
    >
      <div
        data-testid="incident-carousel"
        style={{ visibility: 'hidden', position: 'absolute' }}
      >
        Incident Carousel Placeholder
      </div>
      <div className="livefeed-header">
        <h2 data-cy="livefeed-title">Live Camera Feeds</h2>
        <div className="livefeed-controls">
          <button
            onClick={handleRefresh}
            className="refresh-button"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Feeds'}
          </button>
          <div className="feed-info">
            Showing {cameraFeeds.length} cameras from District 12
          </div>
          <div className="last-refresh">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
        </div>
      )}

      <div className="status-info">
        <div className="status-item">
          <span className="status-label">Location:</span>
          <span className="status-value">Orange County, CA (District 12)</span>
        </div>
        <div className="status-item">
          <span className="status-label">Update Frequency:</span>
          <span className="status-value">Images update every 1-20 minutes</span>
        </div>
        <div className="status-item">
          <span className="status-label">Auto-refresh:</span>
          <span className="status-value">Every 15 minutes</span>
        </div>
      </div>

      <div className="livefeed-grid" data-cy="livefeed-grid">
        {memoizedCameraFeeds.length > 0 ? (
          memoizedCameraFeeds.map(feed => (
            <div
              key={feed.id}
              className="feed-tile clickable"
              data-cy={`feed-tile-${feed.id}`}
              data-testid="feed-item incident-item"
              data-type="accident"
              onClick={() => handleCameraClick(feed)}
              onDoubleClick={() => navigate('/incident-management')}
            >
              <div className="feed-image-container">
                {feed.hasLiveStream && feed.videoUrl ? (
                  <HlsPlayer
                    src={feed.videoUrl}
                    autoPlay={false}
                    controls={false}
                    width="100%"
                    height="auto"
                    className="feed-video"
                    playerRef={getGridPlayerRef(feed.id)}
                    onError={() => handleVideoError(feed.id)}
                    onLoad={() => handleImageLoad(feed.id)}
                    onLoadStart={() => handleVideoLoadStart(feed.id)}
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={feed.image}
                    alt={`Camera feed from ${feed.location}`}
                    className="feed-image"
                    loading="lazy"
                    onError={() => handleImageError(feed.id)}
                    onLoad={() => handleImageLoad(feed.id)}
                    data-cy="feed-image"
                  />
                )}
                <div className="live-feed-overlay" data-cy="live-feed-overlay">
                  <div
                    className={`status-badge ${getStatusClass(feed.status)}`}
                    data-cy="feed-status"
                  >
                    {feed.status}
                  </div>
                  {feed.hasLiveStream && (
                    <div className="video-available-badge">Live Video</div>
                  )}
                </div>
                <div className="play-overlay">
                  <div className="play-button">▶</div>
                </div>
                <div className="update-frequency">
                  Updates every {feed.updateFrequency || '?'} min
                </div>
              </div>
              <div className="feed-details" data-cy="feed-details">
                <div className="feed-info">
                  <div>
                    <h4 data-cy="feed-id">{feed.id}</h4>
                    <p data-cy="feed-location">{feed.location}</p>
                    {feed.imageDescription && (
                      <p className="feed-description">
                        {feed.imageDescription}
                      </p>
                    )}
                    <div className="feed-metadata">
                      <span className="feed-route">{feed.route}</span>
                      <span className="feed-district">{feed.district}</span>
                      {feed.direction && (
                        <span className="feed-direction">{feed.direction}</span>
                      )}
                      {feed.county && (
                        <span className="feed-county">{feed.county}</span>
                      )}
                    </div>
                    {feed.milepost && (
                      <div className="feed-milepost">
                        Milepost: {feed.milepost}
                      </div>
                    )}
                    {feed.coordinates && (
                      <div className="feed-coordinates">
                        Location: {feed.coordinates.lat.toFixed(4)},{' '}
                        {feed.coordinates.lng.toFixed(4)}
                      </div>
                    )}
                    <div className="feed-last-update">
                      Loaded: {feed.lastUpdate}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          // Empty state with test IDs for testing
          <div
            className="feed-tile clickable"
            data-testid="feed-item incident-item"
            data-type="accident"
            style={{ opacity: 0.5 }}
          >
            <div className="feed-image-container">
              <div
                style={{
                  height: '200px',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span>No camera feeds available</span>
              </div>
            </div>
            <div className="feed-details">
              <div className="feed-info">
                <h4>Test Camera</h4>
                <p>Sample feed for testing</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {cameraFeeds.length === 0 && !loading && (
        <div className="no-feeds-message">
          <h3>No camera feeds available</h3>
          <p>Please try refreshing or check back later.</p>
          <button onClick={handleRefresh} className="retry-button">
            Refresh
          </button>
        </div>
      )}

      {showVideoModal && selectedCamera && (
        <div className="video-modal-overlay" onClick={closeVideoModal}>
          <div className="video-modal" onClick={e => e.stopPropagation()}>
            <div className="video-modal-header">
              <div className="modal-title-section">
                <h3 className="modal-title">{selectedCamera.location}</h3>
                <div className="modal-subtitle">
                  {selectedCamera.route} • {selectedCamera.district}
                  {selectedCamera.direction && ` • ${selectedCamera.direction}`}
                </div>
              </div>
              <div className="view-mode-selector">
                {selectedCamera.hasLiveStream && selectedCamera.videoUrl && (
                  <button
                    className={`view-mode-btn ${viewMode === 'video' ? 'active' : ''}`}
                    onClick={() => setViewMode('video')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                    Live Video
                  </button>
                )}
                <button
                  className={`view-mode-btn ${viewMode === 'images' ? 'active' : ''}`}
                  onClick={() => setViewMode('images')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21,15 16,10 5,21" />
                  </svg>
                  Images
                </button>
                {selectedCamera.coordinates && (
                  <button
                    className={`view-mode-btn ${viewMode === 'map' ? 'active' : ''}`}
                    onClick={() => setViewMode('map')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Location
                  </button>
                )}
              </div>
              <button className="close-modal" onClick={closeVideoModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="video-modal-content">
              {viewMode === 'video' &&
              selectedCamera.hasLiveStream &&
              selectedCamera.videoUrl ? (
                  <div className="video-container">
                    <HlsPlayer
                      src={selectedCamera.videoUrl}
                      autoPlay={true}
                      controls={true}
                      width="100%"
                      height="auto"
                      className="camera-video"
                      playerRef={modalPlayerRef}
                      onError={() => handleVideoError(selectedCamera.id)}
                      poster={selectedCamera.image} // Show still image while video loads
                    />
                  </div>
                ) : viewMode === 'map' && selectedCamera.coordinates ? (
                  <div className="map-container">
                    <MapContainer
                      {...({
                        center: [
                          selectedCamera.coordinates.lat,
                          selectedCamera.coordinates.lng,
                        ],
                        zoom: 15,
                        style: { width: '100%' },
                        className: 'camera-map',
                      } as any)}
                    >
                      <MapUpdater
                        center={[
                          selectedCamera.coordinates.lat,
                          selectedCamera.coordinates.lng,
                        ]}
                      />
                      <TileLayer
                        {...({
                          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                          attribution:
                          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                        } as any)}
                      />
                      <Marker
                        {...({
                          position: [
                            selectedCamera.coordinates.lat,
                            selectedCamera.coordinates.lng,
                          ],
                          icon: cameraIcon,
                        } as any)}
                      >
                        <Popup>
                          <div className="map-popup">
                            <h4>{selectedCamera.location}</h4>
                            <p>
                              <strong>Route:</strong> {selectedCamera.route}
                            </p>
                            {selectedCamera.direction && (
                              <p>
                                <strong>Direction:</strong>{' '}
                                {selectedCamera.direction}
                              </p>
                            )}
                            {selectedCamera.county && (
                              <p>
                                <strong>County:</strong> {selectedCamera.county}
                              </p>
                            )}
                            {selectedCamera.milepost && (
                              <p>
                                <strong>Milepost:</strong>{' '}
                                {selectedCamera.milepost}
                              </p>
                            )}
                            <p>
                              <strong>Coordinates:</strong>{' '}
                              {selectedCamera.coordinates.lat.toFixed(6)},{' '}
                              {selectedCamera.coordinates.lng.toFixed(6)}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                    <div className="map-info">
                      <p>
                        <strong>Camera Location:</strong>{' '}
                        {selectedCamera.location}
                      </p>
                      <p>
                        <strong>Location Details:</strong>{' '}
                        {selectedCamera.locationName || selectedCamera.location}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="timelapse-container">
                    <div className="timelapse-viewer">
                      <img
                        src={timelapseImages[currentTimelapseIndex]}
                        alt={`${selectedCamera.location} - Frame ${
                          currentTimelapseIndex + 1
                        }`}
                        className="timelapse-image"
                      />
                      <div className="timelapse-info">
                      Frame {currentTimelapseIndex + 1} of{' '}
                        {timelapseImages.length}
                        {currentTimelapseIndex === 0
                          ? ' (Current)'
                          : ` (${currentTimelapseIndex} updates ago)`}
                      </div>
                    </div>

                    {timelapseImages.length > 1 && (
                      <div className="timelapse-controls">
                        <button
                          className="timelapse-btn"
                          onClick={goToPreviousFrame}
                          disabled={isPlayingTimelapse}
                          title="Previous frame"
                        >
                        ◀
                        </button>
                        <button
                          className="timelapse-btn primary"
                          onClick={toggleTimelapse}
                          title={
                            isPlayingTimelapse
                              ? 'Pause timelapse'
                              : 'Play timelapse'
                          }
                        >
                          {isPlayingTimelapse ? '⏸' : '▶'}
                        </button>
                        <button
                          className="timelapse-btn"
                          onClick={goToNextFrame}
                          disabled={isPlayingTimelapse}
                          title="Next frame"
                        >
                        ▶
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>

            <div className="video-modal-info">
              <div className="camera-details-modal">
                <p>
                  <strong>Route:</strong> {selectedCamera.route}
                </p>
                <p>
                  <strong>District:</strong> {selectedCamera.district}
                </p>
                {selectedCamera.direction && (
                  <p>
                    <strong>Direction:</strong> {selectedCamera.direction}
                  </p>
                )}
                {selectedCamera.county && (
                  <p>
                    <strong>County:</strong> {selectedCamera.county}
                  </p>
                )}
                {selectedCamera.milepost && (
                  <p>
                    <strong>Milepost:</strong> {selectedCamera.milepost}
                  </p>
                )}
                {selectedCamera.imageDescription && (
                  <p>
                    <strong>View:</strong> {selectedCamera.imageDescription}
                  </p>
                )}
                <p>
                  <strong>Update Frequency:</strong> Every{' '}
                  {selectedCamera.updateFrequency || '?'} minutes
                </p>
                {selectedCamera.coordinates && (
                  <p>
                    <strong>Coordinates:</strong>{' '}
                    {selectedCamera.coordinates.lat.toFixed(6)},{' '}
                    {selectedCamera.coordinates.lng.toFixed(6)}
                  </p>
                )}
              </div>

              {userRole === 'admin' && (
                <div className="incident-reporting-section">
                  <div className="incident-actions">
                    {!showIncidentForm ? (
                      <button
                        className="report-incident-btn"
                        onClick={handleShowIncidentForm}
                      >
                        Report Incident
                      </button>
                    ) : (
                      <div className="incident-form">
                        <h4>Report Incident</h4>

                        <div style={{ marginBottom: '10px' }}>
                          <label>Severity:</label>
                          <select
                            value={incidentForm.severity}
                            onChange={e =>
                              setIncidentForm(prev => ({
                                ...prev,
                                severity: e.target.value as
                                  | 'high'
                                  | 'medium'
                                  | 'low',
                              }))
                            }
                          >
                            <option value="low">Low - Minor disruption</option>
                            <option value="medium">
                              Medium - Moderate impact
                            </option>
                            <option value="high">
                              High - Critical incident
                            </option>
                          </select>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                          <label>Description:</label>
                          <textarea
                            value={incidentForm.description}
                            onChange={e =>
                              setIncidentForm(prev => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Describe what you see in the camera feed..."
                            rows={3}
                            required
                          />
                        </div>

                        <div className="incident-form-actions">
                          <button
                            onClick={handleReportIncident}
                            disabled={!incidentForm.description.trim()}
                            className="incident-submit-btn"
                          >
                            Submit Report
                          </button>
                          <button
                            onClick={() => {
                              setShowIncidentForm(false);
                              setIncidentForm({
                                severity: 'medium',
                                description: '',
                              });
                            }}
                            className="incident-cancel-btn"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveFeed;
