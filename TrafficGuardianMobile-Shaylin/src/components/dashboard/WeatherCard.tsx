import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../services/location';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { globalStyles } from '../../styles/globalStyles';

interface WeatherData {
  location: {
    name: string;
    region: string;
  };
  current: {
    temp_c: number;
    condition: {
      text: string;
      icon: string;
    };
    humidity: number;
    wind_kph: number;
    wind_dir: string;
    visibility: number;
  };
}

const WeatherCard: React.FC = () => {
  const { currentLocation } = useLocation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentLocation) {
      fetchWeather();
    }
  }, [currentLocation]);

  const fetchWeather = async () => {
    if (!currentLocation) return;

    try {
      setIsLoading(true);
      setError(null);

      // Mock weather data - in production, use a weather API
      const mockWeather: WeatherData = {
        location: {
          name: 'Johannesburg',
          region: 'Gauteng',
        },
        current: {
          temp_c: 22 + Math.floor(Math.random() * 10),
          condition: {
            text: ['Clear', 'Partly Cloudy', 'Sunny', 'Overcast'][Math.floor(Math.random() * 4)],
            icon: 'sunny',
          },
          humidity: 45 + Math.floor(Math.random() * 30),
          wind_kph: 5 + Math.floor(Math.random() * 15),
          wind_dir: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
          visibility: 8 + Math.floor(Math.random() * 7),
        },
      };

      setWeather(mockWeather);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('Unable to load weather data');
    } finally {
      setIsLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('sunny') || conditionLower.includes('clear')) {
      return 'sunny';
    } else if (conditionLower.includes('cloud')) {
      return 'partly-sunny';
    } else if (conditionLower.includes('rain')) {
      return 'rainy';
    } else if (conditionLower.includes('storm')) {
      return 'thunderstorm';
    } else {
      return 'cloudy';
    }
  };

  const getTemperatureColor = (temp: number) => {
    if (temp > 30) return colors.error;
    if (temp > 25) return colors.warning;
    if (temp > 15) return colors.success;
    return colors.secondary.main;
  };

  if (!currentLocation) {
    return (
      <View style={styles.container}>
        <View style={styles.noLocationContainer}>
          <Ionicons name="location-off" size={24} color={colors.text.secondary} />
          <Text style={styles.noLocationText}>
            Enable location for weather updates
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh" size={24} color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading weather...</Text>
        </View>
      </View>
    );
  }

  if (error || !weather) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={24} color={colors.error} />
          <Text style={styles.errorText}>{error || 'Weather unavailable'}</Text>
          <TouchableOpacity onPress={fetchWeather} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={fetchWeather} style={styles.weatherCard}>
        <View style={styles.weatherHeader}>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color={colors.text.secondary} />
            <Text style={styles.locationText}>
              {weather.location.name}, {weather.location.region}
            </Text>
          </View>
          <TouchableOpacity onPress={fetchWeather}>
            <Ionicons name="refresh" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.weatherMain}>
          <View style={styles.temperatureContainer}>
            <Ionicons 
              name={getWeatherIcon(weather.current.condition.text)} 
              size={32} 
              color={getTemperatureColor(weather.current.temp_c)} 
            />
            <Text 
              style={[
                styles.temperature,
                { color: getTemperatureColor(weather.current.temp_c) }
              ]}
            >
              {weather.current.temp_c}°C
            </Text>
          </View>
          
          <View style={styles.conditionContainer}>
            <Text style={styles.condition}>
              {weather.current.condition.text}
            </Text>
            <Text style={styles.feelsLike}>
              Feels like {weather.current.temp_c + Math.floor(Math.random() * 6 - 3)}°C
            </Text>
          </View>
        </View>

        <View style={styles.weatherDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="water" size={14} color={colors.text.secondary} />
            <Text style={styles.detailText}>
              {weather.current.humidity}% humidity
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Ionicons name="leaf" size={14} color={colors.text.secondary} />
            <Text style={styles.detailText}>
              {weather.current.wind_kph} km/h {weather.current.wind_dir}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Ionicons name="eye" size={14} color={colors.text.secondary} />
            <Text style={styles.detailText}>
              {weather.current.visibility} km visibility
            </Text>
          </View>
        </View>

        {/* Weather impact on driving */}
        <View style={styles.drivingImpact}>
          <Ionicons name="car" size={14} color={colors.primary.main} />
          <Text style={styles.drivingText}>
            {weather.current.condition.text.toLowerCase().includes('rain') ? 
              'Drive carefully - wet roads' :
              weather.current.visibility < 5 ?
              'Reduced visibility - drive slowly' :
              'Good driving conditions'
            }
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

