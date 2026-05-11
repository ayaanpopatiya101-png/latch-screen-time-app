# Latch — *Hooked on Real Life.*

Latch uses the same psychology social media uses on you — to give you
back your time. Friction-before-scroll, daily quests, and offline swaps,
all wrapped in a warm, mascot-led UI.

This repository contains two parts:

| Folder | What it is | Status |
| --- | --- | --- |
| [`client/`](./client) (+ `server/`, `shared/`) | **Web prototype** — React + Vite + TypeScript. Demonstrates the flow and feel. | ✅ Runs in any browser |
| [`ios/`](./ios) | **Native iOS scaffold** — SwiftUI starter targeting iOS 16+ with FamilyControls / DeviceActivity / ManagedSettings. | 🛠 Source only — open in Xcode on a Mac to build |

## Web prototype vs native iOS app

The web prototype is fully clickable but **cannot read or block real
screen time** — the browser has no access to Apple's Screen Time
frameworks. It's there to show what Latch feels like and to validate
the UX.

The native iOS app in [`ios/`](./ios) is what eventually ships to the App
Store. It needs:

- An Apple Developer Program membership ($99/yr).
- A Mac with Xcode.
- Apple's Family Controls distribution entitlement (request from Apple).

See [`ios/README.md`](./ios/README.md) for the full setup guide,
required capabilities, and App Store launch checklist.

## Run the web prototype

```bash
npm install
npm run dev
```

Then open the URL printed by Vite.

## Personalization engine

Latch ships a backend personalization engine that turns onboarding
answers and behavior into a per-user plan. The engine lives in
[`server/personalization.ts`](./server/personalization.ts) and is wired
into Express in [`server/routes.ts`](./server/routes.ts).

It takes a typed `profile` (age, current/goal hours, feelings, hardest
time, top apps) and `behavior` (offline actions, shield skips/unlocks,
focus completions, coins, streak, minutes saved today) and returns:

- **Risk score** (0–100) and tier — `low`, `medium`, `high`, `critical`.
- **Persona** — one of `boredom_scroller`, `night_scroller`,
  `social_validation_seeker`, `stress_scroller`, `balanced_user`, with
  copy and a coach line for the UI.
- **Adaptive shields** — per-app `delaySeconds`, `sessionLimitMinutes`,
  `coinCost`, and recommended `mode` (`soft`, `focus`, `hard`).
- **Recommendations** — best-next-action cards with simple copy.
- **Reward tuning** — base coin multiplier, offline-action coin range,
  focus reward, skip bonus range, and a streak shop discount.
- **Nudge schedule** — windows and copy tied to the user's hardest time.
- **Weekly forecast** — current vs goal hours and reclaimed hours per
  week / year.

### API

