import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import AppText from '../components/AppText';
import { DEMO_DATA_ENABLED } from '../config/demo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import Loading from '../components/Loading';
import { computeDashboardStats, demoOrders, demoProducts } from '../data/demo';
import { dashboardAPI, orderAPI, storeAPI } from '../services/api';
import { DashboardStats, Order, Product } from '../types';
import StoreCard from '../components/StoreCard';
import OrderListItem from '../components/OrderListItem';
import MaterialDetailsDrawer from '../components/MaterialDetailsDrawer';
import CheckoutFab from '../components/CheckoutFab';

interface StudentDashboardScreenProps {
  navigation: any;
}

const StudentDashboardScreen: React.FC<StudentDashboardScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { count: cartCount, lastActionAt, has, toggle } = useCart();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topMaterials, setTopMaterials] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [dataSource, setDataSource] = useState<'api' | 'demo'>('api');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState<Product | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [statsData, ordersData] = await Promise.all([
        dashboardAPI.getStudentStats(),
        orderAPI.getOrders(),
      ]);
      const safeOrders = ordersData || [];
      let materials: Product[] = [];
      try {
        materials = (await storeAPI.getProducts()) || [];
      } catch {
        materials = [];
      }
      if (materials.length === 0 && DEMO_DATA_ENABLED) {
        materials = demoProducts;
      }
      setTopMaterials(materials.slice(0, 3));
      if (safeOrders.length === 0 && DEMO_DATA_ENABLED) {
        setStats(computeDashboardStats(demoOrders));
        setRecentOrders(demoOrders.slice(0, 5));
        setDataSource('demo');
      } else {
        setStats(statsData);
        setRecentOrders(safeOrders.slice(0, 5));
        setDataSource('api');
      }
      setIsOffline(false);
    } catch (error) {
      if (DEMO_DATA_ENABLED) {
        setStats(computeDashboardStats(demoOrders));
        setRecentOrders(demoOrders.slice(0, 5));
        setTopMaterials(demoProducts.slice(0, 3));
        setDataSource('demo');
      } else {
        setStats({ totalOrders: 0, pendingOrders: 0, totalSpent: 0 });
        setRecentOrders([]);
        setTopMaterials([]);
      }
      setIsOffline(true);
      console.warn('Dashboard offline: could not reach API');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading) {
    return <Loading message="Loading dashboard..." />;
  }

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  const shareMaterial = async (product: Product) => {
    try {
      await Share.share({
        message: `${product.name} - ${product.description}\nPrice: ₦${product.price.toLocaleString()}`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        stickyHeaderIndices={[0]}
      >
        <View
          style={[
            styles.stickyHeader,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ProfileSection', { section: 'myAccount' })}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Open My Account"
                style={[styles.avatar, { borderColor: colors.surface, backgroundColor: colors.surface }]}
              >
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                ) : (
                  <AppText style={[styles.avatarText, { color: colors.secondary }]}>
                    {(user?.name || 'U').trim().charAt(0).toUpperCase()}
                  </AppText>
                )}
              </TouchableOpacity>
              <View>
                <Text style={[styles.welcome, { color: colors.textMuted }]}>{getGreeting()},</Text>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {user?.name || 'Student'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('Store')}
              style={[styles.searchButton, { backgroundColor: 'transparent' }]}
              accessibilityRole="button"
              accessibilityLabel="Browse store"
            >
              {/* <AppIcon name="search-outline" size={20} color={colors.text} /> */}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerSpacer} />

        <View style={[styles.heroCard, { backgroundColor: colors.secondary }]}>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: colors.surface }]}>
              Campus essentials{'\n'}delivered fast
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.surface }]}>
              Browse the store and checkout in minutes.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Store')}
              style={[styles.heroButton, { backgroundColor: colors.surface }]}
              accessibilityRole="button"
              accessibilityLabel="Browse store"
              activeOpacity={0.85}
            >
              <Text style={[styles.heroButtonText, { color: colors.secondary }]}>Check now</Text>
              <AppIcon name="arrow-forward" size={16} color={colors.secondary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.heroArt]}>
            <AppIcon name="school-outline" size={34} color={colors.surface} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.cardsGrid}>
            <CourseCard
              title="Nivasity Store"
              subtitle="Browse essentials"
              icon="grid-outline"
              onPress={() => navigation.navigate('Store')}
            />
            <CourseCard
              title="Order History"
              subtitle="Track purchases"
              icon="receipt-outline"
              onPress={() => navigation.navigate('Orders')}
            />
          </View>
        </View>

        {topMaterials.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Materials</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Store')}
                accessibilityRole="button"
                accessibilityLabel="See all materials"
                activeOpacity={0.85}
              >
                <Text style={[styles.viewAll, { color: colors.secondary }]}>See all</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={topMaterials.slice(0, 6)}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 8 }}
              renderItem={({ item }) => (
                <View style={{ width: 350, flexShrink: 0 }}>
                  <StoreCard
                    code={item.category || ''}
                    name={item.name}
                    status={item.available === false ? 'Unavailable' : 'Available'}
                    date={
                      item.deadlineAt || item.createdAt
                        ? new Date(item.deadlineAt || item.createdAt || '').toLocaleDateString(undefined, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                        : ''
                    }
                    price={`₦${item.price?.toLocaleString?.() ?? ''}`}
                    marked={has(item.id)}
                    onAdd={item.available === false ? undefined : () => toggle(item)}
                    onShare={() => shareMaterial(item)}
                    onPress={() => {
                      setActiveMaterial(item);
                      setDetailsOpen(true);
                    }}
                  />
                </View>
              )}
              style={{ marginLeft: -4 }}
            />
          </View>
        )}

        {recentOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Orders</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Orders')}
                accessibilityRole="button"
                accessibilityLabel="View all orders"
                activeOpacity={0.85}
              >
                <Text style={[styles.viewAll, { color: colors.secondary }]}>View all</Text>
              </TouchableOpacity>
            </View>

            {recentOrders.map((order) => (
              <OrderListItem
                key={order.id}
                order={order}
                onPress={() => navigation.navigate('OrderReceipt', { order })}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {cartCount > 0 ? (
        <View style={[styles.checkoutFabWrap, { bottom: 85 + insets.bottom }]}>
          <CheckoutFab onPress={() => navigation.navigate('Checkout')} trigger={lastActionAt} />
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
      />
    </SafeAreaView>
  );
};

const Chip = ({ label, active = false }: { label: string; active?: boolean }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.surfaceAlt : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? colors.text : colors.textMuted }]}>{label}</Text>
    </View>
  );
};

