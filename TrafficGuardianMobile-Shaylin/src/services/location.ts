import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';
import { LOCATION_CONFIG, STORAGE_KEYS } from '../utils/constants';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export interface LocationData extends LocationCoords {
  timestamp: number;
  address?: string;
}

interface LocationContextType {
  currentLocation: LocationCoords | null;
  lastKnownLocation: LocationData | null;
  isLocationEnabled: boolean;
  isTrackingLocation: boolean;
  locationPermissionStatus: Location.PermissionStatus | null;
  accuracy: Location.LocationAccuracy;
  
  requestLocationPermission: () => Promise<boolean>;
  getCurrentLocation: (highAccuracy?: boolean) => Promise<LocationCoords | null>;
  startLocationTracking: () => Promise<void>;
  stopLocationTracking: () => void;
  updateLocation: () => Promise<void>;
  geocodeAddress: (address: string) => Promise<LocationCoords | null>;
  reverseGeocode: (coords: LocationCoords) => Promise<string | null>;
  calculateDistance: (from: LocationCoords, to: LocationCoords) => number;
  isLocationPermissionGranted: () => boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [lastKnownLocation, setLastKnownLocation] = useState<LocationData | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [accuracy] = useState<Location.LocationAccuracy>(
    LOCATION_CONFIG.HIGH_ACCURACY ? Location.LocationAccuracy.High : Location.LocationAccuracy.Balanced
  );

