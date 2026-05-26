# Android native integration plan

This document is the source-of-truth for moving the mobile prototype's mock `ScreenTimeService` to real native Android implementations.

## Two APIs, two permissions

### 1. UsageStatsManager (reading data)

- Class: `android.app.usage.UsageStatsManager`
- Permission: `android.permission.PACKAGE_USAGE_STATS` (signature|privileged on most OEMs; users grant by visiting Settings → Apps with usage access)
- Flow:
  1. From Java/Kotlin, call `Settings.canDrawOverlays(context)` & `(getSystemService(APP_OPS_SERVICE) as AppOpsManager).unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, ...)` to detect grant state.
  2. If not granted, fire `Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)` to send the user to the system settings page.
  3. Read usage with `usageStatsManager.queryUsageStats(INTERVAL_DAILY, startMillis, endMillis)`.
- Output: list of `UsageStats` per package with `totalTimeInForeground` ms.
- Mapping to `AppUsage` (see `mobile/src/types/index.ts`): bundleId = `packageName`, displayName via `PackageManager.getApplicationLabel`, minutesToday = `totalTimeInForeground / 60_000`.

### 2. AccessibilityService (blocking)

- Class: subclass of `android.accessibilityservice.AccessibilityService`
- Permission: enabled by user in Settings → Accessibility → (your service).
- Configuration in `res/xml/accessibility_service_config.xml`:
  ```xml
  <accessibility-service
      xmlns:android="http://schemas.android.com/apk/res/android"
      android:accessibilityEventTypes="typeWindowStateChanged"
      android:accessibilityFeedbackType="feedbackGeneric"
      android:accessibilityFlags="flagDefault"
      android:canRetrieveWindowContent="false"
      android:notificationTimeout="100" />
  ```
  `canRetrieveWindowContent="false"` is important — it makes clear to the reviewer that we are not reading screen contents.
- In `onAccessibilityEvent`, when the foreground package matches a currently-shielded package, start the Latch "Friction" or "Deep Lock" activity over the foreground app via a `FLAG_ACTIVITY_NEW_TASK` intent.

### 3. Foreground service (to keep shields active)

- Class: `android.app.Service` with `startForeground(...)` and a persistent notification.
- Permission: `android.permission.FOREGROUND_SERVICE` plus, on Android 14+, the more specific `FOREGROUND_SERVICE_SPECIAL_USE` (since Latch's use case isn't location/media/camera).

## Bridging to React Native via Expo native modules

1. `npx expo prebuild --platform android` to materialize the `android/` project.
2. Create `modules/screen-time` as an Expo Module (`npx create-expo-module screen-time --local`).
3. Implement Kotlin classes:
   - `ScreenTimeModule.kt` — exports `getTodayUsage`, `requestUsageAccess`, `requestAccessibility`, `startShield`, `stopShield`.
   - `LatchAccessibilityService.kt` — the actual AccessibilityService.
   - `LatchShieldService.kt` — the foreground service holding the shield state.
4. Update `mobile/src/services/screenTimeService.ts` to call the real module via `import ScreenTime from '../../modules/screen-time'` instead of the mock.

## Play Store policies to know

- Accessibility usage is reviewed by Google. You must explain in the Play Console "Accessibility Usage" disclosure that Latch uses Accessibility solely for the OS's blocking primitive, with `canRetrieveWindowContent="false"`.
- `QUERY_ALL_PACKAGES` requires justification — provide it in the Data Safety section (see `docs/data-safety-notes.md`).
- Latch is not a "Device Admin" app; do not request that permission.

## Test matrix

| Scenario | Expected |
| -------- | -------- |
| Fresh install, no permissions | Permissions screen prompts; insights blank. |
| Usage access granted, accessibility off | Insights populate; shields refuse to start with reason `native-permission-required`. |
| Both granted, focus window active | Opening a shielded app launches Latch's Friction activity over it. |
| Both granted, focus window inactive | All apps open normally; Latch only counts usage. |
| User revokes accessibility mid-window | Latch detects (heartbeat polling), surfaces a notification, and degrades to Gentle. |
| Device reboot during window | Foreground service re-binds on `BOOT_COMPLETED` (declare the broadcast receiver with `RECEIVE_BOOT_COMPLETED` permission). |

## Estimated effort

- 2–3 engineer-days to wire the UsageStatsManager side (low risk).
- 5–8 engineer-days to ship a polished AccessibilityService blocker that handles edge cases (OEM quirks on Xiaomi/Huawei especially).
- 1–2 days for the Play Console Accessibility Usage submission and back-and-forth with Google reviewers.
