import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { IconButton } from '../components/ui';
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
  const highlightColor = isDark ? colors.accentMuted : colors.secondary;
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

  // Opening this screen marks everything read. The ones that were unread keep their
  // highlight for this visit so the student can still see what is new.
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const unread = notifications.filter((n) => !n.readAt).map((n) => n.id);
    if (unread.length === 0) return;
    setNewIds((prev) => new Set([...prev, ...unread]));
    markAllAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

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
        <View style={[styles.pushCard, { backgroundColor: colors.accent, borderColor: colors.accent, borderBottomColor: colors.accentLip }]}>
          <View style={styles.pushCardTop}>
            <View style={[styles.pushCardIcon, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <AppIcon name="notifications" size={20} color="#1A1209" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pushTitle, { color: '#1A1209' }]}>Turn on push notifications</Text>
              <Text style={[styles.pushSubtitle, { color: 'rgba(26,18,9,0.82)' }]}>{headerSubtitle}</Text>
            </View>
          </View>
          <Button title="Enable notifications" icon="notifications-outline" onPress={enablePush} loading={enablingPush} variant="secondary" />
        </View>

        <View style={{ height: 14 }} />
      </View>
    );
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const unread = !item.readAt || newIds.has(item.id);
    const timeLabel = formatListTimestamp(item.createdAt);
    const highlighted = highlightId && item.id === highlightId;

    const type = String(item.type || '').toLowerCase();
    const anyData: any = (item.data || {}) as any;
    const action = String(anyData.action || anyData.type || anyData.event || '').toLowerCase();
    const kind =
      action.includes('wallet') || type.includes('wallet')
        ? { icon: 'wallet-outline' as const, fg: colors.success, bg: colors.successSoft }
        : action.includes('payment') || action.includes('order') || type.includes('payment') || type.includes('transaction')
          ? { icon: 'receipt-outline' as const, fg: colors.info, bg: colors.infoSoft }
          : action.includes('support') || type.includes('support')
            ? { icon: 'chatbubbles-outline' as const, fg: colors.accent, bg: colors.accentSoft }
            : action.includes('material') || type.includes('material')
              ? { icon: 'book-outline' as const, fg: colors.secondary, bg: colors.secondary + '22' }
              : { icon: 'notifications-outline' as const, fg: colors.textMuted, bg: colors.surfaceAlt };

    return (
      <TouchableOpacity
        onPress={() => openNotification(item)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        style={[
          styles.card,
          {
            backgroundColor: unread ? colors.accentSoft + '66' : colors.surface,
            borderColor: highlighted ? colors.accent : colors.border,
            borderBottomColor: highlighted ? colors.accent : colors.cardLip,
          },
        ]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.cardIconWrap, { backgroundColor: kind.bg }]}>
            <AppIcon name={kind.icon} size={18} color={kind.fg} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.cardTitle, { color: colors.text, fontWeight: unread ? '800' : '600' }]} numberOfLines={1}>
                {item.title || 'Notification'}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{timeLabel}</Text>
            </View>
            {item.body ? (
              <Text style={[styles.cardBody, { color: unread ? colors.text : colors.textMuted }]} numberOfLines={2}>
                {item.body}
              </Text>
            ) : null}
          </View>
          {unread ? <View style={[styles.unreadDotInline, { backgroundColor: colors.accent }]} /> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.topTitle, { color: colors.text }]} numberOfLines={1}>
            Notifications
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {newIds.size > 0 ? `${newIds.size} new` : "You're all caught up"}
          </Text>
        </View>
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
            <EmptyState
              icon="notifications-outline"
              title="No notifications yet"
              subtitle="Receipts, wallet activity and support replies will show up here."
            />
          </View>
        }
        onScrollToIndexFailed={() => undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  unreadDotInline: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
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
    fontSize: 22,
    fontWeight: '800',
  },
  listContent: {
    paddingTop: 6,
  },
  pushCard: {
    borderWidth: 1,
    borderBottomWidth: 3,
    borderRadius: 24,
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
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pushSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    flex: 1,
    fontSize: 14,
  },
  cardBody: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
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
    borderBottomWidth: 3,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
});

export default NotificationsScreen;
