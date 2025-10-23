import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSocket } from "../services/socketProvider";
import * as Location from "expo-location";
import { useSession } from "../services/sessionContext";
import { globalStyles }from "../styles/globalStyles";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { useTraffic } from "../services/trafficContext";
import MapView, { Marker, Polyline } from "react-native-maps";
import { calculateDistance } from "../services/distanceCalculator";
import Navbar from "../components/navbar";
import { useTheme } from '../services/themeContext';
import { Ionicons } from '@expo/vector-icons';
import  EnhancedMap  from './EnhancedMap';


export default function Index() {
  const router = useRouter();
  const { socket } = useSocket();
  const { user, setUser } = useSession();
  const { currentColors, isDark } = useTheme();

const { 
  traffic, setTraffic, 
  criticalIncidents, setCriticalIncidents,
  incidentCategory, setIncidentCategory,
  incidentLocations, setIncidentLocations
} = useTraffic();

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  //get location
  useEffect(() => {
    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location access is required for full functionality.");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        //Alert.alert("Location Access Granted", `Lat: ${location.coords.latitude}, Lon: ${location.coords.longitude}`);
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to get location.");
      }
    };

    requestLocation();
  }, []);


  //emit user location
  useEffect(()=>{
    if (!socket || !coords) return;
    socket.emit("new-location", {
      latitude : coords.latitude,
      longitude : coords.longitude
    });

      const interval = setInterval(() => {
    socket.emit("new-location", {
      latitude: coords.latitude + 0.01,
      longitude: coords.longitude,
    });
    //console.log("Emitted new-location:", coords); works
  }, 5000);
  return ()=>clearInterval(interval);
  },[socket, coords, user]);

  useEffect(()=>{
    if(!socket) return;

    const handlenewTraffic = (data : any) => {
      console.log("Received new-traffic:", data);
      setTraffic(data);
    };

    socket.on("new-traffic", handlenewTraffic);

    return () => {
      socket.off("new-traffic", handlenewTraffic);
    };
  }, [socket]);

  // Normalize traffic data to always use the array format
  const trafficData = React.useMemo(() => {
    if (!traffic) return [];
    // If traffic has a 'data' property, use it
    if (Array.isArray(traffic.data)) return traffic.data;
    // If traffic has 'incidents' and 'location', wrap it in an array
    if (traffic.incidents && traffic.location) return [traffic];
    // Otherwise return empty array
    return [];
  }, [traffic]);

  console.log("Normalized traffic data:", trafficData.length, "areas");

  return (
<SafeAreaView style={{ flex: 1, backgroundColor: colors.background.pure }}>
  <Navbar>
    {/* Header */}
    <View style={[globalStyles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface.dark, paddingVertical: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.border.light }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <View style={{
            backgroundColor: colors.primary.main,
            width: 36,
            height: 36,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}>
            <Ionicons name="person" size={20} color={colors.text.dark} />
          </View>
          <Text style={[typography.h4, { color: colors.text.primary, fontSize: 18, fontWeight: '700' }]}>
            Welcome, {user?.user.User_Username ?? "Guest"}!
          </Text>
        </View>
        <Text style={[typography.body, { color: colors.text.secondary, fontSize: 14, marginLeft: 48 }]}>
          Live Traffic Updates
        </Text>
      </View>
      <TouchableOpacity>
        <View style={{
          backgroundColor: colors.surface.elevated,
          width: 40,
          height: 40,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.border.light,
        }}>
          <Ionicons name="notifications" size={22} color={colors.primary.main} />
        </View>
      </TouchableOpacity>
    </View>

    {/* Map */}
    <View style={{ flex: 2, marginHorizontal: 20, marginVertical: 16, borderRadius: 10, overflow: 'hidden' }}>
      <EnhancedMap
        traffic={traffic}
        onIncidentSelect={(incident) => console.log(incident)}
        showTrafficFlow={true}
        filterRadius={50}
      />
    </View>

    {/* Traffic list */}
 <View style={{ flex: 2 }}>
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: colors.background.pure }}>
    <View style={{
      backgroundColor: colors.primary.main,
      width: 32,
      height: 32,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    }}>
      <Ionicons name="list" size={18} color={colors.text.dark} />
    </View>
    <Text style={[typography.h4, { color: colors.text.primary, fontSize: 17, fontWeight: '700' }]}>Active Incidents</Text>
  </View>
  <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, backgroundColor: colors.background.pure }}>
    {trafficData.length > 0 ? (
  trafficData.map((area, index) => {
    console.log("Rendering area:", area.location, "Incidents:", area.incidents?.length || 0);
    return (
      <View key={index} style={[globalStyles.card, globalStyles.darkCard, { borderLeftWidth: 3, borderLeftColor: colors.primary.main }]}>
        <View style={globalStyles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{
              backgroundColor: colors.surface.elevated,
              width: 32,
              height: 32,
              borderRadius: 6,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}>
              <Ionicons name="location" size={16} color={colors.primary.main} />
            </View>
            <Text style={[globalStyles.cardTitle, { fontSize: 16, fontWeight: '700' }]}>{area.location}</Text>
          </View>
          <View style={{
            backgroundColor: colors.primary.main,
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 6,
            minWidth: 28,
            alignItems: 'center',
          }}>
            <Text style={{
              color: colors.text.dark,
              fontSize: 13,
              fontWeight: '700',
            }}>
              {area.incidents?.length || 0}
            </Text>
          </View>
        </View>

        {area.incidents && area.incidents.length > 0 ? (
          area.incidents.map((incident, i) => {
            const description = incident?.properties?.iconCategory;
            const lineString = incident?.geometry?.coordinates;
            const distance = calculateDistance(
              lineString,
              [Number(coords?.longitude), Number(coords?.latitude)]
            );
            console.log(`  Incident ${i}: ${description}, Distance: ${distance}`);
            return (
              <View key={i} style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: i === 0 ? 12 : 8,
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: colors.surface.elevated,
                borderRadius: 8,
              }}>
                <View style={{
                  backgroundColor: colors.warning + '20',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}>
                  <Ionicons name="warning" size={14} color={colors.warning} />
                </View>
                <Text style={[typography.body, { flex: 1, color: colors.text.primary, fontSize: 14 }]}>
                  {description}
                </Text>
                <View style={{
                  backgroundColor: colors.surface.dark,
                  paddingVertical: 3,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                }}>
                  <Text style={[typography.caption, { color: colors.text.secondary, fontSize: 12, fontWeight: '600' }]}>
                    {distance}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 12,
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: colors.success + '10',
            borderRadius: 8,
          }}>
            <View style={{
              backgroundColor: colors.success + '20',
              width: 28,
              height: 28,
              borderRadius: 6,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            </View>
            <Text style={[typography.body, { color: colors.success, fontSize: 14, fontWeight: '600' }]}>No incidents reported</Text>
          </View>
        )}
      </View>
    );
  })
) : (
  <View style={{
    alignItems: 'center',
    marginTop: 40,
    paddingVertical: 40,
    paddingHorizontal: 20,
  }}>
    <View style={{
      backgroundColor: colors.surface.elevated,
      width: 80,
      height: 80,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border.light,
    }}>
      <Ionicons name="information-circle" size={40} color={colors.text.secondary} />
    </View>
    <Text style={[typography.h4, { color: colors.text.primary, textAlign: 'center', marginBottom: 8, fontSize: 16, fontWeight: '600' }]}>
      No Traffic Data
    </Text>
    <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center', fontSize: 14 }]}>
      Waiting for live traffic updates...
    </Text>
  </View>
)}

  </ScrollView>
</View>

  </Navbar>
</SafeAreaView>

  ); 
}
