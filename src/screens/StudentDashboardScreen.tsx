import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Loading from '../components/Loading';
import { dashboardAPI, orderAPI } from '../services/api';
import { DashboardStats, Order } from '../types';

interface StudentDashboardScreenProps {
  navigation: any;
}

const StudentDashboardScreen: React.FC<StudentDashboardScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [statsData, ordersData] = await Promise.all([
        dashboardAPI.getStudentStats(),
        orderAPI.getOrders(),
      ]);
      setStats(statsData);
      setRecentOrders((ordersData || []).slice(0, 5));
      setIsOffline(false);
    } catch (error) {
      setStats({ totalOrders: 0, pendingOrders: 0, totalSpent: 0 });
      setRecentOrders([]);
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

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
              <Text style={[styles.avatarText, { color: colors.secondary }]}>
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.welcome, { color: colors.textMuted }]}>Welcome back,</Text>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {user?.name || 'Student'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <AppIcon name="search-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Campus essentials{'\n'}delivered fast
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              Browse the store and checkout in minutes.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Store')}
              style={[styles.heroButton, { backgroundColor: colors.accent }]}
              accessibilityRole="button"
              accessibilityLabel="Browse store"
              activeOpacity={0.85}
            >
              <Text style={[styles.heroButtonText, { color: colors.onAccent }]}>Check now</Text>
              <AppIcon name="arrow-forward" size={16} color={colors.onAccent} />
            </TouchableOpacity>
          </View>
          <View style={[styles.heroArt, { backgroundColor: colors.surfaceAlt }]}>
            <AppIcon name="school-outline" size={34} color={colors.secondary} />
          </View>
        </View>

        {isOffline && (
          <View style={[styles.offlineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.offlineIcon, { backgroundColor: colors.surfaceAlt }]}>
              <AppIcon name="sparkles-outline" size={16} color={colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.offlineTitle, { color: colors.text }]}>Offline mode</Text>
              <Text style={[styles.offlineText, { color: colors.textMuted }]}>
                Pull to refresh when you're back online.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.statRow}>
          <StatPill label="Orders" value={`${stats?.totalOrders || 0}`} icon="receipt-outline" />
          <StatPill label="Pending" value={`${stats?.pendingOrders || 0}`} icon="time-outline" />
          <StatPill label="Spent" value={`₦${(stats?.totalSpent || 0).toLocaleString()}`} icon="wallet-outline" />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Courses</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="View all">
              <Text style={[styles.viewAll, { color: colors.textMuted }]}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chipsRow}>
            <Chip label="All Course" active />
            <Chip label="Popular" />
            <Chip label="Newest" />
          </View>

          <View style={styles.cardsGrid}>
            <CourseCard
              title="Nivasity Store"
              subtitle="Browse essentials"
              icon="grid-outline"
              onPress={() => navigation.navigate('Store')}
            />
            <CourseCard
              title="Edit Profile"
              subtitle="Update details"
              icon="person-outline"
              onPress={() => navigation.navigate('Profile')}
            />
          </View>
        </View>

        {recentOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Orders</Text>
            </View>

            {recentOrders.map((order) => (
              <View
                key={order.id}
                style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.orderInfo}>
                  <Text style={[styles.orderNumber, { color: colors.text }]}>
                    Order #{order.id.substring(0, 8)}
                  </Text>
                  <Text style={[styles.orderDate, { color: colors.textMuted }]}>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.orderDetails}>
                  <Text style={[styles.orderAmount, { color: colors.text }]}>₦{order.total.toLocaleString()}</Text>
                  <StatusBadge status={order.status} />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
      <View style={[styles.courseIcon, { backgroundColor: colors.surfaceAlt }]}>
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

const StatPill = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof AppIcon>['name'];
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: colors.surfaceAlt }]}>
        <AppIcon name={icon} size={16} color={colors.secondary} />
      </View>
      <View>
        <Text style={[styles.statPillValue, { color: colors.text }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.statPillLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
    </View>
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
    paddingTop: 10,
  },
  headerRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  welcome: {
    fontSize: 12,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 8,
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
    fontSize: 20,
    fontWeight: '700',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '700',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  courseIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  offlineCard: {
    marginTop: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  offlineIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 2,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});

export default StudentDashboardScreen;
