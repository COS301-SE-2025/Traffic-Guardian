import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export enum UserRole {
  PUBLIC = 'public',
  VIEWER = 'viewer',
  ANALYST = 'analyst',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum Permission {
  VIEW_BASIC_TRAFFIC = 'view_basic_traffic',
  VIEW_LIVE_FEED = 'view_live_feed',
  VIEW_PEMS_DATA = 'view_pems_data',
  VIEW_DETAILED_ANALYTICS = 'view_detailed_analytics',
  VIEW_HISTORICAL_DATA = 'view_historical_data',
  VIEW_DISTRICT_SPECIFIC = 'view_district_specific',
  MANAGE_INCIDENTS = 'manage_incidents',
  EXPORT_DATA = 'export_data',
  ADMIN_ACCESS = 'admin_access'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  districts?: number[];
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: UserRole;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  canAccessDistrict: (district: number) => boolean;
  login: (apiKey: string, userData: any) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const getRolePermissions = (role: UserRole): Permission[] => {
  switch (role) {
    case UserRole.PUBLIC:
      return [
        Permission.VIEW_BASIC_TRAFFIC,
        Permission.VIEW_LIVE_FEED,
      ];
    case UserRole.VIEWER:
      return [
        Permission.VIEW_BASIC_TRAFFIC,
        Permission.VIEW_LIVE_FEED,
        Permission.VIEW_PEMS_DATA,
      ];
    case UserRole.ANALYST:
      return [
        Permission.VIEW_BASIC_TRAFFIC,
        Permission.VIEW_LIVE_FEED,
        Permission.VIEW_PEMS_DATA,
        Permission.VIEW_DETAILED_ANALYTICS,
        Permission.VIEW_HISTORICAL_DATA,
        Permission.VIEW_DISTRICT_SPECIFIC,
        Permission.EXPORT_DATA,
      ];
    case UserRole.ADMIN:
      return [
        Permission.VIEW_BASIC_TRAFFIC,
        Permission.VIEW_LIVE_FEED,
        Permission.VIEW_PEMS_DATA,
        Permission.VIEW_DETAILED_ANALYTICS,
        Permission.VIEW_HISTORICAL_DATA,
        Permission.VIEW_DISTRICT_SPECIFIC,
        Permission.MANAGE_INCIDENTS,
        Permission.EXPORT_DATA,
      ];
    case UserRole.SUPER_ADMIN:
      return Object.values(Permission);
    default:
      return [Permission.VIEW_BASIC_TRAFFIC];
  }
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeUser = () => {
      const apiKey = sessionStorage.getItem('apiKey');
      const userData = sessionStorage.getItem('user');

      if (apiKey && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          const userRole = parsedUser.role || UserRole.VIEWER;
          const permissions = getRolePermissions(userRole);

          const fullUser: User = {
            id: parsedUser.id || parsedUser.User_ID || 'unknown',
            email: parsedUser.email || parsedUser.User_Email || '',
            name: parsedUser.name || parsedUser.User_Name || 'User',
            role: userRole,
            permissions,
            districts: parsedUser.districts || [],
          };

          setUser(fullUser);
        } catch (error) {
          console.error('Error parsing user data:', error);
          // Clear invalid session data
          sessionStorage.removeItem('apiKey');
          sessionStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    initializeUser();
  }, []);

  const login = (apiKey: string, userData: any) => {
    sessionStorage.setItem('apiKey', apiKey);
    sessionStorage.setItem('user', JSON.stringify(userData));

    const userRole = userData.role || UserRole.VIEWER;
    const permissions = getRolePermissions(userRole);

    const fullUser: User = {
      id: userData.id || userData.User_ID || 'unknown',
      email: userData.email || userData.User_Email || '',
      name: userData.name || userData.User_Name || 'User',
      role: userRole,
      permissions,
      districts: userData.districts || [],
    };

    setUser(fullUser);
  };

  const logout = () => {
    sessionStorage.removeItem('apiKey');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) {
      // Public users have basic permissions
      const publicPermissions = getRolePermissions(UserRole.PUBLIC);
      return publicPermissions.includes(permission);
    }
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const canAccessDistrict = (district: number): boolean => {
    if (!user) {
      return false;
    }
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
      return true;
    }
    return user.districts?.includes(district) ?? false;
  };

  const userRole = user?.role || UserRole.PUBLIC;
  const isAuthenticated = !!user;

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        userRole,
        hasPermission,
        hasAnyPermission,
        canAccessDistrict,
        login,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;