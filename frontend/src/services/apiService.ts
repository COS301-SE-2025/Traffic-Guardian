// Frontend API Service for Analytics with Caching
import { cacheService } from './CacheService';

const API_BASE_URL = process.env.REACT_APP_API_URL! + '/api';

export interface DatabaseIncident {
  Incidents_ID: number;
  Incidents_DateTime: string;
  Incidents_Longitude: number;
  Incidents_Latitude: number;
  Incident_Severity: string;
  Incident_Status: string;
  Incident_Reporter: string;
  Incident_CameraID: number;
  Incident_Description: string;
}

// Archive interfaces
export interface ArchiveData {
  Archive_ID: number;
  Archive_Date: string;
  Archive_Type: string;
  Archive_IncidentID: number;
  Archive_CameraID: number;
  Archive_IncidentData: any;
  Archive_AlertsData: any;
  Archive_Severity: string;
  Archive_Status: string;
  Archive_DateTime: string;
  Archive_SearchText: string;
  Archive_Tags: string[];
  Archive_Metadata: any;
}

export interface ArchiveStats {
  type: string;
  severity: string;
  status: string;
  count: number;
}

export interface ArchiveAnalytics {
  totalArchives: number;
  archivesByType: { [key: string]: number };
  archivesBySeverity: { [key: string]: number };
  archivesByStatus: { [key: string]: number };
  archivesByMonth: { month: string; count: number }[];
  archivesByLocation: { location: string; count: number }[];
  recentArchives: ArchiveData[];
  averageArchiveTime: number;
  storageMetrics: {
    totalSize: number;
    avgSizePerArchive: number;
    oldestArchive: string;
    newestArchive: string;
  };
}

// Response interfaces
export interface LocationData {
  location: string;
  amount: number;
}

export interface CriticalIncidentsData {
  Data: string;
  Amount: number;
}

export interface CategoryData {
  categories: string[];
  percentages: number[];
}

export interface TrafficIncident {
  location: string;
  incidents: Array<{
    properties: {
      iconCategory: string;
      magnitudeOfDelay: number;
      events: Array<{
        description: string;
        code: number;
        iconCategory: string;
      }>;
    };
    geometry: {
      type: string;
      coordinates: number[][];
    };
  }>;
}

export interface TodaysIncidentsData {
  count: number;
  date: string;
  incidents: DatabaseIncident[];
}

export interface IncidentStats {
  total: number;
  active: number;
  today: number;
  severityBreakdown: {
    [key: string]: number;
  };
}

