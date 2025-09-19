import { router, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Button } from "react-native";
import { createIncident, sendVoice } from "../services/incidentsApi";
import { useLocation } from "../services/location";
import { Picker } from "@react-native-picker/picker";
import { useSession } from "../services/sessionContext";
import { Audio } from "expo-av";

export default function Report() {
    const router = useRouter();
    const { coords } = useLocation();
    const { user } = useSession();
  
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [uri, setUri] = useState<string | null>(null);

    //Recording stuff
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  async function startRecording() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Microphone permission is required!");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
    }catch(err){
      console.error("Failed to start recording", err);
    }
  }

  async function stopRecording(){
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setUri(uri);
      setRecording(null);
      console.log("Recording stored at", uri);
    } catch (err) {
      console.error("Failed to stop recording", err);
    }
  }

  async function playSound() {
    if (!uri) return;
    console.log("Loading sound from", uri);

    const { sound } = await Audio.Sound.createAsync({ uri });
    setSound(sound);
    await sound.playAsync();
  }

  async function sendVoiceRecording(){
    try{
      if(!uri){
        Alert.alert("No recording found");
        return;
      }

      const response = await sendVoice(uri, user);
      Alert.alert(response.message);
    }catch(error : any){
      Alert.alert("Error : " + error);
    }
  }
    
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
        
                <TouchableOpacity onPress={() => router.push("/")}>
                  <Text style={styles.navText}>Home</Text>
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

      <View style={{ padding: 20 }}>
      <Button
        title={recording ? "Stop Recording" : "Start Recording"}
        onPress={recording ? stopRecording : startRecording}
      />
      {uri && (
        <>
          {/* <Text>Recorded file: {uri}</Text> */}
          <Button title="Play Recording" onPress={playSound} />
          <Button title="Send" onPress={sendVoiceRecording} />
        </>

      )}
    </View>
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
