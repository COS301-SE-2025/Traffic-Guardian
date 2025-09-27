import { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ImageBackground, 
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { loginUser } from "../services/usersApi";
import React from "react";
import { useSession } from "../services/sessionContext";
import { useTheme } from "../services/themeContext";
import { globalStyles } from "../styles/globalStyles";
import { typography } from "../styles/typography";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingSpinner } from "../components/LoadingComponents";
import { EnhancedNavigation } from "../components/EnhancedNavigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { setUser } = useSession();
  const { currentColors, isDark } = useTheme();
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  const handleLogin = async () => {
    try {
      if (!password.trim() || !email.trim()) {
        Alert.alert("Validation Error", "All fields are required");
        return;
      }

      if (!email.includes('@')) {
        Alert.alert("Validation Error", "Please enter a valid email address");
        return;
      }

      setLoading(true);
      const result = await loginUser(email, password);
      
      setUser(result);
      
      Alert.alert(
        "Welcome Back!",
        `Hello ${result.user.User_Username}, you've successfully logged in.`,
        [
          {
            text: "Continue",
            onPress: () => router.replace("/"),
          }
        ]
      );
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password",
      "Password reset functionality will be available soon. Please contact support if needed.",
      [{ text: "OK" }]
    );
  };

  const handleQuickLogin = () => {
    setEmail("lonwabo@example.com");
    setPassword("StrongPa$$20");
  };

  return (
    <ImageBackground
      source={require("../assets/images/login.jpg")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(41,41,41,0.7)" }}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {/* App Logo/Title */}
              <View style={{ alignItems: 'center', marginBottom: 40 }}>
                <View
                  style={{
                    backgroundColor: currentColors.primary.main,
                    borderRadius: 30,
                    padding: 20,
                    marginBottom: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  <Ionicons name="car-sport" size={40} color="#fff" />
                </View>
                <Text
                  style={{
                    ...typography.h1,
                    color: '#fff',
                    fontWeight: '700',
                    textAlign: 'center',
                    textShadowColor: 'rgba(0, 0, 0, 0.5)',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 3,
                  }}
                >
                  Traffic Guardian
                </Text>
                <Text
                  style={{
                    ...typography.body,
                    color: 'rgba(255, 255, 255, 0.9)',
                    textAlign: 'center',
                    marginTop: 8,
                  }}
                >
                  Stay informed, stay safe
                </Text>
              </View>

              {/* Login Form */}
              <View
                style={{
                  width: "100%",
                  maxWidth: 400,
                  backgroundColor: isDark ? 'rgba(84, 84, 84, 0.95)' : 'rgba(84, 84, 84, 0.95)',
                  borderRadius: 20,
                  padding: 24,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Text
                  style={{
                    ...typography.h2,
                    fontSize: 28,
                    fontWeight: "bold",
                    marginBottom: 24,
                    textAlign: "center",
                    color: "rgba(255, 170, 0, 1)",
                  }}
                >
                  Welcome Back
                </Text>

                {/* Quick Login Helper */}
                <TouchableOpacity
                  onPress={handleQuickLogin}
                  style={{
                    backgroundColor: 'rgba(255, 170, 0, 0.1)',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 170, 0, 0.3)',
                  }}
                >
                  <Text
                    style={{
                      ...typography.bodySmall,
                      color: currentColors.primary.main,
                      textAlign: 'center',
                      fontWeight: '600',
                    }}
                  >
                    Quick Login: Tap to fill demo credentials
                  </Text>
                </TouchableOpacity>

                {/* Email Input */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      ...typography.bodySmall,
                      color: 'rgba(255, 255, 255, 0.8)',
                      marginBottom: 8,
                      fontWeight: '600',
                    }}
                  >
                    Email Address
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: "#f5f5f5",
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: email ? currentColors.primary.main : "#ddd",
                    }}
                  >
                    <Ionicons
                      name="mail"
                      size={20}
                      color={email ? currentColors.primary.main : "#666"}
                      style={{ marginLeft: 16 }}
                    />
                    <TextInput
                      style={{
                        flex: 1,
                        padding: 16,
                        color: "rgba(41,41,41,1)",
                        ...typography.body,
                      }}
                      placeholder="Enter your email"
                      placeholderTextColor="rgba(41,41,41,0.6)"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      ...typography.bodySmall,
                      color: 'rgba(255, 255, 255, 0.8)',
                      marginBottom: 8,
                      fontWeight: '600',
                    }}
                  >
                    Password
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: "#f5f5f5",
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: password ? currentColors.primary.main : "#ddd",
                    }}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={20}
                      color={password ? currentColors.primary.main : "#666"}
                      style={{ marginLeft: 16 }}
                    />
                    <TextInput
                      style={{
                        flex: 1,
                        padding: 16,
                        color: "rgba(41,41,41,1)",
                        ...typography.body,
                      }}
                      placeholder="Enter your password"
                      placeholderTextColor="rgba(41,41,41,0.6)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ padding: 16 }}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Remember Me and Forgot Password */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setRememberMe(!rememberMe)}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Ionicons
                      name={rememberMe ? "checkbox" : "square-outline"}
                      size={20}
                      color={currentColors.primary.main}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        ...typography.bodySmall,
                        color: 'rgba(255, 255, 255, 0.8)',
                      }}
                    >
                      Remember me
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={handleForgotPassword}>
                    <Text
                      style={{
                        ...typography.bodySmall,
                        color: currentColors.primary.main,
                        fontWeight: '600',
                      }}
                    >
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: loading ? 'rgba(255, 165, 0, 0.6)' : currentColors.primary.main,
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: "center",
                    marginBottom: 16,
                    shadowColor: currentColors.primary.main,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <LoadingSpinner size="small" color="#fff" />
                  ) : (
                    <Text style={{ 
                      ...typography.button,
                      color: "#fff", 
                      fontSize: 18, 
                      fontWeight: "bold" 
                    }}>
                      Sign In
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Register Link */}
                <TouchableOpacity
                  style={{
                    borderWidth: 2,
                    borderColor: currentColors.primary.main,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: 'rgba(255, 165, 0, 0.1)',
                  }}
                  onPress={() => router.push("/register")}
                >
                  <Text style={{ 
                    ...typography.button,
                    color: currentColors.primary.main, 
                    fontSize: 16, 
                    fontWeight: "600" 
                  }}>
                    Create New Account
                  </Text>
                </TouchableOpacity>

                {/* Additional Options */}
                <View style={{ marginTop: 20, alignItems: 'center' }}>
                  <Text
                    style={{
                      ...typography.bodySmall,
                      color: 'rgba(255, 255, 255, 0.6)',
                      textAlign: 'center',
                    }}
                  >
                    By signing in, you agree to our Terms of Service and Privacy Policy
                  </Text>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        <EnhancedNavigation />
      </SafeAreaView>
    </ImageBackground>
  );
}