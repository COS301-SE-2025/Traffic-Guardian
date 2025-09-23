import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSocket } from "../services/socketProvider";
import * as Location from "expo-location";
import { useSession } from "../services/sessionContext";
import { globalStyles }from "../styles/globalStyles"


export default function Index() {
  const router = useRouter();
  const { socket } = useSocket();
  const { user, setUser } = useSession();

  const [traffic, setTraffic] = useState(null);
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

  useEffect(() => {
    if (!socket) return;

    const handleTrafficUpdate = (data : any) => {
      setTraffic(data);
    };

    socket.on("trafficUpdate", handleTrafficUpdate);

    return () => {
      socket.off("trafficUpdate", handleTrafficUpdate);
    };
  }, [socket]);

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
    <SafeAreaView>
      <View style={globalStyles.navbar}>
        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={globalStyles.navText}>Login</Text>
        </TouchableOpacity>

        {user && (
          <TouchableOpacity onPress={() => router.push("/report")}>
            <Text style={globalStyles.navText}>Report</Text>
          </TouchableOpacity>
        )}

        {user && (
          <TouchableOpacity
            onPress={() => {
              setUser(null);
              router.push("/");
            }}
          >
            <Text style={globalStyles.navText}>Logout</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.push("/register")}>
          <Text style={globalStyles.navText}>Register</Text>
        </TouchableOpacity>
      </View>

      <View>
        <View style={globalStyles.header}>
          <Text style={globalStyles.headerTitle}>Welcome!</Text>
          <Text style={globalStyles.headerSubtitle}>Traffic and Incident Alerts</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {traffic &&
            Object.entries(traffic).map(([key, value], index) => {
              const location = value.location;

              return (
                <View key={index} style={{ marginBottom: 20 }}>
                  <Text style={{ fontWeight: "bold", marginBottom: 5 }}>
                    Location: {location}
                  </Text>

                  {value.incidents?.map((incident, i) => {
                    const description = incident?.properties?.iconCategory;
                    return (
                      <Text key={i} style={{ marginLeft: 10, marginBottom: 2 }}>
                        - {description}
                      </Text>
                    );
                  })}
                </View>
              );
            })}
        </ScrollView>


      </View>
    </SafeAreaView>
  );
}
