# Google Play Store listing

Source-of-truth for everything you paste into the Google Play Console. Treat this file as the canonical version.

## App name (30 chars)
Latch — Screen-time coach

## Short description (80 chars)
Lumi coaches you off the scroll with focus windows and a credit-based shield.

## Full description (4000 chars)

Latch is a screen-time coach in your pocket. Your guide is Lumi — an AI coach who runs a short, friendly interview to learn how you use your phone, then builds a plan you can actually stick to.

**Why Latch is different**

Most screen-time apps just show you a chart. Latch acts. Lumi sets focus windows around your day, picks the strength of shield that fits your willpower, and rewards you with credits every time you stay with the plan.

**Conversational onboarding**
- 6–8 plain-English questions about your habits and triggers.
- Plan Power score, persona (Scroll Drifter, Late Night Owl, Doom Pinger…), and risk band.
- A clear "what I'll tune for you" summary before you even hit the dashboard.

**Three shield modes**
- Gentle — a calm nudge when you cross a limit.
- Friction — a 20-second breath before the app opens. Most people stop right here.
- Deep Lock — the app is blocked until your scheduled window ends.

**Focus windows that fit your day**
- Morning Calm, Deep Work, Wind Down.
- Picks the apps you choose. Earns you credits when you complete.

**Earn back your time**
- Credits for completed focus windows, daily check-ins, and staying under your limit.
- Spend credits to unlock a blocked app for 15 minutes — you decide whether it's worth it.

**Privacy-first by design**
- All raw screen-time data stays on your device.
- Latch never sells your data and never targets ads with usage or mood data.
- Delete your account from inside the app in two taps.

**Permissions used**
- Usage access: required to compute time spent in each app. Granted via Settings.
- Accessibility service: required to power the Shield. Latch reads only the foreground app's package name during a focus window — never input, screen contents, or text.
- Notifications: for Lumi's nudges. Optional.

For adults who want fewer late-night scrolls, more focused workdays, and a calmer relationship with their phone — without parental-control gimmicks.

## Graphics

| Asset | Size | Notes |
| ----- | ---- | ----- |
| App icon | 512 × 512 PNG, 32-bit | Cream background, Lumi mark |
| Feature graphic | 1024 × 500 | Lumi avatar + tagline "Lumi keeps you off the scroll" |
| Phone screenshots | 1080 × 1920 minimum, up to 8 | Same scenes as Apple listing |
| 7" tablet screenshots | Optional unless you market to tablets | Skip for v1 |

## Categorization

- Application type: Application
- Category: Health & Fitness (primary), Productivity (secondary)
- Tags: Calm, Focus, Habits

## Content rating

Run the IARC questionnaire. Latch should land at **Everyone / PEGI 3**: no violence, no profanity, no in-app purchases that change rating, no user-to-user content.

## Target audience

Adults 18+, secondarily 16+. Confirm "App designed for both children and older users" = NO (we are not a kids app).

## Permissions justification

| Permission | Justification (paste into Play form) |
| ---------- | ------------------------------------ |
| `PACKAGE_USAGE_STATS` | Computes per-app usage durations on-device. User grants via system Settings. |
| `QUERY_ALL_PACKAGES` | Powers the in-app per-app shield picker — without it the picker can't list installed apps. No app-list data is transmitted. |
| `POST_NOTIFICATIONS` | Lumi's nudges and focus-window reminders. |
| `FOREGROUND_SERVICE` | Keeps the shield active during scheduled focus windows. |
| Accessibility Service | Sole mechanism on Android for app blocking. Reads foreground package name only; `canRetrieveWindowContent="false"`. |

## Data Safety

See `docs/data-safety-notes.md` for the full mapping. The Data Safety section in Play Console must match that document exactly.

## Demo credentials (for App Review)

```
Email: review_demo_user@latch.app
Password: Lumi-review-2026!
```

Preloaded with a completed interview and 200 credits so the reviewer can immediately verify Earn/Spend and Shield activation.

## Test plan for reviewer

1. Open app, sign in with demo credentials.
2. Dashboard renders Plan Power 87, persona "Scroll Drifter".
3. Tap Permissions, grant Usage Access and Accessibility Service.
4. Tap Shield → Deep Lock → Activate Shield.
5. Open a shielded app (Instagram preinstalled). Latch's shield screen appears.
6. Settings → Account → Delete: confirms account deletion in-app.

## Pricing & distribution

- Free with planned subscription. v1 has no in-app purchases — toggle "Contains ads: No, Contains in-app purchases: No".
- Countries: launch in US/UK/CA/AU/NZ. Expand after first 5,000 downloads.
- Devices: phones only for v1; tablets opt-out.

## Release tracks plan

1. **Internal testing** — engineers + advisors (up to 100 testers).
2. **Closed testing** — Latch beta cohort, ~500 testers.
3. **Open testing** — optional public beta, opt-in via play.google.com link.
4. **Production** — phased rollout 1% → 10% → 50% → 100% over 3 days.
