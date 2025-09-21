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

   return (
      <TouchableOpacity
        style={[styles.incidentCard, { borderLeftColor: severityColor }]}
        onPress={() => handleIncidentPress(incident)}
      >
        <View style={styles.incidentHeader}>
          <View style={styles.incidentTypeContainer}>
            <Ionicons
              name={getIncidentIcon(incident.type)}
              size={20}
              color={severityColor}
            />
            <Text style={styles.incidentType}>
              {incident.type.replace('_', ' ').toUpperCase()}
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.color }]}>
              <Text style={styles.priorityText}>{priorityConfig.label}</Text>
            </View>
          </View>
          
          <View style={styles.incidentMeta}>
            <Text style={styles.timeAgo}>{formatTimeAgo(incident.createdAt)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {incident.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.incidentDescription} numberOfLines={2}>
          {incident.description}
        </Text>

        <View style={styles.locationContainer}>
          <Ionicons name="location" size={14} color={colors.text.secondary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {incident.location.address}
          </Text>
        </View>

        <View style={styles.incidentDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Impact:</Text>
            <Text style={styles.detailValue}>{incident.trafficImpact}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Reported by:</Text>
            <Text style={styles.detailValue}>{incident.reportedBy.name}</Text>
          </View>

          {incident.assignedTo && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Assigned to:</Text>
              <Text style={styles.detailValue}>{incident.assignedTo.name}</Text>
            </View>
          )}
        </View>

        {incident.emergencyServices.length > 0 && (
          <View style={styles.servicesContainer}>
            <Text style={styles.servicesLabel}>Services:</Text>
            <View style={styles.servicesList}>
              {incident.emergencyServices.map((service, index) => (
                <View key={index} style={styles.serviceTag}>
                  <Text style={styles.serviceText}>
                    {service.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {canUpdate && (
          <View style={styles.quickActions}>
            {incident.status === INCIDENT_STATUS.REPORTED && (
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleQuickAction(incident, 'accept')}
              >
                <Ionicons name="checkmark" size={16} color={colors.text.light} />
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
            )}
            
            {(incident.status === INCIDENT_STATUS.ACTIVE || incident.status === INCIDENT_STATUS.REPORTED) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.respondButton]}
                onPress={() => handleQuickAction(incident, 'respond')}
              >
                <Ionicons name="car" size={16} color={colors.text.light} />
                <Text style={styles.actionButtonText}>Respond</Text>
              </TouchableOpacity>
            )}
            
            {(incident.status === INCIDENT_STATUS.RESPONDING || incident.status === INCIDENT_STATUS.MONITORING) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.resolveButton]}
                onPress={() => handleQuickAction(incident, 'resolve')}
              >
                <Ionicons name="checkmark-circle" size={16} color={colors.text.light} />
                <Text style={styles.actionButtonText}>Resolve</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={colors.text.secondary} />
      <Text style={styles.emptyTitle}>No Incidents Found</Text>
      <Text style={styles.emptySubtitle}>
        {selectedStatus === 'all' 
          ? 'No incidents in your area at the moment'
          : `No ${selectedStatus} incidents found`
        }
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={() => loadIncidents()}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={globalStyles.loadingContainer}>
        <LoadingSpinner size="large" text="Loading incidents..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={statusOptions}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === item.value && styles.filterButtonActive
              ]}
              onPress={() => handleStatusFilter(item.value)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedStatus === item.value && styles.filterButtonTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={incidents}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderIncidentCard}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={incidents.length === 0 ? styles.emptyList : styles.list}
        onEndReached={() => {
        }}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() => loadingMore ? (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={colors.primary.main} />
          </View>
        ) : null}
      />

      {hasPermission('report_incidents') && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('IncidentReporting')}
        >
          <Ionicons name="add" size={24} color={colors.text.light} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface.light,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  filterButtonText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.text.light,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  incidentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  incidentMeta: {
    alignItems: 'flex-end',
  },
  timeAgo: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  incidentDescription: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: 8,
  },
  locationContainer: {
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
  incidentDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    width: 80,
  },
  detailValue: {
    ...typography.caption,
    color: colors.text.primary,
    flex: 1,
    fontWeight: '500',
  },
  servicesContainer: {
    marginBottom: 12,
  },
  servicesLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  serviceTag: {
    backgroundColor: colors.secondary.main + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  serviceText: {
    ...typography.caption,
    color: colors.secondary.main,
    fontSize: 10,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  respondButton: {
    backgroundColor: colors.warning,
  },
  resolveButton: {
    backgroundColor: colors.primary.main,
  },
  actionButtonText: {
    ...typography.buttonSmall,
    color: colors.text.light,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    ...typography.button,
    color: colors.text.light,
  },
  loadingMore: {
    padding: 20,
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    ...globalStyles.shadow,
  },
});

export default IncidentList; 