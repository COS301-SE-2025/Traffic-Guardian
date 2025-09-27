import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View, ScrollView, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from "../services/socketProvider";
import * as Location from "expo-location";
import { useSession } from "../services/sessionContext";
import { useTheme } from "../services/themeContext";
import { globalStyles } from "../styles/globalStyles";
import { typography } from "../styles/typography";
import { useTraffic } from "../services/trafficContext";
import { EnhancedMap } from "../components/EnhancedMap";
import { WeatherIntegration } from "../components/WeatherIntegration";
import { EmergencyContacts } from "../components/EmergencyContacts";
import { AdvancedFiltering, FilterOptions } from "../components/AdvancedFiltering";
import { LoadingSpinner, ErrorState, PulseAnimation } from "../components/LoadingComponents";
import { EnhancedNavigation } from "../components/EnhancedNavigation";
import { calculateDistance } from "../services/distanceCalculator";

export default function Index() {
  const router = useRouter();
  const { socket } = useSocket();
  const { user } = useSession();
  const { currentColors, isDark } = useTheme();
  const { 
    traffic, setTraffic, 
    criticalIncidents, setCriticalIncidents,
    incidentCategory, setIncidentCategory,
    incidentLocations, setIncidentLocations
  } = useTraffic();

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [showFiltering, setShowFiltering] = useState(false);
  const [nearbyIncidents, setNearbyIncidents] = useState<any[]>([]);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    severity: [],
    incidentTypes: [],
    timeRange: '24h',
    distance: 50,
    showResolved: false,
  });

  // Get location
  useEffect(() => {
    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location access is required for full functionality.");
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setLoading(false);
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to get location.");
        setLoading(false);
      }
    };

    requestLocation();
  }, []);

  // Emit user location
  useEffect(() => {
    if (!socket || !coords) return;
    
    socket.emit("new-location", {
      latitude: coords.latitude,
      longitude: coords.longitude
    });

    const interval = setInterval(() => {
      socket.emit("new-location", {
        latitude: coords.latitude + (Math.random() - 0.5) * 0.001,
        longitude: coords.longitude + (Math.random() - 0.5) * 0.001,
      });
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [socket, coords, user]);

  // Listen for traffic updates
  useEffect(() => {
    if (!socket) return;
    
    const handleNewTraffic = (data: any) => {
      setTraffic(data);
      updateNearbyIncidents(data);
    };

    socket.on("new-traffic", handleNewTraffic);

    return () => {
      socket.off("new-traffic", handleNewTraffic);
    };
  }, [socket, coords, filters]);

  const updateNearbyIncidents = (trafficData: any) => {
    if (!coords || !trafficData) return;

    const allIncidents: any[] = [];
    Object.values(trafficData).forEach((area: any) => {
      if (area.incidents) {
        allIncidents.push(...area.incidents);
      }
    });

    // Filter incidents based on current filters
    const filtered = allIncidents.filter(incident => {
      if (!incident?.geometry?.coordinates?.[0]) return false;

      // Distance filter
      const incidentCoords = incident.geometry.coordinates[0];
      const distance = parseFloat(calculateDistance(incidentCoords, [coords.latitude, coords.longitude]).replace(/[^\d.]/g, ''));
      if (distance > filters.distance) return false;

      // Severity filter
      if (filters.severity.length > 0) {
        const severity = incident.properties?.magnitudeOfDelay || 0;
        const severityLevel = severity < 2 ? 'low' : severity < 3 ? 'medium' : severity < 4 ? 'high' : 'critical';
        if (!filters.severity.includes(severityLevel)) return false;
      }

      // Incident type filter
      if (filters.incidentTypes.length > 0) {
        const incidentType = incident.properties?.iconCategory?.toLowerCase() || '';
        const matchesType = filters.incidentTypes.some(type => 
          incidentType.includes(type) || type === 'accident' && incidentType.includes('collision')
        );
        if (!matchesType) return false;
      }

      return true;
    });

    // Sort by distance
    const sorted = filtered.sort((a, b) => {
      const distanceA = parseFloat(calculateDistance(a.geometry.coordinates[0], [coords.latitude, coords.longitude]).replace(/[^\d.]/g, ''));
      const distanceB = parseFloat(calculateDistance(b.geometry.coordinates[0], [coords.latitude, coords.longitude]).replace(/[^\d.]/g, ''));
      return distanceA - distanceB;
    });

    setNearbyIncidents(sorted.slice(0, 10)); // Show top 10 nearest incidents
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (traffic) {
      updateNearbyIncidents(traffic);
    }
    setRefreshing(false);
  };

  const handleIncidentSelect = (incident: any) => {
    setSelectedIncident(incident);
    Alert.alert(
      "Incident Details",
      `${incident.properties?.iconCategory || 'Traffic Incident'}\n\nDistance: ${calculateDistance(incident.geometry.coordinates[0], [coords.latitude, coords.longitude])}`,
      [
        { text: "Close", style: "cancel" },
        { text: "Get Directions", onPress: () => {
          Alert.alert("Coming Soon", "Route guidance feature will be available soon!");
        }},
      ]
    );
  };

  const getSeverityColor = (magnitudeOfDelay: number) => {
    if (magnitudeOfDelay < 2) return currentColors.success;
    if (magnitudeOfDelay < 3) return currentColors.warning;
    if (magnitudeOfDelay < 4) return currentColors.error;
    return '#dc2626';
  };

  const getSeverityText = (magnitudeOfDelay: number) => {
    if (magnitudeOfDelay < 2) return 'Low';
    if (magnitudeOfDelay < 3) return 'Medium';
    if (magnitudeOfDelay < 4) return 'High';
    return 'Critical';
  };

  if (loading) {
    return <LoadingSpinner text="Loading traffic data..." />;
  }

  if (!coords) {
    return (
      <ErrorState
        title="Location Required"
        message="Please enable location services to view traffic information."
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <SafeAreaView 
      style={{
        flex: 1, 
        backgroundColor: isDark ? currentColors.dark.background : currentColors.background.light
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={currentColors.primary.main}
            colors={[currentColors.primary.main]}
          />
        }
      >
        <View
          style={{
            backgroundColor: currentColors.primary.main,
            paddingVertical: 16,
            paddingHorizontal: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{
              ...typography.h2,
              color: currentColors.text.light,
              fontWeight: '600',
            }}>
              Welcome{user?.user.User_Username ? `, ${user.user.User_Username}` : ''}!
            </Text>
            <Text style={{
              ...typography.body,
              color: 'rgba(255, 255, 255, 0.9)',
              marginTop: 4,
            }}>
              Live Traffic & Incident Monitor
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setShowFiltering(true)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 20,
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Ionicons name="options" size={20} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setShowEmergencyContacts(true)}
              style={{
                backgroundColor: currentColors.error,
                borderRadius: 20,
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PulseAnimation duration={3000}>
                <Ionicons name="call" size={20} color="#fff" />
              </PulseAnimation>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <WeatherIntegration onWeatherUpdate={setWeatherData} compact />
        </View>

        {criticalIncidents && (
          <View
            style={{
              marginHorizontal: 16,
              marginVertical: 12,
              padding: 16,
              borderRadius: 16,
              backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
              borderLeftWidth: 4,
              borderLeftColor: currentColors.error,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="warning"
                size={24}
                color={currentColors.error}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{
                  ...typography.h4,
                  color: currentColors.error,
                  fontWeight: '700',
                }}>
                  {criticalIncidents.Amount} Critical Incidents
                </Text>
                <Text style={{
                  ...typography.body,
                  color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
                  marginTop: 2,
                }}>
                  {criticalIncidents.Data}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/analytics')}
                style={{
                  backgroundColor: currentColors.primary.main,
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{
                  ...typography.bodySmall,
                  color: '#fff',
                  fontWeight: '600',
                }}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
            borderWidth: 1,
            borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 12,
              backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? currentColors.dark.border : currentColors.border.light,
            }}
          >
            <Text style={{
              ...typography.h4,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
              fontWeight: '600',
            }}>
              Live Traffic Map
            </Text>
            <TouchableOpacity
              onPress={() => setMapExpanded(!mapExpanded)}
              style={{
                backgroundColor: currentColors.primary.main,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{
                ...typography.bodySmall,
                color: '#fff',
                fontWeight: '600',
              }}>
                {mapExpanded ? 'Collapse' : 'Expand'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ height: mapExpanded ? 400 : 200 }}>
            <EnhancedMap
              traffic={traffic}
              onIncidentSelect={handleIncidentSelect}
              showWeatherOverlay={!!weatherData}
              filterRadius={filters.distance}
            />
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{
              ...typography.h3,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
              fontWeight: '600',
            }}>
              Nearby Incidents
            </Text>
            <Text style={{
              ...typography.bodySmall,
              color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
            }}>
              Within {filters.distance}km
            </Text>
          </View>
          
          {nearbyIncidents.length === 0 ? (
            <View
              style={{
                backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                borderRadius: 12,
                padding: 20,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={currentColors.success}
                style={{ marginBottom: 8 }}
              />
              <Text style={{
                ...typography.body,
                color: isDark ? currentColors.dark.text : currentColors.text.primary,
                textAlign: 'center',
                fontWeight: '600',
              }}>
                All Clear!
              </Text>
              <Text style={{
                ...typography.bodySmall,
                color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
                textAlign: 'center',
                marginTop: 4,
              }}>
                No incidents found in your area
              </Text>
            </View>
          ) : (
            nearbyIncidents.map((incident, index) => {
              const distance = calculateDistance(incident.geometry.coordinates[0], [coords.latitude, coords.longitude]);
              const severity = incident.properties?.magnitudeOfDelay || 0;
              
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleIncidentSelect(incident)}
                  style={{
                    backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: getSeverityColor(severity),
                    borderWidth: 1,
                    borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{
                          ...typography.body,
                          color: isDark ? currentColors.dark.text : currentColors.text.primary,
                          fontWeight: '600',
                          flex: 1,
                        }}>
                          {incident.properties?.iconCategory || 'Traffic Incident'}
                        </Text>
                        <View
                          style={{
                            backgroundColor: getSeverityColor(severity),
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 10,
                          }}
                        >
                          <Text style={{
                            ...typography.caption,
                            color: '#fff',
                            fontWeight: '600',
                          }}>
                            {getSeverityText(severity)}
                          </Text>
                        </View>
                      </View>
                      <Text style={{
                        ...typography.bodySmall,
                        color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
                      }}>
                        {distance}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={isDark ? currentColors.dark.textSecondary : currentColors.text.secondary}
                    />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <EmergencyContacts
        visible={showEmergencyContacts}
        onClose={() => setShowEmergencyContacts(false)}
      />
      
      <AdvancedFiltering
        visible={showFiltering}
        onClose={() => setShowFiltering(false)}
        onApplyFilters={(newFilters) => {
          setFilters(newFilters);
          if (traffic) {
            updateNearbyIncidents(traffic);
          }
        }}
        currentFilters={filters}
      />

      <EnhancedNavigation />
    </SafeAreaView>
  );
}