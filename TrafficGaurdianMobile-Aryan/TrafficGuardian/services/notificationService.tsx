import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform, Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useLocation } from './location';
import { useSession } from './sessionContext';
import { calculateDistance } from './distanceCalculator';

interface NotificationContextType {
  expoPushToken: string | null;
  sendLocalNotification: (title: string, body: string, data?: any) => Promise<void>;
  scheduleIncidentAlert: (incident: any) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  notificationPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

interface NotificationSettings {
  nearbyIncidents: boolean;
  emergencyAlerts: boolean;
  trafficUpdates: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  radiusKm: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Configure how notifications are handled when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    nearbyIncidents: true,
    emergencyAlerts: true,
    trafficUpdates: false,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "07:00",
    },
    radiusKm: 10,
  });

  const { coords } = useLocation();
  const { user } = useSession();

  useEffect(() => {
    registerForPushNotificationsAsync();
    loadNotificationSettings();
  }, []);

  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      handleNotificationTap(response.notification.request.content.data);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  const loadNotificationSettings = async () => {
    try {
      // load from AsyncStorage or user preferences
      // const stored = await AsyncStorage.getItem('notificationSettings');
      // if (stored) {
      //   setSettings(JSON.parse(stored));
      // }
    } catch (error) {
      console.log('Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async (newSettings: NotificationSettings) => {
    try {
      setSettings(newSettings);
      // save to AsyncStorage or sync with server
      // await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.log('Error saving notification settings:', error);
    }
  };

  const registerForPushNotificationsAsync = async () => {
    let token: string | null = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('traffic-incidents', {
        name: 'Traffic Incidents',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF5722',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('emergency-alerts', {
        name: 'Emergency Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#F44336',
        sound: 'default',
        bypassDnd: true,
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notification Permission',
          'Enable notifications to receive traffic alerts and emergency notifications.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Notifications.openSettingsAsync() },
          ]
        );
        setNotificationPermission(false);
        return;
      }

      setNotificationPermission(true);
      
      try {
        token = (await Notifications.getExpoPushTokenAsync()).data;
        setExpoPushToken(token);
      } catch (error) {
        console.log('Error getting push token:', error);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  };

  const requestPermission = async (): Promise<boolean> => {
    const result = await registerForPushNotificationsAsync();
    return !!result;
  };

  const isQuietHours = (): boolean => {
    if (!settings.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = settings.quietHours.start;
    const end = settings.quietHours.end;
    
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }
    
    // Handle same day quiet hours (e.g., 13:00 to 15:00)
    return currentTime >= start && currentTime <= end;
  };

  const sendLocalNotification = async (title: string, body: string, data: any = {}) => {
    if (!notificationPermission) return;
    
    // Check quiet hours for non-emergency notifications
    if (!data.isEmergency && isQuietHours()) return;

    try {
      const channelId = data.isEmergency ? 'emergency-alerts' : 'traffic-incidents';
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: settings.soundEnabled ? 'default' : undefined,
          vibrate: settings.vibrationEnabled ? [0, 250, 250, 250] : undefined,
        },
        trigger: null, // Send immediately
        identifier: data.id || `notification_${Date.now()}`,
      });
    } catch (error) {
      console.log('Error sending notification:', error);
    }
  };

  const scheduleIncidentAlert = async (incident: any) => {
    if (!coords || !settings.nearbyIncidents) return;

    try {
      // Calculate distance to incident
      const incidentCoords = incident.geometry?.coordinates?.[0];
      if (!incidentCoords) return;

      const distance = parseFloat(
        calculateDistance(incidentCoords, [coords.latitude, coords.longitude])
          .replace(/[^\d.]/g, '')
      );

      // Only notify if within radius
      if (distance > settings.radiusKm) return;

      const severity = incident.properties?.magnitudeOfDelay || 0;
      const isEmergency = severity >= 3;
      const category = incident.properties?.iconCategory || 'Traffic Incident';

      let title = '';
      let body = '';

      if (isEmergency) {
        title = '🚨 Emergency Traffic Alert';
        body = `Critical ${category.toLowerCase()} detected ${distance.toFixed(1)}km away. Avoid the area if possible.`;
      } else {
        title = '⚠️ Traffic Alert';
        body = `${category} reported ${distance.toFixed(1)}km from your location.`;
      }

      await sendLocalNotification(title, body, {
        type: 'incident',
        incidentId: incident.id || Date.now().toString(),
        severity: severity >= 3 ? 'high' : severity >= 2 ? 'medium' : 'low',
        distance: distance,
        location: incident.properties?.location || 'Unknown',
        isEmergency,
        coordinates: incidentCoords,
      });

      // For critical incidents, also send a follow up notification with route suggestions
      if (isEmergency) {
        setTimeout(async () => {
          await sendLocalNotification(
            '🛣️ Route Suggestion',
            'Tap to view alternative routes avoiding the incident area.',
            {
              type: 'route_suggestion',
              incidentId: incident.id || Date.now().toString(),
              isEmergency: true,
            }
          );
        }, 30000); // 30 seconds later
      }
    } catch (error) {
      console.log('Error scheduling incident alert:', error);
    }
  };

  const handleNotificationTap = (data: any) => {
    console.log('Notification tapped with data:', data);
    
    switch (data.type) {
      case 'incident':
        // Navigate to incident details or map view
        // router.push(`/incident/${data.incidentId}`);
        break;
      case 'route_suggestion':
        // Navigate to route planning
        // router.push('/route-planning');
        break;
      case 'emergency':
        // Navigate to emergency contacts or relevant screen
        // router.push('/emergency');
        break;
      default:
        // Navigate to home screen
        // router.push('/');
        break;
    }
  };

  const clearAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.log('Error clearing notifications:', error);
    }
  };

  // Simulate receiving traffic updates (this needs to come from our backend)
  const simulateTrafficUpdate = async () => {
    if (!coords || !settings.trafficUpdates) return;

    const updates = [
      {
        title: '🚦 Traffic Update',
        body: 'Heavy traffic reported on M1 Highway. Expected delays of 15-20 minutes.',
        data: { type: 'traffic_update', severity: 'medium' }
      },
      {
        title: '✅ Traffic Cleared',
        body: 'Incident on N1 North has been cleared. Traffic flowing normally.',
        data: { type: 'traffic_cleared', severity: 'low' }
      },
    ];

    const randomUpdate = updates[Math.floor(Math.random() * updates.length)];
    await sendLocalNotification(randomUpdate.title, randomUpdate.body, randomUpdate.data);
  };

  // Weather related notifications
  const sendWeatherAlert = async (weatherData: any) => {
    if (!settings.nearbyIncidents) return;

    const alerts = weatherData.alerts || [];
    for (const alert of alerts) {
      await sendLocalNotification(
        `🌧️ Weather Alert - ${alert.type.toUpperCase()}`,
        alert.message,
        {
          type: 'weather',
          severity: alert.severity,
          isEmergency: alert.severity === 'high',
        }
      );
    }
  };

  // Emergency broadcast simulation
  const sendEmergencyBroadcast = async (message: string) => {
    if (!settings.emergencyAlerts) return;

    await sendLocalNotification(
      '🚨 EMERGENCY BROADCAST',
      message,
      {
        type: 'emergency',
        isEmergency: true,
        timestamp: Date.now(),
      }
    );

    // For emergency broadcasts, also vibrate the device
    if (settings.vibrationEnabled && Platform.OS === 'ios') {
      // On iOS, we can trigger haptic feedback
      // Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        sendLocalNotification,
        scheduleIncidentAlert,
        clearAllNotifications,
        notificationPermission,
        requestPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Utility functions for notification management
export const NotificationUtils = {
  // Format notification for different incident types
  formatIncidentNotification: (incident: any, distance: number) => {
    const category = incident.properties?.iconCategory || 'Traffic Incident';
    const severity = incident.properties?.magnitudeOfDelay || 0;
    
    let emoji = '⚠️';
    let urgency = '';
    
    if (severity >= 3) {
      emoji = '🚨';
      urgency = 'URGENT - ';
    } else if (category.toLowerCase().includes('accident')) {
      emoji = '🚗';
    } else if (category.toLowerCase().includes('construction')) {
      emoji = '🚧';
    } else if (category.toLowerCase().includes('weather')) {
      emoji = '🌧️';
    }

    return {
      title: `${emoji} ${urgency}Traffic Alert`,
      body: `${category} reported ${distance.toFixed(1)}km from your location.`,
    };
  },

  // Schedule daily traffic summary
  scheduleDailySummary: async (hour: number = 8) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Daily Traffic Summary',
        body: 'Tap to view today\'s traffic conditions and incident reports.',
        data: { type: 'daily_summary' },
      },
      trigger: {
        hour,
        minute: 0,
        repeats: true,
      },
    });
  },

  // Create geofence based notifications (conceptual)
  createGeofenceAlert: async (latitude: number, longitude: number, radius: number, message: string) => {
    // This would integrate with a geofencing service
    console.log(`Geofence created at ${latitude}, ${longitude} with ${radius}m radius: ${message}`);
  },
};