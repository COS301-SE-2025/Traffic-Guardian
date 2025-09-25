// Background Data Prefetching Service
// Keeps all page data fresh in the background so navigation is instant

interface CachedData {
  data: any;
  lastFetched: number;
  isStale: boolean;
}

interface PrefetchConfig {
  endpoint: string;
  cacheKey: string;
  refreshInterval: number; // milliseconds
  priority: 'high' | 'normal' | 'low';
}

class DataPrefetchService {
  private cache = new Map<string, CachedData>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private baseUrl: string;
  private isAuthenticated = false;

  // Core data endpoints that need prefetching
  private prefetchConfigs: PrefetchConfig[] = [
    // Dashboard data - highest priority
    {
      endpoint: '/api/incidents',
      cacheKey: 'incidents',
      refreshInterval: 2 * 60 * 1000,
      priority: 'high',
    },
    {
      endpoint: '/api/archives/stats',
      cacheKey: 'archiveStats',
      refreshInterval: 5 * 60 * 1000,
      priority: 'high',
    },
    {
      endpoint: '/api/pems/dashboard-summary',
      cacheKey: 'pemsDashboard',
      refreshInterval: 3 * 60 * 1000,
      priority: 'high',
    },
    {
      endpoint: '/api/pems/high-risk-areas',
      cacheKey: 'highRiskAreas',
      refreshInterval: 4 * 60 * 1000,
      priority: 'high',
    },

    // Traffic data - normal priority
    {
      endpoint: '/api/traffic/incidentLocations',
      cacheKey: 'incidentLocations',
      refreshInterval: 3 * 60 * 1000,
      priority: 'normal',
    },
    {
      endpoint: '/api/traffic/criticalIncidents',
      cacheKey: 'criticalIncidents',
      refreshInterval: 3 * 60 * 1000,
      priority: 'normal',
    },
    {
      endpoint: '/api/traffic/incidentCategory',
      cacheKey: 'incidentCategory',
      refreshInterval: 5 * 60 * 1000,
      priority: 'normal',
    },

    // PEMS district data - normal priority
    {
      endpoint: '/api/pems/district/4',
      cacheKey: 'pems-district-4',
      refreshInterval: 5 * 60 * 1000,
      priority: 'normal',
    },
    {
      endpoint: '/api/pems/district/7',
      cacheKey: 'pems-district-7',
      refreshInterval: 5 * 60 * 1000,
      priority: 'normal',
    },
    {
      endpoint: '/api/pems/district/11',
      cacheKey: 'pems-district-11',
      refreshInterval: 5 * 60 * 1000,
      priority: 'normal',
    },
    {
      endpoint: '/api/pems/district/12',
      cacheKey: 'pems-district-12',
      refreshInterval: 5 * 60 * 1000,
      priority: 'normal',
    },

    // Analytics data - lower priority
    {
      endpoint: '/api/archives?limit=1000',
      cacheKey: 'archiveData',
      refreshInterval: 10 * 60 * 1000,
      priority: 'low',
    },
    {
      endpoint: '/api/pems/alerts',
      cacheKey: 'pemsAlerts',
      refreshInterval: 3 * 60 * 1000,
      priority: 'low',
    },
  ];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const apiKey = sessionStorage.getItem('apiKey');
    return {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey || '',
    };
  }

  // Safe fetch with error handling
  private async safeFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<any | null> {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(8000), // 8 second timeout
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  // Start background prefetching after user logs in
  startPrefetching() {
    if (!this.isAuthenticated) {
      this.isAuthenticated = true;

      // Initial fetch of all high-priority data
      this.prefetchConfigs
        .filter(config => config.priority === 'high')
        .forEach(config => {
          this.fetchAndCache(config);
        });

      // Stagger normal and low priority fetches to avoid overwhelming the server
      setTimeout(() => {
        this.prefetchConfigs
          .filter(config => config.priority === 'normal')
          .forEach(config => {
            this.fetchAndCache(config);
          });
      }, 2000);

      setTimeout(() => {
        this.prefetchConfigs
          .filter(config => config.priority === 'low')
          .forEach(config => {
            this.fetchAndCache(config);
          });
      }, 5000);

      // Set up recurring intervals for all data
      this.prefetchConfigs.forEach(config => {
        const interval = setInterval(() => {
          this.fetchAndCache(config);
        }, config.refreshInterval);

        this.intervals.set(config.cacheKey, interval);
      });
    }
  }

  // Stop prefetching when user logs out
  stopPrefetching() {
    this.isAuthenticated = false;

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();

    // Clear cache
    this.cache.clear();
  }

  // Fetch and cache data for a specific endpoint
  private async fetchAndCache(config: PrefetchConfig) {
    if (!this.isAuthenticated) {return;}

    const url = `${this.baseUrl}${config.endpoint}`;
    const data = await this.safeFetch(url, { headers: this.getAuthHeaders() });

    if (data !== null) {
      this.cache.set(config.cacheKey, {
        data,
        lastFetched: Date.now(),
        isStale: false,
      });

    }
  }

  // Get cached data (instant response)
  getCachedData(cacheKey: string): any | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {return null;}

    // Mark as stale if older than half the refresh interval
    const config = this.prefetchConfigs.find(c => c.cacheKey === cacheKey);
    const staleThreshold = config ? config.refreshInterval / 2 : 60000;

    if (Date.now() - cached.lastFetched > staleThreshold) {
      cached.isStale = true;
    }

    return cached.data;
  }

  // Check if data is available and fresh
  hasData(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    return cached !== undefined && !cached.isStale;
  }

  // Fallback: fetch data if not in cache (for immediate needs)
  async getFreshData(endpoint: string): Promise<any | null> {
    const url = `${this.baseUrl}${endpoint}`;
    return await this.safeFetch(url, { headers: this.getAuthHeaders() });
  }

  // Get cache status for debugging
  getCacheStatus() {
    const status: Record<string, any> = {};

    this.prefetchConfigs.forEach(config => {
      const cached = this.cache.get(config.cacheKey);
      status[config.cacheKey] = {
        cached: !!cached,
        lastFetched: cached?.lastFetched || null,
        isStale: cached?.isStale || false,
        ageSeconds: cached
          ? Math.floor((Date.now() - cached.lastFetched) / 1000)
          : null,
      };
    });

    return status;
  }

  // Manual refresh for specific data
  async refreshData(cacheKey: string) {
    const config = this.prefetchConfigs.find(c => c.cacheKey === cacheKey);
    if (config) {
      await this.fetchAndCache(config);
    }
  }

  // Preload specific page data
  async preloadPageData(pageName: string) {
    const pageConfigs: Record<string, string[]> = {
      dashboard: [
        'incidents',
        'archiveStats',
        'pemsDashboard',
        'highRiskAreas',
      ],
      analytics: ['archiveData', 'incidentLocations', 'criticalIncidents'],
      incidents: ['incidents', 'incidentCategory', 'criticalIncidents'],
      map: ['incidentLocations', 'criticalIncidents', 'incidents'],
      livefeed: ['incidents', 'criticalIncidents', 'pemsAlerts'],
    };

    const requiredData = pageConfigs[pageName] || [];
    const promises = requiredData.map(cacheKey => {
      const config = this.prefetchConfigs.find(c => c.cacheKey === cacheKey);
      return config ? this.fetchAndCache(config) : Promise.resolve();
    });

    await Promise.allSettled(promises);
  }
}

// Create singleton instance
const dataPrefetchService = new DataPrefetchService(
  process.env.REACT_APP_API_URL!,
);

export default dataPrefetchService;
