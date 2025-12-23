import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button as PaperButton, Dialog, Portal, RadioButton } from 'react-native-paper';
import AppIcon from '../components/AppIcon';
import Button from '../components/Button';
import Loading from '../components/Loading';
import { DEMO_DATA_ENABLED } from '../config/demo';
import { demoProducts } from '../data/demo';
import { useTheme } from '../contexts/ThemeContext';
import { storeAPI } from '../services/api';
import { CartItem, Product } from '../types';
import StoreCard from '../components/StoreCard';

interface StoreScreenProps {
  navigation: any;
}

type SortOption = 'recommended' | 'price_asc' | 'price_desc';

const StoreScreen: React.FC<StoreScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState<SortOption>('recommended');

  const loadProducts = useCallback(async () => {
    try {
      const data = await storeAPI.getProducts();
      const safeData = data || [];
      if (safeData.length === 0 && DEMO_DATA_ENABLED) {
        setProducts(demoProducts);
      } else {
        setProducts(safeData);
      }
      setIsOffline(false);
    } catch (error) {
      if (DEMO_DATA_ENABLED) {
        setProducts(demoProducts);
      } else {
        setProducts([]);
      }
      setIsOffline(true);
      console.warn('Store offline: could not reach API');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const toggleCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.filter((item) => item.id !== product.id);
      return [...current, { ...product, quantity: 1 }];
    });
  };

  const goToCheckout = () => {
    if (cartCount === 0) {
      Alert.alert('Cart is empty', 'Add at least one item to checkout.');
      return;
    }
    navigation.navigate('Checkout', { cartItems: cart });
  };

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const product of products) {
      if (product.category) unique.add(product.category);
    }
    return ['All', ...Array.from(unique)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let list = products;

    if (normalized.length > 0) {
      list = list.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(normalized));
    }

    if (selectedCategory !== 'All') {
      list = list.filter((item) => item.category === selectedCategory);
    }

    if (sortOption === 'price_asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price_desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
  }, [products, query, selectedCategory, sortOption]);

  const shareProduct = async (product: Product) => {
    try {
      await Share.share({
        message: `${product.name} — ${product.description}\nPrice: ₦${product.price.toLocaleString()}`,
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

  const renderProduct = ({ item }: { item: Product }) => {
    const inCart = cart.some((c) => c.id === item.id);
    const isAvailable = item.available !== false;
    return (
      <StoreCard
        code={item.category || 'CSC 112'}
        name={item.name}
        status={isAvailable ? 'Available' : 'Unavailable'}
        date={formatCardDate(item.createdAt)}
        price={`₦${item.price.toLocaleString()}`}
        marked={inCart}
        onAdd={() => toggleCart(item)}
        onShare={() => shareProduct(item)}
      />
    );
  };

  if (loading) {
    return <Loading message="Loading products..." />;
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Store</Text>
        <TouchableOpacity
          style={[styles.cartButton, { backgroundColor: colors.surface }]}
          onPress={goToCheckout}
          accessibilityRole="button"
          accessibilityLabel="Go to checkout"
        >
          <AppIcon name="cart-outline" size={20} color={colors.text} />
          {cartCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.badgeText, { color: colors.onAccent }]}>{cartCount}</Text>
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
          <AppIcon name="options-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 130 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isOffline ? 'Offline — pull to refresh' : 'No items found'}
            </Text>
          </View>
        }
      />

      {cartCount > 0 && (
        <View style={[styles.footer, { backgroundColor: 'transparent', bottom: 96 + insets.bottom }]}>
          <Button title={`Checkout (${cartCount} items)`} style={{ backgroundColor: colors.secondary }} onPress={goToCheckout} />
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
            <Text style={[styles.filterSectionTitle, { color: colors.textMuted }]}>Category</Text>
            <View style={styles.filterChips}>
              {categories.map((category) => {
                const active = category === selectedCategory;
                return (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? colors.accent : colors.surfaceAlt,
                        borderColor: active ? colors.accent : colors.border,
                      },
                    ]}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter category ${category}`}
                  >
                    <Text style={[styles.filterChipText, { color: active ? colors.onAccent : colors.text }]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.filterSectionTitle, { color: colors.textMuted, marginTop: 14 }]}>Sort by</Text>
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
                value="price_asc"
                color={colors.accent}
                uncheckedColor={colors.border}
                labelStyle={{ color: colors.text, fontWeight: '700' }}
              />
              <RadioButton.Item
                label="Price: high to low"
                value="price_desc"
                color={colors.accent}
                uncheckedColor={colors.border}
                labelStyle={{ color: colors.text, fontWeight: '700' }}
              />
            </RadioButton.Group>
          </Dialog.Content>

          <Dialog.Actions>
            <PaperButton
              onPress={() => {
                setSelectedCategory('All');
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
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
    fontWeight: '700',
    paddingVertical: 0,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 130,
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
