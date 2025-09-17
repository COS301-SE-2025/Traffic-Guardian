import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useAuth } from '../../services/auth';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import LoadingSpinner from '../common/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';

interface FormData {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  role?: 'citizen' | 'field_responder';
}

const LoginScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'citizen',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  
  const { login, register, isLoading } = useAuth();

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isLogin && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin) {
      if (!formData.name?.trim()) {
        newErrors.name = 'Name is required';
      }
      if (!formData.phone?.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^\+?[0-9\s-()]{10,}$/.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register({
          email: formData.email,
          password: formData.password,
          name: formData.name!,
          phone: formData.phone!,
          role: formData.role!,
        });
      }
    } catch (error: any) {
      Alert.alert(
        'Authentication Failed',
        error.message || 'An error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const demoLogin = async (role: 'citizen' | 'field_responder' | 'admin') => {
    const demoCredentials = {
      citizen: { email: 'citizen@example.com', password: 'password123' },
      field_responder: { email: 'responder@trafficguardian.com', password: 'password123' },
      admin: { email: 'admin@trafficguardian.com', password: 'password123' },
    };

    const { email, password } = demoCredentials[role];
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Demo Login Failed', error.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="shield-checkmark" size={60} color={colors.primary.main} />
            <Text style={styles.appTitle}>Traffic Guardian</Text>
            <Text style={styles.appSubtitle}>Mobile Safety Companion</Text>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.formSubtitle}>
            {isLogin 
              ? 'Sign in to access traffic updates and safety features'
              : 'Join the Traffic Guardian community'
            }
          </Text>

          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                <Ionicons name="person-outline" size={20} color={colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChangeText={(text) => updateFormData('name', text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.text.secondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={colors.text.secondary} 
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
                <Ionicons name="call-outline" size={20} color={colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder="+27 123 456 789"
                  value={formData.phone}
                  onChangeText={(text) => updateFormData('phone', text)}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>
          )}

          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Account Type</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    formData.role === 'citizen' && styles.roleOptionSelected
                  ]}
                  onPress={() => updateFormData('role', 'citizen')}
                >
                  <Ionicons 
                    name="people-outline" 
                    size={24} 
                    color={formData.role === 'citizen' ? colors.primary.main : colors.text.secondary} 
                  />
                  <Text style={[
                    styles.roleText,
                    formData.role === 'citizen' && styles.roleTextSelected
                  ]}>
                    Citizen
                  </Text>
                  <Text style={styles.roleDescription}>
                    Report incidents and view traffic updates
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    formData.role === 'field_responder' && styles.roleOptionSelected
                  ]}
                  onPress={() => updateFormData('role', 'field_responder')}
                >
                  <Ionicons 
                    name="medical-outline" 
                    size={24} 
                    color={formData.role === 'field_responder' ? colors.primary.main : colors.text.secondary} 
                  />
                  <Text style={[
                    styles.roleText,
                    formData.role === 'field_responder' && styles.roleTextSelected
                  ]}>
                    Field Responder
                  </Text>
                  <Text style={styles.roleDescription}>
                    Manage incidents and coordinate response
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="small" color={colors.text.light} />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.toggleLink}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.demoContainer}>
            <Text style={styles.demoTitle}>Quick Demo Access:</Text>
            <View style={styles.demoButtons}>
              <TouchableOpacity
                style={styles.demoButton}
                onPress={() => demoLogin('citizen')}
                disabled={isLoading}
              >
                <Ionicons name="people" size={16} color={colors.text.light} />
                <Text style={styles.demoButtonText}>Citizen</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.demoButton}
                onPress={() => demoLogin('field_responder')}
                disabled={isLoading}
              >
                <Ionicons name="medical" size={16} color={colors.text.light} />
                <Text style={styles.demoButtonText}>Responder</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.demoButton}
                onPress={() => demoLogin('admin')}
                disabled={isLoading}
              >
                <Ionicons name="shield-checkmark" size={16} color={colors.text.light} />
                <Text style={styles.demoButtonText}>Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

