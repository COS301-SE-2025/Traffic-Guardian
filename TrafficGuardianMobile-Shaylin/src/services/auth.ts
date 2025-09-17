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

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Call logout endpoint if token exists
      if (token) {
        try {
          await apiService.post('/auth/logout');
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed:', error);
        }
      }

      // Clear stored data
      await clearStoredAuth();

    } catch (error) {
      console.error('Logout error:', error);
      // Force clear auth state even if there's an error
      await clearStoredAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      if (!token) {
        throw new Error('No token to refresh');
      }

      const response = await apiService.post('/auth/refresh');
      const { token: newToken } = response;

      if (!newToken) {
        throw new Error('Invalid refresh response');
      }

      // Update stored token
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
      setToken(newToken);

    } catch (error: any) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout user
      await logout();
      throw new Error('Session expired. Please login again.');
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const isRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const contextValue: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    hasPermission,
    isRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth utilities
export const authUtils = {
  // Check if user has any of the specified permissions
  hasAnyPermission: (user: User | null, permissions: string[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.some(permission => user.permissions.includes(permission));
  },

  // Check if user has all of the specified permissions
  hasAllPermissions: (user: User | null, permissions: string[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.every(permission => user.permissions.includes(permission));
  },

  // Check if user can access emergency features
  canAccessEmergencyFeatures: (user: User | null): boolean => {
    if (!user) return false;
    return ['admin', 'field_responder'].includes(user.role);
  },

  // Check if user can manage incidents
  canManageIncidents: (user: User | null): boolean => {
    if (!user) return false;
    return user.permissions.includes('update_incidents') || user.role === 'admin';
  },

  // Check if user can report incidents
  canReportIncidents: (user: User | null): boolean => {
    if (!user) return false;
    return user.permissions.includes('report_incidents');
  },

  // Check if user can view analytics
  canViewAnalytics: (user: User | null): boolean => {
    if (!user) return false;
    return user.permissions.includes('view_analytics') || user.permissions.includes('view_public_data');
  },

  // Get user display name
  getDisplayName: (user: User | null): string => {
    if (!user) return 'Guest';
    return user.name || user.email.split('@')[0];
  },

  // Get role display name
  getRoleDisplayName: (role: string): string => {
    const roleNames = {
      citizen: 'Citizen',
      field_responder: 'Field Responder',
      admin: 'Administrator',
    };
    return roleNames[role as keyof typeof roleNames] || role;
  },

  // Check if user account is verified
  isVerified: (user: User | null): boolean => {
    return user?.isVerified === true;
  },

  // Get user initials for avatar
  getUserInitials: (user: User | null): string => {
    if (!user || !user.name) return '?';
    return user.name
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  },
};