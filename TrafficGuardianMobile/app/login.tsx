import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ImageBackground, Animated, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { loginUser } from "../services/usersApi";
import React, { useEffect, useRef } from "react";
import { useSession } from "../services/sessionContext";
import { globalStyles } from "../styles/globalStyles";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../components/navbar";
import { Ionicons } from '@expo/vector-icons';

const aerialTrafficImg = require('../assets/aerial_traffic_img.jpg');

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useSession();
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

  const handleLogin = async () => {
    try {
      if(!password.trim() || !email.trim()){
        throw new Error("All fields are required");
      }
      const result = await loginUser(email, password);
      setUser(result);
      router.push("/");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.pure }}>
      <SafeAreaView style={{flex : 1}}>
        <Navbar>
          <ImageBackground
            source={aerialTrafficImg}
            style={{ flex: 1 }}
            resizeMode="cover"
          >
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.75)'
            }}>
              <Animated.View style={{
                flex : 1,
                justifyContent : 'center',
                alignItems : 'center',
                padding: 20,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }}>
                <View style={[globalStyles.glassCard, { width: "100%", maxWidth: 400 }]}>
              <View style={{ alignItems: 'center', marginBottom: 36 }}>
                <View style={{
                  backgroundColor: colors.primary.main,
                  width: 72,
                  height: 72,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  <Ionicons name="log-in" size={36} color={colors.text.dark} />
                </View>
                <Text style={[typography.h1, { color: colors.text.primary, textAlign: 'center', fontWeight: '800', fontSize: 28, marginBottom: 8 }]}>
                  Welcome Back
                </Text>
                <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center', fontSize: 15 }]}>
                  Sign in to continue
                </Text>
              </View>

              <View style={{ marginBottom: 18 }}>
                <Text style={[typography.label, { color: colors.text.primary, marginBottom: 10, fontSize: 13, fontWeight: '600' }]}>Email</Text>
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
                    <Ionicons name="mail" size={20} color={colors.text.dark} />
                  </View>
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      color: colors.text.primary,
                      fontSize: 16,
                    }}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.text.tertiary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={{ marginBottom: 28 }}>
                <Text style={[typography.label, { color: colors.text.primary, marginBottom: 10, fontSize: 13, fontWeight: '600' }]}>Password</Text>
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
                    <Ionicons name="lock-closed" size={20} color={colors.text.dark} />
                  </View>
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      color: colors.text.primary,
                      fontSize: 16,
                    }}
                    placeholder="••••••••"
                    placeholderTextColor={colors.text.tertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[globalStyles.primaryButton, { marginBottom: 16 }]}
                onPress={handleLogin}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[globalStyles.primaryButtonText, { marginRight: 8 }]}>
                    Sign In
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.text.dark} />
                </View>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
                <Text style={[typography.caption, { color: colors.text.secondary, fontSize: 14 }]}>
                  Don't have an account?
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/register")}
                  style={{ marginLeft: 6 }}
                >
                  <Text style={[typography.caption, { color: colors.primary.main, fontWeight: '700', fontSize: 14 }]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </ImageBackground>
        </Navbar>
      </SafeAreaView>
    </View>
  );
}
