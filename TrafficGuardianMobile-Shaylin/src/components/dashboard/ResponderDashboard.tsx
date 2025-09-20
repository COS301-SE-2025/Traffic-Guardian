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

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case 'accident': return 'car-sport';
      case 'breakdown': return 'construct';
      case 'roadwork': return 'hammer';
      case 'debris': return 'warning';
      case 'weather': return 'rainy';
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

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return colors.error;
    if (priority === 2) return colors.warning;
    return colors.success;
  };

  const renderIncidentCard = ({ item: incident }: { item: AssignedIncident }) => (
    <View style={[
      styles.incidentCard,
      { borderLeftColor: getSeverityColor(incident.severity) }
    ]}>
      <View style={styles.incidentHeader}>
        <View style={styles.incidentTypeContainer}>
          <Ionicons
            name={getIncidentIcon(incident.type)}
            size={20}
            color={getSeverityColor(incident.severity)}
          />
          <Text style={styles.incidentType}>
            {incident.type.toUpperCase()}
          </Text>
          <View style={[
            styles.priorityBadge,
            { backgroundColor: getPriorityColor(incident.priority) }
          ]}>
            <Text style={styles.priorityText}>P{incident.priority}</Text>
          </View>
        </View>
        <Text style={styles.incidentTime}>
          {new Date(incident.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <Text style={styles.incidentDescription} numberOfLines={2}>
        {incident.description}
      </Text>

      <View style={styles.incidentLocation}>
        <Ionicons name="location" size={14} color={colors.text.secondary} />
        <Text style={styles.locationText} numberOfLines={1}>
          {incident.location.address}
        </Text>
      </View>

      <View style={styles.incidentMetadata}>
        <View style={styles.metadataItem}>
          <Text style={styles.metadataLabel}>Status:</Text>
          <Text style={styles.metadataValue}>{incident.status}</Text>
        </View>
        <View style={styles.metadataItem}>
          <Text style={styles.metadataLabel}>Impact:</Text>
          <Text style={styles.metadataValue}>{incident.trafficImpact}</Text>
        </View>
        {incident.affectedLanes > 0 && (
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Lanes:</Text>
            <Text style={styles.metadataValue}>{incident.affectedLanes} affected</Text>
          </View>
        )}
      </View>

      <View style={styles.incidentActions}>
        {incident.status === INCIDENT_STATUS.REPORTED && (
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleIncidentAction(incident, 'Accept')}
          >
            <Text style={styles.actionButtonText}>Accept</Text>
          </TouchableOpacity>
        )}
        
        {incident.status === INCIDENT_STATUS.ACTIVE && (
          <TouchableOpacity
            style={[styles.actionButton, styles.routeButton]}
            onPress={() => handleIncidentAction(incident, 'En Route')}
          >
            <Text style={styles.actionButtonText}>En Route</Text>
          </TouchableOpacity>
        )}
        
        {incident.status === INCIDENT_STATUS.RESPONDING && (
          <TouchableOpacity
            style={[styles.actionButton, styles.sceneButton]}
            onPress={() => handleIncidentAction(incident, 'On Scene')}
          >
            <Text style={styles.actionButtonText}>On Scene</Text>
          </TouchableOpacity>
        )}
        
        {incident.status === INCIDENT_STATUS.MONITORING && (
          <TouchableOpacity
            style={[styles.actionButton, styles.resolveButton]}
            onPress={() => handleIncidentAction(incident, 'Resolve')}
          >
            <Text style={styles.actionButtonText}>Resolve</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.detailsButton]}
          onPress={() => {/* Navigate to incident details */}}
        >
          <Ionicons name="eye" size={16} color={colors.primary.main} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={globalStyles.loadingContainer}>
        <LoadingSpinner size="large" text="Loading responder dashboard..." />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary.main]}
          tintColor={colors.primary.main}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            Field Responder Dashboard
          </Text>
          <Text style={styles.userInfo}>
            {user?.name} • {user?.role.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.dutyToggle,
            isOnDuty ? styles.onDuty : styles.offDuty
          ]}
          onPress={toggleDutyStatus}
        >
          <Ionicons 
            name={isOnDuty ? "radio-button-on" : "radio-button-off"} 
            size={20} 
            color={isOnDuty ? colors.success : colors.text.secondary} 
          />
          <Text style={[
            styles.dutyText,
            { color: isOnDuty ? colors.success : colors.text.secondary }
          ]}>
            {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
          </Text>
        </TouchableOpacity>
      </View>

      {analytics && (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Performance (30 days)</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Incidents Handled"
              value={analytics.incidentsHandled.toString()}
              icon="checkmark-circle"
              color={colors.success}
              size="medium"
            />
            <StatCard
              title="Avg Response"
              value={`${analytics.avgResponseTime}m`}
              icon="time"
              color={colors.warning}
              size="medium"
            />
            <StatCard
              title="Success Rate"
              value={`${analytics.successRate}%`}
              icon="trending-up"
              color={colors.primary.main}
              size="medium"
            />
            <StatCard
              title="Rating"
              value={analytics.performanceMetrics.rating.toFixed(1)}
              icon="star"
              color={colors.secondary.main}
              size="medium"
            />
          </View>
        </View>
      )}

      <View style={styles.incidentsContainer}>
        <Text style={styles.sectionTitle}>
          Assigned Incidents ({assignedIncidents.length})
        </Text>
        
        {assignedIncidents.length === 0 ? (
          <View style={styles.noIncidentsContainer}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.noIncidentsText}>
              No incidents assigned
            </Text>
            <Text style={styles.noIncidentsSubtext}>
              You're all caught up!
            </Text>
          </View>
        ) : (
          <FlatList
            data={assignedIncidents}
            renderItem={renderIncidentCard}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        )}
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="map" size={24} color={colors.primary.main} />
            <Text style={styles.quickActionText}>View Map</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="call" size={24} color={colors.error} />
            <Text style={styles.quickActionText}>Emergency</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="document-text" size={24} color={colors.secondary.main} />
            <Text style={styles.quickActionText}>Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="settings" size={24} color={colors.warning} />
            <Text style={styles.quickActionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  welcomeText: {
    ...typography.h3,
    color: colors.text.primary,
  },
  userInfo: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 4,
  },
  dutyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  onDuty: {
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  offDuty: {
    borderColor: colors.text.secondary,
    backgroundColor: colors.surface.light,
  },
  dutyText: {
    ...typography.caption,
    fontWeight: '600',
    marginLeft: 6,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: 16,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  incidentsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  noIncidentsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.surface.light,
    borderRadius: 12,
    ...globalStyles.shadow,
  },
  noIncidentsText: {
    ...typography.h4,
    color: colors.success,
    marginTop: 16,
  },
  noIncidentsSubtext: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 8,
  },
  incidentCard: {
    backgroundColor: colors.surface.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    ...globalStyles.shadow,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  incidentType: {
    ...typography.label,
    color: colors.text.primary,
    marginLeft: 8,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    ...typography.caption,
    color: colors.text.light,
    fontWeight: '600',
    fontSize: 10,
  },
  incidentTime: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  incidentDescription: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: 8,
  },
  incidentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: 4,
    flex: 1,
  },
  incidentMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  metadataItem: {
    flex: 1,
  },
  metadataLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 10,
  },
  metadataValue: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  incidentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  routeButton: {
    backgroundColor: colors.warning,
  },
  sceneButton: {
    backgroundColor: colors.secondary.main,
  },
  resolveButton: {
    backgroundColor: colors.primary.main,
  },
  detailsButton: {
    backgroundColor: colors.surface.light,
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  actionButtonText: {
    ...typography.buttonSmall,
    color: colors.text.light,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: colors.surface.light,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    ...globalStyles.shadow,
  },
  quickActionText: {
    ...typography.label,
    color: colors.text.primary,
    marginTop: 8,
  },
});

export default ResponderDashboard;