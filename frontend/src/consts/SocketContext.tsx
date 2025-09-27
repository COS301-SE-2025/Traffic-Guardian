// src/contexts/SocketContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

// Fix Socket type to avoid TypeScript errors
type SocketType = ReturnType<typeof io>;

interface ApiIncident {
  Incidents_ID: number;
  Incidents_DateTime: string;
  Incidents_Longitude: number | null;
  Incidents_Latitude: number | null;
  Incident_Severity: 'high' | 'medium' | 'low';
  Incident_Status: 'open' | 'ongoing' | 'resolved' | 'closed';
  Incident_Reporter: string | null;
}

interface RealTimeAlert {
  id: string;
  incident: ApiIncident;
  timestamp: Date;
  acknowledged: boolean;
}

// Weather interfaces - ADDED FOR WEATHER INTEGRATION
interface WeatherCondition {
  text: string;
  icon: string;
  code: number;
}

interface CurrentWeather {
  last_updated_epoch: number;
  last_updated: string;
  temp_c: number;
  temp_f: number;
  is_day: number;
  condition: WeatherCondition;
  wind_mph: number;
  wind_kph: number;
  wind_degree: number;
  wind_dir: string;
  pressure_mb: number;
  pressure_in: number;
  precip_mm: number;
  precip_in: number;
  humidity: number;
  cloud: number;
  feelslike_c: number;
  feelslike_f: number;
  windchill_c: number;
  windchill_f: number;
  heatindex_c: number;
  heatindex_f: number;
  dewpoint_c: number;
  dewpoint_f: number;
  vis_km: number;
  vis_miles: number;
  uv: number;
  gust_mph: number;
  gust_kph: number;
}

interface WeatherLocation {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  tz_id: string;
  localtime_epoch: number;
  localtime: string;
}

interface WeatherData {
  location: WeatherLocation;
  current: CurrentWeather;
}

// Enhanced context type with weather data
interface SocketContextType {
  socket: SocketType | null;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed';
  realtimeAlerts: RealTimeAlert[];
  unreadAlertCount: number;
  acknowledgeAlert: (alertId: string) => void;
  clearAllAlerts: () => void;
  markAllAsRead: () => void;
  addNewIncident?: (incident: any) => void;
  // ADDED FOR WEATHER INTEGRATION
  weatherData: WeatherData[];
  weatherLoading: boolean;
  weatherLastUpdate: Date | null;
  // ADDED FOR ACTIVE USERS TRACKING
  activeUsersCount: number;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed'>('disconnected');
  const [realtimeAlerts, setRealtimeAlerts] = useState<RealTimeAlert[]>([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const socketRef = useRef<SocketType | null>(null);

  // ADDED FOR WEATHER INTEGRATION
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherLastUpdate, setWeatherLastUpdate] = useState<Date | null>(null);

  // ADDED FOR ACTIVE USERS TRACKING
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);

  // Function to play notification sound
  const playNotificationSound = (severity: string) => {
    try {
      const context = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      // Different frequencies for different severities
      switch (severity) {
        case 'high':
          oscillator.frequency.setValueAtTime(800, context.currentTime);
          oscillator.frequency.setValueAtTime(600, context.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(800, context.currentTime + 0.2);
          break;
        case 'medium':
          oscillator.frequency.setValueAtTime(600, context.currentTime);
          break;
        case 'low':
          oscillator.frequency.setValueAtTime(400, context.currentTime);
          break;
      }

      gainNode.gain.setValueAtTime(0.2, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        context.currentTime + 0.3,
      );

      oscillator.start();
      oscillator.stop(context.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  // Function to show browser notification
  const showBrowserNotification = (incident: ApiIncident) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const location =
        incident.Incidents_Latitude && incident.Incidents_Longitude
          ? `Lat: ${incident.Incidents_Latitude}, Lng: ${incident.Incidents_Longitude}`
          : 'Location not specified';

      const severity = incident.Incident_Severity.toUpperCase();

      const notification = new Notification(`${severity} Traffic Incident`, {
        body: `ID: ${incident.Incidents_ID}\n${location}\nReporter: ${
          incident.Incident_Reporter || 'Unknown'
        }`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `incident-${incident.Incidents_ID}`,
        requireInteraction: incident.Incident_Severity === 'high',
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = '/incidents';
        notification.close();
      };

      if (incident.Incident_Severity !== 'high') {
        setTimeout(() => notification.close(), 10000);
      }
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Browser notifications enabled', {
          position: 'bottom-right',
          autoClose: 3000,
        });
      }
    }
  };

