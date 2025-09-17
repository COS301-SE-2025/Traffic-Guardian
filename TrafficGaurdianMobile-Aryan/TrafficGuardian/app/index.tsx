import React, { useEffect } from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSocket } from "../services/socketProvider";

export default function Index() {
  const router = useRouter();

const { socket } = useSocket();

useEffect(() => {
  if (!socket) return;

  const handleWelcome = (data: any) => {
    console.log("New notification:", data);
  };

  socket.on("welcome", handleWelcome);

  return () => {
    socket.off("welcome", handleWelcome);
  };
}, [socket]);



/////////////////////
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={styles.navText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/register")}>
          <Text style={styles.navText}>Register</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={{ fontSize: 18 }}>Welcome!</Text>
        <Text>Traffic and Incident Alerts</Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#333",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  navText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
