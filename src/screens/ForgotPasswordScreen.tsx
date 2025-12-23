import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AuthScaffold from '../components/auth/AuthScaffold';
import AppText from '../components/AppText';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { authAPI } from '../services/api';

interface ForgotPasswordScreenProps {
  navigation: any;
}

type Step = 'request' | 'reset';

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; otp?: string; newPassword?: string }>({});

  const validateEmail = () => {
    const next: typeof errors = {};
    if (!email) next.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Email is invalid';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSendOtp = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setStep('reset');
      appMessage.toast({ message: 'OTP sent. Check your email for your OTP code.' });
    } catch (error: any) {
      appMessage.alert({
        title: 'Error',
        message: error?.response?.data?.message || 'Failed to send OTP',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const next: typeof errors = {};
    if (!otp.trim()) next.otp = 'OTP is required';
    if (!newPassword) next.newPassword = 'New password is required';
    else if (newPassword.length < 6) next.newPassword = 'Password must be at least 6 characters';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await authAPI.resetPassword(otp.trim(), newPassword);
      appMessage.alert({
        title: 'Success',
        message: 'Password updated. Please log in again.',
        actions: [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
      });
    } catch (error: any) {
      appMessage.alert({
        title: 'Error',
        message: error?.response?.data?.message || 'Failed to reset password',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold navigation={navigation} title={step === 'request' ? 'Forgot password?' : 'Reset password'}>
      {step === 'request' ? (
        <>
          <AppText style={[styles.subtitle, { color: colors.textMuted }]}>
            Enter your email to receive an OTP code.
          </AppText>
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            errorText={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            inputMode="email"
          />
          <Button title="Send OTP" onPress={handleSendOtp} loading={loading} style={styles.primaryButton} />
          <View style={styles.bottomRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
              <AppText style={[styles.link, { color: colors.accent }]}>Back to login</AppText>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <AppText style={[styles.subtitle, { color: colors.textMuted }]}>
            Enter the OTP from your email and set a new password.
          </AppText>
          <Input
            label="OTP"
            placeholder="123456"
            value={otp}
            onChangeText={setOtp}
            errorText={errors.otp}
            keyboardType="number-pad"
          />
          <Input
            label="New password"
            placeholder="Create a new password"
            value={newPassword}
            onChangeText={setNewPassword}
            errorText={errors.newPassword}
            isPassword
            autoComplete="password-new"
          />
          <Button title="Reset password" onPress={handleReset} loading={loading} style={styles.primaryButton} />
          <View style={styles.bottomRow}>
            <TouchableOpacity onPress={handleSendOtp} activeOpacity={0.85} disabled={loading}>
              <AppText style={[styles.link, { color: colors.accent }]}>Resend OTP</AppText>
            </TouchableOpacity>
            <AppText style={[styles.dot, { color: colors.textMuted }]}> • </AppText>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
              <AppText style={[styles.link, { color: colors.accent }]}>Back to login</AppText>
            </TouchableOpacity>
          </View>
        </>
      )}
    </AuthScaffold>
  );
};

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 14,
  },
  primaryButton: {
    marginTop: 6,
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  link: {
    fontSize: 14,
    fontWeight: '900',
  },
  dot: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ForgotPasswordScreen;
