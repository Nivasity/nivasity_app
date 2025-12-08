import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { RegisterCredentials } from '../types';

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { register } = useAuth();
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<RegisterCredentials>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<RegisterCredentials> = {};

    if (!credentials.name) {
      newErrors.name = 'Name is required';
    }

    if (!credentials.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!credentials.password) {
      newErrors.password = 'Password is required';
    } else if (credentials.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!credentials.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (credentials.password !== credentials.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await register(credentials);
      // Navigation will be handled by AuthContext
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.response?.data?.message || 'Failed to create account'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Nivasity today</Text>

            <View style={styles.form}>
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={credentials.name}
                onChangeText={(text) =>
                  setCredentials({ ...credentials, name: text })
                }
                error={errors.name}
                autoCapitalize="words"
                autoComplete="name"
              />

              <Input
                label="Email"
                placeholder="Enter your email"
                value={credentials.email}
                onChangeText={(text) =>
                  setCredentials({ ...credentials, email: text })
                }
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Input
                label="Password"
                placeholder="Create a password"
                value={credentials.password}
                onChangeText={(text) =>
                  setCredentials({ ...credentials, password: text })
                }
                error={errors.password}
                isPassword
                autoComplete="password-new"
              />

              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={credentials.confirmPassword}
                onChangeText={(text) =>
                  setCredentials({ ...credentials, confirmPassword: text })
                }
                error={errors.confirmPassword}
                isPassword
                autoComplete="password-new"
              />

              <Button
                title="Register"
                onPress={handleRegister}
                loading={loading}
                style={styles.registerButton}
              />

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegisterScreen;
