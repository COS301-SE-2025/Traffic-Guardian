// src/contexts/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import io, { Socket } from 'socket.io-client';

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

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  realtimeAlerts: RealTimeAlert[];
  unreadAlertCount: number;
  acknowledgeAlert: (alertId: string) => void;
  clearAllAlerts: () => void;
  markAllAsRead: () => void;
  addNewIncident?: (incident: any) => void;
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeAlerts, setRealtimeAlerts] = useState<RealTimeAlert[]>([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  // Function to play notification sound
  const playNotificationSound = (severity: string) => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
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
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
      
      oscillator.start();
      oscillator.stop(context.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  // Function to show browser notification
  const showBrowserNotification = (incident: ApiIncident) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const location = incident.Incidents_Latitude && incident.Incidents_Longitude
        ? `Lat: ${incident.Incidents_Latitude}, Lng: ${incident.Incidents_Longitude}`
        : 'Location not specified';

      const severity = incident.Incident_Severity.toUpperCase();
      
      const notification = new Notification(`${severity} Traffic Incident`, {
        body: `ID: ${incident.Incidents_ID}\n${location}\nReporter: ${incident.Incident_Reporter || 'Unknown'}`,
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
    if (!apiKey) return;

    // Request notification permission when component mounts
    requestNotificationPermission();

    // Create socket connection
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const newSocket = io(API_BASE_URL, {
      auth: {
        token: apiKey
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      console.log('Connected to real-time alerts');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      toast.warn('Disconnected from real-time alerts', {
        position: 'bottom-right',
        autoClose: 3000,
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      console.log("failed to connect real-time alerts, trying to reconnect...");
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
        acknowledged: false
      };

      // Add to alerts list (keep last 20)
      setRealtimeAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
      setUnreadAlertCount(prev => prev + 1);

      const location = incidentData.Incidents_Latitude && incidentData.Incidents_Longitude
        ? `Lat: ${incidentData.Incidents_Latitude}, Lng: ${incidentData.Incidents_Longitude}`
        : 'Location not specified';

      const currentPage = window.location.pathname;
      const severity = incidentData.Incident_Severity.toUpperCase();
      
      // Professional toast notification
      toast.error(
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '16px',
            color: 'white'
          }}>
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
            <div style={{ 
              fontSize: '11px', 
              opacity: 0.6, 
              fontStyle: 'italic',
              marginTop: '4px',
              padding: '4px 8px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '4px'
            }}>
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
            backgroundColor: incidentData.Incident_Severity === 'high' ? '#dc2626' : 
                           incidentData.Incident_Severity === 'medium' ? '#ea580c' : '#059669',
            color: 'white',
            cursor: currentPage !== '/incidents' ? 'pointer' : 'default',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            fontFamily: 'inherit',
          }
        }
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
          document.title = flashCount % 2 === 0 ? 'CRITICAL INCIDENT - Traffic Guardian' : originalTitle;
          flashCount++;
          if (flashCount >= 10) {
            clearInterval(flashInterval);
            document.title = originalTitle;
          }
        }, 500);
      }
    });

    // Other socket event handlers
    newSocket.on('weatherUpdate', (data) => {
      console.log('Weather update received:', data);
    });

    newSocket.on('trafficUpdate', (data) => {
      console.log('Traffic update received:', data);
    });

    newSocket.on('criticalIncidents', (data) => {
      console.log('Critical incidents update:', data);
    });

    newSocket.on('incidentCategory', (data) => {
      console.log('Incident category update:', data);
    });

    newSocket.on('incidentLocations', (data) => {
      console.log('Incident locations update:', data);
    });

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket connection');
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = (alertId: string) => {
    setRealtimeAlerts(prev => 
      prev.map((alert: RealTimeAlert) => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
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
      prev.map((alert: RealTimeAlert) => ({ ...alert, acknowledged: true }))
    );
    setUnreadAlertCount(0);
  };

  
  const addNewIncident = (incident: any) => {
    console.log('New incident added locally:', incident);
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    realtimeAlerts,
    unreadAlertCount,
    acknowledgeAlert,
    clearAllAlerts,
    markAllAsRead,
    addNewIncident,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};