import { Platform } from 'react-native';

// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? Platform.select({
        ios: 'http://localhost:5001/api/mobile',
        android: 'http://10.0.2.2:5001/api/mobile',
        default: 'http://localhost:5001/api/mobile'
      })
    : 'https://your-production-api.com/api/mobile',
  TIMEOUT: 30000, // 30 seconds
  API_KEY: '', // Add API key here if needed
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

export const APP_INFO = {
  NAME: 'Traffic Guardian',
  VERSION: '1.0.0',
  BUILD_NUMBER: '1',
  DESCRIPTION: 'Mobile Safety Companion for Traffic Monitoring',
  SUPPORT_EMAIL: 'support@trafficguardian.com',
  PRIVACY_POLICY_URL: 'https://trafficguardian.com/privacy',
  TERMS_OF_SERVICE_URL: 'https://trafficguardian.com/terms',
};

export const USER_ROLES = {
  CITIZEN: 'citizen',
  FIELD_RESPONDER: 'field_responder',
  ADMIN: 'admin',
} as const;

export const PERMISSIONS = {
  VIEW_PUBLIC_DATA: 'view_public_data',
  REPORT_INCIDENTS: 'report_incidents',
  VIEW_INCIDENTS: 'view_incidents',
  UPDATE_INCIDENTS: 'update_incidents',
  VIEW_ALL_INCIDENTS: 'view_all_incidents',
  MANAGE_INCIDENTS: 'manage_incidents',
  CREATE_REPORTS: 'create_reports',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_USERS: 'manage_users',
} as const;

export const INCIDENT_TYPES = {
  ACCIDENT: 'accident',
  BREAKDOWN: 'breakdown',
  ROADWORK: 'roadwork',
  DEBRIS: 'debris',
  WEATHER: 'weather',
  CONGESTION: 'congestion',
  EMERGENCY: 'emergency',
  OTHER: 'other',
} as const;

export const INCIDENT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const INCIDENT_STATUS = {
  REPORTED: 'reported',
  ACTIVE: 'active',
  RESPONDING: 'responding',
  MONITORING: 'monitoring',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export const TRAFFIC_IMPACT = {
  MINIMAL: 'minimal',
  MODERATE: 'moderate',
  SEVERE: 'severe',
  BLOCKED: 'blocked',
} as const;

export const EMERGENCY_SERVICES = {
  AMBULANCE: 'ambulance',
  POLICE: 'police',
  FIRE: 'fire',
  TRAFFIC_POLICE: 'traffic_police',
  TOW_TRUCK: 'tow_truck',
  MAINTENANCE: 'maintenance',
} as const;

// Location Settings
export const LOCATION_CONFIG = {
  DEFAULT_RADIUS: 10, // km
  MAX_RADIUS: 50, // km
  MIN_ACCURACY: 100, // meters
  UPDATE_INTERVAL: 30000, // 30 seconds
  HIGH_ACCURACY: true,
  TIMEOUT: 15000, // 15 seconds
  MAXIMUM_AGE: 60000, // 1 minute
};

// Map Settings
export const MAP_CONFIG = {
  DEFAULT_ZOOM: 15,
  MIN_ZOOM: 10,
  MAX_ZOOM: 20,
  DEFAULT_REGION: {
    latitude: -26.2041, // Johannesburg
    longitude: 28.0473,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  MARKER_TYPES: {
    USER: 'user',
    INCIDENT: 'incident',
    RESPONDER: 'responder',
    CAMERA: 'camera',
    EMERGENCY: 'emergency',
  },
};

export const NOTIFICATION_TYPES = {
  INCIDENT_REPORTED: 'incident_reported',
  INCIDENT_ASSIGNED: 'incident_assigned',
  INCIDENT_UPDATED: 'incident_updated',
  INCIDENT_RESOLVED: 'incident_resolved',
  EMERGENCY_ALERT: 'emergency_alert',
  TRAFFIC_ALERT: 'traffic_alert',
  WEATHER_ALERT: 'weather_alert',
  SYSTEM_UPDATE: 'system_update',
} as const;

