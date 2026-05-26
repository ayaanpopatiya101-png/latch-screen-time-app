# Real-device test plan

Run this once before TestFlight and again before public launch. Each row is a pass/fail you record in your QA tracker.

## Test devices (recommended minimum)

- iPhone: one device on the current iOS (e.g. iOS 18) and one on the previous major (iOS 17).
- Android: one device on Android 14 from a "stock" maker (Pixel) and one from an aggressive OEM (Samsung or Xiaomi — they kill background services more eagerly).

## A. Account and onboarding

| # | Scenario | Expected | Pass/Fail |
| - | -------- | -------- | --------- |
| A1 | Fresh install, walks through signup | Account created locally, redirected to interview | |
| A2 | Force-quit during interview, relaunch | Returns to next un-answered question; no lost answers | |
| A3 | Completes 8 questions | Plan power, persona, risk band shown; +50 credits granted | |
| A4 | Sign out, sign back in with same email | State restored from local storage | |

## B. Permissions

| # | Scenario | Expected | Pass/Fail |
| - | -------- | -------- | --------- |
| B1 | (iOS) Tap "Allow Family Controls" | Apple system sheet appears; on accept, status flips to Granted | |
| B2 | (iOS) Deny Family Controls | Status flips to Denied; Shield "Deep Lock" card shows native-required warning | |
| B3 | (Android) Tap "Allow Usage Access" | OS routes to Usage Access settings page | |
| B4 | (Android) Tap "Allow Accessibility" | OS routes to Accessibility settings; service can be toggled on | |
| B5 | (Both) Revoke permission in OS Settings, relaunch app | Status reflects the revocation; insights degrade gracefully | |

## C. Dashboard and insights

| # | Scenario | Expected | Pass/Fail |
| - | -------- | -------- | --------- |
| C1 | Plan Power meter renders | Value 0–100 with persona and risk band | |
| C2 | Brain energy card renders | Value 15–95; copy explains it | |
| C3 | Credit card shows balance | Matches sum of credit events | |

## D. Focus windows

| # | Scenario | Expected | Pass/Fail |
| - | -------- | -------- | --------- |
| D1 | Start a Gentle window | Status flips to Active; Lumi nudge fires on shielded app open | |
| D2 | Start a Deep window | Selected apps are blocked at OS level for the duration | |
| D3 | Window ends naturally | Shield clears automatically; +reward credits granted | |
| D4 | Stop a window early | Shield clears; no reward; not penalized | |
| D5 | Phone reboots mid-window | Window resumes after boot (iOS native DeviceActivity, Android via BOOT_COMPLETED receiver) | |

## E. Shield modes

| # | Scenario | Expected | Pass/Fail |
| - | -------- | -------- | --------- |
| E1 | Gentle: open a shielded app during window | Notification appears; app stays open | |
| E2 | Friction: open a shielded app during window | Latch Friction screen appears with 20-sec timer | |
| E3 | Friction: tap "Skip anyway" | -10 credits; app opens | |
| E4 | Deep Lock: open a shielded app during window | Latch shield blocks until window ends | |

## F. Credits engine

| # | Scenario | Expected | Pass/Fail |
| - | -------- | -------- | --------- |
| F1 | Complete a focus window | +reward credits, event in ledger | |
| F2 | Daily check-in | +5 credits once per day | |
| F3 | Unlock blocked app 15 min | -25 credits; spend blocked if insufficient balance | |
| F4 | Pause Shield 10 min | -50 credits | |
| F5 | Ledger shows last 8 events | Events ordered newest-first, sign-coloured | |

## G. Notifications

| # | Scenario | Expected | Pass/Fail |
| - | -------- | -------- | --------- |
| G1 | Notification permission denied | No crashes; coaching cards still appear in-app | |
| G2 | Focus window scheduled, app backgrounded | Window-start notification fires at the right time | |
| G3 | Window completes while backgrounded | Completion notification fires | |

## H. Offline behavior

| # | Scenario | Expected | Pass/Fail |
| - | -------- | -------- | --------- |
| H1 | Airplane mode, app launch | App opens; all local state visible; no spinner forever | |
| H2 | Airplane mode, complete focus window | Credits earned locally; sync queue (if cloud enabled) flushes when back online | |

## I. Account deletion

| # | Scenario | Expected | Pass/Fail |
| - | -------- | -------- | --------- |
| I1 | Settings → Account → Delete | Confirmation modal; on confirm, local data wiped; redirected to login | |
| I2 | Sign back in (if cloud sync was on) | Server returns "account not found"; user sees "your account has been deleted" copy | |

## J. Accessibility (a11y)

| # | Scenario | Expected | Pass/Fail |
| - | -------- | -------- | --------- |
| J1 | VoiceOver / TalkBack on, navigate dashboard | All cards have readable labels | |
| J2 | Large text scale (140%) | Layouts don't clip; no horizontal scroll | |
| J3 | Reduce motion ON | Lumi avatar still readable without bounce animations | |

## What to do if a test fails

- File against `docs/review-issues-template.md`.
- If it blocks TestFlight: fix before resubmitting.
- If it's a polish issue: ship with a known-issues note in the build's release notes and queue the fix for the next sprint.
