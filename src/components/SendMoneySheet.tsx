import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import AppText from './AppText';
import AppIcon from './AppIcon';
import Button from './Button';
import Input from './Input';
import OtpInput from './OtpInput';
import { IconCircle } from './ui';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';
import { transferAPI, TransferRecipient, WalletTransferResult } from '../services/api';

// Send money to a student in the same school, as a sheet (same flow as the web portal):
// find student -> amount -> PIN (sends on the 4th digit) -> done.

type Step = 'lookup' | 'details' | 'pin' | 'done';

// Server accepts 16-100 chars of [A-Za-z0-9:_-]. One token per attempt; a retry reuses it.
const newRequestToken = () =>
  `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`;

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

export default function SendMoneySheet({ visible, onClose, onSent }: { visible: boolean; onClose: () => void; onSent?: () => void }) {
  const { colors } = useTheme();
  const keyboardHeight = useKeyboardHeight();
  const { summary, hasWallet, hasPin, refreshSummary } = useWallet();
  const [step, setStep] = useState<Step>('lookup');
  const [identifier, setIdentifier] = useState('');
  const [recipient, setRecipient] = useState<TransferRecipient | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pin, setPin] = useState('');
  const [token, setToken] = useState(newRequestToken);
  const [result, setResult] = useState<WalletTransferResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('lookup');
    setIdentifier('');
    setRecipient(null);
    setAmount('');
    setNote('');
    setPin('');
    setResult(null);
    setError(null);
    setToken(newRequestToken());
  };

  useEffect(() => {
    if (visible) {
      reset();
      refreshSummary().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const balance = summary?.wallet?.balance ?? 0;
  const amountValue = Math.floor(Number(amount) || 0);

  const lookup = async () => {
    if (!identifier.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setRecipient(await transferAPI.lookup(identifier.trim()));
      setToken(newRequestToken());
      setStep('details');
    } catch (e: any) {
      setError(e?.message || 'Student not found');
    } finally {
      setLoading(false);
    }
  };

  const toPin = () => {
    if (amountValue <= 0) return setError('Enter an amount greater than zero');
    if (amountValue > balance) return setError('Amount is more than your wallet balance');
    setError(null);
    setPin('');
    setStep('pin');
  };

  const send = async (pinValue: string) => {
    if (!recipient) return;
    setLoading(true);
    setError(null);
    try {
      const res = await transferAPI.send({
        recipientIdentifier: recipient.email || identifier.trim(),
        amount: amountValue,
        pin: pinValue,
        requestToken: token,
        description: note.trim() || undefined,
      });
      setResult(res);
      setStep('done');
      refreshSummary().catch(() => undefined);
      onSent?.();
    } catch (e: any) {
      setError(e?.message || 'Transfer failed');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const blocked = !hasWallet || !hasPin;
  const initials = (recipient?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => !loading && onClose()}>
      <View style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={() => !loading && onClose()} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: keyboardHeight }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.headerRow}>
            {step === 'details' || step === 'pin' ? (
              <Pressable
                onPress={() => setStep(step === 'pin' ? 'details' : 'lookup')}
                hitSlop={10}
                accessibilityLabel="Back"
              >
                <AppIcon name="arrow-back" size={22} color={colors.text} />
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }}>
              <AppText style={[styles.title, { color: colors.text }]}>{step === 'done' ? 'Money sent' : 'Send money'}</AppText>
              {step !== 'done' ? (
                <AppText style={{ color: colors.textMuted, fontSize: 13 }}>To a student in your school · Balance {naira(balance)}</AppText>
              ) : null}
            </View>
            <Pressable onPress={() => !loading && onClose()} hitSlop={10} accessibilityLabel="Close">
              <AppIcon name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
            {error ? (
              <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
                <AppText style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>{error}</AppText>
              </View>
            ) : null}

            {blocked ? (
              <AppText style={{ color: colors.text }}>
                {!hasWallet ? 'Create your wallet first, then you can send money.' : 'Create a Wallet PIN before sending money.'}
              </AppText>
            ) : step === 'lookup' ? (
              <>
                <Input
                  label="Matric number or email"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  autoFocus
                  onSubmitEditing={lookup}
                />
                <Button title="Find student" icon="search" onPress={lookup} loading={loading} disabled={!identifier.trim()} />
              </>
            ) : step === 'details' && recipient ? (
              <>
                <View style={[styles.recipient, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                    <AppText style={{ color: '#FFFFFF', fontWeight: '700' }}>{initials}</AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText numberOfLines={1} style={{ color: colors.text, fontWeight: '700' }}>
                      {recipient.name}
                    </AppText>
                    <AppText numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12 }}>
                      {[recipient.matric_no, recipient.email].filter(Boolean).join(' · ')}
                    </AppText>
                  </View>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <AppText style={{ color: colors.textMuted, fontSize: 12 }}>Amount</AppText>
                  <View style={styles.amountRow}>
                    <AppText style={[styles.currency, { color: colors.textMuted }]}>₦</AppText>
                    <TextInput
                      value={amount ? Number(amount).toLocaleString() : ''}
                      onChangeText={(t) => setAmount(t.replace(/\D/g, '').slice(0, 9))}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      autoFocus
                      style={[styles.amountInput, { color: colors.text }]}
                    />
                  </View>
                  <View style={styles.quickRow}>
                    {[500, 1000, 2000, 5000].map((v) => (
                      <Pressable
                        key={v}
                        onPress={() => setAmount(String(v))}
                        style={[styles.quick, { borderColor: colors.border }]}
                      >
                        <AppText style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{naira(v)}</AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <Input label="Note (optional)" value={note} onChangeText={setNote} maxLength={160} />
                <Button title="Continue" icon="send" onPress={toPin} disabled={amountValue <= 0} />
              </>
            ) : step === 'pin' && recipient ? (
              <>
                <View style={[styles.summary, { backgroundColor: colors.surfaceAlt }]}>
                  <AppText style={[styles.bigAmount, { color: colors.text }]}>{naira(amountValue)}</AppText>
                  <AppText style={{ color: colors.textMuted, fontSize: 13 }}>to {recipient.name}</AppText>
                </View>
                <AppText style={{ color: colors.text, fontWeight: '600', textAlign: 'center' }}>Enter your Wallet PIN</AppText>
                <OtpInput value={pin} onChange={setPin} onComplete={send} length={4} variant="pin" secureTextEntry autoFocus disabled={loading} />
                <AppText style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                  {loading ? 'Sending…' : 'Sends as soon as you enter the 4th digit'}
                </AppText>
              </>
            ) : step === 'done' && result ? (
              <>
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <IconCircle icon="checkmark" size={56} color={colors.success} background={colors.successSoft} />
                  <AppText style={[styles.bigAmount, { color: colors.text }]}>{naira(result.transfer.amount)}</AppText>
                  <AppText style={{ color: colors.textMuted }}>sent to {result.transfer.recipient.name}</AppText>
                </View>
                <View style={[styles.summary, { backgroundColor: colors.surfaceAlt, alignItems: 'stretch', gap: 6 }]}>
                  <View style={styles.kv}>
                    <AppText style={{ color: colors.textMuted }}>Reference</AppText>
                    <AppText style={{ color: colors.text, fontSize: 12 }}>{result.reference}</AppText>
                  </View>
                  <View style={styles.kv}>
                    <AppText style={{ color: colors.textMuted }}>New balance</AppText>
                    <AppText style={{ color: colors.text, fontWeight: '700' }}>{naira(result.new_balance)}</AppText>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button title="Send another" variant="outline" style={{ flex: 1 }} onPress={reset} />
                  <Button title="Done" style={{ flex: 1 }} onPress={onClose} />
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...(StyleSheet.absoluteFill as object), backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 14,
    maxHeight: '92%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '800' },
  error: { borderRadius: 14, padding: 12 },
  recipient: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  currency: { fontSize: 30, fontWeight: '700' },
  amountInput: { fontSize: 40, fontFamily: 'Geist-ExtraBold', minWidth: 120, textAlign: 'center', paddingVertical: 4 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quick: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  summary: { borderRadius: 18, padding: 16, alignItems: 'center' },
  bigAmount: { fontSize: 30, fontWeight: '800' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
