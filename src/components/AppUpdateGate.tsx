import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { ReactNode, useEffect, useMemo, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import { useAppMessage } from '../contexts/AppMessageContext';
import { API_BASE_URL } from '../services/api';

type UpdateConfig = {
  latestVersion?: string;
  minimumVersion?: string;
  storeUrl?: string;
  title?: string;
  message?: string;
  required?: boolean;
};

const DEFAULT_UPDATE_CONFIG_URL = `${API_BASE_URL}/app/update-config.php`;
const UPDATE_CONFIG_URL =
  (process.env.EXPO_PUBLIC_APP_UPDATE_CONFIG_URL as string | undefined)?.trim() || DEFAULT_UPDATE_CONFIG_URL;

const getDismissedUpdateKey = () => `app_update.dismissed_version.${Platform.OS}`;

const getStoreLabel = () => {
  if (Platform.OS === 'ios') return 'App Store';
  if (Platform.OS === 'android') return 'Play Store';
  return 'store';
};

const normalizeVersion = (value?: string | null) =>
  String(value || '')
    .trim()
    .replace(/^v/i, '');

const compareVersions = (left?: string | null, right?: string | null) => {
  const leftParts = normalizeVersion(left)
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = normalizeVersion(right)
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
  const size = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < size; index += 1) {
    const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (delta !== 0) return delta > 0 ? 1 : -1;
  }

  return 0;
};

const getInstalledVersion = () => {
  return normalizeVersion(
    (Constants.expoConfig as any)?.version || (Constants as any)?.nativeAppVersion || (Constants as any)?.manifest2?.extra?.expoClient?.version
  );
};

const extractConfig = (payload: any): UpdateConfig | null => {
  if (!payload || typeof payload !== 'object') return null;
  if (Platform.OS === 'android' && payload.android && typeof payload.android === 'object') {
    return { ...payload, ...payload.android };
  }
  if (Platform.OS === 'ios' && payload.ios && typeof payload.ios === 'object') {
    return { ...payload, ...payload.ios };
  }
  return payload;
};

const AppUpdateGate = ({ children }: { children: ReactNode }) => {
  const appMessage = useAppMessage();
  const promptedVersionRef = useRef<string | null>(null);
  const installedVersion = useMemo(() => getInstalledVersion(), []);
  const storeLabel = useMemo(() => getStoreLabel(), []);
  const dismissedUpdateKey = useMemo(() => getDismissedUpdateKey(), []);

  useEffect(() => {
    if (!UPDATE_CONFIG_URL) return;
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

    let active = true;

    const openStore = async (storeUrl: string) => {
      const url = storeUrl;
      if (!url) return;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    };

    const checkForUpdate = async () => {
      try {
        const response = await fetch(UPDATE_CONFIG_URL, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;

        const payload = await response.json();
        const config = extractConfig(payload);
        const latestVersion = normalizeVersion(config?.latestVersion);
        const minimumVersion = normalizeVersion(config?.minimumVersion);
        const targetVersion = latestVersion || minimumVersion;

        if (!targetVersion) return;
        if (compareVersions(targetVersion, installedVersion) <= 0) return;
        if (promptedVersionRef.current === targetVersion) return;

        const dismissedVersion = await AsyncStorage.getItem(dismissedUpdateKey);
        const required = Boolean(config?.required) || (minimumVersion ? compareVersions(minimumVersion, installedVersion) > 0 : false);
        if (!required && dismissedVersion === targetVersion) return;
        if (!active) return;

        promptedVersionRef.current = targetVersion;
        const storeUrl = String(config?.storeUrl || '').trim();
        if (!storeUrl) return;
        appMessage.alert({
          title: config?.title || 'Update available',
          message:
            config?.message ||
            `Version ${targetVersion} is available on ${storeLabel}. Update now for the latest fixes and improvements.`,
          dismissable: !required,
          actions: required
            ? [{ text: 'Update now', onPress: () => void openStore(storeUrl) }]
            : [
              {
                text: 'Later',
                style: 'cancel',
                onPress: () => void AsyncStorage.setItem(dismissedUpdateKey, targetVersion),
              },
              { text: 'Update', onPress: () => void openStore(storeUrl) },
            ],
        });
      } catch {
        // Ignore silent update-check failures.
      }
    };

    void checkForUpdate();

    return () => {
      active = false;
    };
  }, [appMessage, dismissedUpdateKey, installedVersion, storeLabel]);

  return <>{children}</>;
};

export default AppUpdateGate;