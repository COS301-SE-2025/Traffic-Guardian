import React, { createContext, useContext, useState, ReactNode } from "react";

type TrafficContextType = {
  traffic: any | null;
  setTraffic: (data: any) => void;
};

const TrafficContext = createContext<TrafficContextType | undefined>(undefined);

export const TrafficProvider = ({ children }: { children: ReactNode }) => {
  const [traffic, setTraffic] = useState<any | null>(null);

  return (
    <TrafficContext.Provider value={{ traffic, setTraffic }}>
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
