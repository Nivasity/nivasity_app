import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { Checkbox } from 'react-native-paper';
import AuthScaffold from '../components/auth/AuthScaffold';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import Button from '../components/Button';
import Input from '../components/Input';
import OptionPickerDialog from '../components/OptionPickerDialog';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LoginCredentials } from '../types';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { referenceAPI } from '../services/api';

WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  navigation: any;
}

const GOOGLE_WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID as string | undefined);
const GOOGLE_ANDROID_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID as string | undefined);
const GOOGLE_IOS_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID as string | undefined) || '';

const getGoogleRedirectUri = (clientId: string | undefined) => {
  const trimmed = (clientId || '').trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/^(.+)\.apps\.googleusercontent\.com$/);
  if (!match) return undefined;
  return `com.googleusercontent.apps.${match[1]}:/oauthredirect`;
};

const redactToken = (value: unknown) => {
  const token = typeof value === 'string' ? value : '';
  if (!token) return undefined;
  const trimmed = token.trim();
  if (trimmed.length <= 10) return `${trimmed.slice(0, 3)}…(${trimmed.length})`;
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}(${trimmed.length})`;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, loginWithGoogle } = useAuth();
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const processedGoogleResponseKeyRef = useRef<string | null>(null);
  const [schools, setSchools] = useState<Array<{ id: number; name: string }>>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsOpen, setSchoolsOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [pendingGoogleTokens, setPendingGoogleTokens] = useState<{ idToken?: string; accessToken?: string } | null>(null);
  const schoolsRequestIdRef = useRef(0);

  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const needsSchoolIdMessage = (e: any) => {
    const msg = String(e?.response?.data?.message || e?.message || '').toLowerCase();
    return msg.includes('school_id is required') || msg.includes('school id is required');
  };

  const loadSchools = useCallback(async () => {
    if (schoolsLoading) return;
    const requestId = ++schoolsRequestIdRef.current;
    setSchoolsLoading(true);
    try {
      const data = await referenceAPI.getSchools({ page: 1, limit: 100 });
      if (requestId !== schoolsRequestIdRef.current) return;
      setSchools((data.schools || []).map((s) => ({ id: s.id, name: s.name })));
    } catch (e: any) {
      if (requestId !== schoolsRequestIdRef.current) return;
      setSchools([]);
      appMessage.toast({
        status: 'failed',
        message: e?.response?.data?.message || e?.message || 'Could not load schools',
      });
    } finally {
      if (requestId === schoolsRequestIdRef.current) setSchoolsLoading(false);
    }
  }, [appMessage, schoolsLoading]);

  useEffect(() => {
    if (!schoolsOpen) return;
    if (schools.length > 0) return;
    loadSchools();
  }, [loadSchools, schools.length, schoolsOpen]);

  const nativeRedirectUri = Platform.select({
    android: getGoogleRedirectUri(GOOGLE_ANDROID_CLIENT_ID),
    ios: getGoogleRedirectUri(GOOGLE_IOS_CLIENT_ID),
    default: undefined,
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      webClientId: GOOGLE_WEB_CLIENT_ID,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      selectAccount: true,
      ...(nativeRedirectUri ? { redirectUri: nativeRedirectUri } : {}),
    },
    undefined
  );

  useEffect(() => {
    if (!googlePending) return;

    const timeout = setTimeout(() => {
      appMessage.alert({
        title: 'Google Login Failed',
        message: 'Google login took too long. Please try again.',
      });
      setGooglePending(false);
      setGoogleLoading(false);
    }, 25000);

    return () => clearTimeout(timeout);
  }, [appMessage, googlePending]);

  useEffect(() => {
    if (!googlePending) return;
    if (!response) return;

    let cancelled = false;
    (async () => {
      try {
        if (__DEV__) console.log('[GoogleAuth] response:', response);
        if (response.type !== 'success') {
          return;
        }

        const rawParams = (response as any).params as Record<string, any> | undefined;
        if (__DEV__) {
          console.log('[GoogleAuth] response.params:', {
            ...rawParams,
            id_token: redactToken(rawParams?.id_token),
            access_token: redactToken(rawParams?.access_token),
          });
          console.log('[GoogleAuth] response.authentication:', {
            ...((response as any).authentication || undefined),
            idToken: redactToken((response as any).authentication?.idToken),
            accessToken: redactToken((response as any).authentication?.accessToken),
          });
        }
        const idToken =
          String(rawParams?.id_token || '').trim() ||
          String((response as any).authentication?.idToken || '').trim() ||
          undefined;
        const accessToken =
          String(rawParams?.access_token || '').trim() ||
          String((response as any).authentication?.accessToken || '').trim() ||
          undefined;

        if (!idToken && !accessToken) {
          const maybeCode = String(rawParams?.code || '').trim();
          if (maybeCode) {
            return;
          }

          appMessage.alert({
            title: 'Google Login Failed',
            message: 'No token returned from Google. Please try again.',
          });
          return;
        }

        const responseKey = String(
          idToken ||
            accessToken ||
            String((response as any).authentication?.accessToken || '').trim() ||
            String((response as any).url || '').trim()
        );
        if (processedGoogleResponseKeyRef.current === responseKey) return;
        processedGoogleResponseKeyRef.current = responseKey;

        try {
          await loginWithGoogle({ idToken, accessToken });
        } catch (e: any) {
          if (needsSchoolIdMessage(e)) {
            setPendingGoogleTokens({ idToken, accessToken });
            setSchoolsOpen(true);
            appMessage.toast({ status: 'info', message: 'Select your school to complete Google sign-in.' });
            return;
          }
          throw e;
        }
      } catch (e: any) {
        appMessage.alert({
          title: 'Google Login Error',
          message: e?.response?.data?.message || e?.message || 'Unknown error',
        });
      } finally {
        if (!cancelled) {
          setGooglePending(false);
          setGoogleLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appMessage, googlePending, loginWithGoogle, response]);

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
      appMessage.alert({
        title: 'Login Failed',
        message: error?.response?.data?.message || error?.message || 'Invalid email or password',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setPendingGoogleTokens(null);
      setSelectedSchool('');
      const expectedClientId = Platform.select({
        android: GOOGLE_ANDROID_CLIENT_ID,
        ios: GOOGLE_IOS_CLIENT_ID,
        web: GOOGLE_WEB_CLIENT_ID,
        default: GOOGLE_WEB_CLIENT_ID,
      });

      if (!expectedClientId) {
        appMessage.alert({
          title: 'Google Login Not Configured',
          message: 'Missing Google client id. Set EXPO_PUBLIC_GOOGLE_*_CLIENT_ID env vars.',
        });
        return;
      }

      if (Platform.OS === 'ios' && !GOOGLE_IOS_CLIENT_ID) {
        appMessage.alert({
          title: 'Google Login Not Configured',
          message: 'Missing iOS client id. Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.',
        });
        return;
      }

      if (!request) {
        appMessage.alert({
          title: 'Google Login',
          message: 'Auth request is not ready yet. Please try again.',
        });
        return;
      }

      setGoogleLoading(true);
      setGooglePending(true);
      if (__DEV__) console.log('[GoogleAuth] redirectUri:', (request as any).redirectUri);
      const result = await promptAsync();
      if (__DEV__) {
        const rawParams = (result as any)?.params as Record<string, any> | undefined;
        console.log('[GoogleAuth] promptAsync result:', {
          ...result,
          params: rawParams
            ? {
                ...rawParams,
                id_token: redactToken(rawParams?.id_token),
                access_token: redactToken(rawParams?.access_token),
              }
            : rawParams,
          authentication: (result as any)?.authentication
            ? {
                ...(result as any).authentication,
                idToken: redactToken((result as any).authentication?.idToken),
                accessToken: redactToken((result as any).authentication?.accessToken),
              }
            : (result as any)?.authentication,
        });
      }
      if (result.type !== 'success') {
        if (result.type !== 'dismiss') {
          appMessage.alert({ title: 'Google Login', message: 'Login was cancelled.' });
        }
        setGooglePending(false);
        setGoogleLoading(false);
        return;
      }
    } catch (e: any) {
      appMessage.alert({
        title: 'Google Login Error',
        message: e?.message || 'Unknown error',
      });
      setGooglePending(false);
      setGoogleLoading(false);
    }
  };

  const schoolNames = schools.map((s) => s.name);
  const canOpenSchools = !schoolsLoading && schoolNames.length > 0;

  const confirmSchoolForGoogle = async (schoolName: string) => {
    const match = schools.find((s) => s.name === schoolName);
    const schoolId = match?.id;
    const tokens = pendingGoogleTokens;
    if (!schoolId || (!tokens?.idToken && !tokens?.accessToken)) {
      appMessage.alert({
        title: 'Google Sign-in',
        message: !schoolId ? 'Select a valid school.' : 'Missing Google token. Please try again.',
      });
      return;
    }

    setGoogleLoading(true);
    try {
      await loginWithGoogle({ idToken: tokens.idToken, accessToken: tokens.accessToken, schoolId });
      setPendingGoogleTokens(null);
    } catch (e: any) {
      appMessage.alert({
        title: 'Google Login Error',
        message: e?.response?.data?.message || e?.message || 'Unknown error',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
    <AuthScaffold navigation={navigation} title="Welcome back!">
      <TouchableOpacity
        onPress={handleGoogleLogin}
        disabled={loading || googleLoading}
        style={[styles.googleButton, { borderColor: colors.border, backgroundColor: colors.background }]}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        activeOpacity={0.9}
      >
        <AppIcon name="logo-google" size={18} color={colors.text} />
        <AppText style={[styles.googleText, { color: colors.text }]}>
          {googleLoading ? 'Signing in...' : 'Continue with Google'}
        </AppText>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <AppText style={[styles.dividerText, { color: colors.textMuted }]}>or continue with</AppText>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>

      <Input
        label="Email"
        placeholder="student@nivasity.com"
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
          accessibilityLabel="Need help"
          activeOpacity={0.85}
        >
          <AppText style={[styles.link, { color: colors.accent }]}>Need help?</AppText>
        </TouchableOpacity>
      </View>

      <Button title="Log in" onPress={handleLogin} loading={loading} style={styles.primaryButton} />

      <View style={styles.bottomRow}>
        <AppText style={[styles.bottomText, { color: colors.textMuted }]}>
          Don't have an account?{' '}
        </AppText>
        <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.85}>
          <AppText style={[styles.link, { color: colors.accent }]}>Sign up</AppText>
        </TouchableOpacity>
      </View>
    </AuthScaffold>

    <OptionPickerDialog
      visible={schoolsOpen}
      title="Select your school"
      searchPlaceholder="Search school..."
      options={schoolNames}
      selected={selectedSchool}
      loading={schoolsLoading}
      onClose={() => {
        schoolsRequestIdRef.current += 1;
        setSchoolsOpen(false);
        setPendingGoogleTokens(null);
        setSelectedSchool('');
      }}
      onSelect={(value) => {
        if (!canOpenSchools) {
          appMessage.toast({
            status: schoolsLoading ? 'info' : 'failed',
            message: schoolsLoading ? 'Loading schools...' : 'No schools available',
          });
          return;
        }
        setSelectedSchool(value);
        confirmSchoolForGoogle(value);
      }}
    />
    </>
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
    marginTop: 14,
    marginBottom: 24,
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
    borderRadius: 20,
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
