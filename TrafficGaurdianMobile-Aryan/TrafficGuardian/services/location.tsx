import React, { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import * as Location from "expo-location";
import { AppState, AppStateStatus, Platform } from "react-native";
import { calculateDistanceKm } from "./distanceCalculator"; // your helper (already in repo)

export type LatLng = { latitude: number; longitude: number };

type LocationState = {
  /** Last known position (foreground) */
  position: LatLng | null;
  /** True once permissions have been granted for foreground use */
  hasForegroundPermission: boolean | null;
  /** Whether we are actively watching positions */
  watching: boolean;
  /** Any last error */
  error: string | null;

  /** Resolve current position once */
  getCurrentPosition: () => Promise<LatLng | null>;
  /** Begin foreground watch */
  startWatching: (opts?: Partial<Location.LocationOptions>) => Promise<void>;
  /** Stop foreground watch */
  stopWatching: () => void;

  /** Distance convenience (km) */
  distanceKmTo: (target: LatLng) => number | null;
};

const LocationContext = createContext<LocationState | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [hasForegroundPermission, setHasForegroundPermission] = useState<boolean | null>(null);
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  // Ask permission on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setHasForegroundPermission(status === "granted");
        if (status !== "granted") {
          setError("Location permission not granted");
          return;
        }
        const cur = await Location.getCurrentPositionAsync({});
        setPosition({ latitude: cur.coords.latitude, longitude: cur.coords.longitude });
      } catch (e: any) {
        setError(e?.message ?? "Failed to get location");
      }
    })();
  }, []);

  // Pause/resume watch on app background/foreground
  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      if (state !== "active") {
        stopWatching();
      }
    };
    const sub = AppState.addEventListener("change", handler);
    return () => sub.remove();
  }, []);

  const getCurrentPosition = async (): Promise<LatLng | null> => {
    try {
      const cur = await Location.getCurrentPositionAsync({});
      const pos = { latitude: cur.coords.latitude, longitude: cur.coords.longitude };
      setPosition(pos);
      return pos;
    } catch (e: any) {
      setError(e?.message ?? "Failed to get current position");
      return null;
    }
  };

  const startWatching = async (
    opts: Partial<Location.LocationOptions> = {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 4000,
      distanceInterval: Platform.select({ ios: 10, android: 15, default: 15 }),
    }
  ) => {
    if (watchRef.current) return; // already watching
    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: opts.accuracy ?? Location.Accuracy.Balanced,
          distanceInterval: opts.distanceInterval ?? 15,
          timeInterval: opts.timeInterval ?? 4000,
        },
        (loc) => {
          const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setPosition(pos);
        }
      );
      watchRef.current = sub;
      setWatching(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to start location watch");
    }
  };

  const stopWatching = () => {
    watchRef.current?.remove();
    watchRef.current = null;
    setWatching(false);
  };

  const distanceKmTo = (target: LatLng) => {
    if (!position) return null;
    return calculateDistanceKm(position.latitude, position.longitude, target.latitude, target.longitude);
  };

  const value = useMemo<LocationState>(
    () => ({
      position,
      hasForegroundPermission,
      watching,
      error,
      getCurrentPosition,
      startWatching,
      stopWatching,
      distanceKmTo,
    }),
    [position, hasForegroundPermission, watching, error]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocationService = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocationService must be used within a LocationProvider");
  return ctx;
};



/*import React, { createContext, useState, useContext, useEffect } from "react";
import * as Location from "expo-location";

type Coords = { latitude: number; longitude: number } | null;

const LocationContext = createContext<{ coords: Coords }>({ coords: null });

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coords, setCoords] = useState<Coords>(null);

  useEffect(() => {
    const requestLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    };
    requestLocation();
  }, []);

  return <LocationContext.Provider value={{ coords }}>{children}</LocationContext.Provider>;
};

export const useLocation = () => useContext(LocationContext);
*/