import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Checkbox } from 'react-native-paper';
import AuthScaffold from '../components/auth/AuthScaffold';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LoginCredentials } from '../types';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, demoLogin } = useAuth();
  const { colors } = useTheme();

  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const validate = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    if (!credentials.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(credentials.email)) newErrors.email = 'Email is invalid';

    if (!credentials.password) newErrors.password = 'Password is required';
    else if (credentials.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await login(credentials);
    } catch (error: any) {
      Alert.alert('Login Failed', error?.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await demoLogin();
    } catch {
      Alert.alert('Google Login Failed', 'Could not log in with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold navigation={navigation} title="Welcome back!">
      <Input
        label="Email"
        placeholder="julia.roberts@mail.com"
        value={credentials.email}
        onChangeText={(text) => setCredentials((s) => ({ ...s, email: text }))}
        errorText={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
      />

      <Input
        label="Password"
        placeholder="Enter your password"
        value={credentials.password}
        onChangeText={(text) => setCredentials((s) => ({ ...s, password: text }))}
        errorText={errors.password}
        isPassword
        autoComplete="password"
      />

      <View style={styles.rowBetween}>
        <TouchableOpacity
          onPress={() => setRememberMe((v) => !v)}
          style={styles.checkRow}
          accessibilityRole="checkbox"
          accessibilityLabel="Remember me"
          accessibilityState={{ checked: rememberMe }}
          activeOpacity={0.85}
        >
          <View pointerEvents="none">
            <Checkbox
              status={rememberMe ? 'checked' : 'unchecked'}
              color={colors.secondary}
              uncheckedColor={colors.border}
            />
          </View>
          <AppText style={[styles.checkText, { color: colors.textMuted }]}>Remember me</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
          activeOpacity={0.85}
        >
          <AppText style={[styles.link, { color: colors.accent }]}>Forgot password?</AppText>
        </TouchableOpacity>
      </View>

      <Button title="Log in" onPress={handleLogin} loading={loading} style={styles.primaryButton} />

      <View style={styles.dividerRow}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <AppText style={[styles.dividerText, { color: colors.textMuted }]}>or continue with</AppText>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>

      <TouchableOpacity
        onPress={handleGoogleLogin}
        disabled={loading}
        style={[styles.googleButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        activeOpacity={0.9}
      >
        <AppIcon name="logo-google" size={18} color={colors.text} />
        <AppText style={[styles.googleText, { color: colors.text }]}>Continue with Google</AppText>
      </TouchableOpacity>

      <View style={styles.bottomRow}>
        <AppText style={[styles.bottomText, { color: colors.textMuted }]}>
          Don’t have an account?{' '}
        </AppText>
        <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.85}>
          <AppText style={[styles.link, { color: colors.accent }]}>Sign up</AppText>
        </TouchableOpacity>
      </View>
    </AuthScaffold>
  );
};

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  checkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  link: {
    fontSize: 14,
    fontWeight: '900',
  },
  primaryButton: {
    marginTop: 4,
    marginBottom: 14,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    flex: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  googleButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  googleText: {
    fontSize: 16,
    fontWeight: '800',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  bottomText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;
