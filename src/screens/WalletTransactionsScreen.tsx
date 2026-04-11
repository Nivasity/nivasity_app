import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';
import { walletAPI } from '../services/api';
import { WalletTransaction } from '../types';

type WalletTransactionsScreenProps = {
  navigation: any;
};

const formatMoney = (value: number) => `₦${Number(value || 0).toLocaleString()}`;

const WalletTransactionsScreen: React.FC<WalletTransactionsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const { summary, hasWallet, refreshCreditsAndSummary, createWallet } = useWallet();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      await refreshCreditsAndSummary();
      const response = await walletAPI.getTransactions({ page: 1 });
      setTransactions(response.transactions);
    } catch (error: any) {
      setTransactions([]);
      if (!opts?.silent) {
        appMessage.alert({ title: 'Could not load wallet transactions', message: error?.message || 'Please try again.' });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appMessage, refreshCreditsAndSummary]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleCreateWallet = async () => {
    try {
      await createWallet();
      await load({ silent: true });
      appMessage.toast({ status: 'success', message: 'Wallet ready' });
    } catch (error: any) {
      appMessage.alert({ title: 'Could not activate wallet', message: error?.message || 'Please try again.' });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load({ silent: true });
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
          <AppText style={[styles.title, { color: colors.text }]}>Transactions</AppText>
          <View style={styles.iconButton} />
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText style={[styles.summaryLabel, { color: colors.textMuted }]}>Wallet balance</AppText>
          <AppText style={[styles.summaryValue, { color: colors.text }]}>
            {hasWallet ? formatMoney(summary?.wallet?.balance ?? 0) : 'No wallet'}
          </AppText>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : !hasWallet ? (
          <View style={{ marginTop: 18 }}>
            <EmptyState icon="wallet-outline" title="No wallet yet" subtitle="Create one to see credits and debits." />
            <View style={{ height: 14 }} />
            <Button title="Activate my wallet" onPress={handleCreateWallet} />
          </View>
        ) : transactions.length === 0 ? (
          <View style={{ marginTop: 18 }}>
            <EmptyState icon="receipt-outline" title="No wallet transactions" subtitle="Your credits and debits will show here." />
          </View>
        ) : (
          <View style={styles.list}>
            {transactions.map((item) => {
              const positive = item.direction === 'credit';
              const amountColor = positive ? colors.success : item.direction === 'debit' ? colors.accent : colors.text;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => navigation.navigate('WalletTransactionReceipt', { transaction: item })}
                  style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  activeOpacity={0.86}
                  accessibilityRole="button"
                  accessibilityLabel={`Open wallet transaction ${item.displayReference || item.reference}`}
                >
                  <View style={[styles.itemIcon, { backgroundColor: positive ? 'rgba(34,197,94,0.12)' : colors.accentCard }]}>
                    <AppIcon name={positive ? 'arrow-up-outline' : 'arrow-back'} size={18} color={amountColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={[styles.itemTitle, { color: colors.text }]}>{item.description}</AppText>
                    <AppText style={[styles.itemMeta, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.displayDate || item.createdAt}
                    </AppText>
                    <AppText style={[styles.itemMeta, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.displayReference || item.reference}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <AppText style={[styles.itemAmount, { color: amountColor }]}>
                      {positive ? '+' : item.direction === 'debit' ? '-' : ''}
                      {formatMoney(Math.abs(item.signedAmount || item.amount))}
                    </AppText>
                    <AppText style={[styles.itemMeta, { color: colors.textMuted }]}>{item.status}</AppText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
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
  summaryCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  loadingWrap: {
    paddingTop: 40,
    alignItems: 'center',
  },
  list: {
    marginTop: 14,
    gap: 12,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '900',
  },
});

export default WalletTransactionsScreen;