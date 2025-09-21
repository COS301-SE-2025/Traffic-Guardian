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

  