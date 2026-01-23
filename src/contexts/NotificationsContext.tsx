import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as ExpoLinking from 'expo-linking';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { API_BASE_URL, notificationAPI } from '../services/api';
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
  apiBaseUrl: string;
  expoProjectId?: string;
  devicePushToken?: string;
  lastTokenAttemptAt?: string;
  lastTokenSuccessAt?: string;
  lastTokenError?: string;
  lastDeviceRegisterAttemptAt?: string;
  lastDeviceRegisterSuccessAt?: string;
  lastDeviceRegisterError?: string;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  openNotificationTarget: (data?: AppNotificationData) => boolean;
  upsertLocal: (n: AppNotification) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const CACHE_KEY = 'notifications.cache.v1';
const EXPO_PUSH_TOKEN_KEY = 'notifications.expoPushToken.v1';

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

const extractDeepLink = (data?: AppNotificationData) => {
  if (!data) return undefined;
  const anyData: any = data as any;
  const candidates = [
    anyData?.deep_link,
    anyData?.deepLink,
    anyData?.deeplink,
    anyData?.deeplink_url,
    anyData?.deeplinkUrl,
    anyData?.url,
    anyData?.link,
  ];
  for (const value of candidates) {
    const str = typeof value === 'string' ? value.trim() : '';
    if (str) return str;
  }
  return undefined;
};

const toStringParam = (value: any) => {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return String(value).trim();
};

