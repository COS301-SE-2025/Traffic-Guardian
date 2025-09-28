import { router, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Button } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createIncident, sendVoice } from "../services/incidentsApi";
import { useLocation } from "../services/location";
import { Picker } from "@react-native-picker/picker";
import { useSession } from "../services/sessionContext";
import { Audio } from "expo-av";
import { globalStyles } from "../styles/globalStyles";

export default function Report() {
    const router = useRouter();
    const { coords } = useLocation();
    const { user, setUser } = useSession();
  
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
//
async function startRecording() {
  try {
    const permission = await Audio.requestPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Microphone permission is required!");
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();

    setRecording(recording);
  } catch (err) {
    console.error("Failed to start recording", err);
  }
}

async function stopRecording() {
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
//

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

      <SafeAreaView style={{ flex: 1, backgroundColor: "rgb(41,41,41)" }}>
  <ScrollView
    contentContainerStyle={{
      flexGrow: 1,               
      justifyContent: "center",  
      alignItems: "center",      
      padding: 20,
    }}
    showsVerticalScrollIndicator={false}
  >
    <View
      style={{
        width: "100%",
        maxWidth: 400,
        backgroundColor: "#545454ff",
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", textAlign: "center", color: "orange", marginBottom: 20 }}>
        Report an Incident
      </Text>

      {/* Severity Picker */}
      <Text style={{ color: "white", fontWeight: "600", marginBottom: 5 }}>Severity</Text>
      <View style={{ backgroundColor: "#f5f5f5", borderRadius: 12, marginBottom: 15 }}>
        <Picker
          selectedValue={incidentSeverity}
          onValueChange={(item) => setIncidentSeverity(item)}
          style={{ color: "#292929" }}
        >
          <Picker.Item label="Select severity" value="" />
          <Picker.Item label="Low" value="low" />
          <Picker.Item label="Medium" value="medium" />
          <Picker.Item label="High" value="high" />
        </Picker>
      </View>

      {/* Description */}
      <Text style={{ color: "white", fontWeight: "600", marginBottom: 5 }}>Description</Text>
      <TextInput
        style={{
          backgroundColor: "#f5f5f5",
          borderRadius: 12,
          padding: 12,
          marginBottom: 15,
          color: "#292929",
        }}
        placeholder="Details of incident"
        placeholderTextColor="#888"
        value={incidentDescription}
        onChangeText={setDescription}
        multiline
      />

      {/* Submit Button */}
      <TouchableOpacity
        style={{ backgroundColor: "orange", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 10 }}
        onPress={handleSubmit}
      >
        <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>Report</Text>
      </TouchableOpacity>

      {/* Voice Recording */}
      <View style={{ marginTop: 10 }}>
        <TouchableOpacity
          style={{
            backgroundColor: recording ? "#d9534f" : "#5cb85c",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            marginBottom: 10,
          }}
          onPress={recording ? stopRecording : startRecording}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>{recording ? "Stop Recording" : "Start Recording"}</Text>
        </TouchableOpacity>

        {uri && (
          <>
            <TouchableOpacity
              style={{ backgroundColor: "#0275d8", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginBottom: 10 }}
              onPress={playSound}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Play Recording</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: "orange", paddingVertical: 12, borderRadius: 12, alignItems: "center" }}
              onPress={sendVoiceRecording}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Send Recording</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  </ScrollView>

  {/* Navbar at bottom */}
  <View style={globalStyles.navbar}>
    <TouchableOpacity onPress={() => router.push("/")}>
      <Text style={globalStyles.navText}>Home</Text>
    </TouchableOpacity>

    {!user && (
      <TouchableOpacity onPress={() => router.push("/login")}>
        <Text style={globalStyles.navText}>Login</Text>
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

    {!user && (
      <TouchableOpacity onPress={() => router.push("/register")}>
        <Text style={globalStyles.navText}>Register</Text>
      </TouchableOpacity>
    )}
  </View>
</SafeAreaView>

  );
}