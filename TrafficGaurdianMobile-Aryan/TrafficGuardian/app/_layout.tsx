import { Stack } from "expo-router";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { SocketProvider } from "../services/socketProvider";
import { LocationProvider } from "../services/location";
import { SessionProvider } from "../services/sessionContext";
import { TrafficProvider } from "../services/trafficContext";
import { ThemeProvider } from "../services/themeContext";
import { NotificationProvider } from "../services/notificationService";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <NotificationProvider>
          <LocationProvider>
            <SocketProvider>
              <TrafficProvider>
                <StatusBar style="auto" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                    gestureDirection: 'horizontal',
                  }}
                >
                  <Stack.Screen 
                    name="index" 
                    options={{ 
                      title: "Home",
                      gestureEnabled: false, // Disable swipe back on home screen
                    }} 
                  />
                  <Stack.Screen 
                    name="analytics" 
                    options={{ 
                      title: "Analytics",
                      animation: 'slide_from_bottom',
                    }} 
                  />
                  <Stack.Screen 
                    name="report" 
                    options={{ 
                      title: "Report Incident",
                      animation: 'slide_from_bottom',
                    }} 
                  />
                  <Stack.Screen 
                    name="profile" 
                    options={{ 
                      title: "Profile",
                      animation: 'slide_from_right',
                    }} 
                  />
                  <Stack.Screen 
                    name="login" 
                    options={{ 
                      title: "Login",
                      animation: 'slide_from_bottom',
                    }} 
                  />
                  <Stack.Screen 
                    name="register" 
                    options={{ 
                      title: "Register",
                      animation: 'slide_from_right',
                    }} 
                  />
                </Stack>
              </TrafficProvider>
            </SocketProvider>
          </LocationProvider>
        </NotificationProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}