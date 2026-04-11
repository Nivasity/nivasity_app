import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import OtpInput from '../components/OtpInput';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';
import { walletAPI } from '../services/api';

type WalletPinScreenProps = {
  navigation: any;
};

const WalletPinScreen: React.FC<WalletPinScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const { hasWallet, hasPin, refreshSummary, createWallet } = useWallet();
  const [step, setStep] = useState<'request' | 'verify' | 'save'>('request');
  const [code, setCode] = useState('');
  const [pinToken, setPinToken] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshSummary();
    }, [refreshSummary])
  );

  const handleCreateWallet = async () => {
    try {
      await createWallet();
      appMessage.toast({ status: 'success', message: 'Wallet ready' });
    } catch (error: any) {
      appMessage.alert({ title: 'Could not activate wallet', message: error?.message || 'Please try again.' });
    }
  };

  const handleSendCode = async () => {
    setSending(true);
    try {
      await walletAPI.sendPinCode();
      setStep('verify');
      setCode('');
      appMessage.toast({ status: 'success', message: 'Code sent to your email' });
    } catch (error: any) {
      appMessage.alert({ title: 'Could not send code', message: error?.message || 'Please try again.' });
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.trim().length !== 6) {
      appMessage.alert({ title: 'Enter the 6-digit code', message: 'Check your email and try again.' });
      return;
    }
    setVerifying(true);
    try {
      const response = await walletAPI.verifyPinCode(code.trim());
      setPinToken(response.pinToken);
      setStep('save');
      setPin('');
      setConfirmPin('');
      appMessage.toast({ status: 'success', message: 'Code verified' });
    } catch (error: any) {
      appMessage.alert({ title: 'Code not valid', message: error?.message || 'Please try again.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleSavePin = async () => {
    if (pin.length !== 4 || confirmPin.length !== 4) {
      appMessage.alert({ title: 'Enter a 4-digit PIN', message: 'Both fields must be 4 digits.' });
      return;
    }
    if (pin !== confirmPin) {
      appMessage.alert({ title: 'PIN mismatch', message: 'Make sure both PIN entries match.' });
      return;
    }

    setSaving(true);
    try {
      await walletAPI.savePin({ pinToken, pin, confirmPin });
      await refreshSummary();
      appMessage.toast({ status: 'success', message: hasPin ? 'PIN updated' : 'PIN saved' });
      navigation.goBack();
    } catch (error: any) {
      appMessage.alert({ title: 'Could not save PIN', message: error?.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityRole="button">
            <AppIcon name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <AppText style={[styles.title, { color: colors.text }]}>Wallet PIN</AppText>
          <View style={styles.iconButton} />
        </View>

        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText style={[styles.headerLabel, { color: colors.secondary }]}>{hasPin ? 'Update PIN' : 'Create PIN'}</AppText>
          <AppText style={[styles.headerTitle, { color: colors.text }]}>4-digit wallet PIN</AppText>
          <AppText style={[styles.headerText, { color: colors.textMuted }]}>Use it for wallet checkout.</AppText>
        </View>

        {!hasWallet ? (
          <View style={{ marginTop: 20 }}>
            <EmptyState icon="lock-closed-outline" title="Activate wallet first" subtitle="A wallet is required before you can set a PIN." />
            <View style={{ height: 14 }} />
            <Button title="Activate my wallet" onPress={handleCreateWallet} />
          </View>
        ) : null}

        {hasWallet ? (
          <View style={[styles.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <StepChip label="1" title="Send code" active={step === 'request'} done={step !== 'request'} />
            <StepChip label="2" title="Verify" active={step === 'verify'} done={step === 'save'} />
            <StepChip label="3" title="Save PIN" active={step === 'save'} done={false} />

            {step === 'request' ? (
              <View style={styles.stepBody}>
                <AppText style={[styles.stepTitle, { color: colors.text }]}>Email verification</AppText>
                <AppText style={[styles.stepText, { color: colors.textMuted }]}>We’ll send a code to confirm it’s you.</AppText>
                <Button title={sending ? 'Sending...' : hasPin ? 'Send update code' : 'Send code'} onPress={handleSendCode} disabled={sending} />
              </View>
            ) : null}

            {step === 'verify' ? (
              <View style={styles.stepBody}>
                <AppText style={[styles.stepTitle, { color: colors.text }]}>Enter code</AppText>
                <AppText style={[styles.stepText, { color: colors.textMuted }]}>Paste or type the 6-digit code from your email.</AppText>
                <OtpInput value={code} onChange={setCode} autoFocus />
                <Button title={verifying ? 'Verifying...' : 'Verify code'} onPress={handleVerifyCode} disabled={verifying} />
                <TouchableOpacity onPress={handleSendCode} style={styles.linkButton} accessibilityRole="button">
                  <AppText style={[styles.linkText, { color: colors.secondary }]}>Send a new code</AppText>
                </TouchableOpacity>
              </View>
            ) : null}

            {step === 'save' ? (
              <View style={styles.stepBody}>
                <AppText style={[styles.stepTitle, { color: colors.text }]}>Choose your PIN</AppText>
                <AppText style={[styles.stepText, { color: colors.textMuted }]}>Keep it short, private, and easy to remember.</AppText>
                <AppText style={[styles.pinLabel, { color: colors.textMuted }]}>New PIN</AppText>
                <OtpInput value={pin} onChange={setPin} length={4} variant="pin" secureTextEntry autoFocus />
                <AppText style={[styles.pinLabel, { color: colors.textMuted }]}>Confirm PIN</AppText>
                <OtpInput value={confirmPin} onChange={setConfirmPin} length={4} variant="pin" secureTextEntry />
                <Button title={saving ? 'Saving...' : hasPin ? 'Update PIN' : 'Save PIN'} onPress={handleSavePin} disabled={saving} />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const StepChip = ({ label, title, active, done }: { label: string; title: string; active: boolean; done: boolean }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.stepChip, active && { borderColor: colors.accent, backgroundColor: colors.accentCard }, !active && { borderColor: colors.border, backgroundColor: colors.background }]}>
      <View style={[styles.stepDot, { backgroundColor: done || active ? colors.accent : colors.border }]}>
        <AppText style={[styles.stepDotText, { color: done || active ? colors.onAccent : colors.textMuted }]}>{done ? '✓' : label}</AppText>
      </View>
      <AppText style={[styles.stepChipText, { color: colors.text }]}>{title}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 18,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
  },
  headerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  stepCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
    gap: 10,
  },
  stepChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '900',
  },
  stepChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepBody: {
    paddingTop: 6,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  stepText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  linkButton: {
    alignSelf: 'center',
    paddingTop: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pinLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
});

export default WalletPinScreen;