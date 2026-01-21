import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { notificationAPI } from '../services/api';
import { AppNotification, AppNotificationData } from '../types';
import { navigate } from '../navigation/navigationRef';
import { useAppMessage } from './AppMessageContext';
import { useAuth } from './AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  isRefreshing: boolean;
  permissionStatus: Notifications.PermissionStatus | 'undetermined';
  expoPushToken?: string;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  upsertLocal: (n: AppNotification) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const CACHE_KEY = 'notifications.cache.v1';

const parseCache = (raw: string): AppNotification[] | null => {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(Boolean) as AppNotification[];
  } catch {
    return null;
  }
};

const getProjectId = () => {
  const anyConstants: any = Constants as any;
  return (
    anyConstants?.easConfig?.projectId ||
    anyConstants?.expoConfig?.extra?.eas?.projectId ||
    anyConstants?.manifest2?.extra?.eas?.projectId ||
    anyConstants?.manifest?.extra?.eas?.projectId
  );
};

const toExpoTokenNotification = (args: {
  title?: string;
  body?: string;
  data?: AppNotificationData;
  createdAt?: string;
  id?: string;
}): AppNotification => {
  const id = (args.id || '').trim() || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    title: (args.title || 'Notification').trim(),
    body: (args.body || '').trim(),
    data: args.data,
    createdAt: args.createdAt || new Date().toISOString(),
    readAt: null,
  };
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const appMessage = useAppMessage();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | 'undetermined'>('undetermined');
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);

  const lastRefreshAt = useRef(0);
  const registeringToken = useRef<Promise<string | undefined> | null>(null);
  const mounted = useRef(true);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.readAt).length, [notifications]);

  const persist = useCallback((next: AppNotification[]) => {
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const upsertLocal = useCallback(
    (n: AppNotification) => {
      setNotifications((prev) => {
        const idx = prev.findIndex((x) => x.id === n.id);
        let next: AppNotification[];
        if (idx >= 0) {
          next = prev.slice();
          next[idx] = { ...prev[idx], ...n };
        } else {
          next = [n, ...prev];
        }

        next.sort((a, b) => {
          const ta = new Date(String(a.createdAt || '').replace(' ', 'T')).getTime();
          const tb = new Date(String(b.createdAt || '').replace(' ', 'T')).getTime();
          if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
          if (Number.isNaN(ta)) return 1;
          if (Number.isNaN(tb)) return -1;
          return tb - ta;
        });

        persist(next);
        return next;
      });
    },
    [persist]
  );

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!isAuthenticated) return;
      setIsRefreshing(true);
      try {
        const { notifications: list } = await notificationAPI.listNotifications({ page: 1, limit: 50 });
        if (!mounted.current) return;
        setNotifications(list);
        persist(list);
        lastRefreshAt.current = Date.now();
      } catch (e: any) {
        if (!opts?.silent) {
          appMessage.toast({ status: 'failed', message: e?.message || 'Failed to load notifications.' });
        }
      } finally {
        if (mounted.current) setIsRefreshing(false);
      }
    },
    [appMessage, isAuthenticated, persist]
  );

  const ensureAndroidChannel = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ff9100',
      });
    } catch {
      // ignore
    }
  }, []);

  const registerPushTokenIfGranted = useCallback(async () => {
    if (registeringToken.current) return registeringToken.current;
    registeringToken.current = (async () => {
      try {
        await ensureAndroidChannel();

        const perm = await Notifications.getPermissionsAsync();
        setPermissionStatus(perm.status);
        if (perm.status !== 'granted') return undefined;

        if (!Device.isDevice) return undefined;

        const projectId = getProjectId();
        const tokenRes = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined as any);
        const token = tokenRes.data;
        if (!token) return undefined;
        setExpoPushToken(token);

        try {
          const appVersion =
            (Constants.expoConfig as any)?.version ||
            (Constants as any)?.nativeAppVersion ||
            undefined;
          await notificationAPI.registerDevice({
            expoPushToken: token,
            platform: Platform.OS as 'ios' | 'android' | 'web',
            appVersion,
          });
        } catch (e) {
          // Backend endpoint may not exist yet; token is still valid locally.
          if (__DEV__) console.log('[Notifications] device registration failed:', (e as any)?.message);
        }

        return token;
      } finally {
        registeringToken.current = null;
      }
    })();
    return registeringToken.current;
  }, [ensureAndroidChannel]);

  const requestPushPermission = useCallback(async () => {
    try {
      await ensureAndroidChannel();
      const res = await Notifications.requestPermissionsAsync();
      setPermissionStatus(res.status);
      if (res.status !== 'granted') return false;
      await registerPushTokenIfGranted();
      return true;
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Failed to enable push notifications.' });
      return false;
    }
  }, [appMessage, ensureAndroidChannel, registerPushTokenIfGranted]);

  const markAsRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n));
      persist(next);
      return next;
    });

    try {
      await notificationAPI.markRead({ id });
    } catch (e) {
      if (__DEV__) console.log('[Notifications] markRead failed:', (e as any)?.message);
    }
  }, [persist]);

  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString();
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, readAt: n.readAt ?? now }));
      persist(next);
      return next;
    });

    try {
      await notificationAPI.markAllRead();
    } catch (e) {
      if (__DEV__) console.log('[Notifications] markAllRead failed:', (e as any)?.message);
    }
  }, [persist]);

  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        const cached = parseCache(raw);
        if (cached && mounted.current) setNotifications(cached);
      })
      .catch(() => undefined);

    Notifications.getPermissionsAsync()
      .then((res) => setPermissionStatus(res.status))
      .catch(() => undefined);

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    refresh({ silent: true });
    registerPushTokenIfGranted();
  }, [isAuthenticated, refresh, registerPushTokenIfGranted, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handler = (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      const now = Date.now();
      if (now - lastRefreshAt.current < 25_000) return;
      refresh({ silent: true });
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((event) => {
      const content = event?.request?.content;
      const data = (content?.data || {}) as any;
      const id = String(data.notification_id ?? data.id ?? event?.request?.identifier ?? '').trim() || undefined;
      const local = toExpoTokenNotification({
        id,
        title: content?.title || undefined,
        body: content?.body || undefined,
        data: content?.data as any,
      });
      upsertLocal(local);

      appMessage.toast({
        status: 'info',
        title: (content?.title || 'New notification').trim(),
        message: (content?.body || '').trim() || 'Open Notifications to view.',
        actionText: 'View',
        onAction: () => navigate('Notifications', { highlightId: local.id }),
      });
    });

    const handleResponse = (res: Notifications.NotificationResponse | null | undefined) => {
      const data = (res?.notification?.request?.content?.data || {}) as any;
      const id = String(data.notification_id ?? data.id ?? '').trim();
      navigate('Notifications', { highlightId: id || undefined });
    };

    Notifications.getLastNotificationResponseAsync()
      .then((res) => handleResponse(res))
      .catch(() => undefined);

    const response = Notifications.addNotificationResponseReceivedListener((res) => {
      handleResponse(res);
    });

    return () => {
      received.remove();
      response.remove();
    };
  }, [appMessage, upsertLocal]);

  useEffect(() => {
    if (isAuthenticated) return;
    setNotifications([]);
    setExpoPushToken(undefined);
    AsyncStorage.removeItem(CACHE_KEY).catch(() => undefined);
  }, [isAuthenticated]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      isRefreshing,
      permissionStatus,
      expoPushToken,
      refresh,
      requestPushPermission,
      markAsRead,
      markAllAsRead,
      upsertLocal,
    }),
    [
      notifications,
      unreadCount,
      isRefreshing,
      permissionStatus,
      expoPushToken,
      refresh,
      requestPushPermission,
      markAsRead,
      markAllAsRead,
      upsertLocal,
    ]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};
