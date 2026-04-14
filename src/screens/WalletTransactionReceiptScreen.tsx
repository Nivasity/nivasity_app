import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { WalletTransaction } from '../types';

type WalletTransactionReceiptScreenProps = {
  navigation: any;
  route: { params?: { transaction?: WalletTransaction } };
};

const sanitizeFilePart = (value: string) => value.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80);
const formatMoney = (value?: number) => `₦ ${Number(value || 0).toLocaleString()}`;
const formatDate = (value?: string) => {
  if (!value) return 'Unknown';
  const date = new Date(value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const WalletTransactionReceiptScreen: React.FC<WalletTransactionReceiptScreenProps> = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const appMessage = useAppMessage();
  const insets = useSafeAreaInsets();
  const transaction = route.params?.transaction;
  const receiptRef = useRef<View>(null);
  const [working, setWorking] = useState(false);
  const [savedUri, setSavedUri] = useState<string | null>(null);

  const accentTone = useMemo(() => {
    if (transaction?.direction === 'credit') return colors.success;
    if (transaction?.direction === 'debit') return colors.accent;
    return colors.secondary;
  }, [colors.accent, colors.secondary, colors.success, transaction?.direction]);

  const ensureReceiptImage = async (): Promise<string> => {
    if (!transaction) throw new Error('Missing transaction');
    if (savedUri) {
      const file = new FileSystem.File(savedUri);
      if (file.exists) return savedUri;
    }
    if (!receiptRef.current) throw new Error('Transaction not ready');

    const tmpUri = (await captureRef(receiptRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    })) as unknown as string;

    const fileName = `wallet-transaction-${sanitizeFilePart(transaction.id)}-${Date.now()}.png`;
    const destFile = new FileSystem.File(FileSystem.Paths.document, fileName);
    new FileSystem.File(tmpUri).copy(destFile);
    setSavedUri(destFile.uri);
    return destFile.uri;
  };

  const shareReceipt = async () => {
    if (!transaction || working) return;
    setWorking(true);
    try {
      const uri = await ensureReceiptImage();
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        appMessage.alert({ title: 'Sharing not available', message: `Saved at: ${uri}` });
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Wallet Transaction' });
    } catch (error: any) {
      appMessage.alert({ title: 'Failed', message: error?.message || 'Could not share transaction' });
    } finally {
      setWorking(false);
    }
  };

  if (!transaction) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <AppText style={[styles.emptyTitle, { color: colors.text }]}>No transaction found</AppText>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.accent }]}>
            <AppText style={[styles.backButtonText, { color: colors.onAccent }]}>Back</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityRole="button">
          <AppIcon name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <AppText style={[styles.topTitle, { color: colors.text }]}>Transaction</AppText>
        <TouchableOpacity onPress={shareReceipt} style={[styles.iconButton, { backgroundColor: colors.surface }]} accessibilityRole="button">
          <AppIcon name="share-social-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View ref={receiptRef} collapsable={false} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.hero, { backgroundColor: isDark ? 'rgba(255,145,0,0.12)' : colors.accentCard }]}>
            <View style={[styles.heroBadge, { backgroundColor: colors.surface }]}>
              <AppIcon name="wallet-outline" size={18} color={accentTone} />
            </View>
            <AppText style={[styles.heroLabel, { color: colors.textMuted }]}>{transaction.direction.toUpperCase()}</AppText>
            <AppText style={[styles.heroAmount, { color: accentTone }]}>{formatMoney(Math.abs(transaction.signedAmount || transaction.amount))}</AppText>
            <AppText style={[styles.heroSub, { color: colors.text }]}>{transaction.description}</AppText>
          </View>

          <Meta label="Date" value={transaction.displayDate || formatDate(transaction.createdAt)} />
          <Meta label="Reference" value={transaction.displayReference || transaction.reference || 'Not available'} />
          <Meta label="Provider ref" value={transaction.providerReference || 'Not available'} />
          <Meta label="Status" value={transaction.status} />
          <Meta label="Balance before" value={transaction.balanceBefore == null ? 'Not available' : formatMoney(transaction.balanceBefore)} />
          <Meta label="Balance after" value={transaction.balanceAfter == null ? 'Not available' : formatMoney(transaction.balanceAfter)} />
        </View>

        <TouchableOpacity onPress={shareReceipt} disabled={working} style={[styles.shareButton, { backgroundColor: colors.accent }]}>
          <AppIcon name="share-social-outline" size={18} color={colors.onAccent} />
          <AppText style={[styles.shareButtonText, { color: colors.onAccent }]}>{working ? 'Preparing…' : 'Share transaction'}</AppText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const Meta = ({ label, value }: { label: string; value: string }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.metaRow, { borderColor: colors.border }]}>
      <AppText style={[styles.metaLabel, { color: colors.textMuted }]}>{label}</AppText>
      <AppText style={[styles.metaValue, { color: colors.text }]}>{value}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  content: {
    padding: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 26,
    overflow: 'hidden',
  },
  hero: {
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  heroBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroAmount: {
    fontSize: 30,
    fontWeight: '900',
  },
  heroSub: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  metaRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  shareButton: {
    marginTop: 16,
    borderRadius: 22,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  backButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default WalletTransactionReceiptScreen;