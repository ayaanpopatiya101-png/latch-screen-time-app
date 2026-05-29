# Native Screen Time Setup Guide

This guide takes you from a clean clone to a real-device build with actual iOS Screen Time blocking and Android usage tracking.

---

## Prerequisites

- macOS with Xcode 16+ (for iOS)
- Android Studio Hedgehog+ (for Android)
- Node 20+, EAS CLI: `npm install -g eas-cli`
- Apple Developer account with Family Controls entitlement approved (see `docs/apple-family-controls-entitlement-request.md`)
- An EAS project ID — run `eas init` inside `mobile/` and copy the project ID into `app.json` → `extra.eas.projectId`

---

## Step 1 — Run Expo prebuild

```bash
cd mobile

# iOS + Android together
npx expo prebuild --clean

# Or per-platform
npx expo prebuild --platform ios
npx expo prebuild --platform android
```

This generates `mobile/ios/` and `mobile/android/` project directories.
`--clean` wipes any previous prebuild output.

---

## Step 2 — iOS: CocoaPods + Xcode targets

```bash
cd mobile/ios
pod install
open Latch.xcworkspace
```

### 2a. Add the DeviceActivityMonitor extension target

1. File › New › Target › Device Activity Monitor Extension
2. Name: **LatchDeviceActivityMonitor**
3. Bundle ID: `com.latch.screentime.monitor`
4. Replace the generated `Monitor.swift` with `modules/screen-time-ios/ios/LatchDeviceActivityMonitor.swift`
5. Signing & Capabilities → add **App Groups** → `group.com.latch.screentime`
6. Signing & Capabilities → add **Family Controls**

### 2b. Add the ShieldConfiguration extension target

1. File › New › Target › Shield Configuration Extension
2. Name: **LatchShieldConfiguration**
3. Bundle ID: `com.latch.screentime.shield`
4. Replace the generated `ShieldConfigurationExtension.swift` with `modules/screen-time-ios/ios/LatchShieldConfigurationExtension.swift`
5. Add App Groups (`group.com.latch.screentime`) and Family Controls capabilities
6. Add image assets named `lumi-shield-dark` and `lumi-shield-light` to the extension's asset catalogue

### 2c. Main app capabilities

In the **Latch** target (not the extensions):
- Signing & Capabilities → App Groups → `group.com.latch.screentime`
- Signing & Capabilities → Family Controls (this activates `com.apple.developer.family-controls`)

### 2d. Add ScreenTimeIOS module to CocoaPods

In `mobile/ios/Podfile`, verify this line appears (added automatically by Expo's module resolver):
```ruby
pod 'ScreenTimeIOS', :path => '../modules/screen-time-ios'
```
If not, add it inside the main target block and re-run `pod install`.

### 2e. Build and run on device

```bash
# From mobile/
npx expo run:ios --device
```

---

## Step 3 — Android: Gradle setup

### 3a. Register the native module in MainApplication

Open `mobile/android/app/src/main/java/.../MainApplication.kt` (or `.java`) and add the package:

```kotlin
import com.latch.screentime.ScreenTimeAndroidPackage

// Inside getPackages():
ScreenTimeAndroidPackage()
```

### 3b. Add the module source to Gradle

In `mobile/android/settings.gradle`:
```groovy
include ':screen-time-android'
project(':screen-time-android').projectDir =
    new File(rootProject.projectDir, '../modules/screen-time-android/android')
```

In `mobile/android/app/build.gradle` dependencies:
```groovy
implementation project(':screen-time-android')
```

### 3c. Add strings resource

In `mobile/android/app/src/main/res/values/strings.xml`, add:
```xml
<string name="accessibility_service_description">
  Latch uses Accessibility solely to detect when a shielded app is opened
  and show the Latch focus screen. It does not read screen content.
</string>
```

### 3d. Build and run on device

```bash
# From mobile/
npx expo run:android --device
```

---

## Step 4 — Test the native flow

Follow the test matrices in `docs/ios-native-plan.md` and `docs/android-native-plan.md`.

Key checks:

| Platform | Test | Expected |
|---|---|---|
| iOS | Fresh install, deny Family Controls | Shield stays mock; permissions screen prompts |
| iOS | Approve Family Controls, start deep-lock shield | ManagedSettings applies; opening TikTok shows Latch shield UI |
| iOS | Focus window scheduled, device rebooted | DeviceActivity restores shield after reboot |
| Android | Usage access only | Dashboard shows real app times; shield refused |
| Android | Both permissions granted, shield active | Opening shielded app → LatchShieldActivity appears |
| Android | Shield expires (endsAt passed) | Service clears shield automatically |

---

## Step 5 — EAS cloud build

Once device tests pass:

```bash
cd mobile

# iOS preview build → TestFlight
eas build --platform ios --profile preview

# Android preview build → Google Play internal testing
eas build --platform android --profile preview
```

Use `store/testflight-plan.md` and `store/google-internal-testing-plan.md` for submission steps.
