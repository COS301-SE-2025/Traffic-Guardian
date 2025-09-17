import { useState, useEffect } from 'react';
import dataPrefetchService from '../services/DataPrefetchService';

// Custom hook to use cached data with fallback to fresh fetch
export function useCachedData<T>(
  endpoint: string,
  cacheKey: string,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, try to get cached data
        const cachedData = dataPrefetchService.getCachedData(cacheKey);

        if (cachedData && mounted) {
          setData(cachedData);
          setLoading(false);
          return; // Use cached data, no need to fetch
        }

        // If no cached data, fetch fresh
        const freshData = await dataPrefetchService.getFreshData(endpoint);

        if (mounted) {
          if (freshData) {
            setData(freshData);
          } else {
            setError('Failed to fetch data');
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [endpoint, cacheKey, ...dependencies]);

  // Manual refresh function
  const refresh = async () => {
    await dataPrefetchService.refreshData(cacheKey);
    const refreshedData = dataPrefetchService.getCachedData(cacheKey);
    if (refreshedData) {
      setData(refreshedData);
    }
  };

  return { data, loading, error, refresh };
}

// Specialized hooks for common data
export function useIncidents() {
  return useCachedData('/api/incidents', 'incidents');
}

export function useArchiveStats() {
  return useCachedData('/api/archives/stats', 'archiveStats');
}

export function usePemsDashboard() {
  return useCachedData('/api/pems/dashboard-summary', 'pemsDashboard');
}

export function useHighRiskAreas() {
  return useCachedData('/api/pems/high-risk-areas', 'highRiskAreas');
}

export function useIncidentLocations() {
  return useCachedData('/api/traffic/incidentLocations', 'incidentLocations');
}

export function useCriticalIncidents() {
  return useCachedData('/api/traffic/criticalIncidents', 'criticalIncidents');
}

export function useIncidentCategory() {
  return useCachedData('/api/traffic/incidentCategory', 'incidentCategory');
}

export function useArchiveData() {
  return useCachedData('/api/archives?limit=1000', 'archiveData');
}

export function usePemsAlerts() {
  return useCachedData('/api/pems/alerts', 'pemsAlerts');
}

export function usePemsDistrict(districtId: number) {
  return useCachedData(
    `/api/pems/district/${districtId}`,
    `pems-district-${districtId}`,
    [districtId]
  );
}