class ApiService {
  private static getAuthHeaders(): HeadersInit {
    const apiKey = sessionStorage.getItem('apiKey');
    return {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey || '',
    };
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: 'Network error' }));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`,
      );
    }
    return response.json();
  }

  // Get database incidents
  static async fetchIncidents(): Promise<DatabaseIncident[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/incidents`, {
        headers: this.getAuthHeaders(),
      });

      const incidents = await this.handleResponse<DatabaseIncident[]>(response);
      return incidents;
    } catch (error) {
      console.error('Error fetching incidents:', error);
      return [];
    }
  }

  // Get today's incidents
  static async fetchTodaysIncidents(): Promise<TodaysIncidentsData | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/incidents/today`, {
        headers: this.getAuthHeaders(),
      });

      const todaysData = await this.handleResponse<TodaysIncidentsData>(
        response,
      );
      return todaysData;
    } catch (error) {
      console.error("Error fetching today's incidents:", error);
      return null;
    }
  }

  // Get incident statistics
  static async fetchIncidentStats(): Promise<IncidentStats | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/incidents/stats`, {
        headers: this.getAuthHeaders(),
      });

      const stats = await this.handleResponse<IncidentStats>(response);
      return stats;
    } catch (error) {
      console.error('Error fetching incident stats:', error);
      return null;
    }
  }

  // ==================== ARCHIVE ANALYTICS METHODS ====================

  // Get all archives with filtering
  static async fetchArchives(
    filters: {
      type?: string;
      severity?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<ArchiveData[]> {
    try {
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const url = `${API_BASE_URL}/archives${
        queryParams.toString() ? '?' + queryParams.toString() : ''
      }`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });

      const archives = await this.handleResponse<ArchiveData[]>(response);
      return archives;
    } catch (error) {
      console.error('Error fetching archives:', error);
      return [];
    }
  }

  // Get archive statistics
  static async fetchArchiveStats(): Promise<ArchiveStats[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/archives/stats`, {
        headers: this.getAuthHeaders(),
      });

      const stats = await this.handleResponse<ArchiveStats[]>(response);
      return stats;
    } catch (error) {
      console.error('Error fetching archive stats:', error);
      return [];
    }
  }

  // Get comprehensive archive analytics
  static async fetchArchiveAnalytics(): Promise<ArchiveAnalytics | null> {
    try {
      // Fetch archives and stats in parallel
      const [archives, _stats] = await Promise.all([
        this.fetchArchives({ limit: 1000 }), // Get more data for analytics
        this.fetchArchiveStats(),
      ]);

      if (!archives.length) {
        return null;
      }

      // Process analytics
      const analytics: ArchiveAnalytics = {
        totalArchives: archives.length,
        archivesByType: {},
        archivesBySeverity: {},
        archivesByStatus: {},
        archivesByMonth: [],
        archivesByLocation: [],
        recentArchives: archives.slice(0, 10),
        averageArchiveTime: 0,
        storageMetrics: {
          totalSize: 0,
          avgSizePerArchive: 0,
          oldestArchive: '',
          newestArchive: '',
        },
      };

      // Process archives by type
      const typeMap = new Map<string, number>();
      const severityMap = new Map<string, number>();
      const statusMap = new Map<string, number>();
      const monthMap = new Map<string, number>();
      const locationMap = new Map<string, number>();

      archives.forEach(archive => {
        // By type
        const type = archive.Archive_Type || 'unknown';
        typeMap.set(type, (typeMap.get(type) || 0) + 1);

        // By severity
        const severity = archive.Archive_Severity || 'unknown';
        severityMap.set(severity, (severityMap.get(severity) || 0) + 1);

        // By status
        const status = archive.Archive_Status || 'unknown';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);

        // By month
        const date = new Date(archive.Archive_DateTime);
        const monthKey = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        });
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);

        // By location (from search text or metadata)
        const location = this.extractLocationFromArchive(archive);
        if (location) {
          locationMap.set(location, (locationMap.get(location) || 0) + 1);
        }
      });

      // Convert maps to objects/arrays
      analytics.archivesByType = Object.fromEntries(typeMap);
      analytics.archivesBySeverity = Object.fromEntries(severityMap);
      analytics.archivesByStatus = Object.fromEntries(statusMap);

      analytics.archivesByMonth = Array.from(monthMap.entries())
        .map(([month, count]) => ({ month, count }))
        .sort(
          (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime(),
        );

      analytics.archivesByLocation = Array.from(locationMap.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 locations

      // Calculate storage metrics
      if (archives.length > 0) {
        const dates = archives.map(a => new Date(a.Archive_DateTime));
        analytics.storageMetrics.oldestArchive = new Date(
          Math.min(...dates.map(d => d.getTime())),
        ).toISOString();
        analytics.storageMetrics.newestArchive = new Date(
          Math.max(...dates.map(d => d.getTime())),
        ).toISOString();

        // Estimate storage size (rough calculation)
        const estimatedSizePerArchive = 2048; // 2KB average
        analytics.storageMetrics.totalSize =
          archives.length * estimatedSizePerArchive;
        analytics.storageMetrics.avgSizePerArchive = estimatedSizePerArchive;
      }

      return analytics;
    } catch (error) {
      console.error('Error fetching archive analytics:', error);
      return null;
    }
  }

  // Helper to extract location from archive data
  private static extractLocationFromArchive(
    archive: ArchiveData,
  ): string | null {
    try {
      // Try to extract from search text
      if (archive.Archive_SearchText) {
        const searchText = archive.Archive_SearchText.toLowerCase();
        const locations = [
          'rosebank',
          'sandton',
          'midrand',
          'centurion',
          'pretoria',
          'soweto',
          'randburg',
          'boksburg',
          'vereeniging',
          'alberton',
          'hatfield',
        ];

        for (const location of locations) {
          if (searchText.includes(location)) {
            return location.charAt(0).toUpperCase() + location.slice(1);
          }
        }
      }

      // Try to extract from metadata
      if (
        archive.Archive_Metadata &&
        typeof archive.Archive_Metadata === 'object'
      ) {
        const metadata = archive.Archive_Metadata;
        if (metadata.location) {return metadata.location;}
        if (metadata.camera_district) {return metadata.camera_district;}
      }

      return 'Unknown Location';
    } catch (error) {
      return 'Unknown Location';
    }
  }

  // Get archive by ID
  static async fetchArchiveById(id: number): Promise<ArchiveData | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/archives/${id}`, {
        headers: this.getAuthHeaders(),
      });

      const archive = await this.handleResponse<ArchiveData>(response);
      return archive;
    } catch (error) {
      console.error(`Error fetching archive ${id}:`, error);
      return null;
    }
  }

  // =============================================================

  // Get incident locations endpoint
  static async fetchIncidentLocations(): Promise<LocationData[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/traffic/incidentLocations`,
        {
          headers: this.getAuthHeaders(),
        },
      );

      const locations = await this.handleResponse<LocationData[]>(response);
      return locations;
    } catch (error) {
      console.error('Error fetching incident locations:', error);
      return [];
    }
  }

  // Get critical incidents count from endpoint
  static async fetchCriticalIncidents(): Promise<CriticalIncidentsData | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/traffic/criticalIncidents`,
        {
          headers: this.getAuthHeaders(),
        },
      );

      const criticalData = await this.handleResponse<CriticalIncidentsData>(
        response,
      );
      return criticalData;
    } catch (error) {
      console.error('Error fetching critical incidents:', error);
      return null;
    }
  }

  // Get incident categories from endpoint
  static async fetchIncidentCategories(): Promise<CategoryData | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/traffic/incidentCategory`, {
        headers: this.getAuthHeaders(),
      });

      const categoryData = await this.handleResponse<CategoryData>(response);
      return categoryData;
    } catch (error) {
      console.error('Error fetching incident categories:', error);
      return null;
    }
  }

  // Get full traffic incidents (if needed)
  static async fetchTrafficIncidents(): Promise<TrafficIncident[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/traffic/incidents`, {
        headers: this.getAuthHeaders(),
      });

      const trafficData = await this.handleResponse<TrafficIncident[]>(
        response,
      );
      return trafficData;
    } catch (error) {
      console.error('Error fetching traffic incidents:', error);
      return [];
    }
  }

  // Authentication check
  static isAuthenticated(): boolean {
    const apiKey = sessionStorage.getItem('apiKey');
    return !!apiKey && apiKey.length > 0;
  }

  // Get current user info
  static getCurrentUser(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Health check
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Login function (we may already have this elsewhere)
  static async login(email: string, password: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          User_Email: email,
          User_Password: password,
        }),
      });

      const result = await this.handleResponse<any>(response);

      // Store authentication data
      if (result.apiKey) {
        localStorage.setItem('apiKey', result.apiKey);
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout function
  static logout(): void {
<<<<<<< HEAD
    localStorage.removeItem('apiKey');
    localStorage.removeItem('user');
=======
    sessionStorage.removeItem('apiKey');
    sessionStorage.removeItem('user');
  }

  static async fetchPEMSDashboardSummary(): Promise<any | null> {
    const cacheKey = 'pems-dashboard-summary';

    // Check cache first
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/pems/dashboard-summary`, {
        headers: this.getAuthHeaders(),
      });

      const pemsData = await this.handleResponse<any>(response);

      // Cache for 5 minutes
      if (pemsData) {
        cacheService.set(cacheKey, pemsData, 5 * 60 * 1000);
      }

      return pemsData;
    } catch (error) {
      console.error('Error fetching PEMS dashboard summary:', error);
      return null;
    }
  }

  // Get high-risk areas across all districts
  static async fetchPEMSHighRiskAreas(): Promise<any | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/pems/high-risk-areas`, {
        headers: this.getAuthHeaders(),
      });

      const highRiskData = await this.handleResponse<any>(response);
      return highRiskData;
    } catch (error) {
      console.error('Error fetching PEMS high-risk areas:', error);
      return null;
    }
  }

  // Get PEMS alerts for analytics
  static async fetchPEMSAlerts(priority?: string): Promise<any | null> {
    try {
      const queryParams = priority ? `?priority=${priority}` : '';
      const response = await fetch(
        `${API_BASE_URL}/pems/alerts${queryParams}`,
        {
          headers: this.getAuthHeaders(),
        },
      );

      const alertsData = await this.handleResponse<any>(response);
      return alertsData;
    } catch (error) {
      console.error('Error fetching PEMS alerts:', error);
      return null;
    }
  }

  // Get PEMS data for specific district (for detailed analytics)
  static async fetchPEMSDistrictData(district: number): Promise<any | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/pems/district/${district}`,
        {
          headers: this.getAuthHeaders(),
        },
      );

      const districtData = await this.handleResponse<any>(response);
      return districtData;
    } catch (error) {
      console.error(`Error fetching PEMS district ${district} data:`, error);
      return null;
    }
>>>>>>> Dev
  }

  // Public API methods (no authentication required)
  static async fetchPublicPEMSBasicData(): Promise<any | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/pems/public/basic`);
      const basicData = await this.handleResponse<any>(response);
      return basicData;
    } catch (error) {
      console.error('Error fetching public PEMS basic data:', error);
      return null;
    }
  }

  static async fetchPublicTrafficVolumeTrends(): Promise<any | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/pems/public/volume-trends`);
      const trendsData = await this.handleResponse<any>(response);
      return trendsData;
    } catch (error) {
      console.error('Error fetching public traffic volume trends:', error);
      return null;
    }
  }

  // Real-time CHP traffic incidents
  static async fetchRealTimeTrafficIncidents(): Promise<any | null> {
    try {
      // Proxy through our backend to avoid CORS issues
      const response = await fetch(`${API_BASE_URL}/traffic/real-time-incidents`);
      const incidentData = await this.handleResponse<any>(response);
      return incidentData;
    } catch (error) {
      console.error('Error fetching real-time traffic incidents:', error);
      return null;
    }
  }

  // Real Orange County PEMS data with caching
  static async fetchOrangeCountyTrafficData(): Promise<any | null> {
    const cacheKey = 'orange-county-traffic';

    // Check cache first
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/traffic/orange-county`);
      const ocData = await this.handleResponse<any>(response);

      // Cache for 2 minutes (traffic data changes frequently)
      if (ocData) {
        cacheService.set(cacheKey, ocData, 2 * 60 * 1000);
      }

      return ocData;
    } catch (error) {
      console.error('Error fetching Orange County traffic data:', error);
      return null;
    }
  }

  // Weekly traffic volume trends (Monday-Sunday) - supports both public and authenticated
  static async fetchWeeklyTrafficTrends(isAuthenticated = false, district?: number): Promise<any | null> {
    try {
      if (isAuthenticated) {
        const url = district
          ? `${API_BASE_URL}/pems/weekly-trends?district=${district}`
          : `${API_BASE_URL}/pems/weekly-trends`;
        const headers = this.getAuthHeaders();
        const response = await fetch(url, { headers });
        const weeklyData = await this.handleResponse<any>(response);
        return weeklyData;
      } else {
        // For public users, try to get real weekly data from our backend
        const response = await fetch(`${API_BASE_URL}/pems/public/weekly-trends`);
        const weeklyData = await this.handleResponse<any>(response);
        return weeklyData;
      }
    } catch (error) {
      console.error('Error fetching weekly traffic trends:', error);
      return null;
    }
  }

  // Enhanced PEMS data with role-based filtering
  static async fetchPEMSAnalyticsData(userRole: string, districts?: number[]): Promise<any | null> {
    try {
      const queryParams = new URLSearchParams();
      if (userRole) {
        queryParams.append('role', userRole);
      }
      if (districts && districts.length > 0) {
        queryParams.append('districts', districts.join(','));
      }

      const response = await fetch(
        `${API_BASE_URL}/pems/analytics?${queryParams.toString()}`,
        { headers: this.getAuthHeaders() },
      );

      const analyticsData = await this.handleResponse<any>(response);
      return analyticsData;
    } catch (error) {
      console.error('Error fetching role-based PEMS analytics:', error);
      return null;
    }
  }

  // Get district-specific volume data with day-of-week breakdown
  static async fetchDistrictVolumeByDay(district: number): Promise<any | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/pems/district/${district}/volume-by-day`,
        { headers: this.getAuthHeaders() },
      );

      const volumeData = await this.handleResponse<any>(response);
      return volumeData;
    } catch (error) {
      console.error(`Error fetching district ${district} volume by day:`, error);
      return null;
    }
  }

  // Check user permissions and available districts
  static async fetchUserPermissions(): Promise<any | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/permissions`,
        { headers: this.getAuthHeaders() },
      );

      const permissions = await this.handleResponse<any>(response);
      return permissions;
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      return null;
    }
  }

  // Get cameras with their latest traffic counts (public access)
  static async fetchCamerasWithTrafficCounts(): Promise<any[] | null> {
    try {
      // Use the public endpoint for traffic data
      const url = `${API_BASE_URL}/cameras/public/traffic-data`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`❌ Public API request failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const result = await this.handleResponse<{data: any[]}>(response);

      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching public cameras with traffic counts:', error);
      return null;
    }
  }

  // Get top 5 cameras by traffic count (public access)
  static async fetchTopCamerasByTraffic(): Promise<any[] | null> {
    try {
      // Use the public endpoint for top cameras by traffic
      const url = `${API_BASE_URL}/cameras/public/top-by-traffic`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`❌ Public API request failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const result = await this.handleResponse<{data: any[]}>(response);

      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching top cameras by traffic:', error);
      return null;
    }
  }
}

export default ApiService;
