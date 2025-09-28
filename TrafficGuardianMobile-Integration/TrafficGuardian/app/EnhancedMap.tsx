import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Alert, Animated, Text } from 'react-native';
import MapView, { Marker, Polyline, Circle, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../services/location';
import { useTheme } from '../services/themeContext';
import { calculateDistance } from '../services/distanceCalculator';

interface EnhancedMapProps {
  traffic: any;
  onIncidentSelect?: (incident: any) => void;
  showWeatherOverlay?: boolean;
  showTrafficFlow?: boolean;
  filterRadius?: number;
}

interface ClusteredIncident {
  id: string;
  coordinate: { latitude: number; longitude: number };
  incidents: any[];
  count: number;
}

const calculateDistance_internal = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const clusterIncidents = (incidents: any[], clusterRadius: number = 1): ClusteredIncident[] => {
  const clusters: ClusteredIncident[] = [];
  const processed: boolean[] = new Array(incidents.length).fill(false);

  incidents.forEach((incident, index) => {
    if (processed[index]) return;

    const cluster: ClusteredIncident = {
      id: `cluster_${index}`,
      coordinate: {
        latitude: incident.geometry.coordinates[0][1],
        longitude: incident.geometry.coordinates[0][0],
      },
      incidents: [incident],
      count: 1,
    };

    processed[index] = true;

    // Find nearby incidents to cluster
    incidents.forEach((otherIncident, otherIndex) => {
      if (processed[otherIndex] || index === otherIndex) return;

      const distance = calculateDistance_internal(
        cluster.coordinate.latitude,
        cluster.coordinate.longitude,
        otherIncident.geometry.coordinates[0][1],
        otherIncident.geometry.coordinates[0][0]
      );

      if (distance <= clusterRadius) {
        cluster.incidents.push(otherIncident);
        cluster.count++;
        processed[otherIndex] = true;
      }
    });

    clusters.push(cluster);
  });

  return clusters;
};

const getIncidentColor = (incident: any): string => {
  const severity = incident.properties?.magnitudeOfDelay || 0;
  if (severity < 2) return '#10b981'; // Green - low
  if (severity < 3) return '#f59e0b'; // Yellow - medium
  if (severity < 4) return '#ef4444'; // Red - high
  return '#dc2626'; // Dark red - critical
};

const getClusterColor = (incidents: any[]): string => {
  const maxSeverity = Math.max(...incidents.map(i => i.properties?.magnitudeOfDelay || 0));
  if (maxSeverity < 2) return '#10b981';
  if (maxSeverity < 3) return '#f59e0b';
  if (maxSeverity < 4) return '#ef4444';
  return '#dc2626';
};

export function EnhancedMap({
  traffic,
  onIncidentSelect,
  showWeatherOverlay = false,
  showTrafficFlow = true,
  filterRadius = 50,
}: EnhancedMapProps){
  const { coords } = useLocation();
  const { currentColors, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [clusters, setClusters] = useState<ClusteredIncident[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<ClusteredIncident | null>(null);
  const [showUserLocation, setShowUserLocation] = useState(true);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');

  // Animated values for smooth transitions
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for user location
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (traffic && mapReady) {
      processTrafficData();
    }
  }, [traffic, mapReady]);

  const processTrafficData = () => {
    const allIncidents: any[] = [];
    
    if (traffic) {
      Object.values(traffic).forEach((area: any) => {
        if (area.incidents) {
          allIncidents.push(...area.incidents);
        }
      });
    }

    // Filter incidents within radius if user location is available
    let filteredIncidents = allIncidents;
    if (coords && filterRadius > 0) {
      filteredIncidents = allIncidents.filter(incident => {
        if (!incident.geometry?.coordinates?.[0]) return false;
        
        const distance = calculateDistance_internal(
          coords.latitude,
          coords.longitude,
          incident.geometry.coordinates[0][1],
          incident.geometry.coordinates[0][0]
        );
        
        return distance <= filterRadius;
      });
    }

    // Cluster incidents
    const clusteredIncidents = clusterIncidents(filteredIncidents);
    setClusters(clusteredIncidents);
  };

  const handleClusterPress = (cluster: ClusteredIncident) => {
    setSelectedCluster(cluster);
    
    if (cluster.count === 1) {
      onIncidentSelect?.(cluster.incidents[0]);
    } else {
      // Zoom to show all incidents in cluster
      const coordinates = cluster.incidents.map(incident => ({
        latitude: incident.geometry.coordinates[0][1],
        longitude: incident.geometry.coordinates[0][0],
      }));
      
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const centerOnUser = () => {
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const toggleMapType = () => {
    const types: Array<'standard' | 'satellite' | 'hybrid'> = ['standard', 'satellite', 'hybrid'];
    const currentIndex = types.indexOf(mapType);
    const nextIndex = (currentIndex + 1) % types.length;
    setMapType(types[nextIndex]);
  };

  if (!coords) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
        }}
      >
        <Ionicons
          name="location-outline"
          size={48}
          color={isDark ? currentColors.dark.textSecondary : currentColors.text.secondary}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        mapType={mapType}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        showsTraffic={showTrafficFlow}
        initialRegion={{
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onMapReady={() => setMapReady(true)}
        customMapStyle={isDark ? darkMapStyle : undefined}
      >
        {/* User Location with Custom Marker */}
        {showUserLocation && (
          <Marker
            coordinate={coords}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
          >
            <Animated.View
              style={{
                transform: [{ scale: pulseAnim }],
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: currentColors.primary.main,
                  borderWidth: 3,
                  borderColor: '#fff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              />
            </Animated.View>
          </Marker>
        )}

        {/* Filter Radius Circle */}
        {coords && filterRadius > 0 && (
          <Circle
            center={coords}
            radius={filterRadius * 1000} // Convert km to meters
            strokeColor={currentColors.primary.main + '40'}
            fillColor={currentColors.primary.main + '10'}
            strokeWidth={2}
          />
        )}

        {/* Clustered Incidents */}
        {clusters.map((cluster) => (
          <React.Fragment key={cluster.id}>
            <Marker
              coordinate={cluster.coordinate}
              onPress={() => handleClusterPress(cluster)}
            >
              <View
                style={{
                  backgroundColor: getClusterColor(cluster.incidents),
                  borderRadius: cluster.count > 1 ? 15 : 10,
                  width: cluster.count > 1 ? 30 : 20,
                  height: cluster.count > 1 ? 30 : 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: '#fff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                {cluster.count > 1 ? (
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}
                  >
                    {cluster.count}
                  </Text>
                ) : (
                  <Ionicons
                    name="warning"
                    size={12}
                    color="#fff"
                  />
                )}
              </View>
              {cluster.count > 1 && (
                <Callout tooltip={false}>
                  <View
                    style={{
                      backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                      borderRadius: 8,
                      padding: 12,
                      minWidth: 200,
                      borderWidth: 1,
                      borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: 'bold',
                        marginBottom: 4,
                        color: isDark ? currentColors.dark.text : currentColors.text.primary,
                      }}
                    >
                      {cluster.count} Incidents
                    </Text>
                    {cluster.incidents.slice(0, 3).map((incident, index) => (
                      <Text
                        key={index}
                        style={{
                          fontSize: 12,
                          color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
                        }}
                      >
                        • {incident.properties?.iconCategory || 'Traffic Incident'}
                      </Text>
                    ))}
                    {cluster.count > 3 && (
                      <Text
                        style={{
                          fontSize: 12,
                          fontStyle: 'italic',
                          color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
                        }}
                      >
                        +{cluster.count - 3} more...
                      </Text>
                    )}
                  </View>
                </Callout>
              )}
            </Marker>

            {/* Individual incident polylines for single incidents */}
            {cluster.count === 1 && cluster.incidents[0].geometry?.coordinates && (
              <Polyline
                coordinates={cluster.incidents[0].geometry.coordinates.map(([lon, lat]: [number, number]) => ({
                  latitude: lat,
                  longitude: lon,
                }))}
                strokeColor={getIncidentColor(cluster.incidents[0])}
                strokeWidth={4}
              />
            )}
          </React.Fragment>
        ))}
      </MapView>

      {/* Map Controls */}
      <View
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          flexDirection: 'column',
        }}
      >
        {/* Map Type Toggle */}
        <TouchableOpacity
          onPress={toggleMapType}
          style={{
            backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
            borderRadius: 25,
            width: 50,
            height: 50,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            borderWidth: 1,
            borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons
            name="layers"
            size={24}
            color={isDark ? currentColors.dark.text : currentColors.text.primary}
          />
        </TouchableOpacity>

        {/* Center on User */}
        <TouchableOpacity
          onPress={centerOnUser}
          style={{
            backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
            borderRadius: 25,
            width: 50,
            height: 50,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            borderWidth: 1,
            borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons
            name="locate"
            size={24}
            color={currentColors.primary.main}
          />
        </TouchableOpacity>

        {/* Toggle User Location */}
        <TouchableOpacity
          onPress={() => setShowUserLocation(!showUserLocation)}
          style={{
            backgroundColor: showUserLocation 
              ? currentColors.primary.main 
              : isDark ? currentColors.dark.surface : currentColors.surface.light,
            borderRadius: 25,
            width: 50,
            height: 50,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons
            name="person"
            size={24}
            color={showUserLocation 
              ? '#fff' 
              : isDark ? currentColors.dark.text : currentColors.text.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
          borderRadius: 8,
          padding: 12,
          borderWidth: 1,
          borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          style={{
            fontWeight: 'bold',
            marginBottom: 8,
            color: isDark ? currentColors.dark.text : currentColors.text.primary,
            fontSize: 12,
          }}
        >
          Severity Legend
        </Text>
        {[
          { color: '#10b981', label: 'Low' },
          { color: '#f59e0b', label: 'Medium' },
          { color: '#ef4444', label: 'High' },
          { color: '#dc2626', label: 'Critical' },
        ].map((item) => (
          <View
            key={item.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: item.color,
                marginRight: 8,
              }}
            />
            <Text
              style={{
                fontSize: 11,
                color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
              }}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Dark mode map style
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#746855" }]
  }
];
export default EnhancedMap;
