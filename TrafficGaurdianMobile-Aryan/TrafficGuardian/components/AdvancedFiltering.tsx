import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  Switch,
  Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/themeContext';
import { typography } from '../styles/typography';

export interface FilterOptions {
  severity: string[];
  incidentTypes: string[];
  timeRange: string;
  distance: number;
  showResolved: boolean;
}

interface AdvancedFilteringProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

const severityOptions = [
  { label: 'Low', value: 'low', color: '#10b981' },
  { label: 'Medium', value: 'medium', color: '#f59e0b' },
  { label: 'High', value: 'high', color: '#ef4444' },
  { label: 'Critical', value: 'critical', color: '#dc2626' },
];

const incidentTypeOptions = [
  { label: 'Accident', value: 'accident', icon: 'car-sport' },
  { label: 'Breakdown', value: 'breakdown', icon: 'construct' },
  { label: 'Road Works', value: 'roadworks', icon: 'hammer' },
  { label: 'Weather', value: 'weather', icon: 'rainy' },
  { label: 'Traffic Jam', value: 'jam', icon: 'time' },
  { label: 'Debris', value: 'debris', icon: 'warning' },
  { label: 'Emergency', value: 'emergency', icon: 'medical' },
];

const timeRangeOptions = [
  { label: 'Last Hour', value: '1h' },
  { label: 'Last 6 Hours', value: '6h' },
  { label: 'Last 24 Hours', value: '24h' },
  { label: 'Last Week', value: '7d' },
  { label: 'All Time', value: 'all' },
];

const distanceOptions = [1, 5, 10, 25, 50, 100]; // in km

export const AdvancedFiltering = ({ 
  visible, 
  onClose, 
  onApplyFilters, 
  currentFilters 
}: AdvancedFilteringProps) => {
  const { currentColors, isDark } = useTheme();
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);
  const [slideAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleSeverityToggle = (severity: string) => {
    setFilters(prev => ({
      ...prev,
      severity: prev.severity.includes(severity)
        ? prev.severity.filter(s => s !== severity)
        : [...prev.severity, severity]
    }));
  };

  const handleIncidentTypeToggle = (type: string) => {
    setFilters(prev => ({
      ...prev,
      incidentTypes: prev.incidentTypes.includes(type)
        ? prev.incidentTypes.filter(t => t !== type)
        : [...prev.incidentTypes, type]
    }));
  };

  const resetFilters = () => {
    setFilters({
      severity: [],
      incidentTypes: [],
      timeRange: 'all',
      distance: 50,
      showResolved: false,
    });
  };

  const applyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <Animated.View
          style={{
            backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '80%',
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [500, 0],
              }),
            }],
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? currentColors.dark.border : currentColors.border.light,
            }}
          >
            <Text
              style={{
                ...typography.h3,
                color: isDark ? currentColors.dark.text : currentColors.text.primary,
              }}
            >
              Advanced Filters
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? currentColors.dark.text : currentColors.text.primary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            {/* Severity Filter */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  ...typography.h4,
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                  marginBottom: 12,
                }}
              >
                Severity
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {severityOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => handleSeverityToggle(option.value)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 20,
                      marginRight: 8,
                      marginBottom: 8,
                      backgroundColor: filters.severity.includes(option.value)
                        ? option.color
                        : 'transparent',
                      borderWidth: 1,
                      borderColor: option.color,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.body,
                        color: filters.severity.includes(option.value)
                          ? '#fff'
                          : option.color,
                        fontWeight: '600',
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Incident Types */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  ...typography.h4,
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                  marginBottom: 12,
                }}
              >
                Incident Types
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {incidentTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => handleIncidentTypeToggle(option.value)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 20,
                      marginRight: 8,
                      marginBottom: 8,
                      backgroundColor: filters.incidentTypes.includes(option.value)
                        ? currentColors.primary.main
                        : 'transparent',
                      borderWidth: 1,
                      borderColor: filters.incidentTypes.includes(option.value)
                        ? currentColors.primary.main
                        : currentColors.border.light,
                    }}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={16}
                      color={filters.incidentTypes.includes(option.value)
                        ? '#fff'
                        : isDark ? currentColors.dark.text : currentColors.text.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        ...typography.bodySmall,
                        color: filters.incidentTypes.includes(option.value)
                          ? '#fff'
                          : isDark ? currentColors.dark.text : currentColors.text.primary,
                        fontWeight: '500',
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Range */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  ...typography.h4,
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                  marginBottom: 12,
                }}
              >
                Time Range
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {timeRangeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setFilters(prev => ({ ...prev, timeRange: option.value }))}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 20,
                      marginRight: 8,
                      marginBottom: 8,
                      backgroundColor: filters.timeRange === option.value
                        ? currentColors.primary.main
                        : 'transparent',
                      borderWidth: 1,
                      borderColor: filters.timeRange === option.value
                        ? currentColors.primary.main
                        : currentColors.border.light,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.body,
                        color: filters.timeRange === option.value
                          ? '#fff'
                          : isDark ? currentColors.dark.text : currentColors.text.primary,
                        fontWeight: '500',
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Distance */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  ...typography.h4,
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                  marginBottom: 12,
                }}
              >
                Distance Range: {filters.distance}km
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {distanceOptions.map((distance) => (
                  <TouchableOpacity
                    key={distance}
                    onPress={() => setFilters(prev => ({ ...prev, distance }))}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 20,
                      marginRight: 8,
                      marginBottom: 8,
                      backgroundColor: filters.distance === distance
                        ? currentColors.primary.main
                        : 'transparent',
                      borderWidth: 1,
                      borderColor: filters.distance === distance
                        ? currentColors.primary.main
                        : currentColors.border.light,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.body,
                        color: filters.distance === distance
                          ? '#fff'
                          : isDark ? currentColors.dark.text : currentColors.text.primary,
                        fontWeight: '500',
                      }}
                    >
                      {distance}km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Show Resolved */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  ...typography.h4,
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                }}
              >
                Show Resolved Incidents
              </Text>
              <Switch
                value={filters.showResolved}
                onValueChange={(value) => setFilters(prev => ({ ...prev, showResolved: value }))}
                trackColor={{ false: currentColors.border.light, true: currentColors.primary.main }}
                thumbColor={filters.showResolved ? '#fff' : '#f4f3f4'}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View
            style={{
              flexDirection: 'row',
              padding: 20,
              borderTopWidth: 1,
              borderTopColor: isDark ? currentColors.dark.border : currentColors.border.light,
            }}
          >
            <TouchableOpacity
              onPress={resetFilters}
              style={{
                flex: 1,
                paddingVertical: 12,
                marginRight: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: currentColors.border.light,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  ...typography.button,
                  color: isDark ? currentColors.dark.text : currentColors.text.primary,
                }}
              >
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={applyFilters}
              style={{
                flex: 1,
                paddingVertical: 12,
                marginLeft: 8,
                borderRadius: 8,
                backgroundColor: currentColors.primary.main,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  ...typography.button,
                  color: '#fff',
                }}
              >
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};