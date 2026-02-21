import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button as PaperButton, Dialog, Portal, RadioButton } from 'react-native-paper';
import AppIcon from '../components/AppIcon';
import Loading from '../components/Loading';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useAppMessage } from '../contexts/AppMessageContext';
import { storeAPI } from '../services/api';
import { Product } from '../types';
import StoreCard from '../components/StoreCard';
import MaterialDetailsDrawer from '../components/MaterialDetailsDrawer';
import CheckoutFab from '../components/CheckoutFab';
import { ShimmerBlock } from '../components/Shimmer';
import EmptyState from '../components/EmptyState';

interface StoreScreenProps {
  navigation: any;
  route: any;
}

type SortOption = 'recommended' | 'low-high' | 'high-low';

type StoreListItem = Product | { id: string; __shimmer: true };

const SHIMMER_ITEMS: StoreListItem[] = Array.from({ length: 6 }, (_, idx) => ({
  id: `shimmer-${idx}`,
  __shimmer: true,
}));

const StoreScreen: React.FC<StoreScreenProps> = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const appMessage = useAppMessage();
  const insets = useSafeAreaInsets();
  const { items: cartItems, count: cartCount, lastActionAt, has, toggle } = useCart();
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('recommended');
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
    [search, sortOption]
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

  const shareProduct = async (product: Product) => {
    try {
      const materialId = encodeURIComponent(String(product.id));
      const webUrl = `https://nivasity.com/material/${materialId}`;
      await Share.share({
        message: `${product.name}\n${product.description}\nPrice: NGN ${product.price.toLocaleString()}\n\nGet the material here: ${webUrl}`,
      });
    } catch {
      // ignore
    }
  };

  const formatCardDate = (iso?: string) => {
    if (!iso) return 'Today';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Today';
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

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
        date={formatCardDate(material.deadlineAt || material.createdAt)}
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
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Store</Text>
        <TouchableOpacity
          style={[styles.cartButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}
          onPress={goToCheckout}
          accessibilityRole="button"
          accessibilityLabel="Go to checkout"
        >
          <AppIcon name="cart-outline" size={25} color={colors.text} />
          {cartCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.badgeText, { color: colors.background }]}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppIcon name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search here..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
            accessibilityLabel="Search store"
          />
        </View>
        <TouchableOpacity
          onPress={() => setFiltersOpen(true)}
          style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
        >
          <AppIcon name="options-outline" size={25} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList<StoreListItem>
        data={(showCardsShimmer ? SHIMMER_ITEMS : materials) as StoreListItem[]}
        renderItem={({ item }) => ('__shimmer' in item ? <StoreCardShimmer /> : renderProduct(item))}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 30 + insets.bottom }]}
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
        <View style={[styles.footer, { backgroundColor: 'transparent', bottom: 85 + insets.bottom }]}>
          <CheckoutFab onPress={goToCheckout} trigger={lastActionAt} />
        </View>
      )}

      <Portal>
        <Dialog
          visible={filtersOpen}
          onDismiss={() => setFiltersOpen(false)}
          style={[styles.filterDialog, { backgroundColor: colors.surface }]}
        >
          <Dialog.Title style={[styles.filterTitle, { color: colors.text }]}>Search & Filter</Dialog.Title>
          <Dialog.Content>
            <Text style={[styles.filterSectionTitle, { color: colors.textMuted }]}>Sort by</Text>
            <RadioButton.Group
              onValueChange={(value) => setSortOption(value as SortOption)}
              value={sortOption}
            >
              <RadioButton.Item
                label="Recommended"
                value="recommended"
                color={colors.accent}
                uncheckedColor={colors.border}
                labelStyle={{ color: colors.text, fontWeight: '700' }}
              />
              <RadioButton.Item
                label="Price: low to high"
                value="low-high"
                color={colors.accent}
                uncheckedColor={colors.border}
                labelStyle={{ color: colors.text, fontWeight: '700' }}
              />
              <RadioButton.Item
                label="Price: high to low"
                value="high-low"
                color={colors.accent}
                uncheckedColor={colors.border}
                labelStyle={{ color: colors.text, fontWeight: '700' }}
              />
            </RadioButton.Group>
          </Dialog.Content>

          <Dialog.Actions>
            <PaperButton
              onPress={() => {
                setSortOption('recommended');
              }}
              textColor={colors.textMuted}
            >
              Reset
            </PaperButton>
            <PaperButton onPress={() => setFiltersOpen(false)} textColor={colors.accent}>
              Done
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
      />
    </SafeAreaView>
  );
};

const StoreCardShimmer = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.cardShimmerWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.cardShimmerHeader}>
        <ShimmerBlock height={18} width="68%" radius={10} />
        <ShimmerBlock height={14} width="38%" radius={10} style={{ marginTop: 10 }} />
      </View>
      <View style={styles.cardShimmerMeta}>
        <ShimmerBlock height={14} width="55%" radius={10} />
      </View>
      <View style={styles.cardShimmerBottomRow}>
        <ShimmerBlock height={36} width={140} radius={999} />
        <ShimmerBlock height={46} width={46} radius={23} />
      </View>
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  cartButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
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
  filterButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 130,
  },
  cardShimmerWrap: {
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 25,
    padding: 18,
    minHeight: 190,
  },
  cardShimmerHeader: {
    paddingTop: 8,
    marginBottom: 14,
  },
  cardShimmerMeta: {
    marginTop: 2,
  },
  cardShimmerBottomRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  filterDialog: {
    borderRadius: 20,
  },
  filterTitle: {
    fontWeight: '900',
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
});

export default StoreScreen;

