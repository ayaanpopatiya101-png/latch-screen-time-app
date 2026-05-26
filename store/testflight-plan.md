# TestFlight plan

## Phase 0 — Prerequisites

- [ ] Apple Developer account active
- [ ] `com.latch.screentime` bundle id created
- [ ] Family Controls entitlement granted (see `docs/apple-family-controls-entitlement-request.md`)
- [ ] App Store Connect record created with name "Latch — Screen-time coaching"
- [ ] `mobile/eas.json` `submit.production.ios` filled with Apple ID, ASC App ID, Team ID
- [ ] At least one real iPhone available for verification

## Phase 1 — First TestFlight build (internal only)

```bash
cd mobile
npx expo prebuild --platform ios --clean    # only first time, then commit
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

While the build processes (10–25 min):

- Add internal testers (up to 100): App Store Connect → TestFlight → Internal Testing → "+"
- Internal testers can install instantly once the build appears (no Apple Review).

Verify with the internal cohort:

- Lumi interview end-to-end
- Permissions grant flow
- At least one focus window (Gentle and Deep Lock)
- Account deletion

If a critical bug surfaces, fix and rebuild with `auto-increment` doing its job (`eas.json` already has it).

## Phase 2 — External beta (TestFlight Beta App Review)

- Create an External Group called "Latch beta" with up to 10,000 testers.
- Add a build to the group — Apple runs a **Beta App Review** (lighter than full App Review, usually 1–2 days).
- Apple **will** check:
  - The Family Controls entitlement matches what you applied for.
  - Permission strings in `Info.plist` are clear and accurate.
  - The privacy policy URL resolves.
  - Demo credentials work.
- Beta release notes per build — write them in plain English (~3 bullets per build):
  - "Lumi now asks 8 questions instead of 5"
  - "Deep Lock no longer fires when phone is locked"
  - "Fixed crash on Android 14 — wait, wrong platform"

Once approved, external testers receive a TestFlight email and can install.

## Phase 3 — Collect feedback

- TestFlight's built-in "Send Beta Feedback" — review weekly.
- A dedicated `support@latch.app` inbox.
- Optional: a Discord or Slack for power testers.

Track every reported issue in `docs/review-issues-template.md` (the same template works for beta feedback).

## Phase 4 — Stabilize for App Review

When crash-free rate ≥ 99% across the last 7 days of TestFlight builds and feedback queue is at 0 P0/P1 bugs:

- Run the full `docs/real-device-test-plan.md` on at least two physical iPhones (current iOS and previous major).
- Run accessibility checks (VoiceOver, large text, reduce motion).
- Promote the candidate TestFlight build to "Submit for App Review" with the metadata from `store/apple-listing.md`.

## Phase 5 — App Review

- Typical turnaround: 24–48 hours.
- If approved: choose **Manual release** (don't auto-release) so you can coordinate a launch window.
- If rejected: log in `docs/review-issues-template.md`, fix, resubmit.

## Phase 6 — Production rollout

- Use Apple's **phased release** option: 1% → 2% → 5% → 10% → 20% → 50% → 100% over 7 days.
- Pause the rollout if crash rate > 1.5% on the previous-day cohort.
- Keep the prior TestFlight build available to promote in case of emergency rollback.

## Build-numbering convention

- Marketing version: `0.1.x` until first public release, then semver from `1.0.0`.
- Build number: handled automatically by EAS `autoIncrement: true` in `eas.json`.
- Always include the build number in TestFlight release notes so testers can tell us what they're running.
