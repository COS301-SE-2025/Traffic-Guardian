import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/auth';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';

import PublicDashboard from '../dashboard/PublicDashboard';
import ResponderDashboard from '../dashboard/ResponderDashboard';
import IncidentReporting from '../incident/IncidentReporting';
import IncidentList from '../incident/IncidentList';
import IncidentDetails from '../incident/IncidentDetails';
import TrafficAnalytics from '../analytics/TrafficAnalytics';
import PersonalAnalytics from '../analytics/PersonalAnalytics';
import ProfileScreen from '../profile/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const IncidentStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary.main,
        },
        headerTintColor: colors.text.light,
        headerTitleStyle: {
          ...typography.navTitle,
        },
      }}
    >
      <Stack.Screen 
        name="IncidentList" 
        component={IncidentList}
        options={{ title: 'Incidents' }}
      />
      <Stack.Screen 
        name="IncidentDetails" 
        component={IncidentDetails}
        options={{ title: 'Incident Details' }}
      />
      <Stack.Screen 
        name="IncidentReporting" 
        component={IncidentReporting}
        options={{ title: 'Report Incident' }}
      />
    </Stack.Navigator>
  );
};

const AnalyticsStack = () => {
  const { user } = useAuth();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary.main,
        },
        headerTintColor: colors.text.light,
        headerTitleStyle: {
          ...typography.navTitle,
        },
      }}
    >
      <Stack.Screen 
        name="TrafficAnalytics" 
        component={TrafficAnalytics}
        options={{ title: 'Traffic Analytics' }}
      />
      {user && (
        <Stack.Screen 
          name="PersonalAnalytics" 
          component={PersonalAnalytics}
          options={{ title: 'Personal Analytics' }}
        />
      )}
    </Stack.Navigator>
  );
};

const TabNavigator: React.FC = () => {
  const { user, hasPermission, isRole } = useAuth();

  const getTabBarIcon = (routeName: string, focused: boolean, size: number) => {
    let iconName: keyof typeof Ionicons.glyphMap;

    switch (routeName) {
      case 'Dashboard':
        iconName = focused ? 'home' : 'home-outline';
        break;
      case 'Incidents':
        iconName = focused ? 'alert-circle' : 'alert-circle-outline';
        break;
      case 'Report':
        iconName = focused ? 'add-circle' : 'add-circle-outline';
        break;
      case 'Analytics':
        iconName = focused ? 'bar-chart' : 'bar-chart-outline';
        break;
      case 'Profile':
        iconName = focused ? 'person' : 'person-outline';
        break;
      default:
        iconName = 'help-outline';
    }

    return (
      <Ionicons 
        name={iconName} 
        size={size} 
        color={focused ? colors.primary.main : colors.tab.inactive} 
      />
    );
  };

  