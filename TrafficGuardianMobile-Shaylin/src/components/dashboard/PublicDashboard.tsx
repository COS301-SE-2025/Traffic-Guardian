import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/auth';
import { useLocation } from '../../services/location';
import { useNotification } from '../../services/notifications';
import { apiService } from '../../services/api';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { globalStyles } from '../../styles/globalStyles';
import LoadingSpinner from '../common/LoadingSpinner';
import StatCard from '../common/StatCard';
import WeatherCard from './WeatherCard';
import { INCIDENT_TYPES, TIME_FRAMES } from '../../utils/constants';

const { width } = Dimensions.get('window');

interface NearbyIncident {
  id: number;
  type: string;
  severity: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  description: string;
  status: string;
  trafficImpact: string;
  estimatedClearanceTime: string;
  createdAt: string;
}

interface PublicAnalytics {
  timeframe: string;
  summary: {
    totalIncidents: number;
    totalAccidents: number;
    avgResponseTime: number;
    resolutionRate: number;
  };
  insights: {
    safetyTrend: string;
    busyHours: string[];
    commonLocations: string[];
  };
}

interface SafetyScore {
  safetyScore: number;
  scoreCategory: string;
  riskFactors: string[];
  recentIncidents: number;
}

const PublicDashboard: React.FC = () => {
  const { user } = useAuth();
  const { currentLocation, isLocationEnabled, requestLocationPermission } = useLocation();
  const { showNotification } = useNotification();

  const [nearbyIncidents, setNearbyIncidents] = useState<NearbyIncident[]>([]);
  const [analytics, setAnalytics] = useState<PublicAnalytics | null>(null);
  const [safetyScore, setSafetyScore] = useState<SafetyScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadDashboardData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);

      let location = currentLocation;
      if (!location && !isLocationEnabled) {
        const granted = await requestLocationPermission();
        if (!granted) {
          showNotification('Location permission required for nearby incidents', 'warning');
          return;
        }
      }

      const promises = [];

      if (location) {
        promises.push(
          apiService.getNearbyIncidents(
            location.latitude,
            location.longitude,
            10 // 10km radius
          ).catch(error => {
            console.error('Failed to fetch nearby incidents:', error);
            return { incidents: [] };
          })
        );

        promises.push(
          apiService.getSafetyScore(
            location.latitude,
            location.longitude,
            5 // 5km radius
          ).catch(error => {
            console.error('Failed to fetch safety score:', error);
            return null;
          })
        );
      } else {
        promises.push(Promise.resolve({ incidents: [] }));
        promises.push(Promise.resolve(null));
      }

      promises.push(
        apiService.getPublicAnalytics(TIME_FRAMES.WEEK).catch(error => {
          console.error('Failed to fetch analytics:', error);
          return null;
        })
      );

      