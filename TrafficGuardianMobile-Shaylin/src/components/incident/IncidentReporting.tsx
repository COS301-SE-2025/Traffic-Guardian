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

  