import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Button, ImageBackground, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { registerUser } from "../services/usersApi";
import React from "react";
import { globalStyles } from "../styles/globalStyles";
import { SafeAreaView } from "react-native-safe-area-context";


export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [CellPhone, setCellPhone] = useState("");

  const handleRegister = async () => {
    try {
    if(!username.trim() || !password.trim() || !email.trim()){
      throw new Error("All fields are required");
    }

      const result = await registerUser(username, password, email, CellPhone);
      console.log("Success:", result);

      Alert.alert("Success", "Account created!");
      router.push("/login");
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
<SafeAreaView style={{ flex : 1}}>
  <ScrollView
    contentContainerStyle={{
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    }}
    keyboardShouldPersistTaps="handled"
    >
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
          color: "rgba(255,170,0,1)",
        }}
      >
        Register
      </Text>

      {/* Input boxes */}
      <TextInput
        style={{
          width: "100%",
          marginBottom: 15,
          backgroundColor: "#f5f5f5",
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: "orange",
          color: "rgba(41,41,41,1)",
        }}
        placeholder="Username"
        placeholderTextColor="rgba(41,41,41,0.6)"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={{
          width: "100%",
          marginBottom: 15,
          backgroundColor: "#f5f5f5",
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: "orange",
          color: "rgba(41,41,41,1)",
        }}
        placeholder="Cell Phone"
        placeholderTextColor="rgba(41,41,41,0.6)"
        value={CellPhone}
        onChangeText={setCellPhone}
      />
      <TextInput
        style={{
          width: "100%",
          marginBottom: 15,
          backgroundColor: "#f5f5f5",
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: "orange",
          color: "rgba(41,41,41,1)",
        }}
        placeholder="Email"
        placeholderTextColor="rgba(41,41,41,0.6)"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={{
          width: "100%",
          marginBottom: 20,
          backgroundColor: "#f5f5f5",
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: "orange",
          color: "rgba(41,41,41,1)",
        }}
        placeholder="Password"
        placeholderTextColor="rgba(41,41,41,0.6)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* Buttons */}
      <TouchableOpacity
        style={{
          backgroundColor: "orange",
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: "center",
          marginBottom: 10,
        }}
        onPress={handleRegister}
      >
        <Text style={{ color: "#ffffffff", fontSize: 16, fontWeight: "bold" }}>
          Register
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
      style={{borderWidth: 1,
        borderColor: "orange",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center"}} 
      onPress={() => router.push("/login")}>
        <Text
          style={{
            color: "orange", fontSize: 16, fontWeight: "600" 
          }}
        >
          Login
        </Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
</SafeAreaView>

<View style={globalStyles.navbar}>
  <TouchableOpacity onPress={() => router.push("/")}>
    <Text style={globalStyles.navText}>Home</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => router.push("/login")}>
    <Text style={globalStyles.navText}>Login</Text>
  </TouchableOpacity>
</View>

    </SafeAreaView>
    </ImageBackground>
  );
}
