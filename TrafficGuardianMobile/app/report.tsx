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
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
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

      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.pure }}>
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
        backgroundColor: colors.surface.dark,
        borderRadius: 10,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border.light,
      }}
    >
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <View style={{
          backgroundColor: colors.primary.main,
          width: 72,
          height: 72,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <Ionicons name="alert-circle" size={36} color={colors.text.dark} />
        </View>
        <Text style={[typography.h2, { color: colors.text.primary, textAlign: 'center', fontSize: 24, fontWeight: '800' }]}>
          Report Incident
        </Text>
        <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center', marginTop: 6, fontSize: 14 }]}>
          Help keep roads safe
        </Text>
      </View>

      {/* Severity Picker */}
      <View style={{ marginBottom: 18 }}>
        <Text style={[typography.label, { color: colors.text.primary, marginBottom: 10, fontSize: 13, fontWeight: '600' }]}>
          Severity Level
        </Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface.elevated,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border.light,
        }}>
          <View style={{
            backgroundColor: colors.primary.main,
            padding: 12,
            borderTopLeftRadius: 9,
            borderBottomLeftRadius: 9,
          }}>
            <Ionicons name="warning" size={20} color={colors.text.dark} />
          </View>
          <Picker
            selectedValue={incidentSeverity}
            onValueChange={(item) => setIncidentSeverity(item)}
            style={{ flex: 1, color: colors.text.primary }}
          >
            <Picker.Item label="Select severity level" value="" />
            <Picker.Item label="🟢 Low" value="low" />
            <Picker.Item label="🟡 Medium" value="medium" />
            <Picker.Item label="🔴 High" value="high" />
          </Picker>
        </View>
      </View>

      {/* Description */}
      <View style={{ marginBottom: 24 }}>
        <Text style={[typography.label, { color: colors.text.primary, marginBottom: 10, fontSize: 13, fontWeight: '600' }]}>
          Incident Details
        </Text>
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.surface.elevated,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border.light,
        }}>
          <View style={{
            backgroundColor: colors.primary.main,
            paddingHorizontal: 12,
            paddingVertical: 14,
            borderTopLeftRadius: 9,
            borderBottomLeftRadius: 9,
            alignItems: 'center',
          }}>
            <Ionicons name="document-text" size={20} color={colors.text.dark} />
          </View>
          <TextInput
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 16,
              color: colors.text.primary,
              fontSize: 15,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
            placeholder="Describe what happened..."
            placeholderTextColor={colors.text.tertiary}
            value={incidentDescription}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={globalStyles.primaryButton}
        onPress={handleSubmit}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="send" size={20} color={colors.text.light} style={{ marginRight: 8 }} />
          <Text style={globalStyles.primaryButtonText}>Submit Report</Text>
        </View>
      </TouchableOpacity>

      {/* Voice Recording */}
      {/* <View style={{ marginTop: 10 }}>
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
      </View> */}
    </View>
  </ScrollView>

{/* Button to open modal */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          padding: 16,
          marginHorizontal: 20,
          marginBottom: 20,
          backgroundColor: colors.error,
          borderRadius: 10,
          alignItems : 'center',
          justifyContent : 'center',
          flexDirection: 'row',
          borderWidth: 1,
          borderColor: colors.error,
        }}
      >
        <View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          width: 32,
          height: 32,
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
        }}>
          <Ionicons name="call" size={18} color={colors.text.light} />
        </View>
        <Text style={[typography.button, { color: colors.text.light, fontWeight: '700', fontSize: 16 }]}>
          Emergency Contacts
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
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface.dark,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: colors.border.light,
              padding: 20,
              maxHeight: '80%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border.light }}>
              <View style={{
                backgroundColor: colors.error,
                width: 40,
                height: 40,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="call" size={22} color={colors.text.light} />
              </View>
              <Text style={[typography.h3, { color: colors.text.primary, fontSize: 20, fontWeight: '700' }]}>
                Emergency Contacts
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {emergencyContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  onPress={() => handleCall(contact.phone, contact.name)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    marginBottom: 10,
                    backgroundColor: colors.surface.elevated,
                    borderRadius: 10,
                    borderLeftWidth: 3,
                    borderLeftColor: contactTypeColors[contact.type],
                    borderWidth: 1,
                    borderColor: colors.border.light,
                  }}
                >
                  <View style={{
                    backgroundColor: contactTypeColors[contact.type] + '20',
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    <Ionicons
                      name={contactTypeIcons[contact.type] as any}
                      size={24}
                      color={contactTypeColors[contact.type]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: '600', marginBottom: 2 }}>
                      {contact.name}
                    </Text>
                    <Text style={{ color: colors.text.secondary, fontSize: 14 }}>
                      {contact.phone}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Close button */}
            <Pressable
              onPress={() => setModalVisible(false)}
              style={{
                marginTop: 16,
                paddingVertical: 14,
                paddingHorizontal: 16,
                backgroundColor: colors.surface.elevated,
                borderRadius: 10,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border.light,
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close-circle" size={20} color={colors.text.secondary} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.text.secondary, fontSize: 16, fontWeight: '600' }}>
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