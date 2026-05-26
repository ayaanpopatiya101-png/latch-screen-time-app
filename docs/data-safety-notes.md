# Google Play Data Safety answers

Use this as the source of truth for the Play Console Data Safety form.

## Does your app collect or share any of the required user data types?

Yes.

## Data collected

| Category | Type | Collected? | Shared? | Optional? | Purpose |
| -------- | ---- | ---------- | ------- | --------- | ------- |
| Personal info | Name | Yes | No | Required | App functionality |
| Personal info | Email address | Yes | No | Required | App functionality, account management |
| Personal info | User IDs | Yes | No | Required | App functionality |
| App activity | App interactions | Yes | No | Optional | Analytics (opt-out) |
| App activity | In-app actions | Yes | No | Optional | Analytics (opt-out) |
| App activity | Other user-generated content (mood logs, check-ins) | Yes, if user opts in | No | Optional | App functionality |
| Device or other IDs | Device or other IDs | Yes | No | Required | App functionality (account linking) |
| App info and performance | Crash logs | Yes | No | Optional | App functionality |
| App info and performance | Diagnostics | Yes | No | Optional | App functionality |

## Data NOT collected

- Financial info
- Health and fitness
- Messages
- Photos and videos
- Audio files
- Files and docs
- Calendar
- Contacts
- Web browsing
- Location (approximate or precise)
- Installed apps (Latch reads aggregate usage durations only; it does not enumerate or transmit the list of apps you have installed).

## Security practices

- ✅ Data is encrypted in transit (TLS 1.2+)
- ✅ Users can request that their data be deleted
- ✅ Data deletion URL provided: `https://latch.app/delete-account`
- ✅ Account deletion is also available in-app at Settings → Account → Delete account
- ✅ Latch follows the Play Families Policy and SDK requirements (no ad SDKs; no kids-targeted content)
- ✅ App has been independently security reviewed (note: schedule the review before public launch)

## Permissions justification

| Permission | Justification |
| ---------- | ------------- |
| `PACKAGE_USAGE_STATS` | To compute per-app screen-time durations on-device. Granted by user via Settings.ACTION_USAGE_ACCESS_SETTINGS. |
| `QUERY_ALL_PACKAGES` | To show the user a human-readable list of installed apps when configuring shields. No app-list data is transmitted. |
| `POST_NOTIFICATIONS` | To send Lumi nudges and focus-window reminders. |
| `FOREGROUND_SERVICE` | To keep the AccessibilityService-driven shield active during a focus window. |
| Accessibility Service | To detect when a blocked app comes to the foreground during a shield window and show the Friction or Deep Lock screen. We read only the foreground package name. |

## Special form sections

- **Sensitive permissions (`QUERY_ALL_PACKAGES`)** — required to show a per-app picker. Without it, users cannot pick which apps to shield. Provide the public privacy URL plus a screenshot of the in-app picker as the justification.
- **Accessibility usage policy** — Latch uses Accessibility solely as the OS-provided mechanism for app blocking. Explain in the form: "Latch uses the Accessibility Service only to detect the foreground app's package name during a user-scheduled focus window. It does not read input, screen content, or any user-generated text."

## Demo credentials for review

See `store/google-play-listing.md` (`review_demo_user`).
