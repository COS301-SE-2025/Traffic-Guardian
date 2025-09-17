import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
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
import WeatherCard from './WeatherCard';
import { INCIDENT_TYPES, TIME_FRAMES } from '../../utils/constants';

const { width } = Dimensions.get('window');

interface NearbyIncident {
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
  trafficImpact: string;
  estimatedClearanceTime: string;
  createdAt: string;
}

interface PublicAnalytics {
  timeframe: string;
  summary: {
    totalIncidents: number;
    totalAccidents: number;
    avgResponseTime: number;
    resolutionRate: number;
  };
  insights: {
    safetyTrend: string;
    busyHours: string[];
    commonLocations: string[];
  };
}

interface SafetyScore {
  safetyScore: number;
  scoreCategory: string;
  riskFactors: string[];
  recentIncidents: number;
}

const PublicDashboard: React.FC = () => {
  const { user } = useAuth();
  const { currentLocation, isLocationEnabled, requestLocationPermission } = useLocation();
  const { showNotification } = useNotification();

  const [nearbyIncidents, setNearbyIncidents] = useState<NearbyIncident[]>([]);
  const [analytics, setAnalytics] = useState<PublicAnalytics | null>(null);
  const [safetyScore, setSafetyScore] = useState<SafetyScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadDashboardData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);

      let location = currentLocation;
      if (!location && !isLocationEnabled) {
        const granted = await requestLocationPermission();
        if (!granted) {
          showNotification('Location permission required for nearby incidents', 'warning');
          return;
        }
      }

      const promises = [];

      if (location) {
        promises.push(
          apiService.getNearbyIncidents(
            location.latitude,
            location.longitude,
            10 // 10km radius
          ).catch(error => {
            console.error('Failed to fetch nearby incidents:', error);
            return { incidents: [] };
          })
        );

        promises.push(
          apiService.getSafetyScore(
            location.latitude,
            location.longitude,
            5 // 5km radius
          ).catch(error => {
            console.error('Failed to fetch safety score:', error);
            return null;
          })
        );
      } else {
        promises.push(Promise.resolve({ incidents: [] }));
        promises.push(Promise.resolve(null));
      }

      promises.push(
        apiService.getPublicAnalytics(TIME_FRAMES.WEEK).catch(error => {
          console.error('Failed to fetch analytics:', error);
          return null;
        })
      );

      const [incidentsResponse, safetyResponse, analyticsResponse] = await Promise.all(promises);

      setNearbyIncidents(incidentsResponse?.incidents || []);
      setSafetyScore(safetyResponse);
      setAnalytics(analyticsResponse);
      setLastUpdate(new Date());

    } catch (error) {
      console.error('Dashboard load error:', error);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentLocation, isLocationEnabled, requestLocationPermission, showNotification]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData(false);
  };

  const handleIncidentPress = (incident: NearbyIncident) => {
    Alert.alert(
      'Incident Details',
      `${incident.description}\n\nLocation: ${incident.location.address}\nSeverity: ${incident.severity}\nStatus: ${incident.status}`,
      [{ text: 'OK' }]
    );
  };

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case INCIDENT_TYPES.ACCIDENT:
        return 'car-sport';
      case INCIDENT_TYPES.BREAKDOWN:
        return 'construct';
      case INCIDENT_TYPES.ROADWORK:
        return 'hammer';
      case INCIDENT_TYPES.DEBRIS:
        return 'warning';
      case INCIDENT_TYPES.WEATHER:
        return 'rainy';
      default:
        return 'alert-circle';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
      case 'critical':
        return colors.severity.high;
      case 'medium':
        return colors.severity.medium;
      case 'low':
        return colors.severity.low;
      default:
        return colors.text.secondary;
    }
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 90) return colors.success;
    if (score >= 80) return colors.warning;
    return colors.error;
  };

  const formatLastUpdate = () => {
    const now = new Date();
    const diff = now.getTime() - lastUpdate.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (isLoading) {
    return (
      <View style={globalStyles.loadingContainer}>
        <LoadingSpinner size="large" text="Loading dashboard..." />
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
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </Text>
          <Text style={styles.lastUpdateText}>
            Last updated: {formatLastUpdate()}
          </Text>
        </View>
        <TouchableOpacity onPress={() => loadDashboardData()}>
          <Ionicons name="refresh" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      <WeatherCard />

      {safetyScore && (
        <View style={styles.safetyContainer}>
          <Text style={styles.sectionTitle}>Area Safety Score</Text>
          <View style={styles.safetyCard}>
            <View style={styles.safetyScoreContainer}>
              <Text 
                style={[
                  styles.safetyScoreValue,
                  { color: getSafetyScoreColor(safetyScore.safetyScore) }
                ]}
              >
                {safetyScore.safetyScore}
              </Text>
              <Text style={styles.safetyScoreLabel}>
                {safetyScore.scoreCategory.toUpperCase()}
              </Text>
            </View>
            <View style={styles.safetyInfo}>
              <Text style={styles.safetyDescription}>
                Recent incidents: {safetyScore.recentIncidents}
              </Text>
              {safetyScore.riskFactors.length > 0 && (
                <Text style={styles.riskFactors}>
                  Risk factors: {safetyScore.riskFactors.join(', ')}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {analytics && (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Traffic Statistics (7 days)</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Incidents"
              value={analytics.summary.totalIncidents.toString()}
              icon="alert-circle"
              color={colors.secondary.main}
            />
            <StatCard
              title="Accidents"
              value={analytics.summary.totalAccidents.toString()}
              icon="car-sport"
              color={colors.error}
            />
            <StatCard
              title="Avg Response"
              value={`${analytics.summary.avgResponseTime}m`}
              icon="time"
              color={colors.warning}
            />
            <StatCard
              title="Resolution Rate"
              value={`${analytics.summary.resolutionRate}%`}
              icon="checkmark-circle"
              color={colors.success}
            />
          </View>
        </View>
      )}

      <View style={styles.incidentsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Nearby Incidents ({nearbyIncidents.length})
          </Text>
          {currentLocation && (
            <Text style={styles.locationInfo}>
              Within 10km of your location
            </Text>
          )}
        </View>

        {nearbyIncidents.length === 0 ? (
          <View style={styles.noIncidentsContainer}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.noIncidentsText}>
              No incidents in your area
            </Text>
            <Text style={styles.noIncidentsSubtext}>
              Great! Roads are clear nearby
            </Text>
          </View>
        ) : (
          nearbyIncidents.map((incident, index) => (
            <TouchableOpacity
              key={incident.id}
              style={styles.incidentCard}
              onPress={() => handleIncidentPress(incident)}
            >
              <View style={styles.incidentHeader}>
                <View style={styles.incidentTypeContainer}>
                  <Ionicons
                    name={getIncidentIcon(incident.type)}
                    size={20}
                    color={getSeverityColor(incident.severity)}
                  />
                  <Text style={styles.incidentType}>
                    {incident.type.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <View 
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(incident.severity) + '20' }
                  ]}
                >
                  <Text 
                    style={[
                      styles.severityText,
                      { color: getSeverityColor(incident.severity) }
                    ]}
                  >
                    {incident.severity.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.incidentDescription} numberOfLines={2}>
                {incident.description}
              </Text>

              <View style={styles.incidentMeta}>
                <Text style={styles.incidentLocation} numberOfLines={1}>
                  <Ionicons name="location" size={14} color={colors.text.secondary} />
                  {' '}{incident.location.address}
                </Text>
                <Text style={styles.incidentTime}>
                  {new Date(incident.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              {incident.estimatedClearanceTime && (
                <View style={styles.clearanceInfo}>
                  <Ionicons name="time" size={14} color={colors.warning} />
                  <Text style={styles.clearanceText}>
                    Est. clearance: {incident.estimatedClearanceTime}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {analytics?.insights && (
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>Traffic Insights</Text>
          
          <View style={styles.insightItem}>
            <Ionicons name="trending-up" size={20} color={colors.primary.main} />
            <Text style={styles.insightText}>
              Safety trend: {analytics.insights.safetyTrend}
            </Text>
          </View>

          <View style={styles.insightItem}>
            <Ionicons name="time" size={20} color={colors.warning} />
            <Text style={styles.insightText}>
              Busy hours: {analytics.insights.busyHours.join(', ')}
            </Text>
          </View>

          <View style={styles.insightItem}>
            <Ionicons name="location" size={20} color={colors.error} />
            <Text style={styles.insightText}>
              Common incident areas: {analytics.insights.commonLocations.slice(0, 2).join(', ')}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="add-circle" size={24} color={colors.primary.main} />
            <Text style={styles.quickActionText}>Report Incident</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="map" size={24} color={colors.secondary.main} />
            <Text style={styles.quickActionText}>View Map</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="call" size={24} color={colors.error} />
            <Text style={styles.quickActionText}>Emergency</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="bar-chart" size={24} color={colors.success} />
            <Text style={styles.quickActionText}>Analytics</Text>
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
  lastUpdateText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  locationInfo: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  safetyContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  safetyCard: {
    backgroundColor: colors.surface.light,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...globalStyles.shadow,
  },
  safetyScoreContainer: {
    alignItems: 'center',
    marginRight: 20,
  },
  safetyScoreValue: {
    ...typography.statValue,
    fontSize: 36,
  },
  safetyScoreLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 4,
  },
  safetyInfo: {
    flex: 1,
  },
  safetyDescription: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: 4,
  },
  riskFactors: {
    ...typography.caption,
    color: colors.text.secondary,
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
    borderLeftColor: colors.warning,
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
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    ...typography.caption,
    fontWeight: '600',
  },
  incidentDescription: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: 8,
  },
  incidentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incidentLocation: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
    marginRight: 8,
  },
  incidentTime: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  clearanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  clearanceText: {
    ...typography.caption,
    color: colors.warning,
    marginLeft: 4,
  },
  insightsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.light,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  insightText: {
    ...typography.body,
    color: colors.text.primary,
    marginLeft: 12,
    flex: 1,
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
    width: (width - 64) / 2,
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

export default PublicDashboard;

  

      