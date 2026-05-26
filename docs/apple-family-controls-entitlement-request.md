# Apple Family Controls Entitlement Request

Apple gates the **Family Controls** entitlement (`com.apple.developer.family-controls`) behind a manual request that you fill from the Apple Developer portal. Without it, the `FamilyControls`, `DeviceActivity`, and `ManagedSettings` frameworks return errors at runtime, and TestFlight/App Review will reject any build that ships them.

This is a manual step — Latch's code is already configured to use the entitlement (see `mobile/app.json` and the `ios/` SwiftUI scaffold). What follows is the exact submission you need to file.

## Prerequisites

- Active Apple Developer Program membership ($99/year)
- App Store Connect record created for `com.latch.screentime` (or whatever bundle id you use)
- A signed-in account with "Account Holder" or "Admin" role in App Store Connect

## Step-by-step

1. Sign in to <https://developer.apple.com/account>.
2. Open **Certificates, Identifiers & Profiles → Identifiers → App IDs**.
3. Select the bundle identifier `com.latch.screentime`.
4. In the **Capabilities** section, enable **Family Controls (Distribution)**. The toggle will show as pending — you cannot use it yet.
5. Open <https://developer.apple.com/contact/request/family-controls-distribution/>.
6. Submit the form using the answers below.
7. Wait. Apple has historically replied within 1–4 weeks. If they ask follow-ups, respond within their reply window — they will close the request otherwise.

## Form answers (copy/paste)

### App name
Latch — Screen-time coaching

### App bundle ID
com.latch.screentime

### App Store URL (if live)
N/A — pre-launch. Will be the TestFlight build first.

### Description of how your app uses the Screen Time API

> Latch is a personal screen-time coaching app for adults. The Screen Time / Family Controls API is the core of how Latch helps a user stick to their own self-set limits.
>
> We use:
> - **FamilyControls (`AuthorizationCenter`)** to request the user's individual authorization (`.individual`) so Latch can read aggregate usage and apply shields to the apps **the user themselves selects** with `FamilyActivityPicker`.
> - **DeviceActivity (`DeviceActivityMonitor`)** to schedule the user's recurring "focus windows" (e.g. a 90-minute deep-work block in the morning, a wind-down block at night). The monitor extension fires when the window starts and ends, allowing Latch to apply or remove shields without the app being foregrounded.
> - **ManagedSettings (`ShieldConfiguration`, `ManagedSettingsStore`)** to display Latch's custom Shield screen when the user opens a blocked app during a focus window, and to clear the shield when the window ends.
>
> Latch is **not** a parental-controls product. Each user controls their own device. The entitlement powers self-imposed limits, not third-party supervision.

### Justification (why your app needs this entitlement)

> Apple's Family Controls API is the only sanctioned, App-Store-permissible way to limit per-app usage on iOS. Without it, Latch can only show insights, which is half the product. Existing apps like Opal, Jomo, and one sec also use this entitlement for the same reason — self-imposed digital wellbeing.

### Data handling

> All Family Controls data stays on-device. Latch never transmits the list of apps a user has chosen to shield, the durations they spent in each app, or any other Screen Time-derived raw data. Only derived, anonymous scores (Plan Power, Brain Energy) sync to our servers, and only if the user opts in to cloud sync. Our privacy policy is at https://latch.app/privacy.

### Test plan / how Apple can verify

> Demo account `review_demo_user@latch.app / Lumi-review-2026!` (mirrors the App Review demo credentials in our App Store submission).
>
> Steps to verify:
> 1. Sign in with the demo credentials.
> 2. Complete the Lumi interview (8 questions, ~60 seconds).
> 3. Tap "Permissions" → "Screen Time (Family Controls)" → "Allow access". The system sheet appears.
> 4. After granting, the dashboard shows aggregate usage from Apple's API.
> 5. Tap "Shield" → choose "Deep Lock" → "Activate Shield". The next time the user opens a shielded app, Latch's `ShieldConfiguration` UI appears.
>
> Latch does **not** override or replace Screen Time. Existing user limits, downtime, or App Limits remain in effect.

### Privacy policy URL
https://latch.app/privacy

### Support URL
https://latch.app/support

## After Apple approves

1. Re-open the Identifier in the Developer portal. The "Family Controls (Distribution)" capability should now be enabled (not pending).
2. Regenerate provisioning profiles. EAS handles this automatically on the next `eas build`.
3. Bump your version, build, and submit to TestFlight.

## If Apple rejects

Common reasons and how to respond:

- **"This appears to be a parental controls app."** Reply emphasizing that Latch is single-user, self-imposed, and does not allow remote management of another device.
- **"Provide a clearer description of the user benefit."** Add a one-paragraph user story (e.g. "User wants to stop late-night TikTok scrolling; Latch lets them schedule a Wind Down window that blocks TikTok 10pm–7am").
- **"Provide a demo video."** Record a 30-second screen capture of the flow above and attach as MP4 ≤ 50 MB.

Keep the response under one screen — Apple reviewers reply faster to concise messages.
