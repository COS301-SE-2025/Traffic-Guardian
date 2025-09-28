import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSocket } from "../services/socketProvider";
import * as Location from "expo-location";
import { useSession } from "../services/sessionContext";
import { globalStyles }from "../styles/globalStyles"
import { useTraffic } from "../services/trafficContext";
import MapView, { Marker, Polyline } from "react-native-maps";
import { calculateDistance } from "../services/distanceCalculator";
import Navbar from "../components/navbar";
import { useTheme } from '../services/themeContext';
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
      setTraffic(data);
    };

    socket.on("new-traffic", handlenewTraffic);

    return () => {
      socket.off("new-traffic", handlenewTraffic);
    };
  }, [socket]);


  return (
    <SafeAreaView style={{flex : 1, backgroundColor : 'rgb(41, 41, 41)'}}>
      <Navbar>

      <View style={{flex : 1}}>
        <View style={globalStyles.header}>
          <Text style={globalStyles.headerTitle}>Welcome! {user?.user.User_Username ?? ""}</Text>
          <Text style={globalStyles.headerSubtitle}>Traffic and Incident Alerts</Text>
        </View>
        </View>

    <View  style={{flex : 1}}>
      <View style={{ flex: 3 }}>
      <EnhancedMap
          traffic={traffic}
          onIncidentSelect={(incident) => console.log(incident)}
          showTrafficFlow={true}
          filterRadius={50}
        />
      </View>
      </View>

{/* {coords && (
  <View style={{ height: 300 }}>
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: -26.1278,
        longitude: 28.082, 
        latitudeDelta: 0.01 * 100,
        longitudeDelta: 0.01 * 100,
      }}
    >
      <Marker
        coordinate={{ latitude: -26.1278244561, longitude: 28.0815629307 }}
        title={user?.user.User_Username ?? "You"}
      />

      {traffic &&
        Object.entries(traffic).map(([key, value]) =>
          value.incidents?.map((incident, i) => {
            if (!incident?.geometry?.coordinates) return null;

            const coordinates = incident.geometry.coordinates.map(([lon, lat]) => ({
              latitude: lat,
              longitude: lon,
            }));

            let lineColour = 'orange';
            if(incident.properties.magnitudeOfDelay < 3) lineColour = "yellow";
            if(incident.properties.magnitudeOfDelay == 3) lineColour = "orange";
            if(incident.properties.magnitudeOfDelay >= 3) lineColour = "red";
            return (
              <Polyline
                key={`${key}-${i}`}
                coordinates={coordinates}
                strokeColor={lineColour}
                strokeWidth={4}
              />
            );
          })
        )}
    </MapView>
  </View>
)} */}


<View style={{ flex: 2 }}>
  <ScrollView contentContainerStyle={{ padding: 20 }} style={{ flex: 1 }}>
    {Array.isArray(traffic) &&
      traffic.map((area, index) => (
        <View key={index} style={[globalStyles.card, globalStyles.darkCard]}>
          <View style={globalStyles.cardHeader}>
            <Text style={globalStyles.cardTitle}>{area.location}</Text>
          </View>

          {area.incidents && area.incidents.length > 0 ? (
            area.incidents.map((incident, i) => {
              const description = incident?.properties?.iconCategory;
              const lineString = incident?.geometry?.coordinates;
              //console.log(lineString);
              return (
                <Text key={i} style={globalStyles.cardSubtitle}>
                  - {description}{" "}
                  {calculateDistance(
                    lineString,
                    [Number(coords?.longitude), Number(coords?.longitude)]
                  )}{" "}
                  km
                </Text>
              );
            })
          ) : (
            <Text style={globalStyles.cardSubtitle}>No incidents</Text>
          )}
        </View>
      ))}
  </ScrollView>
</View>

      
    </Navbar>

    </SafeAreaView>
  );
}
