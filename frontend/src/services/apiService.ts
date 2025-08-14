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