All endpoints validate input with Zod.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/personalization/plan` | Full plan for a `{ profile, behavior }` payload. |
| `POST` | `/api/personalization/event` | Behavior event in, updated plan + feedback string out. |
| `GET`  | `/api/personalization/demo` | Deterministic demo plan for development. |

Event types: `shield_skip`, `shield_unlock`, `focus_complete`,
`offline_action`, `quest_claim`, `bridge_boost`.

### Frontend integration

The client fetches a plan after onboarding and after every relevant
behavior event using the helpers in
[`client/src/lib/personalization.ts`](./client/src/lib/personalization.ts).
The Home dashboard renders persona, risk tier, weekly forecast, and the
top recommendation. The Shield panel uses the adaptive delay, session
limit, and coin cost. Smart Lumi nudges, swap ordering, focus reward,
skip bonus, and shop discount all read from the plan when available.

If the API is unreachable, `fallbackPlan()` keeps the UI working with
sensible defaults so the prototype never breaks.

### Tests

A deterministic test script validates representative algorithm outputs:

```bash
npx tsx script/personalization-test.ts
```

It covers boredom / night / stress / balanced personas, risk scoring
across hours and behavior, shield adaptation, reward scaling, and the
event endpoint feedback.

### What it does *not* claim

The engine does not diagnose, treat, or replace any clinical care. It
is a behavior-design layer that tunes friction, rewards, and copy to
the user's stated goals.

## App habit pattern engine

Latch also ships a habit pattern engine that learns when and what apps a
user opens over week / month / year windows. The engine lives in
[`server/habitPatterns.ts`](./server/habitPatterns.ts) and is wired into
Express in [`server/routes.ts`](./server/routes.ts).

It groups app-open events into deterministic 3-hour buckets (0–3, 3–6,
6–9, …) and fires a pattern when usage repeats often enough in that
window:

| Period | Threshold (percent of days) | Threshold (absolute days) |
| --- | --- | --- |
| Week (7 days) | 55% | 4 |
| Month (30 days) | 60% | 15 |
| Year (365 days) | — (hard floor) | 120 |

A pattern fires when **either** threshold is met. Output records include
the app name, period, days opened / total days, 3-hour window, a
confidence number, a transparent productive/unproductive verdict, and a
recommended action.

Productivity classification is intentionally simple and rule-based.
Keywords like `education`, `tutorial`, `workout`, `productivity` mark a
session as likely productive; `shorts`, `reels`, `entertainment`,
`gaming` mark it as likely unproductive; everything else stays unknown
and Lumi asks the user via the **Patterns** page (and in a real native
app, a notification). When the user answers "No, block next month,"
Latch creates a 30-day block rule scoped to that exact 3-hour window.

### Pattern API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/app-events` | Record one app open / use event. |
| `POST` | `/api/app-events/bulk` | Bulk import (for demo or native sync). |
| `GET`  | `/api/app-patterns/:accountId?period=week\|month\|year` | Detected patterns + active block rules. |
| `POST` | `/api/app-patterns/review` | Mark a pattern productive or unproductive (creates a next-month block on "unproductive"). |
| `GET`  | `/api/block-rules/:accountId` | List active block rules. |
| `POST` | `/api/app-patterns/demo-seed` | Insert demo events for the current account. |

### Pattern tests

```bash
npx tsx script/habit-patterns-test.ts
```

Covers the YouTube 22/30-days 4–7 PM example, productive content
classification (no block created), unknown content asking the user,
unproductive review creating a 30-day block rule, and the week / month /
year thresholds.

### Real-device events

The web prototype cannot observe real iPhone or Android app opens. See
[`ios/README.md`](./ios/README.md) for the contract a real device should
use to forward `DeviceActivity` (iOS) or `UsageStatsManager` (Android)
events to `POST /api/app-events` / `POST /api/app-events/bulk`. Block
rules live on the server; the native app is responsible for actually
enforcing them via `ManagedSettings` (iOS) or an Accessibility / Usage
Access service (Android).

## Demo accounts and saved profiles

The web prototype gates onboarding behind a tiny account system so a
returning user can see their plan, coins, and streak again.

- **Storage** — accounts and profile/progress live in the existing
  SQLite database (`data.db`) via Drizzle. Array fields (feelings, top
  apps, completed actions) are stored as JSON text.
- **Passwords** — hashed with Node's `crypto.scryptSync` plus a random
  16-byte salt per account. Plaintext is never stored. Hash and salt
  are stripped from every API response.
- **Sessions** — there are no cookies, no `localStorage`, no
  `sessionStorage`, and no `IndexedDB`. The active session is React
  state. Refreshing the page returns you to the account gate; that's
  intentional for the demo.
- **Logout** — the **Log out** button in the app header clears
  in-memory state and returns you to the account gate.

### Auth API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Create an account. Returns the safe user/profile (no hash, no salt). |
| `POST` | `/api/auth/login` | Verify credentials. Returns the safe user/profile. |
| `POST` | `/api/auth/logout` | Returns `{ ok: true }`. |
| `GET`  | `/api/accounts/:id/profile` | Read the saved profile for an account. |
| `PATCH`| `/api/accounts/:id/profile` | Save profile/progress fields (onboarding flag, coins, streak, completed actions, etc). |

