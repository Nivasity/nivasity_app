import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppIcon from '../components/AppIcon';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Loading from '../components/Loading';
import { dashboardAPI } from '../services/api';
import { DashboardStats } from '../types';

interface AdminDashboardScreenProps {
  navigation: any;
}

const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const statsData = await dashboardAPI.getAdminStats();
      setStats(statsData);
      setIsOffline(false);
    } catch (error) {
      setStats({ totalUsers: 0, totalRevenue: 0, totalOrders: 0, pendingOrders: 0 });
      setIsOffline(true);
      console.warn('Admin dashboard offline: could not reach API');
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
    return <Loading message="Loading admin dashboard..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Admin dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Hello, {user?.name || 'Admin'}
          </Text>
        </View>

        <View style={styles.grid}>
          <StatCard icon="people-outline" label="Total Users" value={`${stats?.totalUsers || 0}`} />
          <StatCard icon="cash-outline" label="Total Revenue" value={`₦${(stats?.totalRevenue || 0).toLocaleString()}`} />
          <StatCard icon="receipt-outline" label="Total Orders" value={`${stats?.totalOrders || 0}`} />
          <StatCard icon="time-outline" label="Pending Orders" value={`${stats?.pendingOrders || 0}`} />
        </View>

        {isOffline && (
          <View style={[styles.offline, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

        <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.noticeIcon, { backgroundColor: colors.surfaceAlt }]}>
            <AppIcon name="sparkles-outline" size={18} color={colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.noticeTitle, { color: colors.text }]}>Admin tools</Text>
            <Text style={[styles.noticeText, { color: colors.textMuted }]}>
              User, order, and product management screens can be added next.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof AppIcon>['name'];
  label: string;
  value: string;
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.cardIcon, { backgroundColor: colors.surfaceAlt }]}>
        <AppIcon name={icon} size={18} color={colors.secondary} />
      </View>
      <Text style={[styles.cardValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.cardLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  notice: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  offline: {
    marginTop: 14,
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

export default AdminDashboardScreen;
