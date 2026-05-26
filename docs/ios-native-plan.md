# iOS native integration plan

This document is the source-of-truth for moving the mobile prototype's mock `ScreenTimeService` to a real iOS implementation using Apple's Family Controls stack.

## Frameworks

1. **FamilyControls** — `AuthorizationCenter.shared.requestAuthorization(for: .individual)` to ask the user for permission. Each user authorizes for themselves, not for someone else's device. The user picks the set of apps via `FamilyActivityPicker` and Latch only sees an opaque `FamilyActivitySelection` token — not the underlying app identifiers.
2. **DeviceActivity** — `DeviceActivityCenter().startMonitoring(_:during:)` schedules recurring "focus" windows. A `DeviceActivityMonitor` app extension fires `intervalDidStart` / `intervalDidEnd` callbacks even when Latch isn't running.
3. **ManagedSettings** — `ManagedSettingsStore` stores the shield. `store.shield.applications = selection.applicationTokens` blocks the apps; `store.clearAllSettings()` removes them.
4. **ManagedSettingsUI** — supplies the custom `ShieldConfiguration` UI (Latch shows the Lumi avatar and the "remaining time in window" copy).

## Entitlement

`com.apple.developer.family-controls` — required. See `docs/apple-family-controls-entitlement-request.md` for the application steps. Already declared in `mobile/app.json`.

## Existing scaffold

The repo's `ios/` directory contains a SwiftUI starter created earlier:

- `ios/Latch/` — main app with placeholder screens
- `ios/LatchDeviceActivityMonitor/` — DeviceActivity extension target stub
- `ios/LatchShieldConfiguration/` — ShieldConfiguration extension target stub

Those files predate the Expo prototype and were committed for reference. The Expo prebuild flow will overwrite `ios/` when run, so before `npx expo prebuild` either:

- Move the existing Swift code into an Expo module under `mobile/modules/screen-time-ios/`, or
- Run `expo prebuild --no-install` once, then port the Swift code from the old `ios/` directory into the generated targets, and commit the merged result.

## Bridging into React Native

1. `cd mobile && npx expo prebuild --platform ios`
2. `cd mobile/modules && npx create-expo-module screen-time-ios --local`
3. Add `screen-time-ios.podspec` dependencies: `FamilyControls`, `DeviceActivity`, `ManagedSettings`, `ManagedSettingsUI`.
4. Implement `ScreenTimeModule.swift` to bridge:
   ```swift
   @objc(ScreenTimeModule)
   class ScreenTimeModule: NSObject {
     @objc func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock, ...) {
       Task {
         do {
           try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
           resolve("granted")
         } catch {
           resolve("denied")
         }
       }
     }
     // showPicker, startShield, stopShield, scheduleActivity ...
   }
   ```
5. Configure the App Group (e.g. `group.com.latch.screentime`) so the main app and the DeviceActivityMonitor extension can share the selection token via `UserDefaults(suiteName:)`.
6. Add two target extensions to the Xcode project via Expo's `withXcodeProject` mod:
   - DeviceActivityMonitor extension (calls `ManagedSettingsStore` on interval start/end)
   - ShieldConfiguration extension (renders the Latch shield UI)
7. Update `mobile/src/services/screenTimeService.ts` to call the real native module instead of the mock.

## Privacy review constraints (per Apple)

- Never log the underlying app identifiers — they come back as opaque tokens, but you must not even attempt to resolve them. Keep all selection state in `UserDefaults` inside the App Group, never on a server.
- Don't ship a "see what apps your friend uses" feature. Family Controls in `.individual` mode is explicitly for the same user on the same device.
- Custom shield UI must not contain ads, social-share prompts, or external links unrelated to the user's own goal.

## Test matrix

| Scenario | Expected |
| -------- | -------- |
| Fresh install, denies Family Controls | Permissions screen explains the cost; insights remain blank; shields cannot start. |
| Approves Family Controls, no schedule | Dashboard shows aggregate counts; nothing is blocked. |
| Schedules a focus window | DeviceActivityMonitor fires at start; ManagedSettingsStore applies shield; Latch's shield UI appears on shielded app launch. |
| Focus window ends | Monitor fires `intervalDidEnd`; shield cleared. |
| Device reboot mid-window | DeviceActivity persists schedules across reboots — verified post-reboot. |
| Update from a version without entitlement | First launch shows permissions card requesting Family Controls. |
