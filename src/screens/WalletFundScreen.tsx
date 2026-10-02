import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { Card, GradientCard, IconButton, IconCircle } from '../components/ui';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';

type WalletFundScreenProps = {
  navigation: any;
};

const money = (value: number) =>
  `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Add money: the student's own account number on the wallet gradient, copy, and
// "I've sent the money" which pulls new transfers and reports what arrived.
const WalletFundScreen: React.FC<WalletFundScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const { summary, loading, refreshing, hasWallet, refreshCreditsAndSummary, createWallet } = useWallet();
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshCreditsAndSummary();
    }, [refreshCreditsAndSummary])
  );

  const wallet = summary?.wallet;

  const handleCreateWallet = async () => {
    try {
      await createWallet();
      appMessage.toast({ status: 'success', message: 'Wallet ready' });
    } catch (error: any) {
      appMessage.alert({ title: 'Could not activate wallet', message: error?.message || 'Please try again.' });
    }
  };

  const copy = async () => {
    if (!wallet?.accountNumber) return;
    await Clipboard.setStringAsync(wallet.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const check = async () => {
    setChecking(true);
    const before = wallet?.balance ?? 0;
    const next = await refreshCreditsAndSummary().catch(() => null);
    const after = next?.wallet?.balance ?? before;
    appMessage.toast(
      after > before
        ? { status: 'success', message: `${money(after - before)} received` }
        : { status: 'info', message: 'Nothing new yet. Transfers usually land within a few minutes.' }
    );
    setChecking(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing && !loading}
            onRefresh={() => void refreshCreditsAndSummary()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <View style={styles.topBar}>
          <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
          <AppText style={[styles.topTitle, { color: colors.text }]}>Add money</AppText>
          <View style={{ width: 42 }} />
        </View>

        {!hasWallet ? (
          <Card style={{ alignItems: 'center', gap: 10, padding: 24 }}>
            <IconCircle icon="wallet" size={60} color="#FFFFFF" background={colors.secondary} />
            <AppText style={[styles.title, { color: colors.text }]}>Activate your wallet</AppText>
            <AppText style={{ color: colors.textMuted, textAlign: 'center' }}>Create your wallet to get your own account number.</AppText>
            <Button title="Activate my wallet" onPress={handleCreateWallet} loading={refreshing} style={{ alignSelf: 'stretch', marginTop: 8 }} />
          </Card>
        ) : wallet ? (
          <>
            <AppText style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
              Transfer from any Nigerian bank app or USSD to the account below. It's yours alone, so you can save it as a beneficiary.
            </AppText>

            <GradientCard>
              <AppText style={styles.label}>Bank</AppText>
              <AppText style={styles.value}>{wallet.bankName || '—'}</AppText>
              <AppText style={[styles.label, { marginTop: 14 }]}>Account number</AppText>
              <AppText style={styles.number}>{wallet.accountNumber || '—'}</AppText>
              <AppText style={[styles.label, { marginTop: 14 }]}>Account name</AppText>
              <AppText numberOfLines={1} style={styles.value}>
                {wallet.accountName || '—'}
              </AppText>
              <Pressable
                onPress={copy}
                disabled={!wallet.accountNumber}
                accessibilityRole="button"
                accessibilityLabel="Copy account number"
                style={({ pressed }) => [
                  styles.copy,
                  copied
                    ? { backgroundColor: colors.success }
                    : { backgroundColor: '#FFFFFF', borderBottomWidth: pressed ? 1 : 3, borderBottomColor: 'rgba(0,0,0,0.18)' },
                ]}
              >
                <AppIcon name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#FFFFFF' : '#4E2149'} />
                <AppText style={{ color: copied ? '#FFFFFF' : '#4E2149', fontWeight: '700' }}>
                  {copied ? 'Copied' : 'Copy account number'}
                </AppText>
              </Pressable>
            </GradientCard>

            <Card style={{ gap: 12 }}>
              <View style={styles.balanceRow}>
                <AppText style={{ color: colors.textMuted }}>Current balance</AppText>
                <AppText style={[styles.balance, { color: colors.text }]}>{money(wallet.balance ?? 0)}</AppText>
              </View>
              <Button title="I've sent the money" icon="refresh" variant="outline" onPress={check} loading={checking} />
              <AppText style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>
                Transfers usually reflect within 1–5 minutes, depending on the bank.
              </AppText>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { fontSize: 17, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800' },
  label: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
  value: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginTop: 2 },
  number: { color: '#FFFFFF', fontSize: 34, fontWeight: '700', letterSpacing: 2, marginTop: 2 },
  copy: { marginTop: 20, height: 50, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balance: { fontSize: 18, fontWeight: '800' },
});

export default WalletFundScreen;
