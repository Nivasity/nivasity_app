import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AuthScaffold from '../components/auth/AuthScaffold';
import AppText from '../components/AppText';
import Button from '../components/Button';
import Input from '../components/Input';
import OtpInput from '../components/OtpInput';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { authAPI } from '../services/api';

interface VerifyOtpScreenProps {
  navigation: any;
  route: any;
}

const VerifyOtpScreen: React.FC<VerifyOtpScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const { verifyOtp } = useAuth();

  const email = String(route?.params?.email || '').trim();
  const schoolName = String(route?.params?.schoolName || '').trim();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ otp?: string }>({});

  const validate = () => {
    const next: typeof errors = {};
    const otpDigits = otp.replace(/[^\d]/g, '');
    if (otpDigits.length !== 6) next.otp = 'Enter the 6-digit OTP';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleVerify = async () => {
    if (!validate()) return;
    if (!email) {
      appMessage.alert({ title: 'Missing email', message: 'Go back and enter your email.' });
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email, otp.replace(/[^\d]/g, '').slice(0, 6), {
        schoolName: schoolName || undefined,
      });
    } catch (error: any) {
      appMessage.alert({
        title: 'Verification failed',
        message: error?.response?.data?.message || error?.message || 'Invalid or expired OTP',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await authAPI.resendRegistrationOtp(email);
      appMessage.toast({ message: res.message || 'OTP resent. Check your email.' });
    } catch (error: any) {
      appMessage.alert({
        title: 'Error',
        message: error?.response?.data?.message || error?.message || 'Failed to resend verification',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold navigation={navigation} title="Verify your email">
      <AppText style={[styles.subtitle, { color: colors.textMuted }]}>
        Enter the 6-digit code sent to your email to complete registration.
      </AppText>

      <Input label="Email" value={email} editable={false} />

      <OtpInput value={otp} onChange={setOtp} errorText={errors.otp} autoFocus />

      <Button title="Verify" onPress={handleVerify} loading={loading} style={styles.primaryButton} />

      <View style={styles.bottomRow}>
        <TouchableOpacity onPress={handleResend} activeOpacity={0.85} disabled={loading}>
          <AppText style={[styles.link, { color: colors.accent }]}>Resend code</AppText>
        </TouchableOpacity>
        <AppText style={[styles.dot, { color: colors.textMuted }]}> • </AppText>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
          <AppText style={[styles.link, { color: colors.accent }]}>Back to login</AppText>
        </TouchableOpacity>
      </View>
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

export default VerifyOtpScreen;
