// trafficContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useSocket } from "./socketProvider";

type TrafficContextType = {
  traffic: any | null;
  setTraffic: (data: any) => void;
  criticalIncidents: any | null;
  setCriticalIncidents: (data: any) => void;
  incidentCategory: any | null;
  setIncidentCategory: (data: any) => void;
  incidentLocations: any | null;
  setIncidentLocations: (data: any) => void;
};

const TrafficContext = createContext<TrafficContextType | undefined>(undefined);

export const TrafficProvider = ({ children }: { children: ReactNode }) => {
  const { socket } = useSocket(); // get socket globally

  const [traffic, setTraffic] = useState<any | null>(null);
  const [criticalIncidents, setCriticalIncidents] = useState<any | null>(null);
  const [incidentCategory, setIncidentCategory] = useState<any | null>(null);
  const [incidentLocations, setIncidentLocations] = useState<any | null>(null);

  // 🔥 attach socket listeners ONCE at provider level
  useEffect(() => {
    if (!socket) return;

    const handleTrafficUpdate = (data: any) => {
      setTraffic(data);
    };

    const handleCriticalIncidents = (data: any) => {
      setCriticalIncidents(data);
    };

    const handleIncidentCategory = (data: any) => {
      setIncidentCategory(data);
    };

    const handleIncidentLocations = (data: any) => {
      setIncidentLocations(data);
    };

    socket.on("trafficUpdate", handleTrafficUpdate);
    socket.on("criticalIncidents", handleCriticalIncidents);
    socket.on("incidentCategory", handleIncidentCategory);
    socket.on("incidentLocations", handleIncidentLocations);

    return () => {
      socket.off("trafficUpdate", handleTrafficUpdate);
      socket.off("criticalIncidents", handleCriticalIncidents);
      socket.off("incidentCategory", handleIncidentCategory);
      socket.off("incidentLocations", handleIncidentLocations);
    };
  }, [socket]);

  return (
    <TrafficContext.Provider
      value={{
        traffic,
        setTraffic,
        criticalIncidents,
        setCriticalIncidents,
        incidentCategory,
        setIncidentCategory,
        incidentLocations,
        setIncidentLocations,
      }}
    >
      {children}
    </TrafficContext.Provider>
  );
};

// Custom hook for convenience
export const useTraffic = () => {
  const context = useContext(TrafficContext);
  if (!context) {
    throw new Error("useTraffic must be used within a TrafficProvider");
  }
  return context;
};
