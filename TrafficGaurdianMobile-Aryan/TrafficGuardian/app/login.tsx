import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { loginUser } from "../services/usersApi";
import React from "react";
import { useSession } from "../services/sessionContext";
import { globalStyles } from "../styles/globalStyles";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useSession();
  
  const handleLogin = async () => {
    try {

    if(!password.trim() || !email.trim()){
      throw new Error("All fields are required");
    }
      const result = await loginUser(email, password);
      console.log("Success:", result);

      setUser(result);

      router.push("/");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    }
  };

  return (
    <SafeAreaView>

              <Text>lonwabo@example.com</Text>
              <Text>StrongPa$$20</Text>

            <View style={globalStyles.navbar}>
              <TouchableOpacity onPress={() => router.push("/")}>
                <Text style={globalStyles.navText}>Home</Text>
              </TouchableOpacity>
      
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text style={globalStyles.navText}>Register</Text>
              </TouchableOpacity>
            </View>

      <Text style={globalStyles.headerTitle}>Login</Text>

{/*       <TextInput
        style={globalStyles.input}
        placeholder="lonwabo@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={globalStyles.input}
        placeholder="StrongPa$$20"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      /> */}

      <TouchableOpacity style={globalStyles.primaryButton} onPress={handleLogin}>
        <Text style={globalStyles.primaryButtonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={globalStyles.secondaryButton} onPress={() => router.push("/register")}>
        <Text style={globalStyles.secondaryButtonText}>Register</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