const parsePossibleId = (value: any) => {
  const raw = toStringParam(value);
  if (!raw) return undefined;
  const n = Number(raw);
  if (Number.isFinite(n)) return n;
  return undefined;
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
  const [serverUnreadCount, setServerUnreadCount] = useState<number | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | 'undetermined'>('undetermined');
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
  const [expoProjectId, setExpoProjectId] = useState<string | undefined>(undefined);
  const [devicePushToken, setDevicePushToken] = useState<string | undefined>(undefined);
  const [lastTokenAttemptAt, setLastTokenAttemptAt] = useState<string | undefined>(undefined);
  const [lastTokenSuccessAt, setLastTokenSuccessAt] = useState<string | undefined>(undefined);
  const [lastTokenError, setLastTokenError] = useState<string | undefined>(undefined);
  const [lastDeviceRegisterAttemptAt, setLastDeviceRegisterAttemptAt] = useState<string | undefined>(undefined);
  const [lastDeviceRegisterSuccessAt, setLastDeviceRegisterSuccessAt] = useState<string | undefined>(undefined);
  const [lastDeviceRegisterError, setLastDeviceRegisterError] = useState<string | undefined>(undefined);

  const lastRefreshAt = useRef(0);
  const registeringToken = useRef<Promise<string | undefined> | null>(null);
  const registeringDevice = useRef<Promise<boolean> | null>(null);
  const mounted = useRef(true);
  const lastDeviceRegKey = useRef<string | null>(null);
  const pendingOpenData = useRef<AppNotificationData | undefined>(undefined);

  const localUnreadCount = useMemo(() => notifications.filter((n) => !n.readAt).length, [notifications]);
  const unreadCount = useMemo(() => {
    if (serverUnreadCount == null) return localUnreadCount;
    return Math.max(serverUnreadCount, localUnreadCount);
  }, [localUnreadCount, serverUnreadCount]);

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
        const { notifications: list, unreadCount: nextUnreadCount } = await notificationAPI.listNotifications({ page: 1, limit: 50 });
        if (!mounted.current) return;
        setNotifications(list);
        if (typeof nextUnreadCount === 'number') setServerUnreadCount(nextUnreadCount);
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

  const registerDeviceIfNeeded = useCallback(async (token: string, opts?: { silent?: boolean }) => {
    const userId = user?.id ? String(user.id) : '';
    if (!isAuthenticated || !userId) return false;

    const regKey = `${userId}:${token}`;
    if (lastDeviceRegKey.current === regKey) return true;

    if (registeringDevice.current) return registeringDevice.current;
    registeringDevice.current = (async () => {
      setLastDeviceRegisterAttemptAt(new Date().toISOString());
      setLastDeviceRegisterError(undefined);
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
        lastDeviceRegKey.current = regKey;
        setLastDeviceRegisterSuccessAt(new Date().toISOString());
        return true;
      } catch (e: any) {
        const msg = String(e?.response?.data?.message || e?.message || 'Failed to register device for push notifications.');
        setLastDeviceRegisterError(msg);
        if (!opts?.silent) {
          appMessage.toast({
            status: 'failed',
            message: msg,
          });
        } else if (__DEV__) {
          console.log('[Notifications] device registration failed:', msg);
        }
        return false;
      } finally {
        registeringDevice.current = null;
      }
    })();

    return registeringDevice.current;
  }, [appMessage, isAuthenticated, user?.id]);

  const openNotificationTarget = useCallback((data?: AppNotificationData) => {
    if (!isAuthenticated) {
      pendingOpenData.current = data;
      return false;
    }

    const deepLink = extractDeepLink(data);
    const anyData: any = (data || {}) as any;

    const openMaterial = (materialIdRaw: any) => {
      const materialId = toStringParam(materialIdRaw);
      if (!materialId) return false;
      navigate('StudentMain', { screen: 'Store', params: { materialId } });
      return true;
    };

    const openReceipt = (txRefRaw: any) => {
      const txRef = toStringParam(txRefRaw);
      if (!txRef) return false;
      navigate('OrderReceipt', { txRef });
      return true;
    };

    const openSupport = (args: { ticketId?: any; ticketCode?: any; subject?: any }) => {
      const ticketId = parsePossibleId(args.ticketId);
      const ticketCode = toStringParam(args.ticketCode);
      const subject = toStringParam(args.subject);
      if (!ticketId && !ticketCode) return false;
      navigate('SupportChat', {
        ticketId: ticketId ?? undefined,
        ticketCode: ticketCode || undefined,
        subject: subject || undefined,
      });
      return true;
    };

    if (deepLink) {
      const parsed = ExpoLinking.parse(deepLink);
      const host = (parsed.hostname || '').trim().toLowerCase();
      const path = (parsed.path || '').replace(/^\/+/, '').trim();
      const qp: any = parsed.queryParams || {};

      if (host === 'material') {
        const id = path.split('/')[0] || toStringParam(qp.materialId ?? qp.material_id ?? qp.id);
        return openMaterial(id);
      }

      if (host === 'payment') {
        const txRef =
          toStringParam(qp.tx_ref ?? qp.txRef ?? qp.ref ?? qp.reference ?? qp.transaction_ref) ||
          toStringParam(anyData.tx_ref ?? anyData.txRef);
        return openReceipt(txRef);
      }

      if (host === 'support' || host === 'ticket' || host === 'support-ticket') {
        const ticketId = qp.ticket_id ?? qp.ticketId ?? qp.id ?? anyData.ticket_id ?? anyData.ticketId;
        const ticketCode = qp.ticket_code ?? qp.ticketCode ?? qp.code ?? anyData.ticket_code ?? anyData.ticketCode;
        const subject = qp.subject ?? anyData.subject;
        return openSupport({ ticketId, ticketCode, subject });
      }

      if (host === 'notifications') {
        const highlightId = toStringParam(qp.id ?? qp.notification_id ?? qp.notificationId ?? anyData.notification_id);
        navigate('Notifications', { highlightId: highlightId || undefined });
        return true;
      }

      // Fallback: try to interpret path-based routes (e.g. nivasity://support/ticket?ticket_id=1)
      if (path.startsWith('material/')) return openMaterial(path.replace(/^material\//, ''));
      if (path.startsWith('payment/')) return openReceipt(qp.tx_ref ?? qp.txRef);
      if (path.includes('support')) return openSupport({ ticketId: qp.ticket_id ?? qp.id, ticketCode: qp.ticket_code ?? qp.code });
    }

    // Non-URL payloads (backend may send action + ids)
    const action = toStringParam(anyData.action ?? anyData.type ?? anyData.event).toLowerCase();
    if (action === 'material' || action === 'material_details' || action === 'open_material') {
      return openMaterial(anyData.material_id ?? anyData.materialId ?? anyData.id);
    }
    if (action === 'order_receipt' || action === 'payment_receipt' || action === 'payment_success') {
      return openReceipt(anyData.tx_ref ?? anyData.txRef ?? anyData.order_id ?? anyData.orderId ?? anyData.ref);
    }
    if (action === 'support_ticket' || action === 'open_ticket' || action === 'ticket') {
      return openSupport({
        ticketId: anyData.ticket_id ?? anyData.ticketId ?? anyData.id,
        ticketCode: anyData.ticket_code ?? anyData.ticketCode ?? anyData.code,
        subject: anyData.subject,
      });
    }

    // Field-based fallback
    if (anyData.material_id || anyData.materialId) return openMaterial(anyData.material_id ?? anyData.materialId);
    if (anyData.tx_ref || anyData.txRef) return openReceipt(anyData.tx_ref ?? anyData.txRef);
    if (anyData.ticket_id || anyData.ticketId || anyData.ticket_code || anyData.ticketCode) {
      return openSupport({
        ticketId: anyData.ticket_id ?? anyData.ticketId,
        ticketCode: anyData.ticket_code ?? anyData.ticketCode,
        subject: anyData.subject,
      });
    }

    return false;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const data = pendingOpenData.current;
    if (!data) return;
    pendingOpenData.current = undefined;
    const handled = openNotificationTarget(data);
    if (!handled) navigate('Notifications');
  }, [isAuthenticated, openNotificationTarget]);

  const registerPushTokenIfGranted = useCallback(async () => {
    if (registeringToken.current) return registeringToken.current;
    registeringToken.current = (async () => {
      try {
        await ensureAndroidChannel();

        const perm = await Notifications.getPermissionsAsync();
        setPermissionStatus(perm.status);
        if (perm.status !== 'granted') return undefined;

        if (!Device.isDevice) {
          if (__DEV__) console.log('[Notifications] not a physical device, skipping push token registration');
          return undefined;
        }

        const projectId = getProjectId();
        setExpoProjectId(projectId ? String(projectId) : undefined);
        setLastTokenAttemptAt(new Date().toISOString());
        setLastTokenError(undefined);

        try {
          const devToken = await Notifications.getDevicePushTokenAsync();
          const rawDev = typeof (devToken as any)?.data === 'string' ? String((devToken as any).data) : '';
          setDevicePushToken(rawDev.trim() || undefined);
        } catch (e: any) {
          const msg = String(e?.message || 'Failed to get native device push token');
          setLastTokenError(msg);
          if (__DEV__) console.log('[Notifications] getDevicePushTokenAsync failed:', msg);
        }

        const tokenRes = projectId
          ? await Notifications.getExpoPushTokenAsync({ projectId })
          : await Notifications.getExpoPushTokenAsync();
        const token = tokenRes.data;
        if (!token) return undefined;
        setExpoPushToken(token);
        setLastTokenSuccessAt(new Date().toISOString());
        AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token).catch(() => undefined);

        await registerDeviceIfNeeded(token, { silent: true });

        return token;
      } catch (e: any) {
        setLastTokenError(String(e?.message || 'Failed to get Expo push token'));
        appMessage.toast({
          status: 'failed',
          message:
            e?.message ||
            'Failed to get push token from Expo. Make sure this is a real device build and the Expo projectId is configured.',
        });
        return undefined;
      } finally {
        registeringToken.current = null;
      }
    })();
    return registeringToken.current;
  }, [appMessage, ensureAndroidChannel, registerDeviceIfNeeded]);

  const requestPushPermission = useCallback(async () => {
    try {
      await ensureAndroidChannel();
      const res = await Notifications.requestPermissionsAsync();
      setPermissionStatus(res.status);
      if (res.status !== 'granted') return false;
      const token = await registerPushTokenIfGranted();
      if (!token) {
        appMessage.toast({
          status: 'failed',
          message: Device.isDevice
            ? 'Push permission granted, but no Expo push token was returned.'
            : 'Push notifications require a physical device build (emulators/simulators cannot register for push).',
        });
        return false;
      }

      const ok = await registerDeviceIfNeeded(token);
      return ok;
    } catch (e: any) {
      appMessage.toast({ status: 'failed', message: e?.message || 'Failed to enable push notifications.' });
      return false;
    }
  }, [appMessage, ensureAndroidChannel, registerDeviceIfNeeded, registerPushTokenIfGranted]);

  const markAsRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    let wasUnread = false;
    setNotifications((prev) => {
      const existing = prev.find((n) => n.id === id);
      wasUnread = !!existing && !existing.readAt;
      const next = prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n));
      persist(next);
      return next;
    });
    if (wasUnread && serverUnreadCount != null) {
      setServerUnreadCount((c) => (typeof c === 'number' ? Math.max(0, c - 1) : c));
    }

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
    if (serverUnreadCount != null) setServerUnreadCount(0);

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

    AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY)
      .then((raw) => {
        const token = String(raw || '').trim();
        if (token && mounted.current) setExpoPushToken(token);
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
    if (!isAuthenticated || !user?.id) return;
    if (permissionStatus !== 'granted') return;
    if (!expoPushToken) return;
    registerDeviceIfNeeded(expoPushToken, { silent: true });
  }, [expoPushToken, isAuthenticated, permissionStatus, registerDeviceIfNeeded, user?.id]);

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
        onAction: () => {
          if (!isAuthenticated) {
            pendingOpenData.current = local.data;
            navigate('Login');
            return;
          }
          const handled = openNotificationTarget(local.data);
          if (!handled) navigate('Notifications', { highlightId: local.id });
        },
      });
    });

    const handleResponse = (res: Notifications.NotificationResponse | null | undefined) => {
      if (!res) return;
      const data = (res.notification?.request?.content?.data || {}) as any;
      if (!isAuthenticated) {
        pendingOpenData.current = data;
        Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        return;
      }
      const handled = openNotificationTarget(data);
      if (handled) return;
      const id = String(data.notification_id ?? data.id ?? '').trim();
      navigate('Notifications', { highlightId: id || undefined });
    };

    Notifications.getLastNotificationResponseAsync()
      .then((res) => {
        handleResponse(res);
        if (res) Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      })
      .catch(() => undefined);

    const response = Notifications.addNotificationResponseReceivedListener((res) => {
      handleResponse(res);
    });

    return () => {
      received.remove();
      response.remove();
    };
  }, [appMessage, isAuthenticated, openNotificationTarget, upsertLocal]);

  useEffect(() => {
    if (isAuthenticated) return;
    setNotifications([]);
    setExpoPushToken(undefined);
    setServerUnreadCount(undefined);
    setExpoProjectId(undefined);
    setDevicePushToken(undefined);
    setLastTokenAttemptAt(undefined);
    setLastTokenSuccessAt(undefined);
    setLastTokenError(undefined);
    setLastDeviceRegisterAttemptAt(undefined);
    setLastDeviceRegisterSuccessAt(undefined);
    setLastDeviceRegisterError(undefined);
    lastDeviceRegKey.current = null;
    AsyncStorage.removeItem(CACHE_KEY).catch(() => undefined);
    AsyncStorage.removeItem(EXPO_PUSH_TOKEN_KEY).catch(() => undefined);
  }, [isAuthenticated]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      isRefreshing,
      permissionStatus,
      expoPushToken,
      apiBaseUrl: API_BASE_URL,
      expoProjectId,
      devicePushToken,
      lastTokenAttemptAt,
      lastTokenSuccessAt,
      lastTokenError,
      lastDeviceRegisterAttemptAt,
      lastDeviceRegisterSuccessAt,
      lastDeviceRegisterError,
      refresh,
      requestPushPermission,
      markAsRead,
      markAllAsRead,
      openNotificationTarget,
      upsertLocal,
    }),
    [
      notifications,
      unreadCount,
      isRefreshing,
      permissionStatus,
      expoPushToken,
      expoProjectId,
      devicePushToken,
      lastTokenAttemptAt,
      lastTokenSuccessAt,
      lastTokenError,
      lastDeviceRegisterAttemptAt,
      lastDeviceRegisterSuccessAt,
      lastDeviceRegisterError,
      refresh,
      requestPushPermission,
      markAsRead,
      markAllAsRead,
      openNotificationTarget,
      upsertLocal,
    ]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};
