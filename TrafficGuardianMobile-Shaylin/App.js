import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, ActivityIndicator } from 'react-native';
import * as Font from 'expo-font';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './src/services/auth';
import { LocationProvider } from './src/services/location';
import { NotificationProvider } from './src/services/notifications';
import LoginScreen from './src/components/auth/LoginScreen';
import TabNavigator from './src/components/navigation/TabNavigator';
import { globalStyles } from './src/styles/globalStyles';

const Stack = createStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function AppContent() {
  const { user, isLoading } = useAuth();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'System': require('./assets/fonts/System.ttf'), 
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true); 
      }
    }
    loadFonts();
  }, []);

  if (isLoading || !fontsLoaded) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#d97700" />
        <Text style={globalStyles.loadingText}>Loading Traffic Guardian...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          cardStyle: { backgroundColor: '#fff' }
        }}
      >
        {user ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <NotificationProvider>
          <View style={globalStyles.container}>
            <StatusBar style="auto" />
            <AppContent />
          </View>
        </NotificationProvider>
      </LocationProvider>
    </AuthProvider>
  );
}