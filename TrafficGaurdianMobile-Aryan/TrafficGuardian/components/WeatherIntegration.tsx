import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../services/location';
import { useTheme } from '../services/themeContext';
import { typography } from '../styles/typography';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  icon: string;
  alerts: WeatherAlert[];
}

interface WeatherAlert {
  type: 'rain' | 'fog' | 'wind' | 'ice' | 'snow';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

// Real weather service using OpenWeatherMap API
const weatherService = {
  async getWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      // TODO: Add  OpenWeatherMap API key here
      const API_KEY = '';
      
      if (!API_KEY) {
        throw new Error('Weather API key not configured');
      }
      
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
      );
      
      if (!response.ok) {
        throw new Error('Weather data unavailable');
      }
      
      const data = await response.json();
      
      // Get weather alerts if available
      const alertsResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&exclude=minutely,hourly,daily`
      );
      
      let alerts: WeatherAlert[] = [];
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        alerts = (alertsData.alerts || []).map((alert: any) => ({
          type: getAlertType(alert.event),
          severity: getAlertSeverity(alert.tags),
          message: alert.description,
        }));
      }
      
      return {
        location: data.name || 'Unknown Location',
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].main,
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        visibility: data.visibility ? data.visibility / 1000 : 10, // Convert m to km
        icon: getWeatherIcon(data.weather[0].icon),
        alerts,
      };
    } catch (error) {
      console.error('Weather service error:', error);
      throw error;
    }
  }
};

const getAlertType = (event: string): WeatherAlert['type'] => {
  const eventLower = event.toLowerCase();
  if (eventLower.includes('rain') || eventLower.includes('storm')) return 'rain';
  if (eventLower.includes('fog')) return 'fog';
  if (eventLower.includes('wind')) return 'wind';
  if (eventLower.includes('ice') || eventLower.includes('freeze')) return 'ice';
  if (eventLower.includes('snow')) return 'snow';
  return 'rain'; // Default
};

const getAlertSeverity = (tags: string[]): WeatherAlert['severity'] => {
  if (!tags) return 'medium';
  const severity = tags.find(tag => ['minor', 'moderate', 'severe', 'extreme'].includes(tag.toLowerCase()));
  if (severity === 'minor') return 'low';
  if (severity === 'moderate') return 'medium';
  return 'high';
};

const getWeatherIcon = (iconCode: string): string => {
  const iconMap: { [key: string]: string } = {
    '01d': 'sunny', '01n': 'moon',
    '02d': 'partly-sunny', '02n': 'cloudy-night',
    '03d': 'cloud', '03n': 'cloud',
    '04d': 'cloudy', '04n': 'cloudy',
    '09d': 'rainy', '09n': 'rainy',
    '10d': 'rainy', '10n': 'rainy',
    '11d': 'thunderstorm', '11n': 'thunderstorm',
    '13d': 'snow', '13n': 'snow',
    '50d': 'cloudy', '50n': 'cloudy',
  };
  return iconMap[iconCode] || 'cloud';
};

interface WeatherIntegrationProps {
  onWeatherUpdate?: (weather: WeatherData) => void;
  compact?: boolean;
}

const getWeatherIconColor = (icon: string) => {
  switch (icon) {
    case 'sunny': return '#fbbf24';
    case 'cloud': return '#9ca3af';
    case 'rainy': return '#3b82f6';
    case 'cloudy': return '#6b7280';
    default: return '#6b7280';
  }
};

const getAlertColor = (severity: string) => {
  switch (severity) {
    case 'low': return '#10b981';
    case 'medium': return '#f59e0b';
    case 'high': return '#ef4444';
    default: return '#6b7280';
  }
};

export const WeatherIntegration = ({ onWeatherUpdate, compact = false }: WeatherIntegrationProps) => {
  const { coords } = useLocation();
  const { currentColors, isDark } = useTheme();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (coords) {
      loadWeatherData();
      // Refresh weather every 30 minutes
      const interval = setInterval(loadWeatherData, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [coords]);

  const loadWeatherData = async () => {
    if (!coords) return;
    
    try {
      setLoading(true);
      const weatherData = await mockWeatherService.getWeatherData(
        coords.latitude,
        coords.longitude
      );
      setWeather(weatherData);
      setLastUpdate(new Date());
      onWeatherUpdate?.(weatherData);
    } catch (error) {
      console.error('Weather fetch error:', error);
      Alert.alert('Weather Error', 'Unable to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  if (!weather && !loading) {
    return (
      <TouchableOpacity
        onPress={loadWeatherData}
        style={{
          backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
          borderRadius: 12,
          padding: compact ? 8 : 16,
          marginVertical: 4,
          borderWidth: 1,
          borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
          alignItems: 'center',
        }}
      >
        <Ionicons
          name="cloud-outline"
          size={24}
          color={isDark ? currentColors.dark.textSecondary : currentColors.text.secondary}
        />
        <Text
          style={{
            ...typography.bodySmall,
            color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          Tap to load weather
        </Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View
        style={{
          backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
          borderRadius: 12,
          padding: compact ? 8 : 16,
          marginVertical: 4,
          borderWidth: 1,
          borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
          alignItems: 'center',
        }}
      >
        <Ionicons
          name="refresh"
          size={24}
          color={currentColors.primary.main}
        />
        <Text
          style={{
            ...typography.bodySmall,
            color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
            marginTop: 4,
          }}
        >
          Loading weather...
        </Text>
      </View>
    );
  }

  if (!weather) return null;

  if (compact) {
    return (
      <TouchableOpacity
        onPress={loadWeatherData}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
          borderRadius: 8,
          padding: 8,
          marginVertical: 4,
          borderWidth: 1,
          borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
        }}
      >
        <Ionicons
          name={weather.icon as any}
          size={20}
          color={getWeatherIconColor(weather.icon)}
          style={{ marginRight: 8 }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...typography.bodySmall,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
              fontWeight: '600',
            }}
          >
            {weather.temperature}°C
          </Text>
          <Text
            style={{
              ...typography.caption,
              color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
            }}
          >
            {weather.condition}
          </Text>
        </View>
        {weather.alerts.length > 0 && (
          <View
            style={{
              backgroundColor: getAlertColor(weather.alerts[0].severity),
              borderRadius: 10,
              width: 20,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                ...typography.caption,
                color: '#fff',
                fontWeight: '600',
                fontSize: 10,
              }}
            >
              {weather.alerts.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={{
        backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: isDark ? currentColors.dark.border : currentColors.border.light,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            ...typography.h4,
            color: isDark ? currentColors.dark.text : currentColors.text.primary,
          }}
        >
          Weather Conditions
        </Text>
        <TouchableOpacity onPress={loadWeatherData}>
          <Ionicons
            name="refresh"
            size={20}
            color={isDark ? currentColors.dark.textSecondary : currentColors.text.secondary}
          />
        </TouchableOpacity>
      </View>

      {/* Main Weather Info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Ionicons
          name={weather.icon as any}
          size={48}
          color={getWeatherIconColor(weather.icon)}
          style={{ marginRight: 16 }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...typography.h2,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
            }}
          >
            {weather.temperature}°C
          </Text>
          <Text
            style={{
              ...typography.body,
              color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
            }}
          >
            {weather.condition}
          </Text>
          <Text
            style={{
              ...typography.caption,
              color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
            }}
          >
            {weather.location} • {formatLastUpdate()}
          </Text>
        </View>
      </View>

      {/* Weather Details */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: weather.alerts.length > 0 ? 16 : 0,
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Ionicons
            name="water"
            size={16}
            color={isDark ? currentColors.dark.textSecondary : currentColors.text.secondary}
          />
          <Text
            style={{
              ...typography.caption,
              color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
              marginTop: 4,
            }}
          >
            {weather.humidity}%
          </Text>
          <Text
            style={{
              ...typography.caption,
              color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
            }}
          >
            Humidity
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Ionicons
            name="leaf"
            size={16}
            color={isDark ? currentColors.dark.textSecondary : currentColors.text.secondary}
          />
          <Text
            style={{
              ...typography.caption,
              color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
              marginTop: 4,
            }}
          >
            {weather.windSpeed} km/h
          </Text>
          <Text
            style={{
              ...typography.caption,
              color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
            }}
          >
            Wind
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Ionicons
            name="eye"
            size={16}
            color={isDark ? currentColors.dark.textSecondary : currentColors.text.secondary}
          />
          <Text
            style={{
              ...typography.caption,
              color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
              marginTop: 4,
            }}
          >
            {weather.visibility} km
          </Text>
          <Text
            style={{
              ...typography.caption,
              color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
            }}
          >
            Visibility
          </Text>
        </View>
      </View>

      {/* Weather Alerts */}
      {weather.alerts.map((alert, index) => (
        <View
          key={index}
          style={{
            backgroundColor: getAlertColor(alert.severity) + '20',
            borderLeftWidth: 4,
            borderLeftColor: getAlertColor(alert.severity),
            borderRadius: 8,
            padding: 12,
            marginTop: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons
              name="warning"
              size={16}
              color={getAlertColor(alert.severity)}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                ...typography.bodySmall,
                color: getAlertColor(alert.severity),
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              {alert.type} Alert - {alert.severity}
            </Text>
          </View>
          <Text
            style={{
              ...typography.bodySmall,
              color: isDark ? currentColors.dark.text : currentColors.text.primary,
            }}
          >
            {alert.message}
          </Text>
        </View>
      ))}
    </View>
  );
};