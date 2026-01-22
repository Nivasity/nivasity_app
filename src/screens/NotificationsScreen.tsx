import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const formatRelative = (value?: string) => {
  const raw = (value || '').trim();
  if (!raw) return '';
  const t = new Date(raw.replace(' ', 'T')).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = Date.now() - t;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks}w ago`;
  const years = Math.floor(weeks / 52);
  return `${years}y ago`;
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
    expoPushToken,
    apiBaseUrl,
    lastDeviceRegisterAttemptAt,
    lastDeviceRegisterSuccessAt,
    lastDeviceRegisterError,
    refresh,
    requestPushPermission,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const highlightId = (route?.params?.highlightId as string | undefined) || undefined;
  const listRef = useRef<FlatList<AppNotification> | null>(null);
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    refresh({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerSubtitle = useMemo(() => {
    if (permissionStatus === 'granted') {
      if (expoPushToken) return 'Push notifications are enabled and ready.';
      return 'Push notifications are enabled, but setup is not complete yet.';
    }
    if (permissionStatus === 'denied') return 'Push notifications are off. Enable them in your phone settings.';
    return 'Enable push notifications to get updates even when the app is closed.';
  }, [expoPushToken, permissionStatus]);

  const tokenHint = useMemo(() => {
    const t = String(expoPushToken || '').trim();
    if (!t) return undefined;
    if (t.length <= 18) return t;
    return `${t.slice(0, 12)}…${t.slice(-6)}`;
  }, [expoPushToken]);

  const formatTimestamp = (value?: string) => {
    const raw = (value || '').trim();
    if (!raw) return 'none';
    const t = new Date(raw.replace(' ', 'T'));
    if (Number.isNaN(t.getTime())) return raw;
    return `${t.toLocaleString()} (${raw})`;
  };

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
              {tokenHint ? (
                <Text style={[styles.pushSubtitle, { color: colors.textMuted, marginTop: 4 }]}>
                  Token: {tokenHint}
                </Text>
              ) : null}
            </View>
          </View>
          <Button
            title={permissionStatus === 'granted' ? 'Sync device' : 'Enable'}
            onPress={enablePush}
            loading={enablingPush}
            variant="outline"
            style={{ borderRadius: 16, minHeight: 46 }}
          />
        </View>

        <View style={[styles.diagCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.diagTitle, { color: colors.text }]}>Diagnostics</Text>
          <Text style={[styles.diagLine, { color: colors.textMuted }]} selectable>
            permissionStatus: {permissionStatus}
          </Text>
          <Text style={[styles.diagLine, { color: colors.textMuted }]} selectable>
            expoPushToken: {expoPushToken ? expoPushToken : 'none'}
          </Text>
          <Text style={[styles.diagLine, { color: colors.textMuted }]} selectable>
            apiBaseUrl: {apiBaseUrl}
          </Text>
          <Text style={[styles.diagLine, { color: colors.textMuted }]} selectable>
            lastRegisterAttemptAt: {formatTimestamp(lastDeviceRegisterAttemptAt)}
          </Text>
          <Text style={[styles.diagLine, { color: colors.textMuted }]} selectable>
            lastRegisterSuccessAt: {formatTimestamp(lastDeviceRegisterSuccessAt)}
          </Text>
          <Text style={[styles.diagLine, { color: colors.textMuted }]} selectable>
            lastRegisterError: {lastDeviceRegisterError ? lastDeviceRegisterError : 'none'}
          </Text>
        </View>

        <View style={{ height: 14 }} />
      </View>
    );
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const unread = !item.readAt;
    const relative = formatRelative(item.createdAt);
    const highlighted = highlightId && item.id === highlightId;

    return (
      <TouchableOpacity
        onPress={() => openNotification(item)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        style={[
          styles.row,
          {
            backgroundColor: colors.surface,
            borderColor: highlighted ? colors.accent : colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.dot,
            { backgroundColor: unread ? colors.accent : isDark ? 'rgba(255,255,255,0.20)' : 'rgba(15,23,42,0.14)' },
          ]}
        />
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title || 'Notification'}
          </Text>
          {item.body ? (
            <Text style={[styles.rowMessage, { color: colors.textMuted }]} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
          {relative ? (
            <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{relative}</Text>
          ) : null}
        </View>
        {unread ? (
          <View style={[styles.unreadPill, { borderColor: colors.accent }]}>
            <Text style={[styles.unreadPillText, { color: colors.accent }]}>NEW</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconButton, { backgroundColor: colors.background, borderColor: colors.border }]}
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
          style={[styles.iconButton, { backgroundColor: colors.background, borderColor: colors.border }]}
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
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => refresh()} />}
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
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
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
  diagCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  diagTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  diagLine: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: 4,
  },
  row: {
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  rowBody: {
    flex: 1,
    paddingTop: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  rowMessage: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  rowMeta: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '800',
  },
  unreadPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unreadPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
});

export default NotificationsScreen;
