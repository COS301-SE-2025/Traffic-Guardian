import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { LiveFeedDatabaseIntegration } from '../services/CameraDataService';

export interface CameraFeed {
  id: string;
  location: string;
  locationName?: string;
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
  coordinates?: {
    lat: number;
    lng: number;
  };
}

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

interface LiveFeedContextType {
  cameraFeeds: CameraFeed[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date;
  loadingProgress: number;
  refreshFeeds: () => void;
  setCameraStatus: (
    feedId: string,
    status: 'Online' | 'Offline' | 'Loading'
  ) => void;
  isInitialized: boolean;
}

const LiveFeedContext = createContext<LiveFeedContextType | undefined>(
  undefined,
);

export const useLiveFeed = () => {
  const context = useContext(LiveFeedContext);
  if (context === undefined) {
    throw new Error('useLiveFeed must be used within a LiveFeedProvider');
  }
  return context;
};

export const LiveFeedProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cameraFeeds, setCameraFeeds] = useState<CameraFeed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dbIntegrationRef = useRef<LiveFeedDatabaseIntegration | null>(null);

  // Initialize database integration once
  useEffect(() => {
    if (!dbIntegrationRef.current) {
      dbIntegrationRef.current = new LiveFeedDatabaseIntegration(
        process.env.REACT_APP_API_URL!,
      );
    }

    return () => {
      if (dbIntegrationRef.current) {
        dbIntegrationRef.current.cleanup();
      }
    };
  }, []);

  const convertToHttps = useCallback((originalUrl: string): string => {
    if (originalUrl && originalUrl.startsWith('http://cwwp2.dot.ca.gov')) {
      return originalUrl.replace(
        'http://cwwp2.dot.ca.gov',
        'https://caltrans.blinktag.com/api',
      );
    }
    return originalUrl;
  }, []);

  const parseCoordinates = useCallback(
    (lat: string, lng: string): { lat: number; lng: number } | null => {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return null;
      }

      if (
        latitude < 32 ||
        latitude > 42 ||
        longitude < -125 ||
        longitude > -114
      ) {
        return null;
      }

      return { lat: latitude, lng: longitude };
    },
    [],
  );

  const processDistrictData = useCallback(
    (data: CalTransCameraData, district: number): CameraFeed[] => {
      if (!data?.data || !Array.isArray(data.data)) {return [];}

      const validCameras = data.data.filter(
        item =>
          item.cctv.inService === 'true' &&
          ((item.cctv.imageData.streamingVideoURL &&
            item.cctv.imageData.streamingVideoURL !== 'Not Reported') ||
            (item.cctv.imageData.static.currentImageURL &&
              item.cctv.imageData.static.currentImageURL !== 'Not Reported')),
      );

      return validCameras.slice(0, 15).map(item => {
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
        ]
          .filter(url => url && url !== 'Not Reported')
          .map(url => convertToHttps(url))
          .slice(0, 6);

        const httpsImageUrl = convertToHttps(imageData.static.currentImageURL);
        const videoUrl =
          imageData.streamingVideoURL &&
          imageData.streamingVideoURL !== 'Not Reported'
            ? convertToHttps(imageData.streamingVideoURL)
            : undefined;

        const coordinates =
          parseCoordinates(location.latitude, location.longitude) || undefined;

        return {
          id: `CALTRANS-D${district}-${camera.index}`,
          location:
            location.locationName ||
            location.nearbyPlace ||
            `District ${district} Camera`,
          locationName: location.locationName,
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
          updateFrequency:
            imageData.static.currentImageUpdateFrequency || 'Unknown',
          historicalImages,
          hasLiveStream: !!videoUrl,
          coordinates,
        };
      });
    },
    [convertToHttps, parseCoordinates],
  );

  const fetchDistrictData = useCallback(
    async (district: number): Promise<CameraFeed[]> => {
      try {
        const url = `https://cwwp2.dot.ca.gov/data/d${district}/cctv/cctvStatusD${district
          .toString()
          .padStart(2, '0')}.json`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(
            `Failed to fetch District ${district} cameras: ${response.status}`,
          );
          return [];
        }

        const data: CalTransCameraData = await response.json();
        return processDistrictData(data, district);
      } catch (error) {
        console.error(`Error fetching District ${district}:`, error);
        return [];
      }
    },
    [processDistrictData],
  );

  const fetchCameraData = useCallback(
    async (force = false) => {
      // Don't fetch if we already have data and it's not forced
      if (!force && cameraFeeds.length > 0 && isInitialized) {
        return;
      }

      try {
        setError(null);
        setLoading(true);
        setLoadingProgress(0);

        const orangeCountyCameras = await fetchDistrictData(12);
        if (orangeCountyCameras.length > 0) {
          setCameraFeeds(orangeCountyCameras);

          // Sync with database in background
          if (dbIntegrationRef.current) {
            try {
              await dbIntegrationRef.current.syncCamerasWithDatabase(
                orangeCountyCameras,
              );
            } catch (dbError) {
              console.error('Failed to sync camera data:', dbError);
            }
          }
        }
        setLoadingProgress(100);
        setLastRefresh(new Date());
        setIsInitialized(true);
      } catch (err) {
        console.error('Error fetching camera data:', err);
        setError('Failed to load camera feeds. Please try again later.');
      } finally {
        setLoading(false);
      }
    },
    [fetchDistrictData, cameraFeeds.length, isInitialized],
  );

  // Initialize data on first mount
  useEffect(() => {
    if (!isInitialized) {
      fetchCameraData();
    }
  }, [fetchCameraData, isInitialized]);

  // Set up background refresh
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Refresh every 15 minutes in background
    refreshIntervalRef.current = setInterval(() => {
      fetchCameraData(true);
    }, 15 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchCameraData]);

  const refreshFeeds = useCallback(() => {
    fetchCameraData(true);
  }, [fetchCameraData]);

  const setCameraStatus = useCallback(
    (feedId: string, status: 'Online' | 'Offline' | 'Loading') => {
      setCameraFeeds(prevFeeds =>
        prevFeeds.map(feed => (feed.id === feedId ? { ...feed, status } : feed)),
      );

      // Track status in database
      if (dbIntegrationRef.current) {
        dbIntegrationRef.current.trackCameraStatus(
          feedId,
          status.toLowerCase() as any,
        );
      }
    },
    [],
  );

  const value: LiveFeedContextType = {
    cameraFeeds,
    loading,
    error,
    lastRefresh,
    loadingProgress,
    refreshFeeds,
    setCameraStatus,
    isInitialized,
  };

  return (
    <LiveFeedContext.Provider value={value}>
      {children}
    </LiveFeedContext.Provider>
  );
};
