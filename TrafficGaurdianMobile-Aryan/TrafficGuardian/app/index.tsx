import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const router = useRouter();
  return (
    <SafeAreaView>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text>Login</Text>
            </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/register")}>
              <Text>Register</Text>
            </TouchableOpacity>
    </SafeAreaView>
  );
}
