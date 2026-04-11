import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { ReactNode, useEffect, useMemo, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import { useAppMessage } from '../contexts/AppMessageContext';

type UpdateConfig = {
  latestVersion?: string;
  minimumVersion?: string;
  storeUrl?: string;
  title?: string;
  message?: string;
  required?: boolean;
};

const UPDATE_CONFIG_URL = (process.env.EXPO_PUBLIC_APP_UPDATE_CONFIG_URL as string | undefined)?.trim();
const PLAY_STORE_URL =
  (process.env.EXPO_PUBLIC_PLAY_STORE_URL as string | undefined)?.trim() ||
  'https://play.google.com/store/apps/details?id=com.nivasity.app';
const DISMISSED_UPDATE_KEY = 'app_update.dismissed_version';

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
  return payload;
};

const AppUpdateGate = ({ children }: { children: ReactNode }) => {
  const appMessage = useAppMessage();
  const promptedVersionRef = useRef<string | null>(null);
  const installedVersion = useMemo(() => getInstalledVersion(), []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!UPDATE_CONFIG_URL) return;

    let active = true;

    const openStore = async (storeUrl: string) => {
      const url = storeUrl || PLAY_STORE_URL;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
      await Linking.openURL(PLAY_STORE_URL);
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

        const dismissedVersion = await AsyncStorage.getItem(DISMISSED_UPDATE_KEY);
        const required = Boolean(config?.required) || (minimumVersion ? compareVersions(minimumVersion, installedVersion) > 0 : false);
        if (!required && dismissedVersion === targetVersion) return;
        if (!active) return;

        promptedVersionRef.current = targetVersion;
        const storeUrl = config?.storeUrl || PLAY_STORE_URL;
        appMessage.alert({
          title: config?.title || 'Update available',
          message:
            config?.message ||
            `Version ${targetVersion} is available on Play Store. Update now for the latest fixes and improvements.`,
          dismissable: !required,
          actions: required
            ? [{ text: 'Update now', onPress: () => void openStore(storeUrl) }]
            : [
              {
                text: 'Later',
                style: 'cancel',
                onPress: () => void AsyncStorage.setItem(DISMISSED_UPDATE_KEY, targetVersion),
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
  }, [appMessage, installedVersion]);

  return <>{children}</>;
};

export default AppUpdateGate;