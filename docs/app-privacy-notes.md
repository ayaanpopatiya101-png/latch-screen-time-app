# Apple App Privacy answers

This document maps Latch's data flows to the App Store Connect "App Privacy" form. Use it as your source-of-truth when filling Apple's questionnaire so the answers stay consistent across releases.

## Data linked to user

| Data type | Collected? | Purpose | Linked to identity? | Used for tracking? |
| --------- | ---------- | ------- | ------------------- | ------------------ |
| Name | Yes | App functionality | Yes | No |
| Email Address | Yes | App functionality, customer support | Yes | No |
| User ID | Yes (locally generated) | App functionality | Yes | No |

## Data not linked to user

| Data type | Collected? | Purpose | Notes |
| --------- | ---------- | ------- | ----- |
| Usage Data (Product Interaction) | Yes, only with consent | Analytics, App functionality | Aggregate only; raw per-app screen-time data does NOT leave device |
| Crash Data | Yes, only with consent | App functionality | Sentry / equivalent; opt-out in Settings |
| Performance Data | Yes, only with consent | App functionality | Opt-out in Settings |

## Data not collected

- Health & Fitness
- Financial Info
- Location (precise or coarse)
- Sensitive Info (race, religion, sexual orientation, etc.)
- Contacts
- User Content (photos, audio, customer support messages)
- Browsing History
- Search History
- Identifiers > Advertising data
- Purchases
- Contact Info > Phone Number, Physical Address
- Diagnostics > Other Diagnostic Data beyond crash + performance

## Tracking

Latch does **not** track users across apps and websites owned by other companies. We do not call `ATTrackingManager.requestTrackingAuthorization` because no SDK we ship reads the IDFA.

## Data deletion

Yes — accounts and all derived data can be deleted in-app from Settings → Account → Delete account. Provide the deletion URL on the App Store Connect "Account Deletion" field: `https://latch.app/delete-account`.

## Privacy policy URL

`https://latch.app/privacy` (host the contents of `docs/privacy-policy.md` here before submission)

## Notes for review

- Latch requires the **Family Controls entitlement** (`com.apple.developer.family-controls`). Apply via the Apple Developer "Account → Profiles, Identifiers & Certificates → Identifiers → App IDs → your bundle → Family Controls" — see `docs/apple-family-controls-entitlement-request.md`.
- All Screen Time data is processed via Apple's APIs on device; Latch never logs the underlying selection of apps a user has chosen to block.
- Demo account for App Review: see `store/apple-listing.md` (`review_demo_user`).
