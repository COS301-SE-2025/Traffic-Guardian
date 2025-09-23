import { Stack } from "expo-router";
import React from "react";
import { SocketProvider } from "../services/socketProvider";
import { LocationProvider } from "../services/location";
import { SessionProvider } from "../services/sessionContext";
import { TrafficProvider } from "../services/trafficContext";

export default function RootLayout() {
  return (
    <SessionProvider>
    <LocationProvider>
      <SocketProvider>
        <TrafficProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      </TrafficProvider>
      </SocketProvider>
    </LocationProvider>
    </SessionProvider>
  );
}
