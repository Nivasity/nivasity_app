import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import AppText from './AppText';
import OtpInput from './OtpInput';
import { IconCircle } from './ui';
import { useTheme } from '../contexts/ThemeContext';

// Bottom sheet that asks for the Wallet PIN and confirms as soon as the 4th digit is typed
// (no confirm button). onConfirm should throw with a readable message on failure.
export default function PinConfirmSheet({
  visible,
  onClose,
  title = 'Enter Wallet PIN',
  description,
  amount,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  amount?: string;
  onConfirm: (pin: string) => Promise<void>;
}) {
  const { colors } = useTheme();
  const keyboardHeight = useKeyboardHeight();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPin('');
      setError(null);
      setBusy(false);
    }
  }, [visible]);

  const submit = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(value);
    } catch (err: any) {
      setError(err?.message || 'Could not confirm. Try again.');
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => !busy && onClose()}>
      <View style={styles.flex}>
        <Pressable style={styles.backdrop} onPress={() => !busy && onClose()} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: keyboardHeight }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.center}>
            <IconCircle icon="lock-closed-outline" size={48} />
            <AppText style={[styles.title, { color: colors.text }]}>{title}</AppText>
            {description ? <AppText style={[styles.description, { color: colors.textMuted }]}>{description}</AppText> : null}
          </View>
          {amount ? (
            <View style={[styles.amountBox, { backgroundColor: colors.surfaceAlt }]}>
              <AppText style={[styles.amount, { color: colors.text }]}>{amount}</AppText>
            </View>
          ) : null}
          <OtpInput
            value={pin}
            onChange={setPin}
            onComplete={submit}
            length={4}
            variant="pin"
            secureTextEntry
            autoFocus
            disabled={busy}
          />
          <View style={styles.status}>
            {busy ? (
              <View style={styles.busyRow}>
                <ActivityIndicator color={colors.accent} />
                <AppText style={{ color: colors.textMuted }}>Confirming…</AppText>
              </View>
            ) : error ? (
              <AppText style={[styles.error, { color: colors.danger }]}>{error}</AppText>
            ) : (
              <AppText style={{ color: colors.textMuted, fontSize: 13 }}>Confirms when you enter the 4th digit</AppText>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill as object, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 16,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
  center: { alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  description: { fontSize: 14, textAlign: 'center' },
  amountBox: { borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  amount: { fontSize: 28, fontWeight: '800' },
  status: { minHeight: 24, alignItems: 'center', justifyContent: 'center' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  error: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
