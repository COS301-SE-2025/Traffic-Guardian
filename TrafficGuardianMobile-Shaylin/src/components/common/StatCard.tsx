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

const getCardWidth = (size: 'small' | 'medium' | 'large') => {
  const screenWidth = width - 40; 
  
  switch (size) {
    case 'small':
      return (screenWidth - 12) / 3; // 3 cards per row with gaps
    case 'medium':
      return (screenWidth - 12) / 2; // 2 cards per row with gaps
    case 'large':
      return screenWidth; // Full width
    default:
      return (screenWidth - 12) / 2;
  }
};

const getIconSize = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return 16;
    case 'medium':
      return 20;
    case 'large':
      return 24;
    default:
      return 20;
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.light,
    borderRadius: 12,
    padding: 16,
    ...globalStyles.shadow,
  },
  largeContainer: {
    padding: 20,
  },
  pressable: {
    transform: [{ scale: 1 }],
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingShimmer: {
    width: '100%',
    height: 60,
    backgroundColor: colors.surface.disabled,
    borderRadius: 8,
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleSmall: {
    fontSize: 10,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  trendText: {
    ...typography.caption,
    marginLeft: 4,
    fontWeight: '600',
  },
  valueContainer: {
    marginBottom: 8,
  },
  value: {
    ...typography.statValue,
    fontWeight: '700',
    lineHeight: 32,
  },
  valueSmall: {
    fontSize: 20,
    lineHeight: 24,
  },
  valueLarge: {
    fontSize: 48,
    lineHeight: 56,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  subtitleSmall: {
    fontSize: 10,
    lineHeight: 14,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default StatCard;