import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiService } from './api';
import { STORAGE_KEYS, NOTIFICATION_TYPES } from '../utils/constants';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: any;
  categoryId?: string;
  priority?: 'default' | 'high' | 'max';
  sound?: boolean;
  vibrate?: boolean;
}

export interface NotificationBanner {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface NotificationContextType {
  // Permission state
  permissionStatus: Notifications.PermissionStatus | null;
  expoPushToken: string | null;
  
  // Notification management
  notifications: NotificationBanner[];
  
  // Methods
  requestPermissions: () => Promise<boolean>;
  schedulePushNotification: (notification: NotificationData) => Promise<string | null>;
  cancelNotification: (identifier: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  showNotification: (message: string, type?: NotificationBanner['type'], duration?: number) => void;
  hideNotification: (id: string) => void;
  registerForPushNotifications: () => Promise<string | null>;
  handleNotificationReceived: (notification: Notifications.Notification) => void;
  handleNotificationResponse: (response: Notifications.NotificationResponse) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Determine if notification should be shown based on app state and type
    const shouldShow = notification.request.content.categoryId !== 'silent';
    
    return {
      shouldShowAlert: shouldShow,
      shouldPlaySound: shouldShow,
      shouldSetBadge: true,
    };
  },
});

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationBanner[]>([]);
  const [notificationListener, setNotificationListener] = useState<Notifications.Subscription | null>(null);
  const [responseListener, setResponseListener] = useState<Notifications.Subscription | null>(null);

  useEffect(() => {
    initializeNotifications();
    setupNotificationListeners();

    return () => {
      if (notificationListener) {
        Notifications.removeNotificationSubscription(notificationListener);
      }
      if (responseListener) {
        Notifications.removeNotificationSubscription(responseListener);
      }
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      // Check permission status
      const settings = await Notifications.getPermissionsAsync();
      setPermissionStatus(settings.status);

      // Configure notification categories
      await setupNotificationCategories();

      // Get or register for push token if permission is granted
      if (settings.status === Notifications.PermissionStatus.GRANTED) {
        const token = await registerForPushNotifications();
        setExpoPushToken(token);
      }
    } catch (error) {
      console.error('Notification initialization error:', error);
    }
  };

  const setupNotificationCategories = async () => {
    try {
      await Notifications.setNotificationCategoryAsync('incident', [
        {
          identifier: 'accept',
          buttonTitle: 'Accept',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: { opensAppToForeground: false },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('emergency', [
        {
          identifier: 'respond',
          buttonTitle: 'Respond',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'call_emergency',
          buttonTitle: 'Call 911',
          options: { opensAppToForeground: true },
        },
      ]);
    } catch (error) {
      console.error('Error setting up notification categories:', error);
    }
  };

  const setupNotificationListeners = () => {
    // Listener for notifications received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(handleNotificationReceived);
    setNotificationListener(notificationListener);

    // Listener for when a user taps on a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    setResponseListener(responseListener);
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== Notifications.PermissionStatus.GRANTED) {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);

      if (finalStatus === Notifications.PermissionStatus.GRANTED) {
        // Store permission status
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_PERMISSION, 'true');
        
        // Register for push notifications
        const token = await registerForPushNotifications();
        setExpoPushToken(token);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  };

  const registerForPushNotifications = async (): Promise<string | null> => {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID, // Set this in  environment
      });

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Traffic Guardian',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#d97700',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('emergency', {
          name: 'Emergency Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#ef4444',
          sound: 'default',
        });
      }

      // Send token to server for future push notifications
      try {
        // In a real app, send this to your backend
        console.log('Expo push token:', token.data);
        // await apiService.updatePushToken(token.data);
      } catch (error) {
        console.error('Error sending push token to server:', error);
      }

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  };

  const schedulePushNotification = async (notification: NotificationData): Promise<string | null> => {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          categoryId: notification.categoryId,
          priority: notification.priority || 'default',
          sound: notification.sound !== false,
        },
        trigger: null, // Show immediately
      });

      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  const cancelNotification = async (identifier: string): Promise<void> => {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  };

  const cancelAllNotifications = async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  };

  const showNotification = (
    message: string, 
    type: NotificationBanner['type'] = 'info', 
    duration = 4000
  ): void => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const notification: NotificationBanner = {
      id,
      title: getNotificationTitle(type),
      message,
      type,
      duration,
    };

    setNotifications(prev => [...prev, notification]);

    // Auto hide notification after duration
    if (duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, duration);
    }
  };

  const hideNotification = (id: string): void => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const getNotificationTitle = (type: NotificationBanner['type']): string => {
    switch (type) {
      case 'success': return 'Success';
      case 'error': return 'Error';
      case 'warning': return 'Warning';
      case 'info': default: return 'Info';
    }
  };

  const handleNotificationReceived = (notification: Notifications.Notification): void => {
    console.log('Notification received:', notification);
    
    // Show in app notification for certain types
    const data = notification.request.content.data;
    
    if (data?.showInApp !== false) {
      showNotification(
        notification.request.content.body || 'New notification',
        data?.type || 'info'
      );
    }

    // Handle specific notification types
    switch (data?.type) {
      case NOTIFICATION_TYPES.INCIDENT_ASSIGNED:
        // Handle incident assignment
        break;
      case NOTIFICATION_TYPES.EMERGENCY_ALERT:
        // Handle emergency alert
        break;
      default:
        break;
    }
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse): void => {
    console.log('Notification response:', response);
    
    const { notification, actionIdentifier } = response;
    const data = notification.request.content.data;

    // Handle action responses
    switch (actionIdentifier) {
      case 'accept':
        // Handle incident acceptance
        if (data?.incidentId) {
          // Navigate to incident details
          console.log('Accepting incident:', data.incidentId);
        }
        break;
      
      case 'respond':
        // Handle emergency response
        if (data?.emergencyId) {
          console.log('Responding to emergency:', data.emergencyId);
        }
        break;
      
      case 'call_emergency':
        // Handle emergency call
        console.log('Calling emergency services');
        break;
      
      case Notifications.DEFAULT_ACTION_IDENTIFIER:
        // Handle default tap (opening app)
        if (data?.screen) {
          // Navigate to specific screen
          console.log('Navigating to screen:', data.screen);
        }
        break;
      
      default:
        break;
    }
  };

  const contextValue: NotificationContextType = {
    permissionStatus,
    expoPushToken,
    notifications,
    requestPermissions,
    schedulePushNotification,
    cancelNotification,
    cancelAllNotifications,
    showNotification,
    hideNotification,
    registerForPushNotifications,
    handleNotificationReceived,
    handleNotificationResponse,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

