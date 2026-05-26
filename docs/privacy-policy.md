# Latch Privacy Policy

_Last updated: 2026-05-26_

Latch is a screen-time coaching app. This policy describes what data we collect, why, where it lives, how long we keep it, and how you can delete it. It is written for users; defensible legal language can be layered on top before public launch, but nothing in this document should be made stricter than what the app actually does.

## Plain-English summary

- Latch is **on-device first**. Your raw per-app usage never leaves your phone.
- We do **not sell** your data and we do **not target ads** with your screen-time or mood data.
- We collect the minimum we need to coach you: account info, derived scores, and check-ins you choose to log.
- You can delete your account and all derived data from inside the app.

## 1. Data we collect

### 1.1 Account data
- **Name** and **email** that you provide at sign-up.
- A locally-generated account id.
- Authentication tokens (encrypted; stored on-device via Expo SecureStore / Keychain / Keystore).

### 1.2 On-device screen-time signals
- **iOS:** With your permission, we read aggregate Screen Time data via Apple's `FamilyControls`, `DeviceActivity`, and `ManagedSettings` frameworks. Apple processes the underlying data; Latch only receives anonymous aggregates and the right to apply shields.
- **Android:** With your permission, we read app usage durations via `UsageStatsManager`. With Accessibility Service consent (required to block apps), we read only the foreground app's package name when a shield is active — never input or screen content.
- All of this stays on your device. We compute Plan Power, Persona, Risk band, and Brain Energy locally.

### 1.3 Optional check-ins and mood logs
- If you log how you feel, those entries stay on-device unless you turn on cloud sync.
- Cloud sync (off by default) stores only your derived scores (Plan Power, Brain Energy, credit balance) — not the raw usage that produced them.

### 1.4 Diagnostics
- Anonymized crash reports and performance metrics, only if you leave diagnostics on.
- No advertising identifiers are read or transmitted.

## 2. Data we never collect

- Contents of any screen you view.
- Keystrokes, voice, microphone, camera input.
- Contact lists or messages.
- Web browsing history or DNS traffic.
- Advertising identifiers (`IDFA`, `AAID`) — Latch sets `ITSAppUsesNonExemptEncryption: false` and does not request tracking.

## 3. How data is used

- To compute your Plan Power, Persona, and Risk band on-device.
- To send Lumi nudges and notifications when you grant notification permission.
- To restore your account and derived state across devices (only if you turn on cloud sync).
- To improve Latch via aggregated, de-identified product analytics if you opt in.

We do **not** use your screen-time or mood data for any form of ad targeting, profiling for advertisers, or sale to third parties.

## 4. Sharing and processors

We share data only with sub-processors needed to run the service. Each is bound by a written DPA.

| Vendor | Purpose | Data shared |
| ------ | ------- | ----------- |
| Apple Push Notification Service | Delivering notifications | APNs token |
| Firebase Cloud Messaging (Android) | Delivering notifications | FCM token |
| Sentry (or equivalent) | Crash reporting (optional) | Anonymous crash payload |
| Supabase / your auth provider | Account auth & cloud sync | Email, hashed password, derived scores |

We never share your raw screen-time signals with anyone.

## 5. Retention

- **Local data:** stays on your device until you sign out, uninstall, or delete your account.
- **Cloud-synced data (if enabled):** retained while your account is active. On account deletion: removed from primary storage immediately, purged from backups within 30 days.
- **Diagnostics:** retained 90 days, then deleted.

## 6. Your rights and controls

- **Delete account** — Settings → Account → Delete account. Local data is wiped immediately; server data within 30 days.
- **Revoke permissions** — at any time from iOS Settings → Screen Time / Privacy → Apps, or Android Settings → Apps → Latch. Latch keeps working in insight-only mode.
- **Export data** — Settings → Account → Export. You receive a JSON archive within 7 days.
- **EU/UK GDPR, California CCPA, and similar regulations:** you have rights of access, rectification, deletion, restriction, portability, and objection. Contact privacy@latch.app to exercise them.

## 7. Children

Latch is intended for users 13+ (16+ in some jurisdictions). We do not knowingly collect data from children under 13. Parents managing a child's device via Family Sharing should refer to Apple/Google parental control documentation.

## 8. Security

- TLS 1.2+ for all network traffic.
- Account credentials hashed (argon2 / bcrypt at the auth provider).
- Tokens in iOS Keychain / Android Keystore via Expo SecureStore.
- Latch never executes arbitrary code from the network; all logic ships in the signed binary.

## 9. Changes

We will notify users in-app at least 14 days before material changes to this policy. The latest version is always available at the URL above and in-app at Settings → Privacy policy.

## 10. Contact

privacy@latch.app
