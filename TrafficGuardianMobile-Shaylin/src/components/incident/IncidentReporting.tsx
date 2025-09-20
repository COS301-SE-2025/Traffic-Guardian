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

  