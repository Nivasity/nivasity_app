import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import OptionPickerDialog from '../components/OptionPickerDialog';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';
import { walletAPI } from '../services/api';
import { WalletTransaction } from '../types';

type WalletTransactionsScreenProps = {
  navigation: any;
};

const formatMoney = (value: number) => `₦ ${Number(value || 0).toLocaleString()}`;
const ANY_MONTH = 'Any month';

const toDate = (value?: string) => {
  if (!value) return null;
  const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getMonthKey = (value?: string) => {
  const date = toDate(value);
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const formatMonthLabel = (key: string) => {
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const WalletTransactionsScreen: React.FC<WalletTransactionsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const { hasWallet, refreshCreditsAndSummary, createWallet } = useWallet();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startMonthValue, setStartMonthValue] = useState<string>(ANY_MONTH);
  const [endMonthValue, setEndMonthValue] = useState<string>(ANY_MONTH);
  const [monthPickerTarget, setMonthPickerTarget] = useState<'start' | 'end' | null>(null);

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

  const monthKeys = useMemo(() => {
    const keys = new Set<string>();
    transactions.forEach((item) => {
      const key = getMonthKey(item.createdAt);
      if (key) keys.add(key);
    });
    return Array.from(keys).sort((left, right) => right.localeCompare(left));
  }, [transactions]);

  const monthLabelToValue = useMemo(() => {
    const entries = monthKeys.map((key) => [formatMonthLabel(key), key] as const);
    return Object.fromEntries(entries);
  }, [monthKeys]);

  const monthOptions = useMemo(() => [ANY_MONTH, ...monthKeys.map(formatMonthLabel)], [monthKeys]);

  useEffect(() => {
    if (startMonthValue !== ANY_MONTH && !monthKeys.includes(startMonthValue)) {
      setStartMonthValue(ANY_MONTH);
    }
    if (endMonthValue !== ANY_MONTH && !monthKeys.includes(endMonthValue)) {
      setEndMonthValue(ANY_MONTH);
    }
  }, [endMonthValue, monthKeys, startMonthValue]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const key = getMonthKey(item.createdAt);
      if (!key) return startMonthValue === ANY_MONTH && endMonthValue === ANY_MONTH;
      if (startMonthValue !== ANY_MONTH && key < startMonthValue) return false;
      if (endMonthValue !== ANY_MONTH && key > endMonthValue) return false;
      return true;
    });
  }, [endMonthValue, startMonthValue, transactions]);

  const rangeText = useMemo(() => {
    if (startMonthValue === ANY_MONTH && endMonthValue === ANY_MONTH) return 'Showing all loaded months';
    if (startMonthValue === ANY_MONTH) return `Up to ${formatMonthLabel(endMonthValue)}`;
    if (endMonthValue === ANY_MONTH) return `From ${formatMonthLabel(startMonthValue)}`;
    if (startMonthValue === endMonthValue) return formatMonthLabel(startMonthValue);
    return `${formatMonthLabel(startMonthValue)} to ${formatMonthLabel(endMonthValue)}`;
  }, [endMonthValue, startMonthValue]);

  const selectMonth = (label: string) => {
    const nextValue = label === ANY_MONTH ? ANY_MONTH : (monthLabelToValue[label] ?? ANY_MONTH);

    if (monthPickerTarget === 'start') {
      setStartMonthValue((currentStart) => {
        if (nextValue !== ANY_MONTH && endMonthValue !== ANY_MONTH && nextValue > endMonthValue) {
          setEndMonthValue(nextValue);
        }
        return nextValue;
      });
    }

    if (monthPickerTarget === 'end') {
      setEndMonthValue((currentEnd) => {
        if (nextValue !== ANY_MONTH && startMonthValue !== ANY_MONTH && nextValue < startMonthValue) {
          setStartMonthValue(nextValue);
        }
        return nextValue;
      });
    }

    setMonthPickerTarget(null);
  };

  const startMonthLabel = startMonthValue === ANY_MONTH ? ANY_MONTH : formatMonthLabel(startMonthValue);
  const endMonthLabel = endMonthValue === ANY_MONTH ? ANY_MONTH : formatMonthLabel(endMonthValue);

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
          <>
            <View style={[styles.filterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.filterHeader}>
                <AppText style={[styles.filterTitle, { color: colors.text }]}>Filter</AppText>
                <AppText style={[styles.filterMeta, { color: colors.textMuted }]}>{rangeText}</AppText>
              </View>

              <View style={styles.filterRow}>
                <TouchableOpacity
                  onPress={() => setMonthPickerTarget('start')}
                  style={[styles.filterButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Choose start month"
                >
                  <AppText style={[styles.filterLabel, { color: colors.textMuted }]}>From</AppText>
                  <View style={styles.filterValueRow}>
                    <AppText style={[styles.filterValue, { color: colors.text }]} numberOfLines={1}>
                      {startMonthLabel}
                    </AppText>
                    <AppIcon name="chevron-forward" size={16} color={colors.textMuted} style={styles.filterChevron} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setMonthPickerTarget('end')}
                  style={[styles.filterButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Choose end month"
                >
                  <AppText style={[styles.filterLabel, { color: colors.textMuted }]}>To</AppText>
                  <View style={styles.filterValueRow}>
                    <AppText style={[styles.filterValue, { color: colors.text }]} numberOfLines={1}>
                      {endMonthLabel}
                    </AppText>
                    <AppIcon name="chevron-forward" size={16} color={colors.textMuted} style={styles.filterChevron} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {filteredTransactions.length === 0 ? (
              <View style={{ marginTop: 18 }}>
                <EmptyState
                  icon="time-outline"
                  title="No transactions in range"
                  subtitle="Try a different month range to see more wallet activity."
                />
              </View>
            ) : (
              <View style={styles.list}>
                {filteredTransactions.map((item) => {
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
          </>
        )}
      </ScrollView>

      <OptionPickerDialog
        visible={monthPickerTarget !== null}
        title={monthPickerTarget === 'start' ? 'Select start month' : 'Select end month'}
        options={monthOptions}
        selected={monthPickerTarget === 'start' ? startMonthLabel : endMonthLabel}
        onClose={() => setMonthPickerTarget(null)}
        onSelect={selectMonth}
      />
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
  filterCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },
  filterHeader: {
    gap: 4,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  filterMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  filterButton: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  filterValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  filterChevron: {
    transform: [{ rotate: '90deg' }],
  },
  filterValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
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