  useEffect(() => {
    const apiKey = sessionStorage.getItem('apiKey');
    if (!apiKey) {return;}

    // Request notification permission when component mounts
    requestNotificationPermission();

    let retryCount = 0;
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second
    let reconnectTimer: NodeJS.Timeout;

    const connectSocket = () => {
      setConnectionStatus('connecting');

      // Add 2-second delay before attempting connection
      setTimeout(() => {
        // Create socket connection
        const API_BASE_URL = process.env.REACT_APP_API_URL!;
        const newSocket = io(API_BASE_URL, {
          auth: {
            token: apiKey,
          },
          transports: ['websocket', 'polling'],
          autoConnect: true,
          timeout: 20000,
          forceNew: true,
        });

      setSocket(newSocket);
      socketRef.current = newSocket;

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        setConnectionStatus('connected');
        retryCount = 0; // Reset retry count on successful connection
        console.log('Connected to real-time alerts');
        toast.success('Connected to real-time alerts', {
          position: 'bottom-right',
          autoClose: 2000,
        });
      });

      newSocket.on('disconnect', (reason: string) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');

        if (reason === 'io client disconnect') {
          // Don't retry if client initiated disconnect
          return;
        }
        toast.warn('Disconnected from real-time alerts', {
          position: 'bottom-right',
          autoClose: 3000,
        });

        // Attempt reconnection with exponential backoff
        if (retryCount < maxRetries) {
          setConnectionStatus('reconnecting');
          const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000);
          console.log(`Attempting reconnection in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

          reconnectTimer = setTimeout(() => {
            retryCount++;
            newSocket.disconnect();
            connectSocket();
          }, delay);
        } else {
          setConnectionStatus('failed');
          toast.error('Failed to maintain connection to real-time alerts. Please refresh the page.', {
            position: 'top-center',
            autoClose: false,
          });
        }
      });

      newSocket.on('connect_error', (error: any) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);

        if (retryCount < maxRetries) {
          setConnectionStatus('reconnecting');
          const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000);
          console.log(`Connection failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

          reconnectTimer = setTimeout(() => {
            retryCount++;
            connectSocket();
          }, delay);
        } else {
          setConnectionStatus('failed');
          toast.error('Unable to connect to real-time alerts. Please check your connection and refresh the page.', {
            position: 'top-center',
            autoClose: false,
          });
        }
      });

    // Welcome message handler
    newSocket.on('welcome', (message: string) => {
      console.log('Welcome message:', message);
    });

    // MAIN REAL-TIME INCIDENT ALERT HANDLER
    newSocket.on('newAlert', (incidentData: ApiIncident) => {
      console.log('NEW INCIDENT ALERT RECEIVED:', incidentData);

      // Create alert object
      const newAlert: RealTimeAlert = {
        id: `alert-${incidentData.Incidents_ID}-${Date.now()}`,
        incident: incidentData,
        timestamp: new Date(),
        acknowledged: false,
      };

      // Add to alerts list (keep last 20)
      setRealtimeAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
      setUnreadAlertCount(prev => prev + 1);

      const location =
        incidentData.Incidents_Latitude && incidentData.Incidents_Longitude
          ? `Lat: ${incidentData.Incidents_Latitude}, Lng: ${incidentData.Incidents_Longitude}`
          : 'Location not specified';

      const currentPage = window.location.pathname;
      const severity = incidentData.Incident_Severity.toUpperCase();

      // Professional toast notification
      toast.error(
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '16px',
              color: 'white',
            }}
          >
            NEW {severity} INCIDENT
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            ID: {incidentData.Incidents_ID} | {location}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            Reporter: {incidentData.Incident_Reporter || 'Unknown'}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>
            Time: {new Date().toLocaleTimeString()}
          </div>
          {currentPage !== '/incidents' && (
            <div
              style={{
                fontSize: '11px',
                opacity: 0.6,
                fontStyle: 'italic',
                marginTop: '4px',
                padding: '4px 8px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
              }}
            >
              Click to view incidents page
            </div>
          )}
        </div>,
        {
          position: 'top-right',
          autoClose: incidentData.Incident_Severity === 'high' ? false : 12000,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          onClick: () => {
            if (currentPage !== '/incidents') {
              window.location.href = '/incidents';
            }
          },
          style: {
            backgroundColor:
              incidentData.Incident_Severity === 'high'
                ? '#dc2626'
                : incidentData.Incident_Severity === 'medium'
                  ? '#ea580c'
                  : '#059669',
            color: 'white',
            cursor: currentPage !== '/incidents' ? 'pointer' : 'default',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            fontFamily: 'inherit',
          },
        },
      );

      // Play notification sound
      playNotificationSound(incidentData.Incident_Severity);

      // Show browser notification
      showBrowserNotification(incidentData);

      // Flash page title for high severity incidents
      if (incidentData.Incident_Severity === 'high') {
        const originalTitle = document.title;
        let flashCount = 0;
        const flashInterval = setInterval(() => {
          document.title =
            flashCount % 2 === 0
              ? 'CRITICAL INCIDENT - Traffic Guardian'
              : originalTitle;
          flashCount++;
          if (flashCount >= 10) {
            clearInterval(flashInterval);
            document.title = originalTitle;
          }
        }, 500);
      }
    });

