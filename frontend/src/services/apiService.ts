// Frontend API Service for Analytics
const API_BASE_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000/api';

export interface DatabaseIncident {
  Incident_ID: number;
  Incident_Date: string;
  Incident_Location: string;
  Incident_CarID?: number;
  Incident_Severity: string;
  Incident_Status: string;
  Incident_Reporter?: number;
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
    const apiKey = localStorage.getItem('apiKey');
    return {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey || '',
    };
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Get database incidents
  static async fetchIncidents(): Promise<DatabaseIncident[]> {
    try {
      console.log('Fetching database incidents...');
      const response = await fetch(`${API_BASE_URL}/incidents`, {
        headers: this.getAuthHeaders(),
      });
      
      const incidents = await this.handleResponse<DatabaseIncident[]>(response);
      console.log(`Fetched ${incidents.length} database incidents`);
      return incidents;
    } catch (error) {
      console.error('Error fetching incidents:', error);
      return [];
    }
  }

  // Get today's incidents
  static async fetchTodaysIncidents(): Promise<TodaysIncidentsData | null> {
    try {
      console.log('Fetching today\'s incidents...');
      const response = await fetch(`${API_BASE_URL}/incidents/today`, {
        headers: this.getAuthHeaders(),
      });
      
      const todaysData = await this.handleResponse<TodaysIncidentsData>(response);
      console.log(`Fetched ${todaysData.count} incidents for today`);
      return todaysData;
    } catch (error) {
      console.error('Error fetching today\'s incidents:', error);
      return null;
    }
  }

  // Get incident statistics
  static async fetchIncidentStats(): Promise<IncidentStats | null> {
    try {
      console.log('Fetching incident statistics...');
      const response = await fetch(`${API_BASE_URL}/incidents/stats`, {
        headers: this.getAuthHeaders(),
      });
      
      const stats = await this.handleResponse<IncidentStats>(response);
      console.log('Fetched incident statistics:', stats);
      return stats;
    } catch (error) {
      console.error('Error fetching incident stats:', error);
      return null;
    }
  }

  // ==================== ARCHIVE ANALYTICS METHODS ====================