Errors are surfaced clearly: `409` on duplicate signup, `401` on bad
login, `400` on validation failures, `404` on unknown account ids.

### Auth tests

A deterministic test script covers signup, duplicate signup, bad
password, and profile save/load:

```bash
npx tsx script/auth-test.ts
```

It writes to a temp database (`LATCH_DB_PATH`) so it never touches
your dev `data.db`.

### Security limitations (demo only)

- Without cookies/localStorage there is no persistent client session,
  so refreshing the tab signs the user out.
- The API does not yet validate the caller's identity against
  `:id`. In production you'd want a real session token, CSRF
  protection, and authorization checks on the profile routes.
- Password hashing uses scrypt with sensible defaults; a production
  app should also rate-limit login attempts and pin the scrypt cost
  parameters explicitly.
- The local SQLite file holds plaintext profile data. Don't commit
  `data.db` and don't ship the demo as a production auth system.

## Engagement loops (new)

Latch now layers in the best ideas from BePresent, Opal, and Unrot.
None of these add new permissions to the web demo — they're modeled in
the backend so the iOS build can connect them to Apple's ScreenTime
APIs later.

### Earn & Unlock (Unrot-inspired)

A separate currency from the existing coin economy:

- **Latch Credits** are earned by completing offline actions (walk,
  breathing, journal, workout, gratitude, homework block, reading,
  texting a real friend).
- **Spend** credits to unlock short, capped app windows at a fixed
  rate of 2 credits per minute. The unlocked time is banked on the
  profile (`unlockMinutes`), and the iOS build will close the app when
  the timer runs out.
- **Brain energy** (0–100) reacts to the loop: offline actions charge
  Lumi, spending on screen time drains a little. Visualized as a
  meter on Home and on the Earn page.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/credits/earn` | `{ accountId, source, amount, note? }` — adds credits and ledger entry. |
| `POST` | `/api/credits/spend` | `{ accountId, minutes, appName?, note? }` — deducts at 2 credits/min, banks unlock minutes. |
| `GET`  | `/api/credits/ledger/:accountId` | Recent earn/spend entries (default 30). |

### Focus Plans (Opal-inspired)

Schedule recurring focus windows with a difficulty level:

- **Gentle** — soft block + quick pause, easy to bypass.
- **Friction** — adds delays and a mini quiz; bypass costs credits.
- **Deep Lock** — hardcore, no bypass until the window ends.

Plans also store break policy (`none`, `five_min`, `pomodoro`), the
list of blocked apps, day-of-week mask, and emergency pass count.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET`    | `/api/focus-plans/:accountId` | List a user's plans. |
| `POST`   | `/api/focus-plans` | Create a plan. |
| `PATCH`  | `/api/focus-plans/:id/toggle` | Enable / pause. |
| `DELETE` | `/api/focus-plans/:id` | Remove. |

### Daily goals, doomscroll nudges, reports (BePresent-inspired)

- **Daily goal** — `dailyGoalMinutes` (default 120). One check-in per
  day moves the streak up if the user stayed under, and grants 10
  credits + 20 weekly points.
- **Hourly doomscroll nudges** — opt-in via `doomscrollNudges` flag.
- **Daily / weekly report** — aggregates ledger entries to show
  earned/spent today, earned this week, offline actions, and an
  estimated minutes-saved number.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/daily-goal/check-in` | `{ accountId, minutesUsed }` — bumps streak + credits if under goal. |
| `GET`  | `/api/daily-report/:accountId` | Combined account + report payload. |

### Accountability buddies

Simulated weekly leaderboard with seeded buddies. The mobile build
swaps the seed for real room IDs and push.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET`  | `/api/accountability/:accountId` | Lists buddies; seeds 3 defaults on first call. |
| `POST` | `/api/accountability/challenge` | Invite a buddy by name + challenge title. |

### Tests

```bash
npx tsx script/credits-test.ts
```

Covers credit earn/spend math, the focus-plan CRUD round trip, buddy
seeding, and ledger ordering. Uses a disposable database via
`LATCH_DB_PATH`.
