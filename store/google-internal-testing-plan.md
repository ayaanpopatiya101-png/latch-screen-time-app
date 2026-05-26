# Google Play internal testing plan

## Phase 0 — Prerequisites

- [ ] Google Play Console account active ($25 one-time)
- [ ] App created with package `com.latch.screentime`
- [ ] Privacy policy URL set in app details
- [ ] Google Play Console Service Account JSON file created and downloaded
  - Play Console → Setup → API access → Create new service account
  - Grant role "Release Manager" or "Service Account User"
- [ ] Save the JSON file as `mobile/play-service-account.json` (already gitignored)
- [ ] `eas.json` `submit.production.android.serviceAccountKeyPath` points at the file above

## Phase 1 — First internal build

```bash
cd mobile
npx expo prebuild --platform android --clean   # first time only, then commit
eas build --platform android --profile production
eas submit --platform android --profile production
```

The submit defaults to the **internal** track per `eas.json`.

Add internal testers (up to 100):

- Play Console → Testing → Internal testing → Testers tab → Create email list
- Internal testers install via the opt-in URL Play provides (looks like `play.google.com/apps/internaltest`)
- They must accept the invite once, then the app appears in their Play Store

## Phase 2 — Closed testing (Beta App Review)

- Promote the internal build to a Closed track called "Latch beta".
- Google runs a review on closed-test builds — typically faster than full review (1–3 days).
- Google will check:
  - Data Safety section matches what the app actually does.
  - Accessibility Service disclosure is complete and accurate.
  - `QUERY_ALL_PACKAGES` use is justified.
  - Privacy policy URL resolves.
- Add release notes per build (~3 bullets, ≤ 500 chars).

## Phase 3 — Open testing (optional public beta)

- Promote a stable closed build to Open testing if you want a public opt-in beta. Listed in Play Store with a "Join the beta" badge.
- Skip if you'd rather go directly to production after closed testing.

## Phase 4 — Production

- Promote a closed/open build to Production.
- Google reviews **every** production submission. Typical: 1–7 days.
- Configure a **staged rollout**: 1% → 5% → 10% → 25% → 50% → 100%.
- Halt the rollout from Play Console if ANRs / crashes spike.

## Tracks summary

| Track | Reviewed by Google? | Audience size | Use it for |
| ----- | ------------------- | ------------- | ---------- |
| Internal | No | ≤ 100 emails | Engineers + advisors, daily builds |
| Closed | Yes (light) | Up to 10,000 | Beta cohort, real-world validation |
| Open | Yes (light) | Public opt-in | Optional broader beta |
| Production | Yes (full) | Everyone in chosen countries | Public launch |

## Common review gotchas (Android)

- **Accessibility Usage policy** — if your Accessibility Service description differs from the in-app disclosure or the privacy policy, Google rejects. Keep all three in sync via `docs/data-safety-notes.md` and `docs/android-native-plan.md`.
- **Foreground service** — on Android 14+ you must declare the specific `FOREGROUND_SERVICE_*` permission. Latch's use case maps to `FOREGROUND_SERVICE_SPECIAL_USE` with a JSON justification in the manifest.
- **`QUERY_ALL_PACKAGES`** — Google will ask for a screenshot of the in-app picker showing why you need it.

## Build-numbering convention

- `versionName`: `0.1.x` until first public release, then semver.
- `versionCode`: auto-incremented by EAS.
- Always reference both in release notes for testers.