  // Get all archives with filtering
  static async fetchArchives(filters: {
    type?: string;
    severity?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ArchiveData[]> {
    try {
      console.log('Fetching archives...');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const url = `${API_BASE_URL}/archives${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      
      const archives = await this.handleResponse<ArchiveData[]>(response);
      console.log(`Fetched ${archives.length} archives`);
      return archives;
    } catch (error) {
      console.error('Error fetching archives:', error);
      return [];
    }
  }

  // Get archive statistics
  static async fetchArchiveStats(): Promise<ArchiveStats[]> {
    try {
      console.log('Fetching archive statistics...');
      const response = await fetch(`${API_BASE_URL}/archives/stats`, {
        headers: this.getAuthHeaders(),
      });
      
      const stats = await this.handleResponse<ArchiveStats[]>(response);
      console.log(`Fetched archive stats for ${stats.length} categories`);
      return stats;
    } catch (error) {
      console.error('Error fetching archive stats:', error);
      return [];
    }
  }

  // Get comprehensive archive analytics
  static async fetchArchiveAnalytics(): Promise<ArchiveAnalytics | null> {
    try {
      console.log('Fetching comprehensive archive analytics...');
      
      // Fetch archives and stats in parallel
      const [archives, stats] = await Promise.all([
        this.fetchArchives({ limit: 1000 }), // Get more data for analytics
        this.fetchArchiveStats()
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
          newestArchive: ''
        }
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
        const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
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
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      analytics.archivesByLocation = Array.from(locationMap.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 locations

      // Calculate storage metrics
      if (archives.length > 0) {
        const dates = archives.map(a => new Date(a.Archive_DateTime));
        analytics.storageMetrics.oldestArchive = new Date(Math.min(...dates.map(d => d.getTime()))).toISOString();
        analytics.storageMetrics.newestArchive = new Date(Math.max(...dates.map(d => d.getTime()))).toISOString();
        
        // Estimate storage size (rough calculation)
        const estimatedSizePerArchive = 2048; // 2KB average
        analytics.storageMetrics.totalSize = archives.length * estimatedSizePerArchive;
        analytics.storageMetrics.avgSizePerArchive = estimatedSizePerArchive;
      }

      console.log('Processed archive analytics:', analytics);
      return analytics;

    } catch (error) {
      console.error('Error fetching archive analytics:', error);
      return null;
    }
  }

  // Helper to extract location from archive data
  private static extractLocationFromArchive(archive: ArchiveData): string | null {
    try {
      // Try to extract from search text
      if (archive.Archive_SearchText) {
        const searchText = archive.Archive_SearchText.toLowerCase();
        const locations = ['rosebank', 'sandton', 'midrand', 'centurion', 'pretoria', 'soweto', 
                          'randburg', 'boksburg', 'vereeniging', 'alberton', 'hatfield'];
        
        for (const location of locations) {
          if (searchText.includes(location)) {
            return location.charAt(0).toUpperCase() + location.slice(1);
          }
        }
      }

      // Try to extract from metadata
      if (archive.Archive_Metadata && typeof archive.Archive_Metadata === 'object') {
        const metadata = archive.Archive_Metadata;
        if (metadata.location) return metadata.location;
        if (metadata.camera_district) return metadata.camera_district;
      }

      return 'Unknown Location';
    } catch (error) {
      return 'Unknown Location';
    }
  }

  // Get archive by ID
  static async fetchArchiveById(id: number): Promise<ArchiveData | null> {
    try {
      console.log(`Fetching archive ${id}...`);
      const response = await fetch(`${API_BASE_URL}/archives/${id}`, {
        headers: this.getAuthHeaders(),
      });
      
      const archive = await this.handleResponse<ArchiveData>(response);
      console.log(`Fetched archive ${id}`);
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
      console.log('Fetching incident locations...');
      const response = await fetch(`${API_BASE_URL}/traffic/incidentLocations`, {
        headers: this.getAuthHeaders(),
      });
      
      const locations = await this.handleResponse<LocationData[]>(response);
      console.log(`Fetched locations data for ${locations.length} locations`);
      return locations;
    } catch (error) {
      console.error('Error fetching incident locations:', error);
      return [];
    }
  }

  // Get critical incidents count from endpoint
  static async fetchCriticalIncidents(): Promise<CriticalIncidentsData | null> {
    try {
      console.log('Fetching critical incidents...');
      const response = await fetch(`${API_BASE_URL}/traffic/criticalIncidents`, {
        headers: this.getAuthHeaders(),
      });
      
      const criticalData = await this.handleResponse<CriticalIncidentsData>(response);
      console.log(`Fetched critical incidents: ${criticalData.Amount}`);
      return criticalData;
    } catch (error) {
      console.error('Error fetching critical incidents:', error);
      return null;
    }
  }

  // Get incident categories from endpoint
  static async fetchIncidentCategories(): Promise<CategoryData | null> {
    try {
      console.log('Fetching incident categories...');
      const response = await fetch(`${API_BASE_URL}/traffic/incidentCategory`, {
        headers: this.getAuthHeaders(),
      });
      
      const categoryData = await this.handleResponse<CategoryData>(response);
      console.log(`Fetched ${categoryData.categories.length} categories`);
      return categoryData;
    } catch (error) {
      console.error('Error fetching incident categories:', error);
      return null;
    }
  }

  // Get full traffic incidents (if needed)
  static async fetchTrafficIncidents(): Promise<TrafficIncident[]> {
    try {
      console.log('Fetching traffic incidents...');
      const response = await fetch(`${API_BASE_URL}/traffic/incidents`, {
        headers: this.getAuthHeaders(),
      });
      
      const trafficData = await this.handleResponse<TrafficIncident[]>(response);
      console.log(`Fetched traffic data for ${trafficData.length} locations`);
      return trafficData;
    } catch (error) {
      console.error('Error fetching traffic incidents:', error);
      return [];
    }
  }

  // Authentication check
  static isAuthenticated(): boolean {
    const apiKey = localStorage.getItem('apiKey');
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
    localStorage.removeItem('apiKey');
    localStorage.removeItem('user');
  }
}

export default ApiService;