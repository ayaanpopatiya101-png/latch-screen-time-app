# Latch — iOS native scaffold

This directory holds the **starter SwiftUI app** for Latch (`"Hooked on
Real Life."`). It is *source-only*: there is no `.xcodeproj` checked in,
because the project file is best generated on a Mac via Xcode so that
file references, signing, and entitlements are wired up correctly.

The web app under `client/` is a **prototype** — it cannot read or block
Apple Screen Time. The native app in this folder is what eventually ships
to the App Store.

---

## Why the web app cannot connect to Apple Screen Time

Apple's Screen Time platform is exposed only through three private-ish
frameworks that are available **inside iOS apps**:

| Framework | What it does |
| --- | --- |
| `FamilyControls` | Authorization + the `FamilyActivityPicker` UI for choosing apps/categories. |
| `DeviceActivity` | Schedule monitoring windows; receive callbacks when a per-app threshold is hit. |
| `ManagedSettings` / `ManagedSettingsUI` | Apply shields and customize how a shielded app looks. |

These frameworks have no web equivalent and no public REST API. A browser
running `latch.app` cannot read how long you spent in TikTok and cannot
ask iOS to block it. The only path is a native iOS app shipped through
the App Store, signed with the right entitlements.

---

## Apple Developer Program — required

To build and ship this app you will need:

1. **Apple ID** (free).
2. **Apple Developer Program** membership — **$99 USD / year**.
3. **A Mac** with the latest **Xcode** (free from the Mac App Store).
4. The **Family Controls distribution entitlement**, which Apple grants
   on individual approval. Submit a request:
   <https://developer.apple.com/contact/request/family-controls-distribution>
   Without this, your build will install on your own device but will be
   rejected from TestFlight / App Store distribution.

You currently have *none* of these — that's fine, this scaffold is
designed to wait for you. None of the Swift code makes false claims that
it works without entitlements; every Apple API call is gated and falls
back to demo data when authorization is missing.

---

## Required capabilities, entitlements, frameworks

Configure these on the **Latch** main-app target in Xcode:

- **Frameworks** (auto-linked when you `import` them):
  `SwiftUI`, `FamilyControls`, `DeviceActivity`, `ManagedSettings`,
  `ManagedSettingsUI`, `UserNotifications`.
- **Capabilities** (Signing & Capabilities tab):
  - **Family Controls**
  - **App Groups** — create one (`group.com.latch.app`) and tick it on
    *all three targets* (main app + DeviceActivity ext + Shield ext) so
    they share `UserDefaults`.
  - **Push Notifications** — *only* if you later add server-pushed
    nudges. Local `UserNotifications` works without it.
- **Background Modes** — none required for the current scaffold.

A starter `Latch.entitlements` file is included; rename and re-sign it
after you create the Xcode project.

### Extension targets

Two extension targets ship as stubs alongside the main app:

| Folder | Xcode target type |
| --- | --- |
| `ios/LatchDeviceActivityMonitor/` | *Device Activity Monitor Extension* |
| `ios/LatchShieldConfiguration/` | *Shield Configuration Extension* |

Each ships with its own `Info.plist` and a single Swift file you can drop
into the matching Xcode-generated target.

---

## Steps once you have a Mac

1. **Install Xcode** (latest, supports iOS 16+).
2. **Create the project**:
   `File -> New -> Project… -> iOS -> App` (SwiftUI, Swift, no Core Data,
   no tests for now). Save it inside `ios/` so the existing source files
   sit beside it.
3. **Add the source files**: drag `Latch/`, `LatchDeviceActivityMonitor/`,
   and `LatchShieldConfiguration/` into the project navigator. For each
   group choose *"Create groups"* and tick the right target.
4. **Create the extension targets**:
   `File -> New -> Target… -> Device Activity Monitor Extension` →
   name it `LatchDeviceActivityMonitor`. Repeat for *Shield Configuration
   Extension* → `LatchShieldConfiguration`. Replace the auto-generated
   Swift file with the one in the matching folder here.
