import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { ScreenTitle } from '../components/ui';
import BulkPaymentsList from '../components/BulkPaymentsList';
import { useTheme } from '../contexts/ThemeContext';
import { orderAPI } from '../services/api';
import { Order } from '../types';
import OrderListItem from '../components/OrderListItem';

interface OrderHistoryScreenProps {
  navigation: any;
}

const OrderHistoryScreen: React.FC<OrderHistoryScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'purchases' | 'bulk'>('purchases');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const data = await orderAPI.getOrders();
      setOrders(data || []);
      setIsOffline(false);
    } catch (error) {
      setOrders([]);
      setIsOffline(true);
      console.warn('Orders offline: could not reach API');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return orders;

    return orders.filter((order) => {
      const names = (order.items || []).map((it) => `${it.name} ${it.courseCode || ''} ${it.materialCode || ''}`).join(' ');
      const haystack = `${names} ${order.id} ${order.status} ${new Date(order.createdAt).toLocaleDateString()} ${order.total}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [orders, query]);

  const totalOrdersLabel = useMemo(() => {
    const normalized = query.trim();
    if (normalized.length > 0) return `${filteredOrders.length}/${orders.length}`;
    return `${orders.length}`;
  }, [filteredOrders.length, orders.length, query]);

  const renderOrder = ({ item }: { item: Order }) => {
    return (
      <OrderListItem
        order={item}
        onPress={() => navigation.navigate('OrderReceipt', { order: item })}
      />
    );
  };

  if (loading) {
    return <Loading message="Loading orders..." />;
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <ScreenTitle title="Orders" subtitle={`Everything you've bought · ${totalOrdersLabel}`} />
      </View>

      {/* My purchases / bulk payments I made for course mates */}
      <View style={[styles.tabs, { backgroundColor: colors.surfaceAlt }]} accessibilityRole="tablist">
        {([
          ['purchases', 'My purchases'],
          ['bulk', 'Bulk payments'],
        ] as const).map(([value, label]) => {
          const active = tab === value;
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setTab(value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              activeOpacity={0.85}
              style={[
                styles.tab,
                active && { backgroundColor: colors.accent, borderBottomWidth: 3, borderBottomColor: colors.accentLip },
              ]}
            >
              <Text style={{ color: active ? colors.onAccent : colors.textMuted, fontWeight: '700', fontSize: 14 }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'bulk' ? (
        <BulkPaymentsList />
      ) : (
      <>
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppIcon name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by course code or title"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
            accessibilityLabel="Search orders"
          />
        </View>
        {query.trim().length > 0 ? (
          <TouchableOpacity
            onPress={() => setQuery('')}
            style={[styles.clearButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <AppIcon name="close-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyState
              icon="receipt-outline"
              title={query.trim().length > 0 ? 'No matches' : 'No orders yet'}
              subtitle={query.trim().length > 0 ? 'Try a different search.' : 'Start buying materials in the store to see orders here.'}
            />
          </View>
        }
      />
      </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  countPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countText: {
    fontSize: 12,
    fontWeight: '900',
  },
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Geist-Regular',
    paddingVertical: 0,
  },
  clearButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  orderCard: {
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  orderMeta: {
    fontSize: 13,
    fontWeight: '700',
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default OrderHistoryScreen;
