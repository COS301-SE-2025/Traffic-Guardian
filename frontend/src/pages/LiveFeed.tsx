import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import HlsPlayer from 'react-hls-player';
import './LiveFeed.css';

interface CalTransCameraData {
  data: Array<{
    cctv: {
      index: string;
      recordTimestamp: {
        recordDate: string;
        recordTime: string;
      };
      location: {
        district: string;
        locationName: string;
        nearbyPlace: string;
        longitude: string;
        latitude: string;
        elevation: string;
        direction: string;
        county: string;
        route: string;
        routeSuffix: string;
        postmilePrefix: string;
        postmile: string;
        alignment: string;
        milepost: string;
      };
      inService: string;
      imageData: {
        imageDescription: string;
        streamingVideoURL: string;
        static: {
          currentImageUpdateFrequency: string;
          currentImageURL: string;
          referenceImageUpdateFrequency: string;
          referenceImage1UpdateAgoURL: string;
          referenceImage2UpdatesAgoURL: string;
          referenceImage3UpdatesAgoURL: string;
          referenceImage4UpdatesAgoURL: string;
          referenceImage5UpdatesAgoURL: string;
          referenceImage6UpdatesAgoURL: string;
          referenceImage7UpdatesAgoURL: string;
          referenceImage8UpdatesAgoURL: string;
          referenceImage9UpdatesAgoURL: string;
          referenceImage10UpdatesAgoURL: string;
          referenceImage11UpdatesAgoURL: string;
          referenceImage12UpdatesAgoURL: string;
        };
      };
    };
  }>;
}

interface CameraFeed {
  id: string;
  location: string;
  status: 'Online' | 'Offline' | 'Loading';
  image: string;
  videoUrl?: string;
  district: string;
  route: string;
  lastUpdate: string;
  direction?: string;
  county?: string;
  milepost?: string;
  imageDescription?: string;
  updateFrequency?: string;
  historicalImages?: string[];
  hasLiveStream: boolean;
}