5. **Set the bundle ID**: e.g. `com.latch.app` (main),
   `com.latch.app.deviceactivity` (monitor ext),
   `com.latch.app.shield` (shield ext).
6. **Signing team**: pick your Apple Developer Program team. Let Xcode
   manage signing.
7. **Capabilities**: enable Family Controls + App Groups
   (`group.com.latch.app`) on all three targets.
8. **Run on iPhone**: plug in an unlocked iPhone, trust the developer
   profile (Settings → General → VPN & Device Management) and hit
   *Cmd-R*. The first launch will prompt for Screen Time and notification
   access.
9. **TestFlight**: once it runs, archive (`Product -> Archive`) and
   upload to App Store Connect. Add internal testers by email; they
   install via the TestFlight app.
10. **App Store Connect**: create the app record, fill metadata,
    submit your build for review. Family Controls apps receive extra
    scrutiny — be prepared to explain *why* you need it.

---

## App Store launch checklist

- [ ] Apple Developer Program membership active.
- [ ] Family Controls distribution entitlement approved by Apple.
- [ ] Bundle IDs registered for app + both extensions.
- [ ] App Group provisioned and enabled on all three targets.
- [ ] App icons (1024×1024 marketing + all device sizes).
- [ ] Launch screen storyboard or `UILaunchScreen` plist entry.
- [ ] `NSUserNotificationsUsageDescription` set (already in `Info.plist`).
- [ ] Privacy policy URL hosted at a public address.
- [ ] App Privacy questionnaire completed in App Store Connect.
- [ ] Screenshots for 6.7", 6.5", and 5.5" iPhone displays.
- [ ] App description, keywords, support URL.
- [ ] At least one TestFlight build with internal sign-off.
- [ ] Final review build submitted with release notes.

### Privacy policy notes

Latch handles sensitive data:

- **App-usage data** read via `DeviceActivity` (which apps were opened,
  how long).
- **Local notifications** (no server contact required).
- **No analytics SDKs** in the scaffold; if you add any (PostHog, Sentry,
  Firebase…) update the privacy disclosure.
- **Children**: Family Controls apps are often used by minors. If you
  intend to support under-13 users you must follow COPPA + Apple's Kids
  Category guidelines, which usually forbid third-party analytics and
  require parental consent flows.

A minimal privacy policy must say: what is collected, where it is
stored (on-device only, in this scaffold), who it is shared with (no one),
and how the user can request deletion (uninstall the app).

---

## What lives where

```
ios/
├── Latch/
│   ├── LatchApp.swift                    # @main entry point
│   ├── Info.plist                        # main-app plist
│   ├── Latch.entitlements                # Family Controls + App Group
│   ├── Models/
│   │   └── Models.swift                  # AppRule, Quest, OnboardingData…
│   ├── Managers/
│   │   ├── AppState.swift                # @EnvironmentObject root state
│   │   ├── ScreenTimeManager.swift       # FamilyControls + DeviceActivity
│   │   └── NotificationManager.swift     # UserNotifications wrapper
│   └── Views/
│       ├── ContentView.swift             # Theme + root switcher
│       ├── OnboardingView.swift          # 6-step intro flow
│       ├── DashboardView.swift           # Tabs: Home/Shield/Swaps/Shop/Focus
│       └── BridgeView.swift              # The pause-before-scroll friction screen
├── LatchDeviceActivityMonitor/
│   ├── DeviceActivityMonitorExtension.swift
│   └── Info.plist
└── LatchShieldConfiguration/
    ├── ShieldConfigurationExtension.swift
    └── Info.plist
```

---

## Static checks

This scaffold lives in a Linux CI environment without Xcode, so **Swift
compilation is not run automatically**. Verified in this repo:

- File layout matches the structure described above.
- Each Swift file uses `#if canImport(...)` so missing Apple SDKs do not
  prevent the file from being read or syntax-checked by tooling that has
  the Swift toolchain.
- `Info.plist` files validate as well-formed XML.

To get real type checking, open the project on a Mac with Xcode and run
*Product -> Build*; that's the first thing you'll do once you have the
hardware.