  useEffect(() => {
    initializeLocation();
    loadLastKnownLocation();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const initializeLocation = async () => {
    try {
      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      setIsLocationEnabled(enabled);

      // Check permission status
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermissionStatus(status);

      if (status === Location.PermissionStatus.GRANTED && enabled) {
        // Get initial location
        await getCurrentLocation();
      }
    } catch (error) {
      console.error('Location initialization error:', error);
    }
  };

  const loadLastKnownLocation = async () => {
    try {
      const storedLocation = await AsyncStorage.getItem(STORAGE_KEYS.LAST_LOCATION);
      if (storedLocation) {
        const locationData: LocationData = JSON.parse(storedLocation);
        
        // Check if location is not too old (24 hours)
        const now = Date.now();
        const locationAge = now - locationData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000;
        
        if (locationAge < maxAge) {
          setLastKnownLocation(locationData);
          
          // Use as current location if we don't have one
          if (!currentLocation) {
            setCurrentLocation({
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              accuracy: locationData.accuracy,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading last known location:', error);
    }
  };

  const saveLocation = async (location: LocationCoords) => {
    try {
      const locationData: LocationData = {
        ...location,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(STORAGE_KEYS.LAST_LOCATION, JSON.stringify(locationData));
      setLastKnownLocation(locationData);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionStatus(status);
      
      if (status === Location.PermissionStatus.GRANTED) {
        const enabled = await Location.hasServicesEnabledAsync();
        setIsLocationEnabled(enabled);
        
        if (enabled) {
          await getCurrentLocation();
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Location permission request error:', error);
      return false;
    }
  };

  const getCurrentLocation = async (highAccuracy = false): Promise<LocationCoords | null> => {
    try {
      if (!isLocationPermissionGranted()) {
        const granted = await requestLocationPermission();
        if (!granted) return null;
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: highAccuracy ? Location.LocationAccuracy.High : accuracy,
        timeout: LOCATION_CONFIG.TIMEOUT,
        maximumAge: LOCATION_CONFIG.MAXIMUM_AGE,
      });

      const coords: LocationCoords = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
        accuracy: locationResult.coords.accuracy || undefined,
        altitude: locationResult.coords.altitude || undefined,
        altitudeAccuracy: locationResult.coords.altitudeAccuracy || undefined,
        heading: locationResult.coords.heading || undefined,
        speed: locationResult.coords.speed || undefined,
      };

      // Filter out inaccurate locations
      if (coords.accuracy && coords.accuracy > LOCATION_CONFIG.MIN_ACCURACY) {
        console.warn('Location accuracy too low:', coords.accuracy);
        return currentLocation; // Return existing location if new one is inaccurate
      }

      setCurrentLocation(coords);
      await saveLocation(coords);
      
      return coords;
    } catch (error) {
      console.error('Get current location error:', error);
      return null;
    }
  };

  const startLocationTracking = async (): Promise<void> => {
    try {
      if (!isLocationPermissionGranted()) {
        const granted = await requestLocationPermission();
        if (!granted) throw new Error('Location permission not granted');
      }

      if (locationSubscription) {
        locationSubscription.remove();
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy,
          timeInterval: LOCATION_CONFIG.UPDATE_INTERVAL,
          distanceInterval: LOCATION_CONFIG.LOCATION_UPDATE_DISTANCE,
        },
        (locationResult) => {
          const coords: LocationCoords = {
            latitude: locationResult.coords.latitude,
            longitude: locationResult.coords.longitude,
            accuracy: locationResult.coords.accuracy || undefined,
            altitude: locationResult.coords.altitude || undefined,
            altitudeAccuracy: locationResult.coords.altitudeAccuracy || undefined,
            heading: locationResult.coords.heading || undefined,
            speed: locationResult.coords.speed || undefined,
          };

          // Filter out inaccurate locations
          if (coords.accuracy && coords.accuracy > LOCATION_CONFIG.MIN_ACCURACY) {
            return;
          }

          setCurrentLocation(coords);
          saveLocation(coords);

          // Update server with new location (for responders)
          updateServerLocation(coords);
        }
      );

      setLocationSubscription(subscription);
      setIsTrackingLocation(true);
    } catch (error) {
      console.error('Start location tracking error:', error);
      throw error;
    }
  };

  const stopLocationTracking = (): void => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    setIsTrackingLocation(false);
  };

  const updateLocation = async (): Promise<void> => {
    await getCurrentLocation();
  };

  const updateServerLocation = async (coords: LocationCoords) => {
    try {
      await apiService.updateLocation(
        coords.latitude,
        coords.longitude,
        coords.accuracy,
        coords.heading,
        coords.speed
      );
    } catch (error) {
      console.error('Server location update error:', error);
      // Don't throw error as this is not critical for app functionality
    }
  };

  const geocodeAddress = async (address: string): Promise<LocationCoords | null> => {
    try {
      const result = await apiService.geocodeAddress(address);
      return {
        latitude: result.location.latitude,
        longitude: result.location.longitude,
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const reverseGeocode = async (coords: LocationCoords): Promise<string | null> => {
    try {
      const result = await apiService.reverseGeocode(coords.latitude, coords.longitude);
      return result.address?.formatted_address || null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  };

  const calculateDistance = (from: LocationCoords, to: LocationCoords): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(to.latitude - from.latitude);
    const dLon = toRadians(to.longitude - from.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  const isLocationPermissionGranted = (): boolean => {
    return locationPermissionStatus === Location.PermissionStatus.GRANTED;
  };

  const contextValue: LocationContextType = {
    currentLocation,
    lastKnownLocation,
    isLocationEnabled,
    isTrackingLocation,
    locationPermissionStatus,
    accuracy,
    requestLocationPermission,
    getCurrentLocation,
    startLocationTracking,
    stopLocationTracking,
    updateLocation,
    geocodeAddress,
    reverseGeocode,
    calculateDistance,
    isLocationPermissionGranted,
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

// Location utilities
export const locationUtils = {
  // Format coordinates for display
  formatCoordinates: (coords: LocationCoords, precision = 4): string => {
    return `${coords.latitude.toFixed(precision)}, ${coords.longitude.toFixed(precision)}`;
  },

  // Check if location is within bounds
  isWithinBounds: (
    location: LocationCoords,
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    }
  ): boolean => {
    return (
      location.latitude <= bounds.north &&
      location.latitude >= bounds.south &&
      location.longitude <= bounds.east &&
      location.longitude >= bounds.west
    );
  },

  // Get center point between multiple locations
  getCenterPoint: (locations: LocationCoords[]): LocationCoords => {
    if (locations.length === 0) {
      throw new Error('Cannot calculate center of empty locations array');
    }

    const sum = locations.reduce(
      (acc, location) => ({
        latitude: acc.latitude + location.latitude,
        longitude: acc.longitude + location.longitude,
      }),
      { latitude: 0, longitude: 0 }
    );

    return {
      latitude: sum.latitude / locations.length,
      longitude: sum.longitude / locations.length,
    };
  },

  // Calculate bearing between two points
  calculateBearing: (from: LocationCoords, to: LocationCoords): number => {
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    const lat1 = from.latitude * Math.PI / 180;
    const lat2 = to.latitude * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360; // Normalise to 0-360 degrees

    return bearing;
  },

  // Get compass direction from bearing
  getBearingDirection: (bearing: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  },

  // Check if location is accurate enough
  isLocationAccurate: (location: LocationCoords): boolean => {
    return !location.accuracy || location.accuracy <= LOCATION_CONFIG.MIN_ACCURACY;
  },

  // Get location age in minutes
  getLocationAge: (timestamp: number): number => {
    return Math.floor((Date.now() - timestamp) / (1000 * 60));
  },

  // Check if location is recent
  isLocationRecent: (timestamp: number, maxAgeMinutes = 5): boolean => {
    return locationUtils.getLocationAge(timestamp) <= maxAgeMinutes;
  },

  // Generate a region for map display
  getMapRegion: (location: LocationCoords, radiusKm = 1) => {
    const latitudeDelta = radiusKm / 111; // Approximate km per degree latitude
    const longitudeDelta = radiusKm / (111 * Math.cos(location.latitude * Math.PI / 180));

    return {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: latitudeDelta * 2,
      longitudeDelta: longitudeDelta * 2,
    };
  },

  // Validate location coordinates
  isValidLocation: (location: Partial<LocationCoords>): location is LocationCoords => {
    return (
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number' &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      location.longitude >= -180 &&
      location.longitude <= 180
    );
  },
};