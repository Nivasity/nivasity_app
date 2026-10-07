import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import AppText from './AppText';
import Button from './Button';
import PinConfirmSheet from './PinConfirmSheet';
import { useTheme } from '../contexts/ThemeContext';
import { useAppMessage } from '../contexts/AppMessageContext';
import { DepositRefundState, walletAPI } from '../services/api';

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;
const when = (v?: string) => {
  if (!v) return '';
  const d = new Date(v.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

// Refund my last deposit: the latest bank deposit goes back, whole, to the account it came from.
// Only if the wallet still holds it and no money moved to or from another student since; the
// student gives a reason and confirms with their Wallet PIN.
const DepositRefundSheet: React.FC<{ visible: boolean; onClose: () => void; onDone?: () => void }> = ({ visible, onClose, onDone }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const [state, setState] = useState<DepositRefundState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [pinOpen, setPinOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setState(null);
    setError(null);
    setReason('');
    walletAPI
      .getDepositRefund()
      .then(setState)
      .catch((e) => setError(e?.message || 'Could not load your deposits'));
  }, [visible]);

  const dep = state?.deposit;

  return (
    <>
      <Modal visible={visible && !pinOpen} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.root}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText style={[styles.title, { color: colors.text }]}>Refund my last deposit</AppText>
            <AppText style={{ color: colors.textMuted, fontSize: 13 }}>Your latest bank deposit goes back, in full, to the account it came from.</AppText>

            {!state && !error ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
            ) : error ? (
              <AppText style={{ color: colors.danger, marginTop: 12 }}>{error}</AppText>
            ) : (
              <>
                {dep ? (
                  <View style={[styles.box, { backgroundColor: colors.surfaceAlt }]}>
                    <AppText style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>Latest deposit · {when(dep.date)}</AppText>
                    <AppText style={{ color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 2 }}>{naira(dep.amount)}</AppText>
                    <AppText style={{ color: colors.textMuted, fontSize: 12 }}>Wallet balance {naira(state!.balance)}</AppText>
                  </View>
                ) : null}
                <AppText style={{ color: state!.eligible ? colors.textMuted : colors.warning || colors.text, fontSize: 13, marginTop: 12 }}>{state!.message}</AppText>
                {state!.eligible ? (
                  <>
                    <AppText style={{ color: colors.text, fontWeight: '700', marginTop: 14 }}>Why do you want this refund?</AppText>
                    <TextInput
                      value={reason}
                      onChangeText={setReason}
                      multiline
                      maxLength={240}
                      placeholder="e.g. I sent ₦4,000 twice by mistake"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
                    />
                    <AppText style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>It reaches your bank in a few hours to 3 working days.</AppText>
                  </>
                ) : null}
                {state!.refunds.length ? (
                  <View style={{ marginTop: 14, gap: 4 }}>
                    <AppText style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>YOUR REFUNDS</AppText>
                    {state!.refunds.map((r) => (
                      <View key={r.reference} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <AppText style={{ color: colors.text, fontSize: 13 }}>{naira(r.amount)} · {when(r.created_at)}</AppText>
                        <AppText style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{r.status === 'processing' ? 'On its way' : r.status.replace('_', ' ')}</AppText>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            )}

            <View style={styles.actions}>
              <Button title="Close" variant="ghost" style={{ flex: 1 }} onPress={onClose} />
              {state?.eligible ? (
                <Button title={`Refund ${dep ? naira(dep.amount) : ''}`} style={{ flex: 1 }} disabled={reason.trim().length < 5} onPress={() => setPinOpen(true)} />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      <PinConfirmSheet
        visible={pinOpen}
        onClose={() => setPinOpen(false)}
        title="Confirm refund"
        description="Enter your Wallet PIN to send this deposit back to your bank."
        amount={dep ? naira(dep.amount) : undefined}
        onConfirm={async (pin) => {
          const msg = await walletAPI.requestDepositRefund(dep!.id, reason.trim(), pin);
          appMessage.toast({ status: 'success', message: msg });
          setPinOpen(false);
          onClose();
          onDone?.();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, padding: 18, paddingBottom: 28 },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  box: { borderRadius: 16, padding: 14, marginTop: 14 },
  input: { marginTop: 8, minHeight: 70, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
});

export default DepositRefundSheet;
