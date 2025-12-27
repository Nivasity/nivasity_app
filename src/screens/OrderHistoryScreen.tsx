import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import Loading from '../components/Loading';
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
      const haystack = `${order.id} ${order.status} ${new Date(order.createdAt).toLocaleDateString()} ${order.total}`.toLowerCase();
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

    // Choose icon and color based on status
    let icon: import('../components/AppIcon').AppIconName = 'checkmark-circle-outline';
    let iconColor = colors.success;
    if (item.status === 'processing') {
      icon = 'time-outline';
      iconColor = colors.warning;
    } else if (item.status === 'cancelled' || item.status === 'failed') {
      icon = 'close-circle-outline';
      iconColor = colors.danger;
    } else if (item.status === 'refunded') {
      icon = 'refresh-circle-outline';
      iconColor = colors.secondary;
    }
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('OrderReceipt', { order: item })}
        style={[styles.orderCard, { backgroundColor: 'transparent' }]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Open receipt for order ${item.id}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AppIcon name={icon} size={22} color={iconColor} />
          <View>
            <Text style={[styles.orderNumber, { color: colors.text }]} numberOfLines={1}>
              Order #{item.id}
            </Text>
            <Text style={[styles.orderMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {new Date(item.createdAt).toLocaleDateString()} - {item.items.length} item{item.items.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
        <View>
          <Text style={[styles.orderAmount, { color: colors.text }]} numberOfLines={1}>
            ₦{item.total.toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading message="Loading orders..." />;
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Order History</Text>
          <View style={[styles.countPill, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.countText, { color: colors.text }]}>{totalOrdersLabel}</Text>
          </View>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: 'transparent' }]}>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppIcon name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search orders..."
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
        contentContainerStyle={[styles.listContent, { paddingBottom: 130 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No orders yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  clearButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
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
