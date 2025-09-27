import React from 'react';
import { View, TouchableOpacity, Text, Animated, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../services/themeContext';
import { useSession } from '../services/sessionContext';

const { width } = Dimensions.get('window');

interface NavItem {
  path: string;
  icon: string;
  label: string;
  requiresAuth?: boolean;
  authOnlyHidden?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', icon: 'home', label: 'Home' },
  { path: '/analytics', icon: 'analytics', label: 'Analytics' },
  { path: '/report', icon: 'add-circle', label: 'Report' },
  { path: '/profile', icon: 'person', label: 'Profile', requiresAuth: true },
  { path: '/login', icon: 'log-in', label: 'Login', authOnlyHidden: true },
];

export const EnhancedNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentColors, isDark } = useTheme();
  const { user, setUser } = useSession();
  const [animatedValue] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleNavigation = (path: string) => {
    if (path === '/logout') {
      setUser(null);
      router.push('/');
      return;
    }
    router.push(path);
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.requiresAuth && !user) return false;
    if (item.authOnlyHidden && user) return false;
    return true;
  });

  if (user) {
    filteredNavItems.push({ path: '/logout', icon: 'log-out', label: 'Logout' });
  }

  const tabWidth = width / filteredNavItems.length;

  return (
    <Animated.View
      style={{
        transform: [{ translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [100, 0],
        })}],
        opacity: animatedValue,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: isDark ? currentColors.dark.surface : currentColors.surface.light,
          borderTopWidth: 1,
          borderTopColor: isDark ? currentColors.dark.border : currentColors.border.light,
          paddingBottom: 20,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        }}
      >
        {filteredNavItems.map((item, index) => {
          const isActive = pathname === item.path;
          const isReportButton = item.path === '/report';
          
          return (
            <TouchableOpacity
              key={item.path}
              onPress={() => handleNavigation(item.path)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 4,
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isReportButton ? 50 : 40,
                  height: isReportButton ? 50 : 40,
                  borderRadius: isReportButton ? 25 : 20,
                  backgroundColor: isActive 
                    ? currentColors.primary.main 
                    : isReportButton 
                      ? currentColors.primary.main 
                      : 'transparent',
                  marginBottom: 4,
                  shadowColor: isReportButton ? currentColors.primary.main : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: isReportButton ? 5 : 0,
                }}
              >
                <Ionicons
                  name={item.icon as any}
                  size={isReportButton ? 24 : 20}
                  color={
                    isActive || isReportButton
                      ? currentColors.text.light
                      : isDark
                        ? currentColors.dark.textSecondary
                        : currentColors.text.secondary
                  }
                />
              </View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? '600' : '400',
                  color: isActive
                    ? currentColors.primary.main
                    : isDark
                      ? currentColors.dark.textSecondary
                      : currentColors.text.secondary,
                  textAlign: 'center',
                }}
              >
                {item.label}
              </Text>
              {isActive && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -8,
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: currentColors.primary.main,
                  }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};