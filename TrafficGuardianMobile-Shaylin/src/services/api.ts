import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../utils/constants';

interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  private axiosInstance: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add auth token if available
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Add API key if configured
        if (API_CONFIG.API_KEY) {
          config.headers['X-API-Key'] = API_CONFIG.API_KEY;
        }

        // Log request in development
        if (__DEV__) {
          console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response in development
        if (__DEV__) {
          console.log(`API Response: ${response.status} ${response.config.url}`);
        }

        // Return the data directly for successful responses
        return response.data;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle token expiration (401)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            const refreshToken = await AsyncStorage.getItem('@traffic_guardian_refresh_token');
            if (refreshToken) {
              const response = await this.post('/auth/refresh', { refreshToken });
              const { token } = response;
              
              if (token) {
                this.setAuthToken(token);
                await AsyncStorage.setItem('@traffic_guardian_token', token);
                
                // Retry original request
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.axiosInstance(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearAuthToken();
            await AsyncStorage.multiRemove([
              '@traffic_guardian_token',
              '@traffic_guardian_user',
              '@traffic_guardian_refresh_token'
            ]);
            
            console.log('Token refresh failed, user needs to re-authenticate');
          }
        }

        // Handle network errors
        if (!error.response) {
          const networkError = new Error('Network error. Please check your connection.');
          return Promise.reject(networkError);
        }

        // Handle server errors
        const errorMessage = error.response.data?.error || 
                           error.response.data?.message || 
                           error.message || 
                           'An unexpected error occurred';

        const apiError = new Error(errorMessage);
        (apiError as any).status = error.response.status;
        (apiError as any).response = error.response;

        console.error('API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response.status,
          message: errorMessage,
        });

        return Promise.reject(apiError);
      }
    );
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.get(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.post(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.put(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.patch(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.delete(url, config);
  }

  async login(email: string, password: string) {
    return this.post('/auth/login', { email, password });
  }

  async register(userData: any) {
    return this.post('/auth/register', userData);
  }

  async logout() {
    return this.post('/auth/logout');
  }

  async refreshToken() {
    return this.post('/auth/refresh');
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  async getNearbyIncidents(latitude: number, longitude: number, radius?: number) {
    return this.get('/incidents/nearby', {
      params: { latitude, longitude, radius }
    });
  }

  async reportIncident(incidentData: any) {
    return this.post('/incidents/report', incidentData);
  }

  async getIncident(id: number) {
    return this.get(`/incidents/${id}`);
  }

  async updateIncident(id: number, updateData: any) {
    return this.put(`/incidents/${id}`, updateData);
  }

  async getUserReports() {
    return this.get('/incidents/user/reports');
  }

  async getAssignedIncidents() {
    return this.get('/incidents/responder/assigned');
  }

  async getPublicAnalytics(timeframe?: string, area?: string) {
    return this.get('/analytics/public', {
      params: { timeframe, area }
    });
  }

  async getPersonalAnalytics(timeframe?: string) {
    return this.get('/analytics/personal', {
      params: { timeframe }
    });
  }

  async getRouteAnalytics(origin: string, destination: string) {
    return this.get('/analytics/routes', {
      params: { origin, destination }
    });
  }

  async getSafetyScore(latitude: number, longitude: number, radius?: number) {
    return this.get('/analytics/safety-score', {
      params: { latitude, longitude, radius }
    });
  }

  async getResponderAnalytics(timeframe?: string) {
    return this.get('/analytics/responder', {
      params: { timeframe }
    });
  }

  