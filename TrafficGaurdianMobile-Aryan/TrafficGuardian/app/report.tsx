import { router, useRouter } from "expo-router";
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { createIncident } from "../services/incidentsApi";
import { useLocation } from "../services/location";
import { Picker } from "@react-native-picker/picker";
import { useSession } from "../services/sessionContext";


export default function Report() {
    const router = useRouter();
    const { coords } = useLocation();
    const { user } = useSession();
    
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [incidentLocation, setIncidentLocation] = useState("");
  const [incidentCarID, setIncidentCarID] = useState("");
  const [incidentSeverity, setIncidentSeverity] = useState("");
  const [incidentStatus, setIncidentStatus] = useState("");
  const [incidentDescription, setDescription] = useState("");

  const handleSubmit = async () => {
    try{
        if (!incidentSeverity) {
        Alert.alert("Error", "Please fill in all fields.");
        return;
        }

        const response = await createIncident(incidentDate, incidentLocation, incidentSeverity, incidentDescription, coords, user);
        Alert.alert("Success:", response.message + " ID : " + JSON.stringify(response.incident.Incidents_ID));
    }catch(error : any){
      Alert.alert("Error", error.message || "Something went wrong");
    }
  };

  /////////////////////////////
  return(
    <ScrollView contentContainerStyle={styles.container}>
              <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.push("/login")}>
                  <Text style={styles.navText}>Login</Text>
                </TouchableOpacity>
        
                <TouchableOpacity onPress={() => router.push("/report")}>
                  <Text style={styles.navText}>Report</Text>
                </TouchableOpacity>
        
                <TouchableOpacity onPress={() => router.push("/register")}>
                  <Text style={styles.navText}>Register</Text>
                </TouchableOpacity>
              </View>
      <Text style={styles.title}>Report an Incident</Text>

      <Text style={styles.label}>Severity</Text>
      <Picker
        selectedValue={incidentSeverity}
        style={styles.input}
        onValueChange={(itemValue) => setIncidentSeverity(itemValue)}
      >
        <Picker.Item label="Low" value="low" />
        <Picker.Item label="Medium" value="medium" />
        <Picker.Item label="High" value="high" />
      </Picker>

    <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        placeholder="Details"
        value={incidentDescription}
        onChangeText={setDescription}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    marginTop: 15,
    marginBottom: 5,
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  button: {
    marginTop: 30,
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
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
