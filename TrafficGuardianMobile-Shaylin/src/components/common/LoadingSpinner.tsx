import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  className?: 'content' | 'overlay' | 'inline';
  style?: ViewStyle;
  textStyle?: TextStyle;
  showText?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = colors.primary.main,
  text = 'Loading...',
  className = 'inline',
  style,
  textStyle,
  showText = true,
}) => {
  const getContainerStyle = () => {
    switch (className) {
      case 'content':
        return styles.contentContainer;
      case 'overlay':
        return styles.overlayContainer;
      case 'inline':
      default:
        return styles.inlineContainer;
    }
  };

  const getSpinnerSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'large':
      default:
        return 32;
    }
  };

  return (
    <View style={[getContainerStyle(), style]}>
      <ActivityIndicator 
        size={getSpinnerSize()} 
        color={color}
        testID="loading-spinner"
      />
      {showText && text && (
        <Text 
          style={[
            styles.text,
            size === 'small' && styles.smallText,
            { color },
            textStyle
          ]}
          testID="loading-text"
        >
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  text: {
    ...typography.body,
    marginTop: 12,
    textAlign: 'center',
  },
  smallText: {
    ...typography.caption,
    marginTop: 8,
    marginLeft: 8,
  },
});

export default LoadingSpinner;