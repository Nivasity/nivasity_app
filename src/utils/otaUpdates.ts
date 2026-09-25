// expo-updates (OTA JS-bundle updates, separate from the store-version check
// in AppUpdateGate.tsx - that one is for native/binary changes that need a
// real store submission; this is for JS-only patches pushed via `eas
// update`, no store trip).
//
// Expo already checks + downloads automatically on cold start (the default
// `checkAutomatically: ON_LOAD` in app.json's "updates" config) - nothing to
// do there. The gap is what AppUpdateGate's own check already deals with for
// the store-version case: a phone that stays open for days never cold-starts,
// so a returning-to-foreground check is the only way a long-lived session
// ever sees a newer OTA update at all.
//
// Deliberately never calls Updates.reloadAsync() to force it in - this app
// handles wallet PINs and payments, and reloading the JS runtime out from
// under a user mid-session (mid-checkout, PIN entry, anywhere) would be a
// real hazard. A background fetchUpdateAsync() only changes what loads on
// the NEXT natural cold start (app fully closed and reopened) - it never
// disturbs the current one.
import { AppState, type AppStateStatus } from 'react-native';

// Not available in Expo Go - native module missing there.
let Updates: typeof import('expo-updates') | null = null;
try {
  Updates = require('expo-updates');
} catch {
  /* native module not available (Expo Go) */
}

let lastCheckedAt = 0;
const MIN_CHECK_INTERVAL_MS = 60 * 60 * 1000; // no more than once an hour

async function checkAndPrefetch(): Promise<void> {
  if (!Updates || __DEV__) return;
  // A dev-client / locally-run build has no embedded update channel to
  // compare against - checkForUpdateAsync would just throw. isEnabled
  // covers this (false for a bare `expo run:android`/dev client launch
  // outside of EAS Update's own channels).
  if (!Updates.isEnabled) return;

  const now = Date.now();
  if (now - lastCheckedAt < MIN_CHECK_INTERVAL_MS) return;
  lastCheckedAt = now;

  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;
    // Downloads in the background; becomes the active bundle on the next
    // cold start automatically - no reloadAsync() call here on purpose.
    await Updates.fetchUpdateAsync();
  } catch {
    // Network hiccup, no update server reachable, etc. - fails open, same
    // as AppUpdateGate's store-version check. Never worth surfacing to the
    // user; it'll just try again next foreground/interval.
  }
}

/**
 * Call once near the app root (see App.tsx). Checks for an OTA update on
 * mount and every time the app returns to the foreground, capped at once
 * per hour. No UI, no forced reload - see module comment.
 */
export function initOtaUpdateCheck(): () => void {
  if (!Updates || __DEV__ || !Updates.isEnabled) return () => {};

  checkAndPrefetch();

  const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') checkAndPrefetch();
  });

  return () => subscription.remove();
}
