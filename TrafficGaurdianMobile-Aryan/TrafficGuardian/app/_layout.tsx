import { Stack } from "expo-router";
import React from "react";
import { SocketProvider } from "../services/socketProvider";
import { LocationProvider } from "../services/location";
import { SessionProvider } from "../services/sessionContext";

export default function RootLayout() {
  return (
    <SessionProvider>
    <LocationProvider>
      <SocketProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      </SocketProvider>
    </LocationProvider>
    </SessionProvider>
  );
}
