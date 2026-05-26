# Latch Mobile (Expo)

The React Native / Expo prototype of the Latch screen-time app.

## Stack

- Expo SDK 52, Expo Router (file-based routes)
- React Native 0.76, TypeScript strict
- AsyncStorage for local persistence; theme + components in `src/`
- Mock `ScreenTimeService` abstraction in `src/services/screenTimeService.ts` — swap in native iOS Family Controls + Android UsageStats / AccessibilityService modules for production.

## Folder layout

```
mobile/
  app/                   Expo Router routes
    _layout.tsx          root stack + StoreProvider
    index.tsx            entry that redirects based on auth/onboarding
    login.tsx            account creation
    interview.tsx        Lumi interview
    permissions.tsx      explain + request OS permissions
    about/               privacy + about pages
    (tabs)/
      _layout.tsx        bottom tabs
      dashboard.tsx      plan power, brain energy, credits, next action
      focus.tsx          scheduled focus windows
      shield.tsx         Gentle / Friction / Deep Lock
      earn.tsx           credits ledger
      settings.tsx       account + privacy links
  src/
    components/          reusable UI primitives
    engines/             interview + credits scoring
    services/            screenTimeService, authService
    state/store.tsx      Context-based app state with AsyncStorage persistence
    theme/               colors, typography, spacing, radii
    types/               shared TS types
  app.json               Expo config (icons, splash, entitlements)
  eas.json               EAS build/submit profiles
```

## Local development

```bash
cd mobile
npm install
npx expo start            # opens dev server; press i for iOS sim, a for Android emulator
```

Run on a real phone with the Expo Go app (limited — Screen Time and Accessibility APIs require a development build):

```bash
npx expo start --tunnel
# scan the QR with Expo Go
```

For native features, you need a development build:

```bash
npx expo prebuild
npx expo run:ios          # opens Xcode workspace; requires Xcode + signing certs
npx expo run:android      # requires Android Studio + emulator or device
```

## Type checking

```bash
cd mobile
npm run typecheck
```

## Production builds (EAS)

You'll need an [Expo account](https://expo.dev) and the EAS CLI:

```bash
npm i -g eas-cli
eas login
cd mobile
eas init                  # creates an EAS project, fill the projectId back into app.json
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

For TestFlight + Google Internal Testing submissions:

```bash
eas build --platform ios --profile production
eas submit --platform ios

eas build --platform android --profile production
eas submit --platform android
```

You must already have:

- An Apple Developer account ($99/yr) and a created app record on App Store Connect.
- A Google Play Console account ($25 one-time) and a created app on Play Console.
- A Google Play service account JSON exported to `mobile/play-service-account.json` (gitignored).
- The Apple Family Controls entitlement granted for your bundle id (see `docs/apple-family-controls-entitlement-request.md`).

Fill in `appleId`, `ascAppId`, `appleTeamId` in `eas.json` (production submit profile) before running submit.

## What still needs native work

- **iOS Family Controls / DeviceActivity / ManagedSettings module.** The `ios/` directory at the repo root contains a SwiftUI scaffold from an earlier exploration; in production this would be wrapped as an Expo native module (`expo prebuild` + custom Swift code) so the `ScreenTimeService` can drive `ShieldConfiguration`.
- **Android UsageStatsManager + AccessibilityService.** Documented in `docs/android-native-plan.md`. Requires adding a Java/Kotlin Expo native module after prebuild.
- **Real auth backend.** `authService.ts` is currently AsyncStorage-only. The `UserAccount` shape is compatible with Supabase / Auth0 / your own server — swap by editing one file.

## Configuration before first build

1. Replace `extra.eas.projectId` in `mobile/app.json` after running `eas init`.
2. Replace the placeholder asset files in `src/assets/` (`icon.png`, `splash.png`, `adaptive-icon.png`) with real artwork. The Expo CLI will warn if these are missing on first build.
3. Set your bundle / package ids in `app.json` if you're not using `com.latch.screentime`.
4. Fill in `submit.production` credentials in `eas.json`.
