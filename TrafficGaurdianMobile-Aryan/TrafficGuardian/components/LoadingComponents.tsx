import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { useTheme } from '../services/themeContext';
import { typography } from '../styles/typography';

const { width } = Dimensions.get('window');

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}

export const LoadingSpinner = ({ size = 'large', color, text }: LoadingSpinnerProps) => {
  const { currentColors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeAnim,
        backgroundColor: isDark ? currentColors.dark.background : currentColors.background.light,
      }}
    >
      <ActivityIndicator
        size={size}
        color={color || currentColors.primary.main}
      />
      {text && (
        <Text
          style={{
            ...typography.body,
            color: isDark ? currentColors.dark.text : currentColors.text.primary,
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          {text}
        </Text>
      )}
    </Animated.View>
  );
};

interface SkeletonLoaderProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader = ({ 
  width = 100, 
  height = 20, 
  borderRadius = 4, 
  style 
}: SkeletonLoaderProps) => {
  const { currentColors, isDark } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerAnim]);

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? '#404040' : '#e5e7eb',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: isDark ? '#555' : '#f3f4f6',
          opacity: shimmerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 1],
          }),
        }}
      />
    </View>
  );
};

export const TrafficCardSkeleton = () => {
  return (
    <View
      style={{
        backgroundColor: '#3e3e3e',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        marginHorizontal: 16,
      }}
    >
      <SkeletonLoader width={120} height={20} style={{ marginBottom: 12 }} />
      <SkeletonLoader width={200} height={16} style={{ marginBottom: 8 }} />
      <SkeletonLoader width={150} height={16} style={{ marginBottom: 8 }} />
      <SkeletonLoader width={180} height={16} />
    </View>
  );
};

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
}

export const ErrorState = ({ 
  title = 'Something went wrong',
  message = 'Unable to load data. Please try again.',
  onRetry,
  retryText = 'Retry'
}: ErrorStateProps) => {
  const { currentColors, isDark } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: isDark ? currentColors.dark.background : currentColors.background.light,
      }}
    >
      <Text
        style={{
          ...typography.h3,
          color: currentColors.error,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          ...typography.body,
          color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={{
            backgroundColor: currentColors.primary.main,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              ...typography.button,
              color: currentColors.text.light,
            }}
          >
            {retryText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: string;
}

export const EmptyState = ({
  title = 'No data available',
  message = 'There is nothing to show right now.',
  icon = 'inbox-outline'
}: EmptyStateProps) => {
  const { currentColors, isDark } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}
    >
      <Text
        style={{
          ...typography.h3,
          color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          ...typography.body,
          color: isDark ? currentColors.dark.textSecondary : currentColors.text.secondary,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
    </View>
  );
};

interface PulseAnimationProps {
  children: React.ReactNode;
  duration?: number;
}

export const PulseAnimation = ({ children, duration = 2000 }: PulseAnimationProps) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim, duration]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: pulseAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
};