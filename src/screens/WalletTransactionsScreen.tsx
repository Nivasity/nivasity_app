import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import SendMoneySheet from '../components/SendMoneySheet';
import { Card, Chip, Divider, GradientCard, IconButton, IconCircle } from '../components/ui';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';
import { walletAPI } from '../services/api';
import { WalletTransaction } from '../types';

type WalletTransactionsScreenProps = {
  navigation: any;
};

type Filter = 'all' | 'in' | 'out';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'Money in' },
  { value: 'out', label: 'Money out' },
];

const money = (value: number, decimals = false) =>
  `₦${Number(value || 0).toLocaleString(undefined, decimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : undefined)}`;

const shortDate = (item: WalletTransaction) => {
  if (item.displayDate) return item.displayDate;
  const d = new Date((item.createdAt || '').replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? item.createdAt : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

// Wallet: balance card (Add money, Send, PIN), funding account and the history with
// in/out filter, search and paging. Same layout as the web portal.
const WalletTransactionsScreen: React.FC<WalletTransactionsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const { summary, hasWallet, hasPin, refreshCreditsAndSummary, createWallet } = useWallet();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [sendOpen, setSendOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activating, setActivating] = useState(false);

  const fetchPage = useCallback(
    async (nextPage: number, append: boolean) => {
      const res = await walletAPI.getTransactions({
        page: nextPage,
        type: filter === 'all' ? undefined : filter,
        search: search || undefined,
      });
      setTransactions((current) => (append ? [...current, ...res.transactions] : res.transactions));
      setPage(res.pagination?.page ?? nextPage);
      setTotalPages(res.pagination?.total_pages ?? 1);
      setTotal(res.pagination?.total ?? res.transactions.length);
    },
    [filter, search]
  );

  const load = useCallback(
    async (opts?: { silent?: boolean; withCredits?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        if (opts?.withCredits) await refreshCreditsAndSummary();
        await fetchPage(1, false);
      } catch (error: any) {
        setTransactions([]);
        if (!opts?.silent) appMessage.toast({ status: 'failed', message: error?.message || 'Could not load wallet history' });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appMessage, fetchPage, refreshCreditsAndSummary]
  );

  useFocusEffect(
    useCallback(() => {
      void load({ withCredits: true });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Filter / search changes reload the first page
  useEffect(() => {
    void load({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const loadMore = async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      await fetchPage(page + 1, true);
    } catch {
      // keep what we have
    } finally {
      setLoadingMore(false);
    }
  };

  const copyAccount = async () => {
    const number = summary?.wallet?.accountNumber;
    if (!number) return;
    await Clipboard.setStringAsync(number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activate = async () => {
    setActivating(true);
    try {
      await createWallet();
      await load({ silent: true });
      appMessage.toast({ status: 'success', message: 'Wallet ready' });
    } catch (error: any) {
      appMessage.alert({ title: 'Could not activate wallet', message: error?.message || 'Please try again.' });
    } finally {
      setActivating(false);
    }
  };

  const wallet = summary?.wallet;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load({ silent: true, withCredits: true });
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <View style={styles.topBar}>
          <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
          <AppText style={[styles.topTitle, { color: colors.text }]}>Wallet</AppText>
          <View style={{ width: 42 }} />
        </View>

        {loading && !hasWallet ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 60 }} />
        ) : !hasWallet ? (
          <Card style={{ alignItems: 'center', gap: 10, padding: 24 }}>
            <IconCircle icon="wallet" size={60} color="#FFFFFF" background={colors.secondary} />
            <AppText style={[styles.bigTitle, { color: colors.text }]}>Activate your wallet</AppText>
            <AppText style={{ color: colors.textMuted, textAlign: 'center' }}>
              Your own account number to fund by bank transfer, send money to course mates and pay in seconds.
            </AppText>
            <Button title="Create my wallet" onPress={activate} loading={activating} style={{ alignSelf: 'stretch', marginTop: 8 }} />
          </Card>
        ) : (
          <>
            {/* Balance */}
            <GradientCard>
              <AppText style={styles.balanceLabel}>Available balance</AppText>
              <AppText style={styles.balance}>{money(wallet?.balance ?? 0, true)}</AppText>
              {!hasPin ? (
                <Pressable onPress={() => navigation.navigate('WalletPin')}>
                  <AppText style={styles.hint}>
                    Create a Wallet PIN to pay and send. <AppText style={styles.hintLink}>Create PIN</AppText>
                  </AppText>
                </Pressable>
              ) : null}
              <View style={styles.heroActions}>
                <HeroButton label="Add" icon="add" primary onPress={() => navigation.navigate('WalletFund')} />
                <HeroButton label="Send" icon="paper-plane-outline" onPress={() => setSendOpen(true)} />
                <HeroButton label="PIN" icon="key-outline" onPress={() => navigation.navigate('WalletPin')} />
              </View>
            </GradientCard>

            {/* Funding account */}
            {wallet?.accountNumber ? (
              <Card style={{ gap: 10 }}>
                <AppText style={[styles.cardTitle, { color: colors.text }]}>Add money by bank transfer</AppText>
                <View style={[styles.account, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ color: colors.textMuted, fontSize: 12 }}>{wallet.bankName}</AppText>
                    <AppText style={[styles.accountNumber, { color: colors.text }]}>{wallet.accountNumber}</AppText>
                    <AppText numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
                      {wallet.accountName}
                    </AppText>
                  </View>
                  <Button title={copied ? 'Copied' : 'Copy'} icon={copied ? 'checkmark' : 'copy-outline'} size="sm" variant={copied ? 'outline' : 'primary'} onPress={copyAccount} />
                </View>
              </Card>
            ) : null}

            {/* History */}
            <Card padded={false}>
              <View style={styles.historyHead}>
                <View style={styles.historyTitleRow}>
                  <AppText style={[styles.cardTitle, { color: colors.text }]}>Transaction history</AppText>
                  <AppText style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>
                    {total} transaction{total === 1 ? '' : 's'}
                  </AppText>
                </View>
                <View style={styles.chips}>
                  {FILTERS.map((f) => (
                    <Chip key={f.value} label={f.label} active={filter === f.value} onPress={() => setFilter(f.value)} />
                  ))}
                </View>
                <View style={[styles.search, { backgroundColor: colors.surfaceAlt }]}>
                  <AppIcon name="search-outline" size={16} color={colors.textMuted} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search history"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.searchInput, { color: colors.text }]}
                    returnKeyType="search"
                  />
                </View>
              </View>
              <Divider />
              {loading ? (
                <ActivityIndicator color={colors.accent} style={{ paddingVertical: 30 }} />
              ) : transactions.length === 0 ? (
                <View style={{ padding: 16 }}>
                  <EmptyState
                    icon="receipt-outline"
                    title={search || filter !== 'all' ? 'No transactions match' : 'No wallet activity yet'}
                    subtitle={search || filter !== 'all' ? 'Try another filter or search.' : 'Money in and out of your wallet will show here.'}
                  />
                </View>
              ) : (
                transactions.map((item, i) => {
                  const credit = item.direction === 'credit';
                  return (
                    <View key={`${item.id}-${i}`}>
                      {i > 0 ? <Divider /> : null}
                      <Pressable
                        onPress={() => navigation.navigate('WalletTransactionReceipt', { transaction: item })}
                        style={({ pressed }) => [styles.txRow, pressed && { backgroundColor: colors.surfaceAlt }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Open wallet transaction ${item.displayReference || item.reference}`}
                      >
                        <IconCircle
                          icon={credit ? 'arrow-down' : 'arrow-up'}
                          size={32}
                          color={credit ? colors.success : colors.accent}
                          background={credit ? colors.successSoft : colors.accentSoft}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText numberOfLines={1} style={[styles.txTitle, { color: colors.text }]}>
                            {item.description || (credit ? 'Money in' : 'Payment')}
                          </AppText>
                          <AppText numberOfLines={1} style={{ color: colors.textMuted, fontSize: 11 }}>
                            {shortDate(item)}
                          </AppText>
                        </View>
                        <AppText style={[styles.txAmount, { color: credit ? colors.success : colors.text }]}>
                          {credit ? '+' : '−'}
                          {money(item.amount)}
                        </AppText>
                      </Pressable>
                    </View>
                  );
                })
              )}
              {page < totalPages && transactions.length > 0 ? (
                <>
                  <Divider />
                  <Pressable onPress={loadMore} style={styles.more} accessibilityRole="button">
                    {loadingMore ? (
                      <ActivityIndicator color={colors.accent} />
                    ) : (
                      <AppText style={{ color: colors.accent, fontWeight: '700' }}>
                        Load more · page {page} of {totalPages}
                      </AppText>
                    )}
                  </Pressable>
                </>
              ) : null}
            </Card>
          </>
        )}
      </ScrollView>
      <SendMoneySheet visible={sendOpen} onClose={() => setSendOpen(false)} onSent={() => load({ silent: true })} />
    </SafeAreaView>
  );
};

const HeroButton = ({
  label,
  icon,
  primary,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof AppIcon>['name'];
  primary?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [
      styles.heroButton,
      primary
        ? { backgroundColor: '#FFFFFF', borderBottomWidth: pressed ? 1 : 3, borderBottomColor: 'rgba(0,0,0,0.18)' }
        : { backgroundColor: pressed ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)' },
    ]}
  >
    <AppIcon name={icon} size={17} color={primary ? '#4E2149' : '#FFFFFF'} />
    <AppText style={{ color: primary ? '#4E2149' : '#FFFFFF', fontWeight: '700', fontSize: 14 }}>{label}</AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { fontSize: 17, fontWeight: '700' },
  bigTitle: { fontSize: 22, fontWeight: '800' },
  balanceLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '600' },
  balance: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  hint: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 6 },
  hintLink: { color: '#FFFFFF', fontWeight: '700', textDecorationLine: 'underline' },
  heroActions: { flexDirection: 'row', gap: 8, marginTop: 18 },
  heroButton: { flex: 1, height: 46, borderRadius: 999, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14 },
  accountNumber: { fontSize: 22, fontWeight: '700', letterSpacing: 1.5, marginVertical: 2 },
  historyHead: { padding: 16, gap: 10 },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', gap: 8 },
  search: { height: 40, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Geist-Regular', paddingVertical: 0 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  txTitle: { fontSize: 14, fontWeight: '600' },
  txAmount: { fontSize: 14, fontWeight: '700' },
  more: { paddingVertical: 14, alignItems: 'center' },
});

export default WalletTransactionsScreen;
