// Frontend API Service for Analytics
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export interface DatabaseIncident {
  Incident_ID: number;
  Incident_Date: string;
  Incident_Location: string;
  Incident_CarID?: number;
  Incident_Severity: string;
  Incident_Status: string;
  Incident_Reporter?: number;
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