import { router, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Button, Linking, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createIncident, sendVoice } from "../services/incidentsApi";
import { useLocation } from "../services/location";
import { Picker } from "@react-native-picker/picker";
import { useSession } from "../services/sessionContext";
import { Audio } from "expo-av";
import { globalStyles } from "../styles/globalStyles";
import { Ionicons } from '@expo/vector-icons'; 
import { useTheme } from '../services/themeContext';
import Navbar from "../components/navbar";


export default function Report() {
    const router = useRouter();
    const { coords } = useLocation();
    const { user, setUser } = useSession();
    const { currentColors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
  
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


    const handleCall = (phone: string, name: string) => {
      Alert.alert(
        'Emergency Call',
        `Are you sure you want to call ${name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: () => Linking.openURL(`tel:${phone}`),
          },
        ]
      );
    };

    const contactTypeIcons = {
  police: 'shield-checkmark',
  medical: 'medical',
  fire: 'flame',
  family: 'people',
  friend: 'person',
  other: 'call',
};

const contactTypeColors = {
  police: '#3b82f6',
  medical: '#ef4444',
  fire: '#dc2626',
  family: '#10b981',
  friend: '#f59e0bff',
  other: '#6b7280',
};
interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  type: 'police' | 'medical' | 'fire' | 'family' | 'friend' | 'other';
  isPrimary: boolean;
}

const emergencyContacts: EmergencyContact[] = [
  { id: '1', name: 'Police Emergency', phone: '10111', type: 'police', isPrimary: true },
  { id: '2', name: 'Ambulance/Medical', phone: '10177', type: 'medical', isPrimary: true },
  { id: '3', name: 'Fire Department', phone: '10177', type: 'fire', isPrimary: true },
  { id: '4', name: 'Traffic Police', phone: '0861 400 800', type: 'police', isPrimary: true },
];

  /////////////////////////////
  return(

      <SafeAreaView style={{ flex: 1, backgroundColor: "rgb(41,41,41)" }}>
        <Navbar>
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

{/* Button to open modal */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          padding: 16,
          backgroundColor: currentColors.surface.dark,
          borderRadius: 12,
          alignItems : 'center',
          justifyContent : 'center',
        }}
      >
        <Text style={{ color: '#f59e0bff', fontSize: 18 }}>
          Show Emergency Contacts
        </Text>
      </TouchableOpacity>
  {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: currentColors.background.dark,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 16,
              maxHeight: '80%',
            }}
          >
            <Text style={{ 
              color: '#f59e0bff', 
              fontSize: 24, 
              fontWeight: 'bold', 
              marginBottom: 16 
            }}>
              Emergency Contacts
            </Text>

            <ScrollView>
              {emergencyContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  onPress={() => handleCall(contact.phone, contact.name)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    marginBottom: 12,
                    backgroundColor: currentColors.surface.light,
                    borderRadius: 12,
                    borderColor: contactTypeColors[contact.type],
                    borderWidth: 2,
                  }}
                >
                  <Ionicons
                    name={contactTypeIcons[contact.type] as any}
                    size={28}
                    color={contactTypeColors[contact.type]}
                    style={{ marginRight: 12 }}
                  />
                  <View>
                    <Text style={{ color: currentColors.text.primary, fontSize: 18 }}>
                      {contact.name}
                    </Text>
                    <Text style={{ color: currentColors.text.secondary, fontSize: 14 }}>
                      {contact.phone}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Close button */}
            <Pressable
              onPress={() => setModalVisible(false)}
              style={{
                marginTop: 12,
                padding: 12,
                backgroundColor: currentColors.surface.dark,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#f59e0bff', fontSize: 16 }}>
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
  
  </Navbar>
</SafeAreaView>

  );
}