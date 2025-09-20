import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../../services/auth';
import { useLocation } from '../../services/location';
import { useNotification } from '../../services/notifications';
import { apiService } from '../../services/api';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { globalStyles } from '../../styles/globalStyles';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  INCIDENT_TYPES, 
  INCIDENT_SEVERITY, 
  EMERGENCY_SERVICES,
  FILE_UPLOAD,
  SUCCESS_MESSAGES 
} from '../../utils/constants';

interface IncidentForm {
  type: string;
  severity: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  } | null;
  emergencyServices: string[];
  images: string[];
}

interface LocationDetails {
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
}

const IncidentReporting: React.FC = () => {
  const { user } = useAuth();
  const { currentLocation, requestLocationPermission } = useLocation();
  const { showNotification } = useNotification();

  const [form, setForm] = useState<IncidentForm>({
    type: '',
    severity: '',
    description: '',
    location: null,
    emergencyServices: [],
    images: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [errors, setErrors] = useState<Partial<IncidentForm>>({});

  useEffect(() => {
    // Auto populate location if available
    if (currentLocation && !form.location) {
      handleUseCurrentLocation();
    }
  }, [currentLocation]);

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!form.type) newErrors.type = 'Incident type is required';
    if (!form.severity) newErrors.severity = 'Severity level is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (!form.location) newErrors.location = 'Location is required';

    if (form.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUseCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);

      let location = currentLocation;
      if (!location) {
        const permissionGranted = await requestLocationPermission();
        if (!permissionGranted) {
          Alert.alert(
            'Location Permission Required',
            'Please enable location permission to auto-detect your location.',
            [{ text: 'OK' }]
          );
          return;
        }

        const locationResult = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 15000,
        });
        
        location = {
          latitude: locationResult.coords.latitude,
          longitude: locationResult.coords.longitude,
        };
      }

      const addressResult = await apiService.reverseGeocode(
        location.latitude,
        location.longitude
      );

      setForm(prev => ({
        ...prev,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: addressResult.address?.formatted_address || 'Address not found',
        }
      }));

      setShowLocationModal(false);
      showNotification('Location detected successfully', 'success');

    } catch (error) {
      console.error('Location detection error:', error);
      showNotification('Failed to detect location', 'error');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleManualLocation = async () => {
    if (!manualAddress.trim()) {
      Alert.alert('Error', 'Please enter an address');
      return;
    }

    try {
      setIsLoadingLocation(true);

      const geocodeResult = await apiService.geocodeAddress(manualAddress);
      
      setForm(prev => ({
        ...prev,
        location: {
          latitude: geocodeResult.location.latitude,
          longitude: geocodeResult.location.longitude,
          address: manualAddress,
        }
      }));

      setShowLocationModal(false);
      setManualAddress('');
      showNotification('Location set successfully', 'success');

    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert('Error', 'Could not find the specified address. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permission to take photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: FILE_UPLOAD.IMAGE_QUALITY,
        maxWidth: FILE_UPLOAD.IMAGE_MAX_WIDTH,
        maxHeight: FILE_UPLOAD.IMAGE_MAX_HEIGHT,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        if (form.images.length >= FILE_UPLOAD.MAX_IMAGES_PER_INCIDENT) {
          Alert.alert(
            'Limit Reached',
            `You can only attach up to ${FILE_UPLOAD.MAX_IMAGES_PER_INCIDENT} images.`
          );
          return;
        }

        setForm(prev => ({
          ...prev,
          images: [...prev.images, imageUri]
        }));
      }
    } catch (error) {
      console.error('Camera error:', error);
      showNotification('Failed to take photo', 'error');
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Gallery Permission Required',
          'Please enable gallery permission to select photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: FILE_UPLOAD.IMAGE_QUALITY,
        maxWidth: FILE_UPLOAD.IMAGE_MAX_WIDTH,
        maxHeight: FILE_UPLOAD.IMAGE_MAX_HEIGHT,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        if (form.images.length >= FILE_UPLOAD.MAX_IMAGES_PER_INCIDENT) {
          Alert.alert(
            'Limit Reached',
            `You can only attach up to ${FILE_UPLOAD.MAX_IMAGES_PER_INCIDENT} images.`
          );
          return;
        }

        setForm(prev => ({
          ...prev,
          images: [...prev.images, imageUri]
        }));
      }
    } catch (error) {
      console.error('Gallery error:', error);
      showNotification('Failed to select photo', 'error');
    }
  };

  const handleRemoveImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const toggleEmergencyService = (service: string) => {
    setForm(prev => ({
      ...prev,
      emergencyServices: prev.emergencyServices.includes(service)
        ? prev.emergencyServices.filter(s => s !== service)
        : [...prev.emergencyServices, service]
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const incidentData = {
        type: form.type,
        severity: form.severity,
        description: form.description.trim(),
        location: form.location,
        emergencyServices: form.emergencyServices,
        images: form.images, // In production, upload images first and get URLs
      };

      await apiService.reportIncident(incidentData);

      // Reset form
      setForm({
        type: '',
        severity: '',
        description: '',
        location: null,
        emergencyServices: [],
        images: [],
      });

      Alert.alert(
        'Success',
        SUCCESS_MESSAGES.INCIDENT_REPORTED,
        [{ text: 'OK' }]
      );

      showNotification('Incident reported successfully', 'success');

    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to report incident. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIncidentTypeIcon = (type: string) => {
    switch (type) {
      case INCIDENT_TYPES.ACCIDENT: return 'car-sport';
      case INCIDENT_TYPES.BREAKDOWN: return 'construct';
      case INCIDENT_TYPES.ROADWORK: return 'hammer';
      case INCIDENT_TYPES.DEBRIS: return 'warning';
      case INCIDENT_TYPES.WEATHER: return 'rainy';
      case INCIDENT_TYPES.CONGESTION: return 'car-multiple';
      case INCIDENT_TYPES.EMERGENCY: return 'medical';
      default: return 'alert-circle';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case INCIDENT_SEVERITY.CRITICAL: return colors.severity.critical;
      case INCIDENT_SEVERITY.HIGH: return colors.severity.high;
      case INCIDENT_SEVERITY.MEDIUM: return colors.severity.medium;
      case INCIDENT_SEVERITY.LOW: return colors.severity.low;
      default: return colors.text.secondary;
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.userInfo}>
          <Text style={styles.userText}>
            Reporting as: {user?.name} ({user?.role?.replace('_', ' ')})
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incident Type *</Text>
          <View style={styles.optionsGrid}>
            {Object.values(INCIDENT_TYPES).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.optionButton,
                  form.type === type && styles.optionSelected
                ]}
                onPress={() => setForm(prev => ({ ...prev, type }))}
              >
                <Ionicons
                  name={getIncidentTypeIcon(type)}
                  size={20}
                  color={form.type === type ? colors.primary.main : colors.text.secondary}
                />
                <Text style={[
                  styles.optionText,
                  form.type === type && styles.optionTextSelected
                ]}>
                  {type.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Severity Level *</Text>
          <View style={styles.severityContainer}>
            {Object.values(INCIDENT_SEVERITY).map((severity) => (
              <TouchableOpacity
                key={severity}
                style={[
                  styles.severityButton,
                  form.severity === severity && styles.severitySelected,
                  { borderColor: getSeverityColor(severity) }
                ]}
                onPress={() => setForm(prev => ({ ...prev, severity }))}
              >
                <Text style={[
                  styles.severityText,
                  form.severity === severity && { color: getSeverityColor(severity) }
                ]}>
                  {severity.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.severity && <Text style={styles.errorText}>{errors.severity}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, errors.description && styles.inputError]}
            placeholder="Describe what you see... (minimum 10 characters)"
            value={form.description}
            onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {form.description.length}/500 characters
          </Text>
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location *</Text>
          {form.location ? (
            <View style={styles.locationDisplay}>
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={16} color={colors.success} />
                <Text style={styles.locationText} numberOfLines={2}>
                  {form.location.address}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeLocationButton}
                onPress={() => setShowLocationModal(true)}
              >
                <Text style={styles.changeLocationText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addLocationButton}
              onPress={() => setShowLocationModal(true)}
            >
              <Ionicons name="add-circle" size={20} color={colors.primary.main} />
              <Text style={styles.addLocationText}>Add Location</Text>
            </TouchableOpacity>
          )}
          {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Services Needed</Text>
          <Text style={styles.sectionSubtitle}>
            Select services that should be notified (optional)
          </Text>
          <View style={styles.servicesGrid}>
            {Object.values(EMERGENCY_SERVICES).map((service) => (
              <TouchableOpacity
                key={service}
                style={[
                  styles.serviceButton,
                  form.emergencyServices.includes(service) && styles.serviceSelected
                ]}
                onPress={() => toggleEmergencyService(service)}
              >
                <Text style={[
                  styles.serviceText,
                  form.emergencyServices.includes(service) && styles.serviceTextSelected
                ]}>
                  {service.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos (Optional)</Text>
          <Text style={styles.sectionSubtitle}>
            Add up to {FILE_UPLOAD.MAX_IMAGES_PER_INCIDENT} photos to help responders
          </Text>
          
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
              <Ionicons name="camera" size={20} color={colors.primary.main} />
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.photoButton} onPress={handleSelectFromGallery}>
              <Ionicons name="images" size={20} color={colors.primary.main} />
              <Text style={styles.photoButtonText}>From Gallery</Text>
            </TouchableOpacity>
          </View>

          {form.images.length > 0 && (
            <ScrollView horizontal style={styles.imagePreviewContainer}>
              {form.images.map((imageUri, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <LoadingSpinner size="small" color={colors.text.light} showText={false} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={colors.text.light} />
              <Text style={styles.submitButtonText}>Report Incident</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showLocationModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Incident Location</Text>
            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.locationOption}
              onPress={handleUseCurrentLocation}
              disabled={isLoadingLocation}
            >
              <Ionicons name="locate" size={24} color={colors.primary.main} />
              <View style={styles.locationOptionText}>
                <Text style={styles.locationOptionTitle}>Use Current Location</Text>
                <Text style={styles.locationOptionSubtitle}>
                  Automatically detect your location
                </Text>
              </View>
              {isLoadingLocation && <LoadingSpinner size="small" />}
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.manualLocationContainer}>
              <Text style={styles.manualLocationTitle}>Enter Address Manually</Text>
              <TextInput
                style={styles.addressInput}
                placeholder="Enter address or landmark"
                value={manualAddress}
                onChangeText={setManualAddress}
              />
              <TouchableOpacity
                style={styles.setLocationButton}
                onPress={handleManualLocation}
                disabled={isLoadingLocation || !manualAddress.trim()}
              >
                <Text style={styles.setLocationButtonText}>Set Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  userInfo: {
    backgroundColor: colors.primary.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  userText: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.light,
    marginBottom: 8,
  },
  