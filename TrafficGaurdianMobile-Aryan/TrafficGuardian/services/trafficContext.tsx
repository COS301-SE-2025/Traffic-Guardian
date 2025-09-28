import React, { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { useSocket } from "./socketProvider";

/** Minimal incident shape used in the app */
export type Incident = {
  id: string | number;
  type?: string;
  severity?: "low" | "moderate" | "high" | "critical" | string;
  title?: string;
  description?: string;
  latitude: number;
  longitude: number;
  createdAt?: string | number | Date;
  updatedAt?: string | number | Date;
  distanceKm?: number; // optional derived field
  [key: string]: any;
};

type TrafficContextType = {
  /** All incidents keyed by id */
  incidentsById: Record<string | number, Incident>;
  /** Ordered list for easy rendering (most recent first) */
  incidents: Incident[];
  /** Critical-only projection */
  critical: Incident[];
  /** Categories counts */
  byCategory: Record<string, number>;
  /** Locations list (lat/lng only) */
  locations: Array<{ latitude: number; longitude: number }>;

  /** Upsert many incidents at once (e.g. full snapshot) */
  upsertMany: (items: Incident[]) => void;
  /** Optimistically push a locally-created report */
  pushLocalReport: (item: Incident) => void;
  /** Remove an incident by id */
  remove: (id: string | number) => void;
  /** Clear everything (e.g. on logout) */
  clear: () => void;

  /** Convenience selector for nearby items */
  nearby: (lat: number, lng: number, radiusKm: number) => Incident[];
  /** Ask server (via socket) for a fresh snapshot */
  refreshFromServer: () => void;
};

const TrafficContext = createContext<TrafficContextType | undefined>(undefined);

export const TrafficProvider = ({ children }: { children: ReactNode }) => {
  const { socket } = useSocket();

  const [incidentsById, setIncidentsById] = useState<Record<string | number, Incident>>({});
  const readyRef = useRef(false);

  const upsertMany = (items: Incident[]) => {
    setIncidentsById((prev) => {
      const next = { ...prev };
      for (const it of items) {
        if (!it?.id) continue;
        const id = it.id;
        const prevItem = next[id];
        next[id] = {
          ...prevItem,
          ...it,
          updatedAt: it.updatedAt ?? it.createdAt ?? prevItem?.updatedAt ?? Date.now(),
        };
      }
      return next;
    });
  };

  const pushLocalReport = (item: Incident) => {
    if (!item?.id) item.id = `local-${Date.now()}`;
    upsertMany([item]);
  };

  const remove = (id: string | number) =>
    setIncidentsById((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });

  const clear = () => setIncidentsById({});

  const incidents = useMemo(
    () =>
      Object.values(incidentsById).sort((a, b) => {
        const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        return tb - ta;
      }),
    [incidentsById]
  );

  const critical = useMemo(() => incidents.filter((i) => (i.severity ?? "").toLowerCase() === "critical"), [incidents]);

  const byCategory = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const i of incidents) {
      const key = (i.type ?? "other").toString();
      agg[key] = (agg[key] ?? 0) + 1;
    }
    return agg;
  }, [incidents]);

  const locations = useMemo(
    () => incidents.map((i) => ({ latitude: i.latitude, longitude: i.longitude })),
    [incidents]
  );

  const nearby = (lat: number, lng: number, radiusKm: number) => {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const res: Incident[] = [];
    for (const i of incidents) {
      const dLat = toRad(i.latitude - lat);
      const dLon = toRad(i.longitude - lng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat)) * Math.cos(toRad(i.latitude)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c;
      if (d <= radiusKm) res.push({ ...i, distanceKm: d });
    }
    return res.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  };

  const refreshFromServer = () => {
    socket?.emit("requestTrafficSnapshot");
  };

  // Attach socket listeners once
  useEffect(() => {
    if (!socket) return;
    const onSnapshot = (data: Incident[] = []) => upsertMany(data);
    const onUpsert = (data: Incident | Incident[]) => upsertMany(Array.isArray(data) ? data : [data]);
    const onRemove = (id: string | number) => remove(id);

    socket.on("trafficSnapshot", onSnapshot);
    socket.on("trafficUpdate", onUpsert);
    socket.on("trafficRemove", onRemove);

    // Request an initial snapshot only once when a socket becomes available
    if (!readyRef.current) {
      readyRef.current = true;
      refreshFromServer();
    }

    return () => {
      socket.off("trafficSnapshot", onSnapshot);
      socket.off("trafficUpdate", onUpsert);
      socket.off("trafficRemove", onRemove);
    };
  }, [socket]);

  const value: TrafficContextType = {
    incidentsById,
    incidents,
    critical,
    byCategory,
    locations,
    upsertMany,
    pushLocalReport,
    remove,
    clear,
    nearby,
    refreshFromServer,
  };

  return <TrafficContext.Provider value={value}>{children}</TrafficContext.Provider>;
};

export const useTraffic = () => {
  const ctx = useContext(TrafficContext);
  if (!ctx) throw new Error("useTraffic must be used within a TrafficProvider");
  return ctx;
};





/*
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
};*/
