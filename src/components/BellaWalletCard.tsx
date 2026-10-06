import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Text from './AppText';
import AppIcon from './AppIcon';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { walletAPI } from '../services/api';
import { WalletSummary } from '../types';

const naira = (n: number) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

// Wallet card Bella shows under her reply (show_wallet_details). The details load here, on the
// student's device, so the account number and balance never pass through the AI.
const BellaWalletCard: React.FC<{ onOpenWallet: () => void; onActivate: () => void }> = ({ onOpenWallet, onActivate }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const [data, setData] = useState<WalletSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    walletAPI
      .getSummary()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <TouchableOpacity onPress={onOpenWallet} style={[styles.outline, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <AppIcon name="wallet-outline" size={18} color={colors.accent} />
        <Text style={{ color: colors.text, fontWeight: '700' }}>Open wallet</Text>
      </TouchableOpacity>
    );
  }
  if (!data) {
    return (
      <View style={[styles.loading, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  const w = data.wallet;
  if (!data.hasWallet || !w?.accountNumber) {
    return (
      <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>You don't have a wallet yet</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>Activate it to get your own account number for funding.</Text>
        <TouchableOpacity onPress={onActivate} style={[styles.action, { backgroundColor: colors.accent }]}>
          <AppIcon name="wallet-outline" size={16} color={colors.onAccent} />
          <Text style={{ color: colors.onAccent, fontWeight: '800' }}>Activate wallet</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const copy = async () => {
    await Clipboard.setStringAsync(String(w.accountNumber));
    appMessage.toast({ status: 'success', message: 'Account number copied' });
  };
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>YOUR NIVASITY WALLET</Text>
        <Text style={styles.muted}>
          Balance <Text style={{ color: '#fff', fontWeight: '800' }}>{naira(w.balance)}</Text>
        </Text>
      </View>
      <Text style={[styles.muted, { marginTop: 10 }]}>{w.bankName}</Text>
      <View style={[styles.row, { justifyContent: 'flex-start', gap: 10 }]}>
        <Text selectable style={styles.number}>{w.accountNumber}</Text>
        <TouchableOpacity onPress={copy} style={styles.copy} accessibilityLabel="Copy account number">
          <AppIcon name="copy-outline" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.muted}>{w.accountName}</Text>
      <Text style={[styles.muted, { marginTop: 10, fontSize: 11 }]}>Transfer to this account from any bank app. It reflects in your wallet automatically.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, backgroundColor: '#7a3b73' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  muted: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  number: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 1.5 },
  copy: { padding: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)' },
  box: { borderWidth: 1, borderRadius: 18, padding: 14 },
  action: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, paddingVertical: 11 },
  outline: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 11 },
  loading: { height: 90, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

export default BellaWalletCard;
