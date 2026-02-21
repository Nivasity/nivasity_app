import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { useAppMessage } from '../contexts/AppMessageContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { useTheme } from '../contexts/ThemeContext';
import { AppNotification } from '../types';

type NotificationsScreenProps = {
  navigation: any;
  route: any;
};

const parseAppDate = (value?: string) => {
  const raw = (value || '').trim();
  if (!raw) return null;
  const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const isSameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatListTimestamp = (value?: string) => {
  const d = parseAppDate(value);
  if (!d) return '';

  const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

  if (isSameLocalDay(d, now)) return `Today ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameLocalDay(d, yesterday)) return `Yesterday ${time}`;

  const day = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${day} ${time}`;
};

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const appMessage = useAppMessage();
  const {
    notifications,
    unreadCount,
    isRefreshing,
    permissionStatus,
    refresh,
    requestPushPermission,
    markAsRead,
    markAllAsRead,
    openNotificationTarget,
  } = useNotifications();

  const highlightId = (route?.params?.highlightId as string | undefined) || undefined;
  const listRef = useRef<FlatList<AppNotification> | null>(null);
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    refresh({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerSubtitle = useMemo(() => {
    if (permissionStatus === 'denied') return 'Push notifications are off. Enable them in your phone settings.';
    return 'Enable push notifications to get updates even when the app is closed.';
  }, [permissionStatus]);

  useEffect(() => {
    if (!highlightId) return;
    const idx = notifications.findIndex((n) => n.id === highlightId);
    if (idx < 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
    });
  }, [highlightId, notifications]);

  const openNotification = async (n: AppNotification) => {
    await markAsRead(n.id);
    const handled = openNotificationTarget(n.data);
    if (handled) return;

    const message = n.body || 'Notification';
    appMessage.alert({
      title: n.title || 'Notification',
      message,
      actions: [{ text: 'OK' }],
    });
  };

  const enablePush = async () => {
    setEnablingPush(true);
    try {
      const ok = await requestPushPermission();
      if (!ok) {
        appMessage.toast({ status: 'failed', message: 'Push notifications are not enabled.' });
      } else {
        appMessage.toast({ status: 'success', message: 'Push notifications enabled.' });
      }
    } finally {
      setEnablingPush(false);
    }
  };

  const renderHeader = () => {
    if (permissionStatus === 'granted') {
      return <View style={{ height: 8 }} />;
    }

    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={[styles.pushCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.pushCardTop}>
            <View style={styles.pushCardIcon}>
              <AppIcon name="notifications-outline" size={20} color={colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pushTitle, { color: colors.text }]}>Push notifications</Text>
              <Text style={[styles.pushSubtitle, { color: colors.textMuted }]}>{headerSubtitle}</Text>
            </View>
          </View>
          <Button
            title="Enable"
            onPress={enablePush}
            loading={enablingPush}
            variant="outline"
            style={{ borderRadius: 16, minHeight: 46 }}
          />
        </View>

        <View style={{ height: 14 }} />
      </View>
    );
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const unread = !item.readAt;
    const timeLabel = formatListTimestamp(item.createdAt);
    const highlighted = highlightId && item.id === highlightId;

    const type = String(item.type || '').toLowerCase();
    const anyData: any = (item.data || {}) as any;
    const action = String(anyData.action || anyData.type || anyData.event || '').toLowerCase();
    const icon =
      action.includes('payment') || action.includes('order') || type.includes('payment') || type.includes('transaction')
        ? 'receipt-outline'
        : action.includes('support') || type.includes('support')
          ? 'chatbubbles-outline'
          : action.includes('material') || type.includes('material')
            ? 'book-outline'
            : 'notifications-outline';

    return (
      <TouchableOpacity
        onPress={() => openNotification(item)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: highlighted ? colors.accent : colors.border,
          },
        ]}
      >
        <View style={styles.cardTop}>
          <View
            style={[
              styles.cardIconWrap,
              { backgroundColor: 'rgb(255, 255, 255)' },
            ]}
          >
            <Image source={require('../../assets/logo.png')} style={styles.cardLogo} resizeMode="contain" />
            {unread ? (
              <View style={[styles.unreadDot, { backgroundColor: colors.accent, borderColor: colors.surface }]} />
            ) : null}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title || 'Notification'}
            </Text>
            {item.body ? (
              <Text style={[styles.cardBody, { color: colors.textMuted }]} numberOfLines={2}>
                {item.body}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

        <View style={styles.cardBottom}>
          <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{timeLabel}</Text>
          <TouchableOpacity
            onPress={() => openNotification(item)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="View notification"
            style={styles.viewCta}
          >
            <Text style={[styles.viewCtaText, { color: colors.accent }]}>View</Text>
            <AppIcon name="chevron-forward" size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconButton]}
          accessibilityRole="button"
          accessibilityLabel="Back"
          activeOpacity={0.85}
        >
          <AppIcon name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]} numberOfLines={1}>
          Notifications
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (unreadCount < 1) return;
            markAllAsRead();
          }}
          style={[styles.iconButton]}
          accessibilityRole="button"
          accessibilityLabel="Mark all as read"
          activeOpacity={0.85}
        >
          <AppIcon name="checkmark" size={20} color={unreadCount > 0 ? colors.accent : colors.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={(r) => {
          listRef.current = r;
        }}
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 40 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => refresh()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <EmptyState
                icon="notifications-outline"
                title="No notifications yet"
                subtitle="When something important happens, you’ll see it here."
              />
            </View>
          </View>
        }
        onScrollToIndexFailed={() => undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  listContent: {
    paddingTop: 6,
  },
  pushCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  pushCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pushCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  pushSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  card: {
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 22,
    gap: 12,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  unreadDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  cardBody: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.7,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: '800',
  },
  viewCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  viewCtaText: {
    fontSize: 12,
    fontWeight: '900',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
});

export default NotificationsScreen;
