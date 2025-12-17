import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import Loading from '../components/Loading';
import { useTheme } from '../contexts/ThemeContext';
import AppIcon from '../components/AppIcon';
import { storeAPI } from '../services/api';
import { CartItem, Product } from '../types';

interface StoreScreenProps {
  navigation: any;
}

const StoreScreen: React.FC<StoreScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const data = await storeAPI.getProducts();
      setProducts(data || []);
      setIsOffline(false);
    } catch (error) {
      setProducts([]);
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

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
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

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.thumb, { backgroundColor: colors.surfaceAlt }]}>
        <AppIcon name="cube-outline" size={22} color={colors.secondary} />
      </View>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.price, { color: colors.accent }]} numberOfLines={1}>
          ₦{item.price.toLocaleString()}
        </Text>
        <TouchableOpacity
          onPress={() => addToCart(item)}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Add ${item.name} to cart`}
        >
          <AppIcon name="add" size={18} color={colors.onAccent} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <Loading message="Loading products..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isOffline ? 'Offline — pull to refresh' : 'No products available'}
            </Text>
          </View>
        }
      />

      {cartCount > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <Button title={`Checkout (${cartCount} items)`} onPress={goToCheckout} />
        </View>
      )}
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  columns: {
    gap: 12,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  thumb: {
    height: 92,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    minHeight: 32,
  },
  cardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
    paddingRight: 8,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default StoreScreen;
