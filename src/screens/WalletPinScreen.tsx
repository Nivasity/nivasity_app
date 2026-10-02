import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AppText from '../components/AppText';
import Button from '../components/Button';
import OtpInput from '../components/OtpInput';
import { Card, IconButton, IconCircle } from '../components/ui';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';
import { walletAPI } from '../services/api';

type WalletPinScreenProps = {
  navigation: any;
};

// Create / change / reset the Wallet PIN. Every row of boxes moves on by itself when the
// last digit is typed: no Save buttons (same flow as the web portal).
//  direct: [current ->] new -> confirm      reset: send code -> 6-digit code -> new -> confirm
type Step = 'direct' | 'request' | 'verify' | 'save';
type Entry = 'current' | 'new' | 'confirm';

const WalletPinScreen: React.FC<WalletPinScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const { hasWallet, hasPin, refreshSummary, createWallet } = useWallet();
  const [step, setStep] = useState<Step>('direct');
  const [entry, setEntry] = useState<Entry>('new');
  const [code, setCode] = useState('');
  const [pinToken, setPinToken] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEntry = useCallback(
    (s: Step, withCurrent: boolean) => {
      setStep(s);
      setCurrentPin('');
      setPin('');
      setConfirmPin('');
      setEntry(withCurrent ? 'current' : 'new');
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      refreshSummary()
        .then((summary) => startEntry('direct', Boolean(summary?.hasPin)))
        .catch(() => undefined);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const run = async (action: () => Promise<void>, onFail?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e: any) {
      // Covers wrong current PIN, expired codes and the 30-minute lockout after repeated wrong PINs.
      setError(e?.message || 'Something went wrong. Please try again.');
      onFail?.();
    } finally {
      setBusy(false);
    }
  };

  const save = (confirmValue: string) => {
    if (confirmValue !== pin) {
      setError('PINs do not match. Enter your new PIN again.');
      setPin('');
      setConfirmPin('');
      setEntry('new');
      return;
    }
    run(
      async () => {
        if (step === 'save') await walletAPI.savePin({ pinToken, pin, confirmPin: confirmValue });
        else await walletAPI.setPinDirect({ pin, confirmPin: confirmValue, currentPin: hasPin ? currentPin : undefined });
        await refreshSummary();
        appMessage.toast({ status: 'success', message: hasPin ? 'PIN updated' : 'PIN created' });
        navigation.goBack();
      },
      () => startEntry(step, step === 'direct' && hasPin)
    );
  };

  const onEntryComplete = (value: string) => {
    setError(null);
    if (entry === 'current') setEntry('new');
    else if (entry === 'new') setEntry('confirm');
    else save(value);
  };

  const sendCode = () =>
    run(async () => {
      await walletAPI.sendPinCode();
      setCode('');
      setStep('verify');
      appMessage.toast({ status: 'success', message: 'Code sent to your email' });
    });

  const verifyCode = (value: string) =>
    run(
      async () => {
        const response = await walletAPI.verifyPinCode(value);
        setPinToken(response.pinToken);
        startEntry('save', false);
      },
      () => setCode('')
    );

  const activate = () =>
    run(async () => {
      await createWallet();
      appMessage.toast({ status: 'success', message: 'Wallet ready' });
    });

  const entries: Entry[] = step === 'direct' && hasPin ? ['current', 'new', 'confirm'] : ['new', 'confirm'];
  const entryLabel: Record<Entry, string> = {
    current: 'Enter your current PIN',
    new: 'Choose a new 4-digit PIN',
    confirm: 'Enter the new PIN again',
  };
  const entryValue = entry === 'current' ? currentPin : entry === 'new' ? pin : confirmPin;
  const setEntryValue = entry === 'current' ? setCurrentPin : entry === 'new' ? setPin : setConfirmPin;

  const header =
    step === 'request' || step === 'verify'
      ? { icon: 'mail-outline' as const, title: step === 'request' ? 'Reset Wallet PIN' : 'Check your email', text: step === 'request' ? "We'll email you a 6-digit code to confirm it's you." : 'Enter the 6-digit code we sent you.' }
      : step === 'save'
        ? { icon: 'shield-checkmark-outline' as const, title: 'Set a new PIN', text: 'Code confirmed. Choose your new Wallet PIN.' }
        : hasPin
          ? { icon: 'key-outline' as const, title: 'Change Wallet PIN', text: 'Current PIN first, then your new one.' }
          : { icon: 'shield-checkmark-outline' as const, title: 'Create Wallet PIN', text: "You'll use it to approve payments and transfers." };

  const status = (
    <View style={styles.status}>
      {busy ? (
        <View style={styles.busyRow}>
          <ActivityIndicator color={colors.accent} />
          <AppText style={{ color: colors.textMuted }}>Please wait…</AppText>
        </View>
      ) : error ? (
        <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
          <AppText style={[styles.topTitle, { color: colors.text }]}>Wallet PIN</AppText>
          <View style={{ width: 42 }} />
        </View>

        <Card style={styles.card}>
          {!hasWallet ? (
            <>
              <View style={styles.center}>
                <IconCircle icon="wallet-outline" size={56} />
                <AppText style={[styles.title, { color: colors.text }]}>Activate your wallet first</AppText>
                <AppText style={[styles.text, { color: colors.textMuted }]}>You need a wallet before you can set a PIN.</AppText>
              </View>
              {status}
              <Button title="Activate wallet" onPress={activate} loading={busy} />
            </>
          ) : (
            <>
              <View style={styles.center}>
                <IconCircle icon={header.icon} size={56} />
                <AppText style={[styles.title, { color: colors.text }]}>{header.title}</AppText>
                <AppText style={[styles.text, { color: colors.textMuted }]}>{header.text}</AppText>
              </View>

              {step === 'direct' || step === 'save' ? (
                <>
                  <View style={styles.dots}>
                    {entries.map((e) => {
                      const idx = entries.indexOf(e);
                      const cur = entries.indexOf(entry);
                      return (
                        <View
                          key={e}
                          style={[
                            styles.dot,
                            { backgroundColor: idx <= cur ? colors.accent : colors.border, opacity: idx < cur ? 0.6 : 1 },
                            idx === cur && { width: 24 },
                          ]}
                        />
                      );
                    })}
                  </View>
                  <AppText style={[styles.entryLabel, { color: colors.text }]}>{entryLabel[entry]}</AppText>
                  <OtpInput
                    key={`${step}-${entry}`}
                    value={entryValue}
                    onChange={setEntryValue}
                    onComplete={onEntryComplete}
                    length={4}
                    variant="pin"
                    secureTextEntry
                    autoFocus
                    disabled={busy}
                    errorText={undefined}
                  />
                  {status}
                  {step === 'direct' && hasPin ? (
                    <Pressable
                      onPress={() => {
                        setError(null);
                        setStep('request');
                      }}
                      style={styles.link}
                      accessibilityRole="button"
                    >
                      <AppText style={[styles.linkText, { color: colors.accent }]}>Forgot your PIN? Reset with email code</AppText>
                    </Pressable>
                  ) : null}
                </>
              ) : step === 'request' ? (
                <>
                  {status}
                  <Button title="Send code" icon="mail-outline" onPress={sendCode} loading={busy} />
                  <Button title="I remember my PIN" variant="ghost" onPress={() => startEntry('direct', true)} />
                </>
              ) : (
                <>
                  <OtpInput value={code} onChange={setCode} onComplete={verifyCode} length={6} autoFocus disabled={busy} />
                  {status}
                  <Pressable onPress={sendCode} style={styles.link} accessibilityRole="button" disabled={busy}>
                    <AppText style={[styles.linkText, { color: colors.accent }]}>Send a new code</AppText>
                  </Pressable>
                </>
              )}
            </>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  topTitle: { fontSize: 17, fontWeight: '700' },
  card: { padding: 20, gap: 16 },
  center: { alignItems: 'center', gap: 6 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  text: { fontSize: 14, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 6, width: 6, borderRadius: 3 },
  entryLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  status: { minHeight: 22, alignItems: 'center', justifyContent: 'center' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  error: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  link: { alignSelf: 'center', paddingVertical: 6 },
  linkText: { fontSize: 14, fontWeight: '700' },
});

export default WalletPinScreen;
