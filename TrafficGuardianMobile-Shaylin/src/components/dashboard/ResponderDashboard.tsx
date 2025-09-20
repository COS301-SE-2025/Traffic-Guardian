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

  