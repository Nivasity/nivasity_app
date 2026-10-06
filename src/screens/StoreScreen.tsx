import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import Loading from '../components/Loading';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useAppMessage } from '../contexts/AppMessageContext';
import { storeAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { shareMaterial } from '../utils/shareMaterial';
import { Product } from '../types';
import StoreCard from '../components/StoreCard';
import MaterialDetailsDrawer from '../components/MaterialDetailsDrawer';
import CheckoutFab from '../components/CheckoutFab';
import { ShimmerBlock } from '../components/Shimmer';
import EmptyState from '../components/EmptyState';
import { Chip, IconButton, ScreenTitle } from '../components/ui';
import { SystemAlerts } from '../components/Notices';
import BellaFab from '../components/BellaFab';

interface StoreScreenProps {
  navigation: any;
  route: any;
}

type SortOption = 'recommended' | 'low-high' | 'high-low';
type LevelFilterOption = 'all' | '100' | '200' | '300' | '400' | '500';

type StoreListItem = Product | { id: string; __shimmer: true };
const LEVEL_FILTER_OPTIONS: Array<{ label: string; value: LevelFilterOption }> = [
  { label: 'All levels', value: 'all' },
  { label: '100', value: '100' },
  { label: '200', value: '200' },
  { label: '300', value: '300' },
  { label: '400', value: '400' },
  { label: '500', value: '500' },
];

const SHIMMER_ITEMS: StoreListItem[] = Array.from({ length: 6 }, (_, idx) => ({
  id: `shimmer-${idx}`,
  __shimmer: true,
}));

const StoreScreen: React.FC<StoreScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const appMessage = useAppMessage();
  const { items: cartItems, count: cartCount, total: cartTotal, has, toggle } = useCart();
  const [materials, setMaterials] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  // Price sorting was removed (same as the web store); the server's recommended order is used.
  const sortOption: SortOption = 'recommended';
  const [levelFilter, setLevelFilter] = useState<LevelFilterOption>('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const detailsRequestIdRef = useRef(0);
  const showCardsShimmer = loading && !refreshing && !loadingMore;

  useEffect(() => {
    const handle = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const rawId = route?.params?.materialId ?? route?.params?.material_id ?? route?.params?.id;
    const materialId = rawId != null ? String(rawId).trim().split('/')[0] : '';
    if (!materialId) return;

    navigation.setParams({ materialId: undefined, material_id: undefined, id: undefined });

    let canceled = false;
    (async () => {
      try {
        const existing = materials.find((m) => String(m.id) === materialId) || null;
        if (existing) {
          if (!canceled) {
            setActiveProduct(existing);
            setDetailsOpen(true);
          }
          return;
        }

        const fetched = await storeAPI.getProduct(materialId);
        if (canceled) return;
        setActiveProduct(fetched);
        setDetailsOpen(true);
      } catch (e: any) {
        if (canceled) return;
        appMessage.toast({ status: 'failed', message: e?.message || 'Failed to load material.' });
      }
    })();

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.materialId, route?.params?.material_id, route?.params?.id]);

  const loadPage = useCallback(
    async (args: { nextPage: number; append: boolean }) => {
      if (args.append) setLoadingMore(true);
      try {
        const result = await storeAPI.getMaterials({
          page: args.nextPage,
          limit: 20,
          search: search || undefined,
          sort: sortOption,
          level: levelFilter === 'all' ? undefined : levelFilter,
        });

        setMaterials((current) => {
          if (!args.append) return result.materials;
          const seen = new Set(current.map((m) => m.id));
          return [...current, ...result.materials.filter((m) => !seen.has(m.id))];
        });
        setPagination(result.pagination);
        setPage(result.pagination.page || args.nextPage);
        setIsOffline(false);
      } catch {
        if (!args.append) {
          setMaterials([]);
          setPagination(null);
          setPage(1);
        }
        setIsOffline(true);
        console.warn('Store offline: could not reach API');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [levelFilter, search, sortOption]
  );

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setPagination(null);
    setPage(1);
    await loadPage({ nextPage: 1, append: false });
  }, [loadPage]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    setPagination(null);
    setPage(1);
    loadPage({ nextPage: 1, append: false });
  };

  const goToCheckout = () => {
    if (cartCount === 0) {
      appMessage.alert({ title: 'Cart is empty', message: 'Add at least one item to checkout.' });
      return;
    }
    navigation.navigate('Checkout', { cartItems });
  };

  const canLoadMore = useMemo(() => {
    if (!pagination) return false;
    if (pagination.total_pages && page >= pagination.total_pages) return false;
    // Prefer server page counts; totals can be misleading when the UI filters items (e.g. purchased materials).
    if (pagination.total_pages) return page < pagination.total_pages;
    return materials.length < pagination.total;
  }, [materials.length, page, pagination]);

  const shareProduct = (product: Product) => shareMaterial(product, user);

  const openMaterialDetails = useCallback(async (material: Product) => {
    setActiveProduct(material);
    setDetailsOpen(true);

    const requestId = ++detailsRequestIdRef.current;
    try {
      const fetched = await storeAPI.getProduct(material.id);
      if (detailsRequestIdRef.current !== requestId) return;
      setActiveProduct((current) => {
        if (!current || current.id !== material.id) return current;
        return { ...current, ...fetched };
      });
    } catch {
      // ignore
    }
  }, []);

  const renderProduct = (material: Product) => {
    const inCart = has(material.id);
    const isAvailable = material.available !== false;
    return (
      <StoreCard
        code={material.courseCode || material.materialCode || ''}
        name={material.name}
        status={isAvailable ? 'Available' : 'Unavailable'}
        level={material.level || '—'}
        price={`₦${material.price.toLocaleString()}`}
        marked={inCart}
        onAdd={isAvailable ? () => toggle(material) : undefined}
        onShare={() => shareProduct(material)}
        onPress={() => {
          void openMaterialDetails(material);
        }}
      />
    );
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <ScreenTitle
          title="Store"
          subtitle="Course materials for your department"
          right={<IconButton icon="cart-outline" label="Go to checkout" badge={cartCount} onPress={goToCheckout} />}
        />
        {/* System alerts (maintenance, outages) only on the Store */}
        <SystemAlerts />
        {/* Buy with Bella: she finds the materials and fills the cart; the student pays at checkout */}
        <TouchableOpacity onPress={() => navigation.navigate('Bella')} activeOpacity={0.9} style={styles.bellaCard} accessibilityRole="button">
          <View style={styles.bellaIcon}>
            <AppIcon name="sparkles" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Buy with Bella</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>Tell Bella your course codes. She finds your materials and fills your cart.</Text>
          </View>
          <AppIcon name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppIcon name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search materials"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
            accessibilityLabel="Search store"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
              <AppIcon name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levels}>
          {LEVEL_FILTER_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.value === 'all' ? option.label : `${option.label} level`}
              active={levelFilter === option.value}
              onPress={() => setLevelFilter(option.value)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList<StoreListItem>
        data={(showCardsShimmer ? SHIMMER_ITEMS : materials) as StoreListItem[]}
        renderItem={({ item }) => ('__shimmer' in item ? <StoreCardShimmer /> : renderProduct(item))}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: cartCount > 0 ? 100 : 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        onEndReached={() => {
          if (loading || refreshing || loadingMore) return;
          if (!canLoadMore) return;
          loadPage({ nextPage: page + 1, append: true });
        }}
        onEndReachedThreshold={0.55}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="bag-outline"
              title={
                isOffline
                  ? 'You are offline'
                  : search.trim().length > 0
                    ? 'No matches'
                    : 'No materials yet'
              }
              subtitle={
                isOffline
                  ? 'Pull down to refresh.'
                  : search.trim().length > 0
                    ? 'Try a different search.'
                    : 'The store is empty right now.'
              }
            />
          </View>
        }
      />

      {cartCount > 0 && (
        <View style={[styles.footer, { backgroundColor: 'transparent', bottom: 12 }]}>
          <CheckoutFab onPress={goToCheckout} count={cartCount} total={cartTotal} />
        </View>
      )}

      <MaterialDetailsDrawer
        visible={detailsOpen}
        product={activeProduct}
        inCart={activeProduct ? has(activeProduct.id) : false}
        onClose={() => setDetailsOpen(false)}
        onToggleCart={() => {
          if (activeProduct) toggle(activeProduct);
        }}
        onShare={() => {
          if (activeProduct) shareProduct(activeProduct);
        }}
        onPayForMates={() => {
          if (!activeProduct) return;
          setDetailsOpen(false);
          navigation.navigate('BulkPayment', { manualId: activeProduct.id });
        }}
      />
      <BellaFab onPress={() => navigation.navigate('Bella')} />
    </SafeAreaView>
  );
};

const StoreCardShimmer = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.cardShimmerWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <ShimmerBlock height={96} width={96} radius={18} />
      <View style={{ flex: 1, gap: 8, paddingTop: 4 }}>
        <ShimmerBlock height={16} width="80%" radius={8} />
        <ShimmerBlock height={12} width="50%" radius={8} />
        <View style={{ flex: 1 }} />
        <ShimmerBlock height={18} width={80} radius={8} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bellaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 0,
    marginBottom: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#a21caf',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  bellaIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  searchBar: {
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
  levels: {
    gap: 8,
    paddingBottom: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cardShimmerWrap: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    alignItems: 'center',
  },
  filterDropdown: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },
  filterSection: {
    marginBottom: 10,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
});

export default StoreScreen;

