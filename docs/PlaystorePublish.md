# Play Store Publish (Expo / Android)

This project is an Expo (SDK 54) React Native app. For Play Store submission you should build an **Android App Bundle (`.aab`)** using **EAS Build** (recommended; `expo build` / classic builds are deprecated).

## 1) One-time prerequisites

- Google Play Developer account.
- An Expo account (for EAS Build / EAS Submit).
- App assets ready:
  - App icon (1024×1024)
  - Feature graphic (1024×500)
  - Screenshots (phone; optionally tablet)
- A publicly accessible:
  - Privacy Policy URL
  - Support email address

## 2) Project config checklist (`app.json`)

Confirm these before you build:

- **Identifiers**
  - `expo.slug` is set (already).
  - `expo.android.package` is final and unique (already set: `com.nivasity.app`).
  - `expo.ios.bundleIdentifier` is set (already).
- **Versioning**
  - `expo.version` is your human version (already `1.0.0`).
  - Add and increment `expo.android.versionCode` for every Play Store upload (required).
    - Example: `1`, then `2`, `3`, ...
- **UI mode**
  - `expo.userInterfaceStyle` should be `automatic` (already).
- **Icons / splash**
  - `expo.icon`, `expo.splash`, `expo.android.adaptiveIcon` are set and point to real files (already present).
- **Permissions**
  - Keep only what you actually use.
  - If you access photos/receipts, confirm `expo-media-library` plugin copy is correct (already present).

Suggested `versionCode` addition:

```json
{
  "expo": {
    "android": {
      "versionCode": 1
    }
  }
}
```

## 3) Environment variables (production)

This app reads public runtime variables at build time:

- `EXPO_PUBLIC_API_BASE_URL` (default is production API if unset)
- `EXPO_PUBLIC_ASSETS_BASE_URL` (default is production assets if unset)

For EAS, set them as secrets (recommended):

```bash
eas secret:create --name EXPO_PUBLIC_API_BASE_URL --value "https://api.nivasity.com/v1"
eas secret:create --name EXPO_PUBLIC_ASSETS_BASE_URL --value "https://assets.nivasity.com"
```

## 4) Add EAS Build config (recommended)

1) Install EAS CLI:

```bash
npm i -g eas-cli
eas login
```

2) Initialize EAS in this repo:

```bash
eas init
```

3) Create `eas.json` (example):

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Notes:
- Use `preview` (APK) for quick tester installs.
- Use `production` (AAB) for Play Store.

## 5) Build the Android bundle (AAB)

Before building:

- Bump `expo.android.versionCode`.
- Run a quick check:

```bash
npm run typecheck
npx expo-doctor
```

Build:

```bash
eas build --platform android --profile production
```

This outputs an `.aab` you upload to the Play Console.

## 6) Submit to Play Store

### Option A: Upload manually (most common)

- Play Console → your app → **Production** (or **Internal testing**) → Create release → upload the `.aab`.

### Option B: EAS Submit

```bash
eas submit --platform android --profile production
```

You’ll need to connect a Google Play service account / credentials when prompted.

## 7) Play Console checklist (non-code)

- **Store Listing**
  - App name, short description, full description
  - Screenshots + feature graphic
  - Category, tags
- **App Access**
  - Provide test credentials if login is required
- **Content Rating**
- **Target audience**
- **Data Safety**
  - Declare what data is collected/shared (auth email/phone, analytics/crash logs, etc.)
- **Privacy Policy URL**
- **Ads declaration** (if any)

## 8) Release readiness checklist

- Confirm auth flows work on a release build (login, register/verify OTP, forgot/reset password).
- Confirm profile images load from `https://assets.nivasity.com/users/{profile_pic}` in production.
- Confirm “academic details required” dialog shows when `dept_id` is missing.
- Confirm crash reporting/analytics approach (if used) and reflect it in Data Safety + Privacy Policy.

## 9) If you add Google Sign-In later (extra requirements)

- Create OAuth client IDs in Google Cloud Console.
- Add correct Android SHA-1/SHA-256 signing fingerprints (debug + release/EAS).
- Include the Android package name and correct redirect configuration (depends on the library you choose).
- For Play Store, ensure the **release** signing key fingerprint is registered (EAS-managed or your own).
