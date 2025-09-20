import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/auth';
import { useLocation } from '../../services/location';
import { useNotification } from '../../services/notifications';
import { apiService } from '../../services/api';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { globalStyles } from '../../styles/globalStyles';
import LoadingSpinner from '../common/LoadingSpinner';
import StatCard from '../common/StatCard';
import { INCIDENT_STATUS, INCIDENT_SEVERITY } from '../../utils/constants';

interface AssignedIncident {
  id: number;
  type: string;
  severity: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  description: string;
  status: string;
  priority: number;
  estimatedClearanceTime: string;
  affectedLanes: number;
  trafficImpact: string;
  emergencyServices: string[];
  assignedTo: {
    userId: number;
    name: string;
    estimatedArrival: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ResponderAnalytics {
  incidentsHandled: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  successRate: number;
  incidentTypes: {
    accidents: number;
    breakdowns: number;
    debris: number;
    weather: number;
  };
  performanceMetrics: {
    rating: number;
    commendations: number;
    efficiency: number;
  };
}

const ResponderDashboard: React.FC = () => {
  const { user } = useAuth();
  const { currentLocation, updateLocation } = useLocation();
  const { showNotification } = useNotification();

  const [assignedIncidents, setAssignedIncidents] = useState<AssignedIncident[]>([]);
  const [analytics, setAnalytics] = useState<ResponderAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadDashboardData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);

      const promises = [
        apiService.getAssignedIncidents().catch(error => {
          console.error('Failed to fetch assigned incidents:', error);
          return { incidents: [] };
        }),
        apiService.getResponderAnalytics('30d').catch(error => {
          console.error('Failed to fetch responder analytics:', error);
          return null;
        }),
      ];

      const [incidentsResponse, analyticsResponse] = await Promise.all(promises);

      setAssignedIncidents(incidentsResponse?.incidents || []);
      setAnalytics(analyticsResponse);
      setLastUpdate(new Date());

    } catch (error) {
      console.error('Dashboard load error:', error);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    let locationInterval: NodeJS.Timeout;
    
    if (isOnDuty && currentLocation) {
      locationInterval = setInterval(() => {
        updateLocation();
      }, 30000);
    }

    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, [isOnDuty, currentLocation, updateLocation]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData(false);
  };

  const toggleDutyStatus = async () => {
    try {
      const newStatus = !isOnDuty;
      setIsOnDuty(newStatus);
      
      if (newStatus && currentLocation) {
        await apiService.updateLocation(
          currentLocation.latitude,
          currentLocation.longitude,
          undefined,
          undefined,
          undefined
        );
      }

      showNotification(
        `You are now ${newStatus ? 'on duty' : 'off duty'}`,
        'success'
      );
    } catch (error) {
      console.error('Duty status update error:', error);
      showNotification('Failed to update duty status', 'error');
      setIsOnDuty(!isOnDuty); 
    }
  };

  const handleIncidentAction = (incident: AssignedIncident, action: string) => {
    Alert.alert(
      'Incident Action',
      `${action} incident: ${incident.description}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              let updateData: any = {};
              
              switch (action) {
                case 'Accept':
                  updateData = { status: INCIDENT_STATUS.ACTIVE };
                  break;
                case 'En Route':
                  updateData = { 
                    status: INCIDENT_STATUS.RESPONDING,
                    estimatedArrival: '10 minutes'
                  };
                  break;
                case 'On Scene':
                  updateData = { status: INCIDENT_STATUS.MONITORING };
                  break;
                case 'Resolve':
                  updateData = { status: INCIDENT_STATUS.RESOLVED };
                  break;
              }

              await apiService.updateIncident(incident.id, updateData);
              await loadDashboardData(false);
              showNotification(`Incident ${action.toLowerCase()}ed successfully`, 'success');
            } catch (error) {
              console.error('Incident action error:', error);
              showNotification(`Failed to ${action.toLowerCase()} incident`, 'error');
            }
          }
        }
      ]
    );
  };

  