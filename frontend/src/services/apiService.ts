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

