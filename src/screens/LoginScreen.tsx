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
import { useTheme } from '../contexts/ThemeContext';
import Input from '../components/Input';
import Button from '../components/Button';
import AppIcon from '../components/AppIcon';
import { LoginCredentials } from '../types';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, demoLogin } = useAuth();
  const { colors, toggle, isDark } = useTheme();
  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await demoLogin();
    } catch (error) {
      Alert.alert('Demo Login Failed', 'Could not log in as demo user.');
    } finally {
      setLoading(false);
    }
  };
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await login(credentials);
      // Navigation will be handled by AuthContext
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.response?.data?.message || 'Invalid email or password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.topRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Welcome')}
                style={[styles.iconButton, { backgroundColor: colors.surface }]}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <AppIcon name="arrow-back" size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggle}
                style={[styles.iconButton, { backgroundColor: colors.surface }]}
                accessibilityRole="button"
                accessibilityLabel="Toggle theme"
              >
                <AppIcon
                  name={isDark ? 'sunny-outline' : 'moon-outline'}
                  size={18}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Login to your account
            </Text>

            <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                placeholder="Enter your password"
                value={credentials.password}
                onChangeText={(text) =>
                  setCredentials({ ...credentials, password: text })
                }
                error={errors.password}
                isPassword
                autoComplete="password"
              />

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotPassword}
              >
                <Text style={[styles.forgotPasswordText, { color: colors.secondary }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              <Button
                title="Login"
                onPress={handleLogin}
                loading={loading}
                style={styles.primaryButton}
              />

              <Button
                title="Demo Login"
                onPress={handleDemoLogin}
                loading={loading}
                variant="outline"
              />

              <View style={styles.registerContainer}>
                <Text style={[styles.registerText, { color: colors.textMuted }]}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={[styles.registerLink, { color: colors.secondary }]}>Register</Text>
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
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 18,
  },
  form: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 14,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 6,
    marginBottom: 12,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LoginScreen;