const CourseCard = ({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof AppIcon>['name'];
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.courseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.courseIcon]}>
        <AppIcon name={icon} size={22} color={colors.secondary} />
      </View>
      <Text style={[styles.courseTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.courseSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
};

const StatusBadge = ({ status }: { status: Order['status'] }) => {
  const { colors } = useTheme();
  const style = (() => {
    switch (status) {
      case 'completed':
        return { backgroundColor: `${colors.success}22`, color: colors.success };
      case 'processing':
        return { backgroundColor: `${colors.secondary}22`, color: colors.secondary };
      case 'cancelled':
        return { backgroundColor: `${colors.danger}22`, color: colors.danger };
      default:
        return { backgroundColor: `${colors.warning}22`, color: colors.warning };
    }
  })();

  return (
    <View style={[styles.badge, { backgroundColor: style.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: style.color }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  stickyHeader: {
    zIndex: 10,
    position: 'relative',
  },
  headerRow: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSpacer: {
    height: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 50,
    height: 50,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  welcome: {
    fontSize: 14,
    fontWeight: '600',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    maxWidth: 220,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroText: {
    flex: 1,
    paddingRight: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  heroButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  heroButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  heroArt: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    marginTop: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statPillValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  statPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '800',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  courseCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  courseIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  courseSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderCard: {
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  orderDetails: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  materialList: {
    gap: 12,
  },
  materialCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  materialIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 3,
  },
  materialSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  materialMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  materialDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  materialMetaText: {
    fontSize: 11,
    fontWeight: '800',
  },
  materialRight: {
    alignItems: 'flex-end',
  },
  materialPrice: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
  },
  materialCta: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  materialCtaText: {
    fontSize: 12,
    fontWeight: '900',
  },
  checkoutFabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
    alignItems: 'center',
  },
});

export default StudentDashboardScreen;
