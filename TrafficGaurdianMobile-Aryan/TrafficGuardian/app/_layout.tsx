import { Stack } from "expo-router";
import React from "react";
import { SocketProvider } from "../services/socketProvider";

export default function RootLayout() {
  return (
  <SocketProvider>
    <Stack
    screenOptions={{
          headerShown: false,
        }}
    />
  </SocketProvider>
  );
}
