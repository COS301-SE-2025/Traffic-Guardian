import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
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
import { INCIDENT_STATUS, INCIDENT_SEVERITY } from '../../utils/constants';

interface Incident {
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
  trafficImpact: string;
  emergencyServices: string[];
  reportedBy: {
    userId: number;
    name: string;
    type: string;
  };
  assignedTo?: {
    userId: number;
    name: string;
    estimatedArrival?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const IncidentList: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, hasPermission } = useAuth();
  const { currentLocation } = useLocation();
  const { showNotification } = useNotification();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loadingMore, setLoadingMore] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: INCIDENT_STATUS.REPORTED, label: 'Reported' },
    { value: INCIDENT_STATUS.ACTIVE, label: 'Active' },
    { value: INCIDENT_STATUS.RESPONDING, label: 'Responding' },
    { value: INCIDENT_STATUS.MONITORING, label: 'Monitoring' },
    { value: INCIDENT_STATUS.RESOLVED, label: 'Resolved' },
  ];

  const loadIncidents = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);

      let incidentsResponse;
      
      if (hasPermission('view_all_incidents')) {
        incidentsResponse = await apiService.get('/incidents');
      } else if (hasPermission('update_incidents')) {
        incidentsResponse = await apiService.getAssignedIncidents();
      } else if (currentLocation) {
        incidentsResponse = await apiService.getNearbyIncidents(
          currentLocation.latitude,
          currentLocation.longitude,
          25 // 25km radius
        );
      } else {
        incidentsResponse = { incidents: [] };
      }

      let allIncidents = incidentsResponse?.incidents || [];

      if (selectedStatus !== 'all') {
        allIncidents = allIncidents.filter((incident: Incident) => 
          incident.status === selectedStatus
        );
      }

      allIncidents.sort((a: Incident, b: Incident) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority; // Lower priority number = higher priority
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setIncidents(allIncidents);

    } catch (error) {
      console.error('Load incidents error:', error);
      showNotification('Failed to load incidents', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStatus, hasPermission, currentLocation, showNotification]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadIncidents(false);
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
  };

  const handleIncidentPress = (incident: Incident) => {
    navigation.navigate('IncidentDetails', { incidentId: incident.id });
  };

  const handleQuickAction = async (incident: Incident, action: string) => {
    try {
      let updateData: any = {};
      let successMessage = '';

      switch (action) {
        case 'accept':
          updateData = { status: INCIDENT_STATUS.ACTIVE };
          successMessage = 'Incident accepted';
          break;
        case 'respond':
          updateData = { status: INCIDENT_STATUS.RESPONDING };
          successMessage = 'Marked as responding';
          break;
        case 'resolve':
          updateData = { status: INCIDENT_STATUS.RESOLVED };
          successMessage = 'Incident resolved';
          break;
        default:
          return;
      }

      Alert.alert(
        'Confirm Action',
        `${action.charAt(0).toUpperCase() + action.slice(1)} this incident?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                await apiService.updateIncident(incident.id, updateData);
                showNotification(successMessage, 'success');
                loadIncidents(false);
              } catch (error) {
                console.error('Update incident error:', error);
                showNotification('Failed to update incident', 'error');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Quick action error:', error);
      showNotification('Action failed', 'error');
    }
  };

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case 'accident': return 'car-sport';
      case 'breakdown': return 'construct';
      case 'roadwork': return 'hammer';
      case 'debris': return 'warning';
      case 'weather': return 'rainy';
      case 'congestion': return 'car-multiple';
      case 'emergency': return 'medical';
      default: return 'alert-circle';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return colors.severity.critical;
      case 'high': return colors.severity.high;
      case 'medium': return colors.severity.medium;
      case 'low': return colors.severity.low;
      default: return colors.text.secondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case INCIDENT_STATUS.REPORTED: return colors.secondary.main;
      case INCIDENT_STATUS.ACTIVE: return colors.warning;
      case INCIDENT_STATUS.RESPONDING: return colors.primary.main;
      case INCIDENT_STATUS.MONITORING: return colors.success;
      case INCIDENT_STATUS.RESOLVED: return colors.text.secondary;
      default: return colors.text.secondary;
    }
  };

  const getPriorityBadge = (priority: number) => {
    const priorityConfig = {
      1: { label: 'HIGH', color: colors.error },
      2: { label: 'MED', color: colors.warning },
      3: { label: 'LOW', color: colors.success },
    };
    return priorityConfig[priority as keyof typeof priorityConfig] || 
           { label: 'UNK', color: colors.text.secondary };
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const incidentTime = new Date(dateString);
    const diffMs = now.getTime() - incidentTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const renderIncidentCard = ({ item: incident }: { item: Incident }) => {
    const severityColor = getSeverityColor(incident.severity);
    const statusColor = getStatusColor(incident.status);
    const priorityConfig = getPriorityBadge(incident.priority);
    const canUpdate = hasPermission('update_incidents');

    