import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

let pendingNav: { name: string; params?: any } | null = null;

export const navigate = (name: string, params?: any) => {
  if (!navigationRef.isReady()) {
    pendingNav = { name, params };
    return;
  }
  (navigationRef as any).navigate(name, params);
};

export const goBack = () => {
  if (!navigationRef.isReady()) return;
  if (!navigationRef.canGoBack()) return;
  navigationRef.goBack();
};

export const flushPendingNavigation = () => {
  if (!navigationRef.isReady()) return;
  if (!pendingNav) return;
  const { name, params } = pendingNav;
  pendingNav = null;
  (navigationRef as any).navigate(name, params);
};
