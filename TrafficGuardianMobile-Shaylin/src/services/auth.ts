import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: 'citizen' | 'field_responder' | 'admin';
  permissions: string[];
  isVerified: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'citizen' | 'field_responder';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TOKEN: '@traffic_guardian_token',
  USER: '@traffic_guardian_user',
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored authentication data on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Set up token in API service when token changes
  useEffect(() => {
    if (token) {
      apiService.setAuthToken(token);
    } else {
      apiService.clearAuthToken();
    }
  }, [token]);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
      ]);

      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        
        // Verify token is still valid
        try {
          await apiService.get('/auth/me');
        } catch (error) {
          // Token invalid, clear auth data
          await clearStoredAuth();
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      await clearStoredAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const storeAuthData = async (token: string, user: User) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
      ]);
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw new Error('Failed to store authentication data');
    }
  };

  const clearStoredAuth = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
      ]);
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      const response = await apiService.post('/auth/login', {
        email: email.toLowerCase().trim(),
        password,
      });

      const { user: userData, token: authToken } = response;

      if (!userData || !authToken) {
        throw new Error('Invalid response from server');
      }

      // Store auth data
      await storeAuthData(authToken, userData);
      
      // Update state
      setToken(authToken);
      setUser(userData);

    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.error || error.message || 'Login failed';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    try {
      setIsLoading(true);

      // Validate data
      if (!data.email || !data.password || !data.name || !data.phone) {
        throw new Error('All fields are required');
      }

      const response = await apiService.post('/auth/register', {
        ...data,
        email: data.email.toLowerCase().trim(),
        name: data.name.trim(),
        phone: data.phone.trim(),
      });

      const { user: userData, token: authToken } = response;

      if (!userData || !authToken) {
        throw new Error('Invalid response from server');
      }

      // Store auth data
      await storeAuthData(authToken, userData);
      
      // Update state
      setToken(authToken);
      setUser(userData);

    } catch (error: any) {
      console.error('Registration error:', error);
      const message = error.response?.data?.error || error.message || 'Registration failed';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  