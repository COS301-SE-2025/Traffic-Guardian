import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Animated, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { registerUser } from "../services/usersApi";
import React, { useEffect, useRef } from "react";
import { globalStyles } from "../styles/globalStyles";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../components/navbar";
import { Ionicons } from '@expo/vector-icons';

const drivingCarsImg = require('../assets/driving_cars_highway.jpg');

const InputField = ({ icon, label, placeholder, value, onChangeText, secure = false, keyboardType = "default" }: any) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={[typography.label, { color: colors.text.primary, marginBottom: 10, fontSize: 13, fontWeight: '600' }]}>
      {label}
    </Text>
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.elevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.light,
    }}>
      <View style={{
        backgroundColor: colors.primary.main,
        padding: 12,
        borderTopLeftRadius: 9,
        borderBottomLeftRadius: 9,
      }}>
        <Ionicons name={icon} size={20} color={colors.text.dark} />
      </View>
      <TextInput
        style={{
          flex: 1,
          paddingVertical: 14,
          paddingHorizontal: 16,
          color: colors.text.primary,
          fontSize: 15,
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.text.tertiary}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={secure ? "none" : "words"}
        keyboardType={keyboardType}
        secureTextEntry={secure}
      />
    </View>
  </View>
);

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [CellPhone, setCellPhone] = useState("");
  const [userfullname, setuserfullname] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 30,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRegister = async () => {
    try {
      if(!username.trim() || !password.trim() || !email.trim()){
        throw new Error("All fields are required");
      }
      const result = await registerUser(username, email, password, CellPhone, userfullname);
      Alert.alert("Success", "Account created!");
      router.push("/login");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.pure }}>
      <SafeAreaView style={{flex : 1}}>
        <Navbar>
          <ImageBackground
            source={drivingCarsImg}
            style={{ flex: 1 }}
            resizeMode="cover"
          >
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.75)'
            }}>
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 20,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Animated.View style={{
                  width: "100%",
                  maxWidth: 400,
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }}>
              <View style={[globalStyles.glassCard, { marginTop: 20, marginBottom: 20 }]}>
                <View style={{ alignItems: 'center', marginBottom: 32 }}>
                  <View style={{
                    backgroundColor: colors.primary.main,
                    width: 72,
                    height: 72,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}>
                    <Ionicons name="person-add" size={36} color={colors.text.dark} />
                  </View>
                  <Text style={[typography.h1, { color: colors.text.primary, textAlign: 'center', fontWeight: '800', fontSize: 28, marginBottom: 8 }]}>
                    Create Account
                  </Text>
                  <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center', fontSize: 15 }]}>
                    Join Traffic Guardian
                  </Text>
                </View>

                <InputField
                  icon="person"
                  label="Full Name"
                  placeholder="John Doe"
                  value={userfullname}
                  onChangeText={setuserfullname}
                />

                <InputField
                  icon="at"
                  label="Username"
                  placeholder="johndoe"
                  value={username}
                  onChangeText={setUsername}
                />

                <InputField
                  icon="call"
                  label="Phone Number"
                  placeholder="+27 123 456 789"
                  value={CellPhone}
                  onChangeText={setCellPhone}
                  keyboardType="phone-pad"
                />

                <InputField
                  icon="mail"
                  label="Email"
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />

                <InputField
                  icon="lock-closed"
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secure={true}
                />

                <TouchableOpacity
                  style={[globalStyles.primaryButton, { marginTop: 8, marginBottom: 16 }]}
                  onPress={handleRegister}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[globalStyles.primaryButtonText, { marginRight: 8 }]}>
                      Create Account
                    </Text>
                    <Ionicons name="checkmark-circle" size={18} color={colors.text.dark} />
                  </View>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
                  <Text style={[typography.caption, { color: colors.text.secondary, fontSize: 14 }]}>
                    Already have an account?
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/login")}
                    style={{ marginLeft: 6 }}
                  >
                    <Text style={[typography.caption, { color: colors.primary.main, fontWeight: '700', fontSize: 14 }]}>
                      Sign In
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </View>
      </ImageBackground>
        </Navbar>
      </SafeAreaView>
    </View>
  );
}