const LiveFeed: React.FC = () => {
  const [cameraFeeds, setCameraFeeds] = useState<CameraFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDistricts] = useState([12]); // Orange County (District 12)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<CameraFeed | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [timelapseImages, setTimelapseImages] = useState<string[]>([]);
  const [currentTimelapseIndex, setCurrentTimelapseIndex] = useState(0);
  const [isPlayingTimelapse, setIsPlayingTimelapse] = useState(false);
  const [timelapseInterval, setTimelapseInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'video' | 'images'>('video');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [progressiveLoading, setProgressiveLoading] = useState(false);

  // Add refs for HLS players
  const modalPlayerRef = useRef<any>(null);
  const gridPlayerRefs = useRef<{ [key: string]: any }>({});

  const convertToHttps = useCallback((originalUrl: string): string => {
    if (originalUrl && originalUrl.startsWith('http://cwwp2.dot.ca.gov')) {
      return originalUrl.replace('http://cwwp2.dot.ca.gov', 'https://caltrans.blinktag.com/api');
    }
    return originalUrl;
  }, []);

  const processDistrictData = useCallback((data: CalTransCameraData, district: number): CameraFeed[] => {
    if (!data?.data || !Array.isArray(data.data)) return [];

    const validCameras = data.data.filter((item) => 
      item.cctv.inService === 'true' && 
      ((item.cctv.imageData.streamingVideoURL && item.cctv.imageData.streamingVideoURL !== 'Not Reported') ||
       (item.cctv.imageData.static.currentImageURL && item.cctv.imageData.static.currentImageURL !== 'Not Reported'))
    );

    return validCameras
      .slice(0, 10) // Get more cameras since we're only using one district
      .map((item) => {
        const camera = item.cctv;
        const location = camera.location;
        const imageData = camera.imageData;
        
        const historicalImages = [
          imageData.static.referenceImage1UpdateAgoURL,
          imageData.static.referenceImage2UpdatesAgoURL,
          imageData.static.referenceImage3UpdatesAgoURL,
          imageData.static.referenceImage4UpdatesAgoURL,
          imageData.static.referenceImage5UpdatesAgoURL,
          imageData.static.referenceImage6UpdatesAgoURL,
        ].filter(url => url && url !== 'Not Reported')
         .map(url => convertToHttps(url))
         .slice(0, 6);
        
        const httpsImageUrl = convertToHttps(imageData.static.currentImageURL);
        const videoUrl = imageData.streamingVideoURL && imageData.streamingVideoURL !== 'Not Reported' 
          ? convertToHttps(imageData.streamingVideoURL) 
          : undefined;
        
        return {
          id: `CALTRANS-D${district}-${camera.index}`,
          location: location.locationName || location.nearbyPlace || `District ${district} Camera`,
          status: 'Loading' as const,
          image: httpsImageUrl,
          videoUrl,
          district: `District ${district}`,
          route: location.route || 'Unknown Route',
          lastUpdate: new Date().toLocaleTimeString(),
          direction: location.direction,
          county: location.county,
          milepost: location.milepost,
          imageDescription: imageData.imageDescription,
          updateFrequency: imageData.static.currentImageUpdateFrequency || 'Unknown',
          historicalImages,
          hasLiveStream: !!videoUrl,
        };
      });
  }, [convertToHttps]);

  const fetchDistrictData = useCallback(async (district: number): Promise<CameraFeed[]> => {
    try {
      const url = `https://cwwp2.dot.ca.gov/data/d${district}/cctv/cctvStatusD${district.toString().padStart(2, '0')}.json`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Failed to fetch District ${district} cameras: ${response.status}`);
        return [];
      }

      const data: CalTransCameraData = await response.json();
      return processDistrictData(data, district);
    } catch (error) {
      console.error(`Error fetching District ${district}:`, error);
      return [];
    }
  }, [processDistrictData]);

  const fetchCameraData = useCallback(async () => {
    try {
      setError(null);
      setLoadingProgress(0);
      setProgressiveLoading(true);
      
      // Clear existing feeds for fresh start
      if (!progressiveLoading) {
        setCameraFeeds([]);
      }
      
      // Load Orange County (District 12) cameras
      try {
        const orangeCountyCameras = await fetchDistrictData(12);
        if (orangeCountyCameras.length > 0) {
          setCameraFeeds(orangeCountyCameras);
        }
        setLoadingProgress(100);
      } catch (error) {
        console.error(`Error fetching Orange County District 12:`, error);
        setError('Failed to load Orange County camera feeds. Please try again later.');
      }
      
      // Final check
      setCameraFeeds(prevFeeds => {
        if (prevFeeds.length === 0) {
          setError('No Orange County camera feeds available at this time.');
        }
        return prevFeeds;
      });
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching camera data:', err);
      setError('Failed to load Orange County camera feeds. Please try again later.');
    } finally {
      setLoading(false);
      setProgressiveLoading(false);
    }
  }, [selectedDistricts, fetchDistrictData, progressiveLoading]);

  useEffect(() => {
    fetchCameraData();
    const interval = setInterval(fetchCameraData, 15 * 60 * 1000); // Refresh every 15 minutes
    setRefreshInterval(interval);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      if (interval) clearInterval(interval);
    };
  }, [fetchCameraData]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setLoadingProgress(0);
    setCameraFeeds([]); // Clear existing feeds when manually refreshing
    fetchCameraData();
  }, [fetchCameraData]);

  const handleImageError = useCallback((feedId: string) => {
    setCameraFeeds(prevFeeds =>
      prevFeeds.map(feed =>
        feed.id === feedId ? { ...feed, status: 'Offline' as const } : feed
      )
    );
  }, []);

  const handleImageLoad = useCallback((feedId: string) => {
    setCameraFeeds(prevFeeds =>
      prevFeeds.map(feed =>
        feed.id === feedId ? { ...feed, status: 'Online' as const } : feed
      )
    );
  }, []);

  const handleVideoError = useCallback((feedId: string) => {
    setCameraFeeds(prevFeeds =>
      prevFeeds.map(feed =>
        feed.id === feedId ? { ...feed, status: 'Offline', hasLiveStream: false } : feed
      )
    );
  }, []);

  const handleCameraClick = useCallback((camera: CameraFeed) => {
    setSelectedCamera(camera);
    setShowVideoModal(true);
    setViewMode(camera.hasLiveStream ? 'video' : 'images');
    
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
    if (timelapseInterval) {
      clearInterval(timelapseInterval);
      setTimelapseInterval(null);
    }
  }, [timelapseInterval]);

  const startTimelapse = useCallback(() => {
    if (timelapseImages.length <= 1) return;
    
    setIsPlayingTimelapse(true);
    const interval = setInterval(() => {
      setCurrentTimelapseIndex(prev => 
        prev >= timelapseImages.length - 1 ? 0 : prev + 1
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
    if (isPlayingTimelapse) stopTimelapse();
    else startTimelapse();
  }, [isPlayingTimelapse, stopTimelapse, startTimelapse]);

  const goToPreviousFrame = useCallback(() => {
    if (!isPlayingTimelapse) {
      setCurrentTimelapseIndex(prev => 
        prev <= 0 ? timelapseImages.length - 1 : prev - 1
      );
    }
  }, [isPlayingTimelapse, timelapseImages.length]);

  const goToNextFrame = useCallback(() => {
    if (!isPlayingTimelapse) {
      setCurrentTimelapseIndex(prev => 
        prev >= timelapseImages.length - 1 ? 0 : prev + 1
      );
    }
  }, [isPlayingTimelapse, timelapseImages.length]);

  const getStatusClass = useCallback((status: string) => status.toLowerCase(), []);

  const memoizedCameraFeeds = useMemo(() => cameraFeeds, [cameraFeeds]);

  // Function to get or create a ref for a specific feed
  const getGridPlayerRef = useCallback((feedId: string) => {
    if (!gridPlayerRefs.current[feedId]) {
      gridPlayerRefs.current[feedId] = React.createRef();
    }
    return gridPlayerRefs.current[feedId];
  }, []);

  if (loading && cameraFeeds.length === 0) {
    return (
      <div className="livefeed-page" data-cy="livefeed-page">
        <div className="livefeed-header">
          <h2 data-cy="livefeed-title">Orange County Live Camera Feeds</h2>
          <div className="livefeed-subtitle" data-cy="livefeed-subtitle">
            Loading Orange County highway cameras...
          </div>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <div className="loading-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <div className="progress-text">
              {Math.round(loadingProgress)}% loaded • Loading Orange County District 12
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && cameraFeeds.length === 0) {
    return (
      <div className="livefeed-page" data-cy="livefeed-page">
        <div className="livefeed-header">
          <h2 data-cy="livefeed-title">Orange County Live Camera Feeds</h2>
          <div className="livefeed-subtitle" data-cy="livefeed-subtitle">
            Real-time Orange County traffic monitoring
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
    <div className="livefeed-page" data-cy="livefeed-page">
      <div className="livefeed-header">
        <h2 data-cy="livefeed-title">Orange County Live Camera Feeds</h2>
        <div className="livefeed-controls">
          <button 
            onClick={handleRefresh} 
            className="refresh-button"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Feeds'}
          </button>
          <div className="feed-info">
            Showing {cameraFeeds.length} cameras from Orange County (District 12)
            {progressiveLoading && (
              <span className="loading-more"> • Loading more...</span>
            )}
          </div>
          <div className="last-refresh">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-error">×</button>
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
        {memoizedCameraFeeds.map((feed) => (
          <div 
            key={feed.id} 
            className="feed-tile clickable" 
            data-cy={`feed-tile-${feed.id}`}
            onClick={() => handleCameraClick(feed)}
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
                <div className={`status-badge ${getStatusClass(feed.status)}`} data-cy="feed-status">
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
                    <p className="feed-description">{feed.imageDescription}</p>
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
                  <div className="feed-last-update">
                    Loaded: {feed.lastUpdate}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {cameraFeeds.length === 0 && !loading && (
        <div className="no-feeds-message">
          <h3>No Orange County camera feeds available</h3>
          <p>Please try refreshing or check back later.</p>
          <button onClick={handleRefresh} className="retry-button">
            Refresh
          </button>
        </div>
      )}

      {showVideoModal && selectedCamera && (
        <div className="video-modal-overlay" onClick={closeVideoModal}>
          <div className="video-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <h3>{selectedCamera.location}</h3>
              <button className="close-modal" onClick={closeVideoModal}>×</button>
            </div>
            
            <div className="video-modal-content">
              {selectedCamera.hasLiveStream && selectedCamera.videoUrl && viewMode === 'video' ? (
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
                  />
                  {selectedCamera.historicalImages && selectedCamera.historicalImages.length > 0 && (
                    <button onClick={() => setViewMode('images')} className="switch-view-btn">
                      View Historical Images
                    </button>
                  )}
                </div>
              ) : (
                <div className="timelapse-container">
                  <div className="timelapse-viewer">
                    <img
                      src={timelapseImages[currentTimelapseIndex]}
                      alt={`${selectedCamera.location} - Frame ${currentTimelapseIndex + 1}`}
                      className="timelapse-image"
                    />
                    <div className="timelapse-info">
                      Frame {currentTimelapseIndex + 1} of {timelapseImages.length}
                      {currentTimelapseIndex === 0 ? ' (Current)' : ` (${currentTimelapseIndex} updates ago)`}
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
                        title={isPlayingTimelapse ? 'Pause timelapse' : 'Play timelapse'}
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
                  
                  {selectedCamera.hasLiveStream && selectedCamera.videoUrl && (
                    <button onClick={() => setViewMode('video')} className="switch-view-btn">
                      View Live Video
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="video-modal-info">
              <div className="camera-details-modal">
                <p><strong>Route:</strong> {selectedCamera.route}</p>
                <p><strong>District:</strong> {selectedCamera.district}</p>
                {selectedCamera.direction && (
                  <p><strong>Direction:</strong> {selectedCamera.direction}</p>
                )}
                {selectedCamera.county && (
                  <p><strong>County:</strong> {selectedCamera.county}</p>
                )}
                {selectedCamera.milepost && (
                  <p><strong>Milepost:</strong> {selectedCamera.milepost}</p>
                )}
                {selectedCamera.imageDescription && (
                  <p><strong>View:</strong> {selectedCamera.imageDescription}</p>
                )}
                <p><strong>Update Frequency:</strong> Every {selectedCamera.updateFrequency || '?'} minutes</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveFeed;