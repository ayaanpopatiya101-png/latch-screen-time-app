# Latch — Hooked on Real Life

Latch is a screen-time app built around a simple inversion: social
platforms use behavioural psychology to keep you scrolling, so Latch
uses the same playbook in reverse to give you your time back. Every
feature in the repo is mapped to a documented persuasion tactic and a
countermove drawn from clinical and academic research.

The app ships three layers of defense:

1. **Friction at the moment of use** — shields, delays, focus plans,
   and a transition "bridge" between phone-mode and real-life mode.
2. **A behavioural economy** — earn Latch Credits by doing offline
   things, spend them on capped app windows, watch a brain-energy
   meter rise and fall with your choices.
3. **An anti-addiction engine** — a research-backed module that
   targets the ten specific tactics platforms use to hook attention
   (variable rewards, infinite scroll, autoplay, FOMO, notifications,
   re-engagement emails, hidden time awareness, personalized feeds,
   confirmshaming, dopamine-hijacked social signals). See the
   [Anti-Addiction Engine](#anti-addiction-engine) section below.

This repository now contains three parts:

| Folder | What it is | Status |
| --- | --- | --- |
| [`client/`](./client) (+ `server/`, `shared/`) | **Web prototype** — React + Vite + TypeScript. Demonstrates the flow and feel. | ✅ Runs in any browser |
| [`mobile/`](./mobile) | **Expo / React Native mobile prototype** — TypeScript, Expo Router, Lumi interview, dashboard, focus, shield, credits, permissions. | ✅ Runs via `expo start`; native screen-time still mocked |
| [`ios/`](./ios) | **Native iOS scaffold** — SwiftUI starter targeting iOS 16+ with FamilyControls / DeviceActivity / ManagedSettings. Will be folded into the Expo mobile project via Expo Modules during prebuild. | 🛠 Source only — open in Xcode on a Mac to build |

Additional documentation has been added:

- [`docs/`](./docs) — privacy policy, app-privacy notes, data-safety notes, iOS + Android native integration plans, Apple Family Controls entitlement request, real-device test plan, public launch checklist, review-issues template.
- [`store/`](./store) — Apple App Store listing, Google Play listing, TestFlight plan, Google internal testing plan.
- [`.github/workflows/`](./.github/workflows) — Web CI, Mobile CI, manual EAS preview build trigger.

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

## Anti-Addiction Engine

Latch's newest module is a research-backed engine that names the ten
most-documented platform tactics, ships a counter-move for each, and
rolls them into a single personalized plan. It lives in
[`server/antiAddiction.ts`](./server/antiAddiction.ts) and is rendered
in [`client/src/components/AntiAddictionPage.tsx`](./client/src/components/AntiAddictionPage.tsx)
(reachable from the home grid as the **Reset** tile and at
`/anti-addiction`).

The engine is intentionally non-clinical. It surfaces tools and copy
that the research literature already supports — it does not diagnose
or treat anything.

### Tactic ↔ counter-move map

Every feature below is implemented as a zod-validated route, a SQLite
table, and a card on the **Reset** page. The "source" column points to
the primary research the counter-move borrows from.

| # | Platform tactic | Counter-move shipped in Latch | Primary source |
| --- | --- | --- | --- |
| 1 | **Variable rewards** — unpredictable likes / pulls / refreshes condition compulsive checking. | **Batch windows** — user picks two short fixed windows (default 12:00 and 18:00, Scripps recommendation); any check outside the window is flagged and a nudge shows the minutes until the next window. | B.F. Skinner operant conditioning; Anna Lembke, *Dopamine Nation* (Stanford). |
| 2 | **Infinite scroll** — no stopping cue, no "bottom of the page." | **Session clock** — server-stamped per-app elapsed timer with a hard "end the session" CTA every time the user opens the Reset page. | Aza Raskin (inventor of infinite scroll), public mea culpas in *60 Minutes* and *The Social Dilemma*. |
| 3 | **Dopamine-hijacked social connection** — likes and follower counts piggy-back on real social reward circuits. | **Feed audit** — guided unfollow loop. Each unfollow / mute earns Latch Credits via `recordFeedAudit` so the user is rewarded for shrinking the surface area. | Crisis Text Line research on social-comparison harm; Sherry Turkle, *Reclaiming Conversation*. |
| 4 | **Autoplay / rabbit holes** — the next video plays before you can decide. | **Autoplay checklist** — per-platform toggle list (autoplay off, recommendations off, history off, etc.) with a score and a "next step to flip" recommendation. | Tristan Harris / Center for Humane Technology; Adam Alter, *Irresistible*. |
| 5 | **FOMO** — "X people posted while you were away." | **FOMO reframe** — when the user types a fear ("I'll miss the group chat"), the engine returns a reframed sentence built from the FOMO research and stores it for review. | Przybylski et al. 2013 FOMO scale; Catherine Price, *How to Break Up With Your Phone*. |
| 6 | **Notifications** — red badges and pull-to-refresh exploit Zeigarnik. | **Notification audit + batch windows** — copy in the Reset page walks the user through killing badge counts, sounds, and lock-screen previews, then routes them to the batch-window picker. | Bluma Zeigarnik (1927); American Academy of Pediatrics problematic-media-use guidance. |
| 7 | **Hidden time awareness** — apps obscure how long you've been inside. | **Tactic of the day** + **plan composer** — every visit shows the user a different tactic with a 30-second action and an honest "this is how long you spent" line drawn from session-clock data. | Catherine Price; Cal Newport, *Digital Minimalism*. |
| 8 | **Personalization** — the feed gets eerily good at predicting what will keep you. | **Detox plan** — auto-recommends one of five frameworks based on current daily hours: Lembke 30-day dopamine fast (≥6h), Newport 30-day digital declutter, Price 30-day phone breakup, a 7-day primer (≥4h), or a 3-day weekend primer. State machine in `buildAntiAddictionPlan` and `detoxProgress`. | Lembke 2021; Newport 2019; Price 2018. |
| 9 | **Confirmshaming** — "No thanks, I like wasting my time." | **Reflection prompts** — short journaled questions on cravings and triggers; reframes the user's *own* language, not the platform's, and the answers persist in `reflectionLog`. | Lembke's "radical honesty" practice; Themycenaean review of dark patterns. |
| 10 | **Re-engagement emails / push** — "We miss you, come back." | **Bedroom charger pledge** — daily check-in that the phone slept outside the bedroom; awards credits, builds a streak, and pulls re-engagement triggers out of the most vulnerable hours. | AAP sleep / device-in-bedroom guidance; *Reclaiming Conversation*. |

### Reset page

The `/anti-addiction` route (also reachable from the home dashboard as
the **Reset** tile) renders, in order:

- The user's plan summary (current vs goal hours, recommended detox).
- **Tactic of the day** — one of the ten tactic cards, rotated
  deterministically by date so users see them all over ten days.
- **Reflection prompt** — a one-line question with a textarea that
  posts to `/api/reflection`.
- **Detox plan** — start / end controls and a progress bar driven by
  `detoxProgress(plan)`.
- **Batch windows** — clock picker that calls `/api/batch-windows`.
- **Bedroom charger** — daily pledge with streak.
- **Feed audit** — counter for unfollows + mutes, rewards credits.
- **Autoplay checklist** — per-platform toggles.
- **Quick wins** — short, do-now actions composed by the plan engine.
- **Tactic library** — full ten-card reference with sources.
- **Recommended reading** — the five books the engine draws from.

### API

All endpoints validate input with Zod and live in
[`server/routes.ts`](./server/routes.ts).

| Method | Path | Purpose |
| --- | --- | --- |
| `GET`  | `/api/anti-addiction/reference` | Static tactic cards + books for the library page. |
| `GET`  | `/api/anti-addiction/plan/:accountId` | Composed plan (tactic of the day, detox recommendation, quick wins, reflection prompt). |
| `GET`  | `/api/anti-addiction/tactic/:accountId` | Just today's tactic card. |
| `GET`  | `/api/batch-windows` | List the user's check-in windows. |
| `POST` | `/api/batch-windows` | Replace the full window set (typed by `batchWindowSchema`). |
| `GET`  | `/api/reflection` | Recent reflection entries. |
| `POST` | `/api/reflection` | Save one reflection (`reflectionPromptSchema`). |
| `GET`  | `/api/detox-plans` | Active + past detox plans for the account. |
| `POST` | `/api/detox-plans` | Start a detox plan with one of five frameworks. |
| `DELETE` | `/api/detox-plans/:id` | End a detox plan early. |
| `POST` | `/api/feed-audit` | Record N unfollows / mutes, earn credits (`source: "friend"`). |
| `GET`  | `/api/feed-audit` | Recent feed-audit events. |
| `POST` | `/api/bedroom-charger` | Daily pledge; earns credits via `source: "daily_goal"`. |
| `GET`  | `/api/bedroom-charger` | Pledge history + current streak. |
| `GET`  | `/api/autoplay-checklist` | Current toggle state per platform. |
| `POST` | `/api/autoplay-checklist` | Upsert a toggle. |
| `POST` | `/api/fomo-reframe` | Submit a fear, get a reframed sentence back; both stored. |
| `GET`  | `/api/session-clock` | Per-app elapsed minutes for the session clock. |

### Database

Seven new SQLite tables are created on boot in
[`server/storage.ts`](./server/storage.ts):
`batch_windows`, `detox_plans`, `feed_audit_events`,
`bedroom_charger_log`, `autoplay_checklist`, `reflection_log`,
`fomo_reframe_log`. Types are exported from
[`shared/schema.ts`](./shared/schema.ts).

### Tests

```bash
npx tsx script/anti-addiction-test.ts
```

The deterministic test script covers batch-window math, detox-plan
routing by hours, feed-audit credit formula
(`round(2 * sqrt(unfollows) + 0.4)`), autoplay next-step recommendation,
session-clock state, tactic-of-the-day rotation, FOMO reframe message
shape, and full-plan composition. It exits non-zero on any failure.

### Books the engine draws from

All five are surfaced verbatim in the Reset page's "Recommended
reading" card and inform the copy across the module:

- Anna Lembke — *Dopamine Nation* (Stanford School of Medicine).
- Cal Newport — *Digital Minimalism*.
- Catherine Price — *How to Break Up With Your Phone*.
- Adam Alter — *Irresistible*.
- Sherry Turkle — *Reclaiming Conversation*.

### What it does *not* claim

The anti-addiction engine is a behaviour-design layer, not a clinical
tool. It does not diagnose internet/social-media use disorder, does
not replace therapy, and does not promise outcomes — it simply maps
research-validated counter-moves to the tactics they counter and
hands the user a way to act on them.

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
