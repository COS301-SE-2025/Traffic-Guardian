import { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ImageBackground, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { registerUser } from "../services/usersApi";
import React from "react";
import { useTheme } from "../services/themeContext";
import { globalStyles } from "../styles/globalStyles";
import { typography } from "../styles/typography";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingSpinner } from "../components/LoadingComponents";
import { EnhancedNavigation } from "../components/EnhancedNavigation";

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cellPhone, setCellPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
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

  const validateForm = () => {
    if (!username.trim() || !password.trim() || !email.trim() || !cellPhone.trim()) {
      Alert.alert("Validation Error", "All fields are required");
      return false;
    }

    if (username.length < 3) {
      Alert.alert("Validation Error", "Username must be at least 3 characters long");
      return false;
    }

    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert("Validation Error", "Please enter a valid email address");
      return false;
    }

    if (password.length < 8) {
      Alert.alert("Validation Error", "Password must be at least 8 characters long");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Validation Error", "Passwords do not match");
      return false;
    }

    if (!cellPhone.match(/^[\+]?[0-9\s\-\(\)]{10,}$/)) {
      Alert.alert("Validation Error", "Please enter a valid phone number");
      return false;
    }

    if (!acceptTerms) {
      Alert.alert("Terms Required", "Please accept the terms and conditions to continue");
      return false;
    }

    return true;
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return { strength: 0, label: '', color: '#ddd' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.match(/[a-z]/)) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^a-zA-Z0-9]/)) score++;

    const strengths = [
      { strength: 0, label: 'Very Weak', color: '#ef4444' },
      { strength: 1, label: 'Weak', color: '#f97316' },
      { strength: 2, label: 'Fair', color: '#f59e0b' },
      { strength: 3, label: 'Good', color: '#84cc16' },
      { strength: 4, label: 'Strong', color: '#22c55e' },
      { strength: 5, label: 'Very Strong', color: '#10b981' },
    ];

    return strengths[score];
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const result = await registerUser(username, email, password, cellPhone);
      
      Alert.alert(
        "Registration Successful!",
        "Your account has been created successfully. Please log in to continue.",
        [
          {
            text: "Go to Login",
            onPress: () => router.replace("/login"),
          }
        ]
      );
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

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
            contentContainerStyle={{ flexGrow: 1, paddingVertical: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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
              <View style={{ alignItems: 'center', marginBottom: 30 }}>
                <View
                  style={{
                    backgroundColor: currentColors.primary.main,
                    borderRadius: 25,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  <Ionicons name="person-add" size={32} color="#fff" />
                </View>
                <Text
                  style={{
                    ...typography.h2,
                    color: '#fff',
                    fontWeight: '700',
                    textAlign: 'center',
                    textShadowColor: 'rgba(0, 0, 0, 0.5)',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 3,
                  }}
                >
                  Join Traffic Guardian
                </Text>
                <Text
                  style={{
                    ...typography.body,
                    color: 'rgba(255, 255, 255, 0.9)',
                    textAlign: 'center',
                    marginTop: 4,
                  }}
                >
                  Help keep roads safe for everyone
                </Text>
              </View>

              {/* Registration Form */}
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
                    ...typography.h3,
                    fontSize: 24,
                    fontWeight: "bold",
                    marginBottom: 20,
                    textAlign: "center",
                    color: "rgba(255, 170, 0, 1)",
                  }}
                >
                  Create Account
                </Text>

                {/* Username Input */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      ...typography.bodySmall,
                      color: 'rgba(255, 255, 255, 0.8)',
                      marginBottom: 8,
                      fontWeight: '600',
                    }}
                  >
                    Username
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: "#f5f5f5",
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: username ? currentColors.primary.main : "#ddd",
                    }}
                  >
                    <Ionicons
                      name="person"
                      size={20}
                      color={username ? currentColors.primary.main : "#666"}
                      style={{ marginLeft: 16 }}
                    />
                    <TextInput
                      style={{
                        flex: 1,
                        padding: 16,
                        color: "rgba(41,41,41,1)",
                        ...typography.body,
                      }}
                      placeholder="Choose a username"
                      placeholderTextColor="rgba(41,41,41,0.6)"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                    />
                    {username.length >= 3 && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={currentColors.success}
                        style={{ marginRight: 16 }}
                      />
                    )}
                  </View>
                </View>

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
                    />
                    {email.includes('@') && email.includes('.') && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={currentColors.success}
                        style={{ marginRight: 16 }}
                      />
                    )}
                  </View>
                </View>

                {/* Phone Input */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      ...typography.bodySmall,
                      color: 'rgba(255, 255, 255, 0.8)',
                      marginBottom: 8,
                      fontWeight: '600',
                    }}
                  >
                    Phone Number
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: "#f5f5f5",
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: cellPhone ? currentColors.primary.main : "#ddd",
                    }}
                  >
                    <Ionicons
                      name="call"
                      size={20}
                      color={cellPhone ? currentColors.primary.main : "#666"}
                      style={{ marginLeft: 16 }}
                    />
                    <TextInput
                      style={{
                        flex: 1,
                        padding: 16,
                        color: "rgba(41,41,41,1)",
                        ...typography.body,
                      }}
                      placeholder="Enter phone number"
                      placeholderTextColor="rgba(41,41,41,0.6)"
                      value={cellPhone}
                      onChangeText={setCellPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={{ marginBottom: 16 }}>
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
                      placeholder="Create a password"
                      placeholderTextColor="rgba(41,41,41,0.6)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
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
                  
                  {/* Password Strength Indicator */}
                  {password.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{
                            ...typography.caption,
                            color: passwordStrength.color,
                            fontWeight: '600',
                          }}
                        >
                          Password Strength: {passwordStrength.label}
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 4,
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          borderRadius: 2,
                        }}
                      >
                        <View
                          style={{
                            height: '100%',
                            width: `${(passwordStrength.strength / 5) * 100}%`,
                            backgroundColor: passwordStrength.color,
                            borderRadius: 2,
                          }}
                        />
                      </View>
                    </View>
                  )}
                </View>

                {/* Confirm Password Input */}
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      ...typography.bodySmall,
                      color: 'rgba(255, 255, 255, 0.8)',
                      marginBottom: 8,
                      fontWeight: '600',
                    }}
                  >
                    Confirm Password
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: "#f5f5f5",
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: confirmPassword ? 
                        (password === confirmPassword ? currentColors.success : currentColors.error) 
                        : "#ddd",
                    }}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={20}
                      color={confirmPassword ? 
                        (password === confirmPassword ? currentColors.success : currentColors.error) 
                        : "#666"}
                      style={{ marginLeft: 16 }}
                    />
                    <TextInput
                      style={{
                        flex: 1,
                        padding: 16,
                        color: "rgba(41,41,41,1)",
                        ...typography.body,
                      }}
                      placeholder="Confirm your password"
                      placeholderTextColor="rgba(41,41,41,0.6)"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ padding: 16 }}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                  {confirmPassword.length > 0 && (
                    <Text
                      style={{
                        ...typography.caption,
                        color: password === confirmPassword ? currentColors.success : currentColors.error,
                        marginTop: 4,
                        fontWeight: '600',
                      }}
                    >
                      {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                    </Text>
                  )}
                </View>

                {/* Terms & Conditions */}
                <TouchableOpacity
                  onPress={() => setAcceptTerms(!acceptTerms)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    marginBottom: 24,
                  }}
                >
                  <Ionicons
                    name={acceptTerms ? "checkbox" : "square-outline"}
                    size={20}
                    color={currentColors.primary.main}
                    style={{ marginRight: 12, marginTop: 2 }}
                  />
                  <Text
                    style={{
                      ...typography.bodySmall,
                      color: 'rgba(255, 255, 255, 0.8)',
                      flex: 1,
                      lineHeight: 20,
                    }}
                  >
                    I agree to the{' '}
                    <Text style={{ color: currentColors.primary.main, fontWeight: '600' }}>
                      Terms of Service
                    </Text>
                    {' '}and{' '}
                    <Text style={{ color: currentColors.primary.main, fontWeight: '600' }}>
                      Privacy Policy
                    </Text>
                  </Text>
                </TouchableOpacity>

                {/* Register Button */}
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
                  onPress={handleRegister}
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
                      Create Account
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Login Link */}
                <TouchableOpacity
                  style={{
                    borderWidth: 2,
                    borderColor: currentColors.primary.main,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: 'rgba(255, 165, 0, 0.1)',
                  }}
                  onPress={() => router.push("/login")}
                >
                  <Text style={{ 
                    ...typography.button,
                    color: currentColors.primary.main, 
                    fontSize: 16, 
                    fontWeight: "600" 
                  }}>
                    Already have an account? Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        <EnhancedNavigation />
      </SafeAreaView>
    </ImageBackground>
  );
}