import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, TouchableOpacity, View } from 'react-native';
import AuthScaffold from '../components/auth/AuthScaffold';
import AppText from '../components/AppText';
import Button from '../components/Button';
import Input from '../components/Input';
import OtpInput from '../components/OtpInput';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { authAPI } from '../services/api';

interface ForgotPasswordScreenProps {
  navigation: any;
}

type Step = 'request' | 'reset';
type ResetStage = 'otp' | 'password';

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();

  const [step, setStep] = useState<Step>('request');
  const [resetStage, setResetStage] = useState<ResetStage>('otp');
  const [stageWidth, setStageWidth] = useState(0);
  const stageAnim = useRef(new Animated.Value(0)).current;
  const verifySeq = useRef(0);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    otp?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const otpDigits = useMemo(() => otp.replace(/[^\d]/g, '').slice(0, 6), [otp]);

  useEffect(() => {
    if (step !== 'reset') return;
    if (resetStage !== 'otp') return;
    if (otpDigits.length !== 6) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    const seq = ++verifySeq.current;
    setVerifyingOtp(true);
    setErrors((prev) => ({ ...prev, otp: undefined }));

    authAPI
      .verifyPasswordResetOtp(trimmedEmail, otpDigits)
      .then((res) => {
        if (seq !== verifySeq.current) return;
        setResetToken(res.resetToken);
        setResetStage('password');
      })
      .catch((error: any) => {
        if (seq !== verifySeq.current) return;
        setResetToken(null);
        setErrors((prev) => ({
          ...prev,
          otp: error?.response?.data?.message || error?.message || 'Invalid or expired OTP',
        }));
      })
      .finally(() => {
        if (seq !== verifySeq.current) return;
        setVerifyingOtp(false);
      });
  }, [email, otpDigits, resetStage, step]);

  useEffect(() => {
    if (step !== 'reset') return;
    if (!stageWidth) return;
    Animated.timing(stageAnim, {
      toValue: resetStage === 'password' ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [resetStage, stageAnim, stageWidth, step]);

  const translateX = useMemo(() => {
    if (!stageWidth) return 0 as unknown as number;
    return stageAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -stageWidth],
    });
  }, [stageAnim, stageWidth]);

  const validateEmail = () => {
    const next: typeof errors = {};
    const trimmed = email.trim();
    if (!trimmed) next.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(trimmed)) next.email = 'Email is invalid';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const requestResetOtp = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    try {
      verifySeq.current++;
      const res = await authAPI.forgotPassword(email.trim());
      setStep('reset');
      setResetStage('otp');
      setOtp('');
      setResetToken(null);
      setVerifyingOtp(false);
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      appMessage.toast({ message: res.message || 'OTP sent. Check your email.' });
    } catch (error: any) {
      appMessage.alert({
        title: 'Error',
        message: error?.response?.data?.message || error?.message || 'Failed to send OTP',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateReset = () => {
    const next: typeof errors = {};
    if (!resetToken) next.otp = 'Verify OTP to continue';

    if (!newPassword) next.newPassword = 'New password is required';
    else if (newPassword.length < 6) next.newPassword = 'Password must be at least 6 characters';

    if (!confirmPassword) next.confirmPassword = 'Confirm your password';
    else if (confirmPassword !== newPassword) next.confirmPassword = 'Passwords do not match';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateReset()) return;
    if (!resetToken) {
      setResetStage('otp');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.resetPassword({
        token: resetToken,
        newPassword,
      });
      appMessage.alert({
        title: 'Success',
        message: res.message || 'Password reset successfully. You can now login with your new password.',
        actions: [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to reset password';
      verifySeq.current++;
      setResetStage('otp');
      setResetToken(null);
      setVerifyingOtp(false);
      setNewPassword('');
      setConfirmPassword('');
      setErrors({ otp: message });
      appMessage.alert({
        title: 'Error',
        message,
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
            Enter your email to receive a 6-digit OTP code.
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
          <Button title="Send OTP" onPress={requestResetOtp} loading={loading} style={styles.primaryButton} />
          <View style={styles.bottomRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
              <AppText style={[styles.link, { color: colors.accent }]}>Back to login</AppText>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <AppText style={[styles.subtitle, { color: colors.textMuted }]}>
            Enter the OTP from your email to continue.
          </AppText>

          <View style={styles.slideViewport} onLayout={(e) => setStageWidth(e.nativeEvent.layout.width)}>
            {stageWidth ? (
              <Animated.View style={[styles.slideRow, { width: stageWidth * 2, transform: [{ translateX }] }]}>
                <View style={[styles.slide, { width: stageWidth }]}>
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    errorText={errors.otp}
                    autoFocus
                    disabled={verifyingOtp || loading}
                  />
                  {verifyingOtp ? (
                    <View style={styles.verifyingRow}>
                      <ActivityIndicator size="small" color={colors.secondary} />
                      <AppText style={[styles.verifyingText, { color: colors.textMuted }]}>
                        Verifying OTP...
                      </AppText>
                    </View>
                  ) : null}
                  <AppText style={[styles.hint, { color: colors.textMuted }]}>
                    OTP expires after 10 minutes. You can request a fresh code anytime.
                  </AppText>
                </View>

                <View style={[styles.slide, { width: stageWidth }]}>
                  <AppText style={[styles.subtitle, { color: colors.textMuted, marginBottom: 10 }]}>
                    Create a new password.
                  </AppText>

                  <Input
                    label="New password"
                    placeholder="Create a new password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    errorText={errors.newPassword}
                    isPassword
                    autoComplete="password-new"
                  />
                  <Input
                    label="Confirm password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    errorText={errors.confirmPassword}
                    isPassword
                    autoComplete="password-new"
                  />

                  <Button
                    title="Reset password"
                    onPress={handleResetPassword}
                    loading={loading}
                    style={styles.primaryButton}
                  />
                </View>
              </Animated.View>
            ) : (
              <OtpInput value={otp} onChange={setOtp} errorText={errors.otp} autoFocus />
            )}
          </View>

          <View style={styles.bottomRow}>
            {resetStage === 'password' ? (
              <>
                <TouchableOpacity
                  onPress={() => {
                    verifySeq.current++;
                    setResetToken(null);
                    setVerifyingOtp(false);
                    setResetStage('otp');
                  }}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  <AppText style={[styles.link, { color: colors.accent }]}>Change OTP</AppText>
                </TouchableOpacity>
                <AppText style={[styles.dot, { color: colors.textMuted }]}> • </AppText>
              </>
            ) : null}

            <TouchableOpacity
              onPress={requestResetOtp}
              activeOpacity={0.85}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Resend OTP"
            >
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
  hint: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
    marginTop: -6,
    marginBottom: 10,
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: -2,
    marginBottom: 8,
  },
  verifyingText: {
    fontSize: 12,
    fontWeight: '800',
  },
  primaryButton: {
    marginTop: 6,
    marginBottom: 14,
  },
  slideViewport: {
    overflow: 'hidden',
  },
  slideRow: {
    flexDirection: 'row',
  },
  slide: {
    paddingRight: 0,
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
