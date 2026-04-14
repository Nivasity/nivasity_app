import * as Clipboard from 'expo-clipboard';
import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';

type WalletFundScreenProps = {
  navigation: any;
};

const formatMoney = (value: number) => `₦ ${Number(value || 0).toLocaleString()}`;

const WalletFundScreen: React.FC<WalletFundScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const { summary, loading, refreshing, hasWallet, refreshCreditsAndSummary, createWallet } = useWallet();

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

  const handleCopy = async () => {
    if (!wallet?.accountNumber) return;
    await Clipboard.setStringAsync(wallet.accountNumber);
    appMessage.toast({ status: 'success', message: 'Account number copied' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing && !loading}
            onRefresh={() => {
              void refreshCreditsAndSummary();
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityRole="button">
            <AppIcon name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <AppText style={[styles.title, { color: colors.text }]}>Fund Wallet</AppText>
          <TouchableOpacity
            onPress={() => {
              void refreshCreditsAndSummary();
            }}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Refresh wallet"
          >
            <AppIcon name="refresh-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText style={[styles.eyebrow, { color: colors.secondary }]}>
            {hasWallet ? 'Wallet balance' : 'Wallet'}
          </AppText>
          <AppText style={[styles.balance, { color: colors.text }]}>
            {hasWallet ? formatMoney(wallet?.balance ?? 0) : 'Activate to fund'}
          </AppText>
          <AppText style={[styles.subtle, { color: colors.textMuted }]}>
            {hasWallet ? 'Send to the account below.' : 'Create your wallet to get a bank account.'}
          </AppText>
          {!hasWallet ? (
            <Button title={refreshing ? 'Activating...' : 'Activate my wallet'} onPress={handleCreateWallet} disabled={refreshing} />
          ) : null}
        </View>

        {hasWallet && wallet ? (
          <>
            <View style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Row label="Bank" value={wallet.bankName || 'Not available'} />
              <Row label="Account name" value={wallet.accountName || 'Not available'} />
              <View style={[styles.copyRow, { borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <AppText style={[styles.rowLabel, { color: colors.textMuted }]}>Account number</AppText>
                  <AppText style={[styles.accountNumber, { color: colors.text }]}>{wallet.accountNumber || 'Not available'}</AppText>
                </View>
                <TouchableOpacity
                  onPress={handleCopy}
                  disabled={!wallet.accountNumber}
                  style={[styles.copyButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                  accessibilityRole="button"
                  accessibilityLabel="Copy account number"
                >
                  <AppIcon name="copy-outline" size={16} color={colors.secondary} />
                  <AppText style={[styles.copyText, { color: colors.text }]}>Copy</AppText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.noteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.noteIcon, { backgroundColor: colors.accentCard }]}>
                <AppIcon name="wallet-outline" size={18} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={[styles.noteTitle, { color: colors.text }]}>Use this account to fund</AppText>
                <AppText style={[styles.noteText, { color: colors.textMuted }]}>Credits appear in your wallet after sync.</AppText>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <AppText style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</AppText>
      <AppText style={[styles.rowValue, { color: colors.text }]}>{value}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
  heroCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    gap: 10,
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balance: {
    fontSize: 30,
    fontWeight: '900',
  },
  subtle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  accountCard: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 14,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 6,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  copyRow: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountNumber: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  copyButton: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  noteCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  noteIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default WalletFundScreen;