import { router, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Image,
  Modal,
  Animated 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { createIncident, sendVoice } from "../services/incidentsApi";
import { useLocation } from "../services/location";
import { Picker } from "@react-native-picker/picker";
import { useSession } from "../services/sessionContext";
import { useTheme } from "../services/themeContext";
import { Audio } from "expo-av";
import { globalStyles } from "../styles/globalStyles";
import { typography } from "../styles/typography";
import { EnhancedNavigation } from "../components/EnhancedNavigation";
import { LoadingSpinner, PulseAnimation } from "../components/LoadingComponents";

interface PhotoData {
  uri: string;
  type: string;
  name: string;
}

export default function Report() {
  const router = useRouter();
  const { coords } = useLocation();
  const { user } = useSession();
  const { currentColors, isDark } = useTheme();
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitAnimation] = useState(new Animated.Value(0));
  
  // Form data
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [incidentLocation, setIncidentLocation] = useState("");
  const [incidentSeverity, setIncidentSeverity] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [incidentDescription, setDescription] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const incidentTypes = [
    { label: "Select incident type", value: "" },
    { label: "🚗 Vehicle Accident", value: "accident" },
    { label: "🔧 Vehicle Breakdown", value: "breakdown" },
    { label: "🚧 Road Construction", value: "roadworks" },
    { label: "🌧️ Weather Related", value: "weather" },
    { label: "🚦 Traffic Jam", value: "jam" },
    { label: "⚠️ Road Debris", value: "debris" },
    { label: "🚨 Emergency Situation", value: "emergency" },
    { label: "🚌 Public Transport Issue", value: "transport" },
    { label: "🦌 Animal on Road", value: "animal" },
    { label: "💡 Traffic Light Malfunction", value: "lights" },
    { label: "🛣️ Road Surface Issue", value: "surface" },
    { label: "📱 Other", value: "other" },
  ];

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  useEffect(() => {
    if (coords) {
      reverseGeocode();
    }
  }, [coords]);

  const reverseGeocode = async () => {
    if (!coords) return;
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      if (result[0]) {
        const address = `${result[0].street || ''} ${result[0].city || ''}, ${result[0].region || ''}`.trim();
        setCurrentLocation(address);
        if (!incidentLocation) {
          setIncidentLocation(address);
        }
      }
    } catch (error) {
      console.log('Reverse geocoding error:', error);
    }
  };

  // Camera and gallery functions
  const requestPermissions = async () => {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus.status !== 'granted' || galleryStatus.status !== 'granted') {
      Alert.alert('Permission needed', 'Camera and gallery permissions are required to add photos.');
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const photoData: PhotoData = {
        uri: asset.uri,
        type: 'image/jpeg',
        name: `incident_${Date.now()}.jpg`,
      };
      setPhotos(prev => [...prev, photoData]);
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const newPhotos: PhotoData[] = result.assets.map((asset, index) => ({
        uri: asset.uri,
        type: 'image/jpeg',
        name: `incident_${Date.now()}_${index}.jpg`,
      }));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const showPhotoOptions = () => {
    Alert.alert(
      "Add Photo",
      "Choose how you want to add a photo",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: takePhoto },
        { text: "Choose from Gallery", onPress: pickFromGallery },
      ]
    );
  };

  // Audio recording functions
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
      Alert.alert("Error", "Failed to start recording");
    }
  }

  async function stopRecording() {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setVoiceUri(uri);
      setRecording(null);
    } catch (err) {
      console.error("Failed to stop recording", err);
      Alert.alert("Error", "Failed to stop recording");
    }
  }

  async function playSound() {
    if (!voiceUri) return;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: voiceUri });
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      Alert.alert("Error", "Failed to play recording");
    }
  }

  const handleSubmit = async () => {
    try {
      if (!incidentSeverity || !incidentType) {
        Alert.alert("Error", "Please fill in all required fields.");
        return;
      }

      setLoading(true);
      
      Animated.sequence([
        Animated.timing(submitAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(submitAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Submit main incident report
      const response = await createIncident(
        incidentDate, 
        incidentLocation || currentLocation, 
        incidentSeverity, 
        `${incidentType}: ${incidentDescription}${additionalNotes ? ` | Additional notes: ${additionalNotes}` : ''}`,
        coords, 
        user
      );

      // Submit voice recording if exists
      if (voiceUri && user) {
        try {
          await sendVoice(voiceUri, user);
        } catch (voiceError) {
          console.log("Voice upload failed:", voiceError);
          // Don't fail the entire submission for voice upload issues
        }
      }

      // Submit photos if any (mock -  we need to set this up to upload to the server)
      if (photos.length > 0) {
        try {
          // Mock photo upload
          console.log(`Uploading ${photos.length} photos...`);
          // would upload each photo to server here
        } catch (photoError) {
          console.log("Photo upload failed:", photoError);
        }
      }

      setShowSuccessModal(true);
      
      // Reset form
      setTimeout(() => {
        setIncidentSeverity("");
        setIncidentType("");
        setDescription("");
        setAdditionalNotes("");
        setPhotos([]);
        setVoiceUri(null);
        setShowSuccessModal(false);
        router.push("/");
      }, 2000);

    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: isDark ? currentColors.dark.background : currentColors.background.light,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <Ionicons 
          name="person-circle-outline" 
          size={80} 
          color={isDark ? currentColors.dark.textSecondary : currentColors.text.secondary} 
        />
        <Text style={{
          ...typography.h3,
          color: isDark ? currentColors.dark.text : currentColors.text.primary,
          textAlign: 'center',
          marginTop: 16,
          marginBottom: 8,
        }}>
          Login Required
        </Text>
        <Text style={{
          ...typography.body,
          color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
          textAlign: 'center',
          marginBottom: 20,
        }}>
          Please log in to report incidents
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/login')}
          style={{
            backgroundColor: currentColors.primary.main,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
          }}
        >
          <Text style={{
            ...typography.button,
            color: '#fff',
          }}>
            Go to Login
          </Text>
        </TouchableOpacity>
        <EnhancedNavigation />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: isDark ? currentColors.dark.background : currentColors.background.light 
    }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{
          backgroundColor: currentColors.primary.main,
          paddingVertical: 20,
          paddingHorizontal: 20,
        }}>
          <Text style={{
            ...typography.h2,
            color: currentColors.text.light,
            fontWeight: '600',
            marginBottom: 8,
          }}>
            Report Incident
          </Text>
          <Text style={{
            ...typography.body,
            color: 'rgba(255, 255, 255, 0.9)',
          }}>
            Help keep roads safe by reporting incidents
          </Text>
        </View>

        {/* Current Location Display */}
        {currentLocation && (
          <View style={{
            margin: 16,
            padding: 12,
            backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Ionicons 
              name="location" 
              size={20} 
              color={currentColors.success} 
              style={{ marginRight: 8 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{
                ...typography.bodySmall,
                color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
              }}>
                Current Location
              </Text>
              <Text style={{
                ...typography.body,
                color: isDark ? currentColors.dark.text : currentColors.text.primary,
                fontWeight: '500',
              }}>
                {currentLocation}
              </Text>
            </View>
          </View>
        )}

        <View style={{ padding: 20 }}>
          {/* Incident Type */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              ...typography.body,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
              fontWeight: '600',
              marginBottom: 8,
            }}>
              Incident Type *
            </Text>
            <View style={{
              backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
            }}>
              <Picker
                selectedValue={incidentType}
                onValueChange={(item) => setIncidentType(item)}
                style={{ 
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                  height: 50,
                }}
              >
                {incidentTypes.map((type) => (
                  <Picker.Item key={type.value} label={type.label} value={type.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Severity */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              ...typography.body,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
              fontWeight: '600',
              marginBottom: 8,
            }}>
              Severity Level *
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[
                { label: 'Low', value: 'low', color: currentColors.success },
                { label: 'Medium', value: 'medium', color: currentColors.warning },
                { label: 'High', value: 'high', color: currentColors.error },
                { label: 'Critical', value: 'critical', color: '#dc2626' },
              ].map((severity) => (
                <TouchableOpacity
                  key={severity.value}
                  onPress={() => setIncidentSeverity(severity.value)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    marginHorizontal: 4,
                    borderRadius: 12,
                    backgroundColor: incidentSeverity === severity.value
                      ? severity.color
                      : isDark ? currentColors.dark.surface : currentColors.surface.light,
                    borderWidth: 1,
                    borderColor: severity.color,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    ...typography.bodySmall,
                    color: incidentSeverity === severity.value
                      ? '#fff'
                      : severity.color,
                    fontWeight: '600',
                  }}>
                    {severity.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Override */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              ...typography.body,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
              fontWeight: '600',
              marginBottom: 8,
            }}>
              Incident Location
            </Text>
            <TextInput
              style={{
                backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
                color: isDark ? currentColors.dark.text : currentColors.text.primary,
                ...typography.body,
              }}
              placeholder="Use current location or specify different location"
              placeholderTextColor={isDark ? currentColors.dark.textSecondary : currentColors.text.secondary}
              value={incidentLocation}
              onChangeText={setIncidentLocation}
              multiline
            />
          </View>

          {/* Description */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              ...typography.body,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
              fontWeight: '600',
              marginBottom: 8,
            }}>
              Description
            </Text>
            <TextInput
              style={{
                backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
                color: isDark ? currentColors.dark.text : currentColors.text.primary,
                ...typography.body,
                minHeight: 100,
                textAlignVertical: 'top',
              }}
              placeholder="Describe what happened..."
              placeholderTextColor={isDark ? currentColors.dark.textSecondary : currentColors.text.secondary}
              value={incidentDescription}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Additional Notes */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              ...typography.body,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
              fontWeight: '600',
              marginBottom: 8,
            }}>
              Additional Notes
            </Text>
            <TextInput
              style={{
                backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
                color: isDark ? currentColors.dark.text : currentColors.text.primary,
                ...typography.body,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              placeholder="Any additional information..."
              placeholderTextColor={isDark ? currentColors.dark.textSecondary : currentColors.text.secondary}
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Photo Section */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              ...typography.body,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
              fontWeight: '600',
              marginBottom: 12,
            }}>
              Photos ({photos.length}/5)
            </Text>
            
            {photos.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                {photos.map((photo, index) => (
                  <View key={index} style={{ marginRight: 12, position: 'relative' }}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={{ 
                        width: 100, 
                        height: 100, 
                        borderRadius: 8,
                        backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => removePhoto(index)}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        backgroundColor: currentColors.error,
                        borderRadius: 12,
                        width: 24,
                        height: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {photos.length < 5 && (
              <TouchableOpacity
                onPress={showPhotoOptions}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: currentColors.primary.main,
                }}
              >
                <Ionicons 
                  name="camera" 
                  size={24} 
                  color={currentColors.primary.main} 
                  style={{ marginRight: 12 }}
                />
                <Text style={{
                  ...typography.body,
                  color: currentColors.primary.main,
                  fontWeight: '600',
                }}>
                  Add Photos
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Voice Recording Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{
              ...typography.body,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
              fontWeight: '600',
              marginBottom: 12,
            }}>
              Voice Recording
            </Text>
            
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={recording ? stopRecording : startRecording}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: recording ? currentColors.error : currentColors.success,
                  borderRadius: 12,
                  padding: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {recording ? (
                  <PulseAnimation>
                    <Ionicons name="stop" size={24} color="#fff" style={{ marginRight: 8 }} />
                  </PulseAnimation>
                ) : (
                  <Ionicons name="mic" size={24} color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text style={{
                  ...typography.button,
                  color: '#fff',
                }}>
                  {recording ? "Stop Recording" : "Start Recording"}
                </Text>
              </TouchableOpacity>

              {voiceUri && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={playSound}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: currentColors.secondary.main,
                      borderRadius: 12,
                      padding: 12,
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="play" size={20} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={{
                      ...typography.bodySmall,
                      color: '#fff',
                      fontWeight: '600',
                    }}>
                      Play
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setVoiceUri(null)}
                    style={{
                      backgroundColor: currentColors.error,
                      borderRadius: 12,
                      padding: 12,
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="trash" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Submit Button */}
          <Animated.View
            style={{
              transform: [{
                scale: submitAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.95],
                })
              }]
            }}
          >
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={{
                backgroundColor: loading ? currentColors.button.primaryDisabled : currentColors.primary.main,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              {loading ? (
                <LoadingSpinner size="small" color="#fff" />
              ) : (
                <Text style={{
                  ...typography.button,
                  color: '#fff',
                  fontSize: 18,
                }}>
                  Submit Report
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
            borderRadius: 20,
            padding: 30,
            alignItems: 'center',
            marginHorizontal: 40,
          }}>
            <View style={{
              backgroundColor: currentColors.success,
              borderRadius: 50,
              padding: 20,
              marginBottom: 20,
            }}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </View>
            <Text style={{
              ...typography.h3,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
              textAlign: 'center',
              marginBottom: 8,
            }}>
              Report Submitted!
            </Text>
            <Text style={{
              ...typography.body,
              color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
              textAlign: 'center',
            }}>
              Thank you for helping keep our roads safe
            </Text>
          </View>
        </View>
      </Modal>

      <EnhancedNavigation />
    </SafeAreaView>
  );
}