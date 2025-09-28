// LocationContext.tsx
import React, { createContext, useState, useContext, useEffect } from "react";
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
