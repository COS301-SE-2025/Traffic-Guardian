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

export const TIME_FRAMES = {
  TODAY: 'today',
  WEEK: '7d',
  MONTH: '30d',
  QUARTER: '90d',
  YEAR: '365d',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@traffic_guardian_token',
  REFRESH_TOKEN: '@traffic_guardian_refresh_token',
  USER_DATA: '@traffic_guardian_user',
  SETTINGS: '@traffic_guardian_settings',
  THEME: '@traffic_guardian_theme',
  LOCATION_PERMISSION: '@traffic_guardian_location_permission',
  NOTIFICATION_PERMISSION: '@traffic_guardian_notification_permission',
  ONBOARDING_COMPLETED: '@traffic_guardian_onboarding',
  LAST_LOCATION: '@traffic_guardian_last_location',
  CACHE_PREFIX: '@traffic_guardian_cache_',
} as const;

export const NETWORK_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  SLOW: 'slow',
} as const;

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
  MODAL: 250,
  LOADING: 1000,
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  LOCATION_PERMISSION_DENIED: 'Location permission is required for this feature.',
  CAMERA_PERMISSION_DENIED: 'Camera permission is required to take photos.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
} as const;

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  REGISTRATION_SUCCESS: 'Account created successfully!',
  INCIDENT_REPORTED: 'Incident reported successfully!',
  INCIDENT_UPDATED: 'Incident updated successfully!',
  LOCATION_SHARED: 'Location shared successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
  LOGOUT_SUCCESS: 'Logged out successfully!',
} as const;

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[0-9\s-()]{10,}$/,
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
  DESCRIPTION_MAX_LENGTH: 500,
  COORDINATE_PRECISION: 6,
} as const;

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/mov'],
  MAX_IMAGES_PER_INCIDENT: 5,
  IMAGE_QUALITY: 0.8,
  IMAGE_MAX_WIDTH: 1920,
  IMAGE_MAX_HEIGHT: 1080,
} as const;

export const FEATURES = {
  DARK_MODE: true,
  PUSH_NOTIFICATIONS: true,
  LOCATION_TRACKING: true,
  OFFLINE_MODE: true,
  ANALYTICS: true,
  CAMERA_INTEGRATION: true,
  MAPS_INTEGRATION: true,
  EMERGENCY_FEATURES: true,
  VOICE_NOTES: false, // Future feature
  VIDEO_CALLS: false, // Future feature
} as const;

export const PERFORMANCE = {
  IMAGE_CACHE_SIZE: 100, // Number of images to cache
  API_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  LOCATION_UPDATE_DISTANCE: 100, // meters
  BATTERY_OPTIMIZATION: true,
  REDUCE_ANIMATIONS: false,
} as const;

// Emergency Contact Numbers (South Africa)
export const EMERGENCY_NUMBERS = {
  POLICE: '10111',
  AMBULANCE: '10177',
  FIRE: '10177',
  TRAFFIC_POLICE: '10111',
  GENERAL_EMERGENCY: '112',
} as const;

// Common Locations (South Africa - Gauteng)
export const COMMON_LOCATIONS = [
  {
    name: 'Johannesburg CBD',
    coordinates: { latitude: -26.2041, longitude: 28.0473 },
    type: 'city_center',
  },
  {
    name: 'Sandton',
    coordinates: { latitude: -26.1076, longitude: 28.0567 },
    type: 'business_district',
  },
  {
    name: 'Pretoria CBD',
    coordinates: { latitude: -25.7479, longitude: 28.2293 },
    type: 'city_center',
  },
  {
    name: 'OR Tambo Airport',
    coordinates: { latitude: -26.1367, longitude: 28.2411 },
    type: 'airport',
  },
  {
    name: 'Centurion',
    coordinates: { latitude: -25.8601, longitude: 28.1883 },
    type: 'suburb',
  },
] as const;

// App URLs
export const APP_URLS = {
  PLAYSTORE: 'https://play.google.com/store/apps/details?id=com.trafficguardian.mobile',
  APPSTORE: 'https://apps.apple.com/app/traffic-guardian/id123456789',
  WEBSITE: 'https://trafficguardian.com',
  SUPPORT: 'https://support.trafficguardian.com',
  FEEDBACK: 'https://trafficguardian.com/feedback',
} as const;

// Development Settings
export const DEV_SETTINGS = {
  ENABLE_FLIPPER: __DEV__,
  ENABLE_CONSOLE_LOGS: __DEV__,
  ENABLE_NETWORK_LOGGING: __DEV__,
  MOCK_LOCATION: __DEV__,
  SKIP_ONBOARDING: __DEV__,
  ENABLE_DEV_MENU: __DEV__,
} as const;

// Export all as default for easy importing
export default {
  API_CONFIG,
  APP_INFO,
  USER_ROLES,
  PERMISSIONS,
  INCIDENT_TYPES,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  TRAFFIC_IMPACT,
  EMERGENCY_SERVICES,
  LOCATION_CONFIG,
  MAP_CONFIG,
  NOTIFICATION_TYPES,
  TIME_FRAMES,
  STORAGE_KEYS,
  NETWORK_STATUS,
  THEMES,
  ANIMATION_DURATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION,
  FILE_UPLOAD,
  FEATURES,
  PERFORMANCE,
  EMERGENCY_NUMBERS,
  COMMON_LOCATIONS,
  APP_URLS,
  DEV_SETTINGS,
};