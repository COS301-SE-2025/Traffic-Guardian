import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { loginUser } from "../services/usersApi";
import React from "react";
import { useSession } from "../services/sessionContext";
import { globalStyles } from "../styles/globalStyles";
import { SafeAreaView } from "react-native-safe-area-context";
import { Background } from "@react-navigation/elements";
import Navbar from "../components/navbar";
import { useTheme } from '../services/themeContext';

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
      <ImageBackground
      source={require("../assets/images/login.jpg")}
      style={{ flex: 1 }}
      resizeMode="cover"
      >
    <SafeAreaView style={{flex : 1, backgroundColor: "rgba(41,41,41,0.6)"}}>
      <Navbar>

<View style={{flex : 1, justifyContent : 'center', alignItems : 'center'}}>

  <View
    style={{
      width: "100%",
      maxWidth: 400,
      backgroundColor: "#545454ff",
      borderRadius: 16,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 5,
    }}
  >
    <Text
      style={{
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
        color: "rgba(255, 170, 0, 1)",
      }}
    >
      Login
    </Text>

    <TextInput
      style={[
        globalStyles.input,
        {
          marginBottom: 15,
          backgroundColor: "#f5f5f5",
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: "orange",
          color: "rgba(41,41,41,1)",
        },
      ]}
      placeholder="lonwabo@example.com"
      placeholderTextColor="rgba(41,41,41,0.6)"
      value={email}
      onChangeText={setEmail}
      autoCapitalize="none"
    />

    <TextInput
      style={[
        globalStyles.input,
        {
          marginBottom: 20,
          backgroundColor: "#f5f5f5",
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: "orange",
          color: "rgba(41,41,41,1)",
        },
      ]}
      placeholder="StrongPa$$20"
      placeholderTextColor="rgba(41,41,41,0.6)"
      value={password}
      onChangeText={setPassword}
      secureTextEntry
    />

    <TouchableOpacity
      style={{
        backgroundColor: "orange",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        marginBottom: 10,
      }}
      onPress={handleLogin}
    >
      <Text style={{ color: "#ffffffff", fontSize: 16, fontWeight: "bold" }}>
        Login
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={{
        borderWidth: 1,
        borderColor: "orange",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
      }}
      onPress={() => router.push("/register")}
    >
      <Text style={{ color: "orange", fontSize: 16, fontWeight: "600" }}>
        Register
      </Text>
    </TouchableOpacity>
  </View>

</View>
</Navbar>
    </SafeAreaView>

    </ImageBackground>
  );
}
