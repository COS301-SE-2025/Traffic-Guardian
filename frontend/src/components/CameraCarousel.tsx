import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/apiService';
import LoadingSpinner from './LoadingSpinner';

interface Camera {
  Camera_ID: number;
  Camera_RoadwayName: string;
  Camera_DirectionOfTravel: string;
  Camera_Latitude: number;
  Camera_Longitude: number;
  Camera_ImageURL: string;
  Camera_StreamURL?: string;
  Camera_Route: string;
  Camera_District: string;
  last_traffic_count: number;
  Camera_Status: 'online' | 'offline';
  Camera_Description?: string;
}

interface CameraCarouselProps {
  className?: string;
}

const CameraCarousel: React.FC<CameraCarouselProps> = ({ className = '' }) => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<number>>(new Set());

  const fetchTopCameras = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const cameraData = await ApiService.fetchTopCamerasByTraffic();

      if (cameraData && cameraData.length > 0) {
        setCameras(cameraData);
      } else {
        setError('No camera data available');
      }
    } catch (err) {
      console.error('Error fetching top cameras:', err);
      setError('Failed to load camera data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopCameras();
  }, [fetchTopCameras]);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (cameras.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % cameras.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [cameras.length]);

  const handleImageError = (cameraId: number) => {
    setImageLoadErrors(prev => {
      const newSet = new Set(prev);
      newSet.add(cameraId);
      return newSet;
    });
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % cameras.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + cameras.length) % cameras.length);
  };

  if (loading) {
    return (
      <div className={`camera-carousel-container ${className}`}>
        <div className="camera-carousel-header">
          <h3>High Volume Areas</h3>
          <div className="camera-carousel-subtitle">
            Live camera feeds from busiest locations
          </div>
        </div>
        <div className="camera-carousel-loading">
          <LoadingSpinner size="small" text="Loading cameras..." />
        </div>
      </div>
    );
  }

  if (error || cameras.length === 0) {
    return (
      <div className={`camera-carousel-container ${className}`}>
        <div className="camera-carousel-header">
          <h3>High Volume Areas</h3>
          <div className="camera-carousel-subtitle">
            Live camera feeds from busiest locations
          </div>
        </div>
        <div className="camera-carousel-error">
          <div className="error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <div className="error-message">
            {error || 'No cameras available at the moment'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`camera-carousel-container ${className}`}>
      <div className="camera-carousel-header">
        <h3>Top Traffic Cameras</h3>
        <div className="camera-carousel-subtitle">
          Highest traffic volume locations • {cameras.length} cameras
        </div>
      </div>

      <div className="camera-carousel-wrapper">
        <div className="camera-carousel">
          <button
            className="carousel-nav prev"
            onClick={prevSlide}
            aria-label="Previous camera"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="camera-slide-container">
            {cameras.map((camera, index) => (
              <div
                key={camera.Camera_ID}
                className={`camera-slide ${index === currentIndex ? 'active' : ''}`}
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`,
                }}
              >
                <div className="camera-image-container">
                  {!imageLoadErrors.has(camera.Camera_ID) ? (
                    <img
                      src={camera.Camera_ImageURL}
                      alt={`Traffic camera at ${camera.Camera_RoadwayName}`}
                      className="camera-image"
                      onError={() => handleImageError(camera.Camera_ID)}
                      loading="lazy"
                    />
                  ) : (
                    <div className="camera-image-placeholder">
                      <div className="placeholder-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                      <div className="placeholder-text">Image not available</div>
                    </div>
                  )}

                  <div className="camera-overlay">
                    <div className="camera-info">
                      <div className="camera-location">
                        {camera.Camera_RoadwayName}
                      </div>
                    </div>
                    <div className={`camera-status ${camera.Camera_Status}`}>
                      <div className="status-dot" />
                      {camera.Camera_Status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            className="carousel-nav next"
            onClick={nextSlide}
            aria-label="Next camera"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="camera-carousel-indicators">
          {cameras.map((_, cameraIndex) => (
            <button
              key={`indicator-${cameraIndex}`}
              className={`carousel-indicator ${cameraIndex === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(cameraIndex)}
              aria-label={`Go to camera ${cameraIndex + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CameraCarousel;