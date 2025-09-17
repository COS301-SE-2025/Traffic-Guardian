import { Stack } from "expo-router";
import React from "react";
import { SocketProvider } from "../services/socketProvider";
import { LocationProvider } from "../services/location";

export default function RootLayout() {
  return (
    <LocationProvider>
      <SocketProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      </SocketProvider>
    </LocationProvider>
  );
}
