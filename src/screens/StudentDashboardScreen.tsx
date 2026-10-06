import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import AppIcon from '../components/AppIcon';
import Text from '../components/AppText';
import { useAuth } from '../contexts/AuthContext';
import { shareMaterial as shareMaterialLink } from '../utils/shareMaterial';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { useWallet } from '../contexts/WalletContext';
import Loading from '../components/Loading';
import { orderAPI, storeAPI, isDefaultAvatar } from '../services/api';
import { DashboardStats, Order, Product } from '../types';
import StoreCard from '../components/StoreCard';
import MaterialDetailsDrawer from '../components/MaterialDetailsDrawer';
import CheckoutFab from '../components/CheckoutFab';
import EmptyState from '../components/EmptyState';
import SendMoneySheet from '../components/SendMoneySheet';
import { PendingClaimsSheet, SurveyCard, SystemAlerts } from '../components/Notices';
import BellaFab from '../components/BellaFab';
import { Card, CourseTile, Divider, GradientCard, IconButton, IconCircle, RoundAction, SectionHeader } from '../components/ui';

interface StudentDashboardScreenProps {
  navigation: any;
}

const NOTIFICATIONS_DAILY_PROMPT_KEY = 'notifications.dailyPrompt.v1';
const BALANCE_HIDDEN_KEY = 'dashboard.balanceHidden';
const money = (value: number, decimals = false) =>
  `₦${Number(value || 0).toLocaleString(undefined, decimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : undefined)}`;

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const StudentDashboardScreen: React.FC<StudentDashboardScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const { count: cartCount, total: cartTotal, has, toggle } = useCart();
  const { unreadCount, permissionStatus, requestPushPermission } = useNotifications();
  const { summary, hasWallet, hasPin, refreshCreditsAndSummary, createWallet } = useWallet();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topMaterials, setTopMaterials] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState<Product | null>(null);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const detailsRequestIdRef = useRef(0);

  const computeStats = (orders: Order[]): DashboardStats => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'processing').length;
    const totalSpent = orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'failed')
      .reduce((sum, o) => sum + (o.total || 0), 0);
    return { totalOrders, pendingOrders, totalSpent };
  };

  const loadDashboard = useCallback(async () => {
    const [ordersRes, materialsRes] = await Promise.allSettled([
      orderAPI.getOrders({ page: 1, limit: 20 }),
      storeAPI.getMaterials({ page: 1, limit: 6, sort: 'recommended' }),
      refreshCreditsAndSummary(),
    ]);

    const nextOrders = ordersRes.status === 'fulfilled' ? ordersRes.value || [] : [];
    const nextMaterials = materialsRes.status === 'fulfilled' ? materialsRes.value.materials || [] : [];

    setRecentOrders(nextOrders.slice(0, 4));
    setStats(computeStats(nextOrders));
    setTopMaterials(nextMaterials.slice(0, 6));
    setIsOffline(ordersRes.status === 'rejected' || materialsRes.status === 'rejected');
    setLoading(false);
    setRefreshing(false);
  }, [refreshCreditsAndSummary]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  useEffect(() => {
    AsyncStorage.getItem(BALANCE_HIDDEN_KEY)
      .then((v) => setBalanceHidden(v === '1'))
      .catch(() => undefined);
  }, []);

  const toggleBalance = () => {
    setBalanceHidden((v) => {
      AsyncStorage.setItem(BALANCE_HIDDEN_KEY, v ? '0' : '1').catch(() => undefined);
      return !v;
    });
  };

  // Ask for notification permission at most once a day
  useEffect(() => {
    let canceled = false;
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      try {
        const last = String((await AsyncStorage.getItem(NOTIFICATIONS_DAILY_PROMPT_KEY)) || '').trim();
        if (last === today) return;
        await AsyncStorage.setItem(NOTIFICATIONS_DAILY_PROMPT_KEY, today);
        if (permissionStatus === 'undetermined' && !canceled) await requestPushPermission();
      } catch {
        // ignore
      }
    })();
    return () => {
      canceled = true;
    };
  }, [permissionStatus, requestPushPermission]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const openMaterialDetails = useCallback(async (material: Product) => {
    setActiveMaterial(material);
    setDetailsOpen(true);
    const requestId = ++detailsRequestIdRef.current;
    try {
      const fetched = await storeAPI.getProduct(material.id);
      if (detailsRequestIdRef.current !== requestId) return;
      setActiveMaterial((current) => (!current || current.id !== material.id ? current : { ...current, ...fetched }));
    } catch {
      // ignore
    }
  }, []);

  const shareMaterial = (product: Product) => shareMaterialLink(product, user);

  const activateWallet = async () => {
    setActivating(true);
    try {
      await createWallet();
      appMessage.toast({ status: 'success', message: 'Wallet ready' });
    } catch (error: any) {
      appMessage.alert({ title: 'Could not activate wallet', message: error?.message || 'Please try again.' });
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return <Loading message="Loading dashboard..." />;
  }

  const firstName = (user?.name || 'Student').trim().split(' ')[0];
  const balance = summary?.wallet?.balance ?? 0;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: cartCount > 0 ? 110 : 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        {/* Greeting */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.navigate('ProfileSection', { section: 'myAccount' })}
            accessibilityRole="button"
            accessibilityLabel="Open My Account"
            style={[styles.avatar, { backgroundColor: colors.secondary }]}
          >
            {user?.avatar && !isDefaultAvatar(user.avatar) ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>{greeting()} 👋</Text>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {firstName}
            </Text>
          </View>
          <IconButton icon="notifications-outline" label="Open notifications" badge={unreadCount} onPress={() => navigation.navigate('Notifications')} />
        </View>

        {/* System alerts (maintenance, outages) only on Home */}
        <SystemAlerts />

        {/* Wallet */}
        <GradientCard>
          <View style={styles.walletTop}>
            <View style={styles.walletChip}>
              <Text style={styles.walletChipText}>{hasWallet ? summary?.wallet?.bankName || 'School wallet' : 'Nivasity wallet'}</Text>
            </View>
            {hasWallet ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <IconButton icon="time-outline" tone="onGradient" label="Wallet history" onPress={() => navigation.navigate('WalletTransactions')} />
                <IconButton icon="refresh" tone="onGradient" label="Refresh balance" onPress={onRefresh} />
              </View>
            ) : null}
          </View>

          {hasWallet ? (
            <>
              <Pressable
                onPress={toggleBalance}
                style={styles.balanceLabelRow}
                accessibilityRole="button"
                accessibilityLabel={balanceHidden ? 'Show balance' : 'Hide balance'}
              >
                <Text style={styles.balanceLabel}>Available balance</Text>
                <AppIcon name={balanceHidden ? 'eye-off-outline' : 'eye-outline'} size={16} color="rgba(255,255,255,0.8)" />
              </Pressable>
              <Text style={styles.balance}>{balanceHidden ? '₦ ••••••' : money(balance, true)}</Text>
              {!hasPin ? (
                <Pressable onPress={() => navigation.navigate('WalletPin')}>
                  <Text style={styles.walletHint}>
                    Create a Wallet PIN to pay and send. <Text style={styles.walletHintLink}>Create PIN</Text>
                  </Text>
                </Pressable>
              ) : null}
              <View style={styles.walletActions}>
                <WalletButton label="Add money" icon="add" primary onPress={() => navigation.navigate('WalletFund')} />
                <WalletButton label="Send" icon="paper-plane-outline" onPress={() => setSendOpen(true)} />
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.balance, { fontSize: 26, marginTop: 16 }]}>Activate your wallet</Text>
              <Text style={styles.walletHint}>Get your own account number, pay in seconds and send money to course mates.</Text>
              <View style={styles.walletActions}>
                <WalletButton label={activating ? 'Activating…' : 'Activate wallet'} icon="flash-outline" primary onPress={activateWallet} />
              </View>
            </>
          )}
        </GradientCard>

        {/* Quick actions */}
        <Card style={styles.actionsCard}>
          <RoundAction icon="storefront" label="Store" color="#F97316" onPress={() => navigation.navigate('Store')} />
          <RoundAction icon="people" label="Bulk pay" color="#7A3B73" onPress={() => navigation.navigate('BulkPayment')} />
          <RoundAction icon="megaphone" label="Requests" color="#2563EB" onPress={() => navigation.navigate('MaterialRequests')} />
          {(user?.role || '').toLowerCase() === 'hoc' ? (
            <RoundAction icon="clipboard" label="Class rep" color="#059669" onPress={() => navigation.navigate('ClassRep')} />
          ) : (
            <RoundAction icon="chatbubble-ellipses" label="Help" color="#059669" onPress={() => navigation.navigate('Bella')} />
          )}
        </Card>

        {/* Semester summary */}
        <Card>
          <SectionHeader title="Your semester" action="View orders" onAction={() => navigation.navigate('Orders')} />
          <View style={styles.metrics}>
            <Metric icon="trending-up" color="#EA580C" label="Spent" value={money(stats?.totalSpent ?? 0)} />
            <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
            <Metric icon="book-outline" color="#2563EB" label="Orders" value={String(stats?.totalOrders ?? 0)} />
            <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
            <Metric icon="time-outline" color="#A21CAF" label="Pending" value={String(stats?.pendingOrders ?? 0)} />
          </View>
        </Card>

        <SurveyCard />

        {/* Store picks */}
        <View>
          <SectionHeader title="In the store" action="See all" onAction={() => navigation.navigate('Store')} />
          <FlatList
            data={topMaterials}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
            ListEmptyComponent={
              <View style={{ width: 320 }}>
                <EmptyState
                  icon="bag-outline"
                  title={isOffline ? 'Could not load materials' : 'No materials yet'}
                  subtitle={isOffline ? 'Check your connection and pull to refresh.' : 'Materials for this semester will appear here.'}
                />
              </View>
            }
            renderItem={({ item }) => (
              <View style={{ width: 300 }}>
                <StoreCard
                  code={item.courseCode || item.materialCode || ''}
                  name={item.name}
                  status={item.available === false ? 'Unavailable' : 'Available'}
                  level={item.level || '—'}
                  price={`₦${item.price?.toLocaleString?.() ?? ''}`}
                  marked={has(item.id)}
                  onAdd={item.available === false ? undefined : () => toggle(item)}
                  onShare={() => shareMaterial(item)}
                  onPress={() => void openMaterialDetails(item)}
                />
              </View>
            )}
          />
        </View>

        {/* Recent orders */}
        <View>
          <SectionHeader title="Recent orders" action="See all" onAction={() => navigation.navigate('Orders')} />
          {recentOrders.length > 0 ? (
            <Card padded={false}>
              {recentOrders.map((order, i) => {
                const first = order.items?.[0];
                const code = first?.courseCode || first?.materialCode || '';
                const more = (order.items?.length || 0) - 1;
                return (
                  <View key={order.id}>
                    {i > 0 ? <Divider /> : null}
                    <Pressable
                      onPress={() => navigation.navigate('OrderReceipt', { order })}
                      style={({ pressed }) => [styles.orderRow, pressed && { backgroundColor: colors.surfaceAlt }]}
                    >
                      {code ? <CourseTile code={code} size={40} /> : <IconCircle icon="receipt-outline" size={40} />}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={[styles.orderTitle, { color: colors.text }]}>
                          {first?.name || `Order ${order.id}`}
                          {more > 0 ? ` +${more}` : ''}
                        </Text>
                        <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12 }}>
                          {new Date(order.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={[styles.orderAmount, { color: colors.text }]}>{money(order.total)}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </Card>
          ) : (
            <EmptyState icon="receipt-outline" title="No orders yet" subtitle="Materials you buy will show up here." />
          )}
        </View>
      </ScrollView>

      {cartCount > 0 ? (
        <View style={styles.checkoutFabWrap}>
          <CheckoutFab onPress={() => navigation.navigate('Checkout')} count={cartCount} total={cartTotal} />
        </View>
      ) : null}

      <MaterialDetailsDrawer
        visible={detailsOpen}
        product={activeMaterial}
        inCart={activeMaterial ? has(activeMaterial.id) : false}
        onClose={() => setDetailsOpen(false)}
        onToggleCart={() => {
          if (activeMaterial) toggle(activeMaterial);
        }}
        onShare={() => {
          if (activeMaterial) shareMaterial(activeMaterial);
        }}
        onPayForMates={() => {
          if (!activeMaterial) return;
          setDetailsOpen(false);
          navigation.navigate('BulkPayment', { manualId: activeMaterial.id });
        }}
      />
      <SendMoneySheet visible={sendOpen} onClose={() => setSendOpen(false)} />
      <PendingClaimsSheet onResolved={loadDashboard} />
      <BellaFab onPress={() => navigation.navigate('Bella')} />
    </SafeAreaView>
  );
};

const WalletButton = ({
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
      styles.walletButton,
      primary
        ? { backgroundColor: '#FFFFFF', borderBottomWidth: pressed ? 1 : 3, borderBottomColor: 'rgba(0,0,0,0.18)' }
        : { backgroundColor: pressed ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)' },
      { transform: [{ translateY: pressed ? 1 : 0 }] },
    ]}
  >
    <AppIcon name={icon} size={18} color={primary ? '#4E2149' : '#FFFFFF'} />
    <Text style={[styles.walletButtonText, { color: primary ? '#4E2149' : '#FFFFFF' }]}>{label}</Text>
  </Pressable>
);

const Metric = ({
  icon,
  color,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof AppIcon>['name'];
  color: string;
  label: string;
  value: string;
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.metric}>
      <IconCircle icon={icon} size={34} color={color} background={color + '1F'} />
      <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 46, height: 46 },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  greeting: { fontSize: 13, fontWeight: '600' },
  name: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  walletTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  walletChip: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  walletChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  balance: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  walletHint: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 6, lineHeight: 18 },
  walletHintLink: { color: '#FFFFFF', fontWeight: '700', textDecorationLine: 'underline' },
  walletActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  walletButton: { flex: 1, height: 48, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  walletButtonText: { fontSize: 14, fontWeight: '700' },
  actionsCard: { flexDirection: 'row', paddingVertical: 18 },
  metrics: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metric: { flex: 1, alignItems: 'center', gap: 4 },
  metricValue: { fontSize: 17, fontWeight: '800' },
  metricDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  orderTitle: { fontSize: 14, fontWeight: '600' },
  orderAmount: { fontSize: 14, fontWeight: '700' },
  checkoutFabWrap: { position: 'absolute', left: 16, right: 16, bottom: 12, zIndex: 20, alignItems: 'center' },
});

export default StudentDashboardScreen;