    // WEATHER EVENT HANDLERS - ADDED FOR WEATHER INTEGRATION
    newSocket.on('weatherUpdate', (data: WeatherData[]) => {
      console.log('Weather update received:', data);
      setWeatherData(data);
      setWeatherLoading(false);
      setWeatherLastUpdate(new Date());
    });

    newSocket.on('weatherAlert', (weatherAlertData: any) => {
      console.log('Weather alert received:', weatherAlertData);

      // Show weather alert as toast notification
      toast.info(
        `Weather Alert: ${
          weatherAlertData.message || 'Weather conditions have changed'
        }`,
        {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        },
      );
    });

    // Other socket event handlers (unchanged)
    newSocket.on('trafficUpdate', (data: any) => {
      console.log('Traffic update received:', data);
    });

    newSocket.on('criticalIncidents', (data: any) => {
      console.log('Critical incidents update:', data);
    });

    newSocket.on('incidentCategory', (data: any) => {
      console.log('Incident category update:', data);
    });

    newSocket.on('incidentLocations', (data: any) => {
      console.log('Incident locations update:', data);
    });

    // ACTIVE USERS TRACKING EVENT HANDLER
    newSocket.on(
      'activeUsersUpdate',
      (data: { count: number; timestamp: Date }) => {
        console.log('Active users update:', data);
        setActiveUsersCount(data.count);
      },
    );

      return newSocket;
      }, 2000); // 2 second delay
    };

    // Start initial connection
    connectSocket();

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket connection');
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = (alertId: string) => {
    setRealtimeAlerts(prev =>
      prev.map((alert: RealTimeAlert) =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert,
      ),
    );
    setUnreadAlertCount(prev => Math.max(0, prev - 1));
  };

  // Clear all alerts
  const clearAllAlerts = () => {
    setRealtimeAlerts([]);
    setUnreadAlertCount(0);
  };

  // Mark all as read
  const markAllAsRead = () => {
    setRealtimeAlerts(prev =>
      prev.map((alert: RealTimeAlert) => ({ ...alert, acknowledged: true })),
    );
    setUnreadAlertCount(0);
  };

  const addNewIncident = (incident: any) => {
    console.log('New incident added locally:', incident);
  };

  // Enhanced context value with weather data and active users
  const value: SocketContextType = {
    socket,
    isConnected,
    connectionStatus,
    realtimeAlerts,
    unreadAlertCount,
    acknowledgeAlert,
    clearAllAlerts,
    markAllAsRead,
    addNewIncident,
    // ADDED FOR WEATHER INTEGRATION
    weatherData,
    weatherLoading,
    weatherLastUpdate,
    // ADDED FOR ACTIVE USERS TRACKING
    activeUsersCount,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
