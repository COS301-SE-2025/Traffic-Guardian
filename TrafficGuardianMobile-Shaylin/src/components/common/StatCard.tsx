import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { globalStyles } from '../../styles/globalStyles';

const { width } = Dimensions.get('window');

interface StatCardProps {
  title: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: string;
  };
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = colors.primary.main,
  subtitle,
  trend,
  onPress,
  size = 'medium',
  loading = false,
}) => {
  const cardWidth = getCardWidth(size);
  
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      case 'stable':
        return 'remove';
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    if (!trend) return colors.text.secondary;
    
    switch (trend.direction) {
      case 'up':
        return colors.success;
      case 'down':
        return colors.error;
      case 'stable':
        return colors.warning;
      default:
        return colors.text.secondary;
    }
  };

  const CardComponent = onPress ? TouchableOpacity : View;

  if (loading) {
    return (
      <View style={[styles.container, { width: cardWidth }, styles.loading]}>
        <View style={styles.loadingShimmer} />
      </View>
    );
  }

  return (
    <CardComponent
      style={[
        styles.container,
        { width: cardWidth },
        size === 'large' && styles.largeContainer,
        onPress && styles.pressable,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={getIconSize(size)} color={color} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={[styles.title, size === 'small' && styles.titleSmall]} numberOfLines={2}>
            {title}
          </Text>
          {trend && (
            <View style={styles.trendContainer}>
              <Ionicons 
                name={getTrendIcon() as any} 
                size={12} 
                color={getTrendColor()} 
              />
              <Text style={[styles.trendText, { color: getTrendColor() }]}>
                {trend.value}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.valueContainer}>
        <Text 
          style={[
            styles.value, 
            { color },
            size === 'small' && styles.valueSmall,
            size === 'large' && styles.valueLarge,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
      </View>

      {subtitle && (
        <Text 
          style={[styles.subtitle, size === 'small' && styles.subtitleSmall]} 
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      )}

      {title.toLowerCase().includes('rate') || title.toLowerCase().includes('score') ? (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  backgroundColor: color,
                  width: `${Math.min(parseFloat(value.replace('%', '')) || 0, 100)}%`
                }
              ]} 
            />
          </View>
        </View>
      ) : null}
    </CardComponent>
  );
};

