# Latch -- 8-Figure App Roadmap

> **Version:** 1.0.0  
> **Last Updated:** July 2026  
> **Goal:** Transform Latch from prototype to a 7-8 figure revenue app ($10M-$100M ARR)

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [The Path to 8 Figures](#2-the-path-to-8-figures)
3. [Monetization Strategy](#3-monetization-strategy)
4. [Viral Growth Loops](#4-viral-growth-loops)
5. [Retention & Engagement](#5-retention--engagement)
6. [App Store Launch Checklist](#6-app-store-launch-checklist)
7. [Technical Improvements](#7-technical-improvements)
8. [Competitive Positioning](#8-competitive-positioning)
9. [90-Day Launch Sprint](#9-90-day-launch-sprint)
10. [Success Metrics](#10-success-metrics)

---

## 1. Current State Assessment

### What's Working Exceptionally Well

| Component | Quality | Notes |
|-----------|---------|-------|
| **Concept/Positioning** | A+ | "Fight fire with fire" -- using behavioral psychology against platforms is a powerful, differentiated narrative |
| **Personalization Engine** | A+ | Risk scoring, persona inference, adaptive shields, nudge scheduling -- this is clinically sophisticated |
| **Anti-Addiction Engine** | A+ | 10 tactic-countermove pairs backed by 5 published books; the Reset page is a genuine product moat |
| **Habit Pattern Detection** | A | 3-hour bucket analysis with auto-block rules -- genuinely useful |
| **Backend Architecture** | B+ | Zod validation, Drizzle ORM, SQLite, clean route structure |
| **Web Prototype** | B+ | Fully clickable, demonstrates the flow well |
| **Mobile Prototype** | C+ | Expo scaffold with tabs but thin on features vs web |
| **Native iOS** | D+ | SwiftUI scaffold exists but not integrated with mobile layer |
| **Monetization** | F | No revenue model defined -- this is the biggest blocker to 8 figures |
| **Auth/Security** | C | Scrypt hashing is good but no persistent sessions is a UX problem |

### Critical Gap: The Mobile <> Native iOS Divide

The app has **three separate codebases** that don't talk to each other:

```
Web Prototype (React/Vite)     --> Full features, but can't access Screen Time APIs
Mobile Prototype (Expo/RN)     --> Can access native APIs, but thin on features
Native iOS (SwiftUI)           --> Can use FamilyControls, but separate from Expo
```

**The #1 technical priority** is collapsing this into a single production app. The recommended path:

```
Expo Mobile App
  + Expo Modules API --> bridges to Swift native modules
  + FamilyControls / DeviceActivity / ManagedSettings
  + All web features ported to React Native
  = ONE app that ships to App Store
```

---

## 2. The Path to 8 Figures

### Market Math

To hit $10M+ ARR in the screen-time category, you need:

| Metric | Conservative | Target | Aggressive |
|--------|-------------|--------|------------|
| Monthly Price | $7.99 | $9.99 | $12.99 |
| Paying Users Needed | 104K | 83K | 64K |
| Free-to-Paid Conversion | 3% | 5% | 8% |
| Total Downloads Needed | 3.5M | 1.7M | 800K |
| Monthly Downloads | 100K | 200K | 400K |

**Reference points:**
- Opal: ~$15M ARR (estimated), 4M+ downloads
- BePresent: ~$3M ARR (estimated), 1M+ downloads
- One Sec: ~$5M ARR (estimated), 2M+ downloads

### Why Latch Can Outpace Them

1. **Better personalization** -- Opal has static rules; Latch has adaptive personas
2. **Research-backed credibility** -- The anti-addiction engine cites 5 published books
3. **Dual economy** -- Earn credits offline + spend on screen time is more engaging than simple blocking
4. **Lumi character** -- Anthropomorphized coach creates emotional attachment
5. **Pattern detection** -- No competitor auto-detects habit patterns and creates block rules

---

## 3. Monetization Strategy

### Freemium Tier Structure

```
FREE (forever)
--
- Daily screen time tracker
- Basic shield (1 app, fixed delay)
- Daily goal + streak
- 1 focus plan
- Lumi basic coaching
- Weekly report

LATCH PRO ($9.99/mo or $59.99/yr -- 50% savings)
--
- Everything in Free
- Unlimited adaptive shields (personalized per app)
- Anti-addiction Reset page (full 10 tactics)
- Habit pattern detection + auto-blocks
- Focus plans (unlimited, all difficulty levels)
- Latch Credits economy (earn offline, spend on app time)
- Accountability buddies
- Advanced personalization engine
- Export data
- Family sharing (up to 5 members)

LATCH FAMILY ($14.99/mo or $99.99/yr)
--
- Everything in Pro
- Parent dashboard (monitor kids' screen time)
- Shared family goals
- Individual profiles for each family member
- Emergency override for parents
- Weekly family report
```

### Revenue Projections (Year 1-3)

| Year | Free Users | Pro Subs | Family Subs | MRR | ARR |
|------|-----------|----------|-------------|-----|-----|
| 1 | 500K | 15K | 2K | $180K | $2.2M |
| 2 | 2M | 55K | 8K | $670K | $8.0M |
| 3 | 5M | 120K | 20K | $1.5M | $18M |

### Additional Revenue Streams

1. **Latch Credits IAP** -- Users can buy credit packs ($0.99, $4.99, $9.99) for instant unlocks
2. **Corporate Wellness** -- B2B licenses at $5/employee/month (employers pay for productivity)
3. **Affiliate Revenue** -- Recommend books, courses, and wellness products through the app
4. **Data Insights (anonymized)** -- Sell aggregated screen-time trend reports to researchers

---

## 4. Viral Growth Loops

### Loop 1: Accountability Buddy Network Effect

```
User invites friend --> Both see each other's progress
--> Competitive/social pressure to reduce screen time
--> Friend invites another friend
--> Viral coefficient > 1.2
```

**Improvements needed:**
- Real-time progress sharing (not just seeded mock data)
- Weekly challenges between buddies
- "Streak together" -- both must check in to maintain streak
- Push notifications when buddy surpasses you

### Loop 2: Shareable Wins

```
User hits goal --> "I saved 4 hours this week" shareable card
--> Posted to Instagram/TikTok/Twitter
--> Friends see it --> Curiosity download
```

**Improvements needed:**
- Beautiful shareable cards (designed for social media)
- Auto-generated "week in review" stories
- "Before/After" screen time comparisons
- Branded hashtag: #LatchLife

### Loop 3: Family Plan Invites

```
Parent subscribes to Family --> Invites kids
--> Kids use app --> Kids invite their friends
--> Friends' parents see value --> New Family subscriptions
```

### Loop 4: Content Marketing Engine

The anti-addiction engine is a **content goldmine**:

- Each tactic card = 1 blog post + 1 TikTok video + 1 Instagram carousel
- Weekly "Tactic Tuesday" social series
- Monthly research digest
- Lumi as a character brand (merch potential)

**Target:** 100K TikTok followers in 6 months drives 50K+ downloads.

---

## 5. Retention & Engagement

### The Retention Problem in Screen-Time Apps

Most screen-time apps have terrible retention:
- Day-1: 40%
- Day-7: 15%
- Day-30: 5%

**Why?** Users install when motivated, forget about the app, and it becomes background noise.

### Latch's Retention Mechanics (What's Already Good)

| Feature | Retention Impact |
|---------|-----------------|
| Streak system | High -- loss aversion drives daily opens |
| Latch Credits | High -- gamification creates daily engagement |
| Lumi coaching | Medium -- character attachment builds habit |
| Daily goal check-in | High -- daily active trigger |
| Weekly report | Medium -- weekly re-engagement |
| Tactic of the day | Medium -- novelty drives daily opens |

### Retention Improvements Needed

**1. Smart Push Notifications (not annoying)**

```
Good: "You're 10 min under your goal today. One more hour and your streak lives!"
Bad: "Open Latch now"

Good: "Lumi noticed you usually open Instagram at 9 PM. Want to start a focus plan?"
Bad: "You have a notification"
```

**2. Streak Recovery ( monetization opportunity)**

When a user breaks their streak:
- Free: Start over at 0
- Pro: "Use a Streak Freeze" (1 free per month, more via IAP)
- This is a proven revenue driver (Duolingo makes $100M+/year from streaks)

**3. Seasonal Events**

- January: "Digital Detox Month" -- 30-day challenge
- Summer: "Summer Offline Challenge"
- Back to School: "Focus Mode for Students"
- Each event = limited-time badges + bonus credits + social sharing

**4. Lumi Evolution**

Lumi should "grow" as the user engages:
- Level 1: Basic text responses
- Level 5: Animated avatar reacts to wins
- Level 10: Lumi sends encouraging voice messages
- Level 20: Lumi predicts when you'll slip and pre-empts

**5. Community Features**

- Public leaderboards (opt-in, anonymous)
- "Latch Circles" -- small groups with shared goals
- Success stories feed
- Expert AMAs (behavioral psychologists)

---

## 6. App Store Launch Checklist

### Pre-Launch (Month -2)

- [ ] Collapse web/mobile/iOS into single Expo app with native modules
- [ ] Integrate Apple FamilyControls (request entitlement from Apple)
- [ ] Implement subscription tiers with RevenueCat
- [ ] Add push notifications (Expo Notifications)
- [ ] Create app icon (1024x1024, no transparency)
- [ ] Design 10+ screenshots per device size
- [ ] Write App Store description (see store/apple-listing.md -- good start)
- [ ] Create preview video (30 seconds)
- [ ] Set up Privacy Policy URL (docs/privacy-policy.md exists)
- [ ] Complete App Store privacy questionnaire
- [ ] Age rating: 4+ (no objectionable content)

### Soft Launch (Month -1)

- [ ] TestFlight internal testing (20+ testers)
- [ ] TestFlight external testing (100+ testers)
- [ ] Crash testing on iPhone 12, 14, 15, 16, SE
- [ ] Battery impact testing (screen-time monitoring can drain)
- [ ] Screen Time API accuracy validation
- [ ] Family Controls flow testing
- [ ] Subscription purchase flow testing (sandbox)
- [ ] Accessibility audit (VoiceOver, Dynamic Type)

### Launch Week

- [ ] Submit to App Store (allow 48-hour review)
- [ ] Submit to Product Hunt
- [ ] Post launch video on TikTok/Instagram Reels
- [ ] Email beta testers to rate on App Store
- [ ] Monitor crash reports hourly
- [ ] Respond to every App Store review within 2 hours

### Launch Month

- [ ] Run Apple Search Ads ($500/day budget)
- [ ] Run TikTok Spark Ads with influencer partnerships
- [ ] Publish 3 blog posts about digital wellness
- [ ] Pitch to tech journalists (TechCrunch, The Verge, etc.)
- [ ] Submit for Apple "App of the Day" consideration

---

## 7. Technical Improvements

### Priority 1: Single Production Codebase

**Problem:** Three separate codebases (web, Expo, SwiftUI) with no shared logic.

**Solution:**
```
Recommended Architecture:

mobile/                    # Expo + React Native (single source of truth)
  app/                     # Screens (port all web features here)
  components/              # Shared React Native components
  hooks/                   # Shared logic (personalization, credits, etc.)
  native-modules/          # Expo Modules for ScreenTime APIs
    ios/
      FamilyControlsModule.swift
      DeviceActivityModule.swift
      ManagedSettingsModule.swift
  store/                   # State management (Zustand)
  lib/                     # API client, utilities
  assets/                  # Images, fonts, sounds

server/                    # Node.js backend (keep, scale up)
  routes.ts
  personalization.ts
  antiAddiction.ts
  habitPatterns.ts
  storage.ts

shared/                    # Shared types & schemas
  schema.ts
```

**Why not pure SwiftUI?** Expo lets you ship iOS and Android from one codebase. The native Screen Time modules can be bridged via Expo Modules API. This is what Opal and One Sec do.

### Priority 2: Persistent Auth + Real User Sessions

**Problem:** No persistent client session (refreshing signs you out). This is a dealbreaker for a production app.

**Solution:**
```typescript
// Use JWT tokens stored in Keychain (iOS) / Keystore (Android)
import * as SecureStore from 'expo-secure-store';

// On login:
await SecureStore.setItemAsync('auth_token', jwtToken);

// On app launch:
const token = await SecureStore.getItemAsync('auth_token');
if (token) {
  // Validate token, restore session
  restoreSession(token);
}
```

### Priority 3: Real-Time Screen Time Data

**Problem:** Web app can't read real screen time. Mobile app is mocked.

**Solution:**
```swift
// iOS Native Module (Expo Modules API)
import FamilyControls
import DeviceActivity
import ManagedSettings

public class ScreenTimeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ScreenTime")
    
    AsyncFunction("requestAuthorization") { () async throws -> Bool in
      let center = AuthorizationCenter.shared
      try await center.requestAuthorization(for: .individual)
      return true
    }
    
    AsyncFunction("getScreenTime") { () async -> [String: Double] in
      // Query DeviceActivity for per-app usage
      // Return app name -> minutes today
    }
    
    AsyncFunction("blockApps") { (bundleIds: [String], durationMinutes: Int) in
      // Use ManagedSettings to block apps
      let store = ManagedSettingsStore()
      store.shield.applications = bundleIds
    }
  }
}
```

### Priority 4: RevenueCat for Subscriptions

**Why RevenueCat?**
- Handles Apple/Google receipt validation
- Built-in subscription lifecycle management
- Analytics on free trials, churn, LTV
- Paywall A/B testing

```typescript
import Purchases from 'react-native-purchases';

// Initialize
Purchases.configure({ apiKey: 'YOUR_REVENUECAT_API_KEY' });

// Check subscription status
const customerInfo = await Purchases.getCustomerInfo();
const isPro = customerInfo.entitlements.active['pro'] !== undefined;

// Show paywall
await Purchases.presentPaywallIfNeeded({ requiredEntitlementIdentifier: 'pro' });
```

### Priority 5: Analytics Stack

**Required events to track:**
```typescript
// User lifecycle
- app_install
- onboarding_complete
- trial_started
- subscription_converted
- subscription_cancelled
- subscription_renewed

// Engagement
- shield_triggered
- focus_plan_completed
- offline_action_logged
- credit_earned
- credit_spent
- daily_goal_checked_in
- streak_maintained | streak_broken
- tactic_of_day_viewed

// Revenue
- paywall_viewed
- paywall_dismissed
- purchase_initiated
- purchase_completed
- purchase_failed
- refund_requested
```

**Recommended tools:**
- PostHog (product analytics, open source)
- RevenueCat (subscription analytics)
- Sentry (crash reporting)

### Priority 6: Backend Scaling

**Current:** SQLite on a single server.
**Year 1 target:** 100K+ users.

**Migration path:**
```
Phase 1 (now): SQLite + Drizzle (good for <10K users)
Phase 2 (Month 6): PostgreSQL + Drizzle (10K-500K users)
Phase 3 (Year 2): PostgreSQL + read replicas (500K-2M users)
Phase 4 (Year 3): Consider PlanetScale or Supabase (2M+ users)
```

**Immediate backend improvements:**
- Add rate limiting (Express rate-limit)
- Add request logging (Morgan + structured logs)
- Add health check endpoint
- Dockerize for deployment
- Set up CI/CD (GitHub Actions -> Fly.io or Railway)

---

## 8. Competitive Positioning

### Competitor Comparison

| Feature | Latch | Opal | BePresent | One Sec |
|---------|-------|------|-----------|---------|
| App blocking | Planned | Yes | Yes | Yes |
| Focus sessions | Yes | Yes | Yes | No |
| Personalization engine | **Best** | Basic | None | None |
| Habit pattern detection | **Unique** | No | No | No |
| Anti-addiction education | **Best** | No | Basic | No |
| Credits/gamification | **Unique** | No | Points | No |
| AI coach (Lumi) | **Unique** | No | No | No |
| Social accountability | Yes | No | **Best** | No |
| Family sharing | Planned | Yes | No | No |
| Research backing | **Best** | No | No | No |

### Positioning Statement

> "Opal blocks apps. Latch rewires your relationship with them."

**Key differentiators to emphasize:**
1. **Clinically-informed** -- not just a blocker, but a behavioral intervention
2. **Adaptive** -- learns your patterns and personalizes friction
3. **Educational** -- teaches you WHY you're addicted, not just stopping you
4. **Rewarding** -- earn credits for offline life, not just punishment for screen time

### Pricing Comparison

| App | Monthly | Annual |
|-----|---------|--------|
| Opal | $9.99 | $59.99 |
| BePresent | $5.99 | $35.99 |
| One Sec | $4.99 | $29.99 |
| **Latch Pro** | **$9.99** | **$59.99** |
| **Latch Family** | **$14.99** | **$99.99** |

Latch is priced at market rate. The research backing and personalization justify premium pricing.

---

## 9. 90-Day Launch Sprint

### Month 1: Foundation

| Week | Tasks |
|------|-------|
| 1 | Port all web screens to React Native; set up Expo with native modules scaffold |
| 2 | Integrate Screen Time APIs (FamilyControls, DeviceActivity); test on real device |
| 3 | Implement RevenueCat subscriptions; build paywall screens; test purchase flow |
| 4 | Add persistent auth (SecureStore + JWT); polish onboarding flow |

### Month 2: Polish

| Week | Tasks |
|------|-------|
| 5 | Add push notifications; Lumi daily coaching messages; streak reminders |
| 6 | Build shareable win cards; social sharing integration; viral referral flow |
| 7 | Add analytics (PostHog); crash reporting (Sentry); performance optimization |
| 8 | TestFlight internal testing; bug fixes; accessibility audit |

### Month 3: Launch

| Week | Tasks |
|------|-------|
| 9 | TestFlight external testing (100 users); gather feedback; iterate |
| 10 | Create App Store assets (screenshots, preview video, descriptions) |
| 11 | Submit to App Store; prepare Product Hunt launch; line up press |
| 12 | LAUNCH; monitor; respond to reviews; iterate based on data |

---

## 10. Success Metrics

### App Store Metrics

| Metric | Month 1 | Month 3 | Month 6 | Year 1 |
|--------|---------|---------|---------|--------|
| Downloads | 10K | 50K | 200K | 500K |
| Day-1 Retention | 35% | 40% | 45% | 50% |
| Day-7 Retention | 15% | 18% | 22% | 25% |
| Day-30 Retention | 5% | 7% | 10% | 12% |
| Free-to-Paid Conversion | 2% | 3% | 4% | 5% |
| Trial-to-Paid Conversion | 20% | 25% | 30% | 35% |
| Monthly Churn | 15% | 12% | 10% | 8% |
| App Store Rating | 4.0 | 4.3 | 4.5 | 4.6+ |

### Revenue Metrics

| Metric | Month 3 | Month 6 | Year 1 | Year 2 |
|--------|---------|---------|--------|--------|
| MRR | $10K | $50K | $180K | $670K |
| ARR | $120K | $600K | $2.2M | $8.0M |
| ARPU (avg revenue per user) | $2 | $3 | $4 | $5 |
| LTV (lifetime value) | $30 | $45 | $60 | $80 |
| CAC (customer acquisition cost) | $5 | $4 | $3 | $2.50 |
| LTV:CAC Ratio | 6:1 | 11:1 | 20:1 | 32:1 |

### Engagement Metrics

| Metric | Target |
|--------|--------|
| Sessions per DAU | 2.5+ |
| Avg session length | 3+ minutes |
| Shield triggers per user per day | 5+ |
| Focus plans completed per week | 2+ |
| Daily goal check-in rate | 40%+ |
| Streak >7 days | 20% of users |
| Accountability buddy invites | 0.5 per user |

---

## Appendix: Code-Level Improvements

### App.tsx (108KB) -- Component Extraction

The main App.tsx is 108KB -- this is a **critical code smell**. Extract into:

```
client/src/
  App.tsx                    # Router + auth context only (~200 lines)
  screens/
    HomeDashboard.tsx         # Current Home grid
    ShieldPanel.tsx           # Shield configuration
    FocusMode.tsx             # Focus session active
    EarnUnlock.tsx            # Credits economy
    ResetPage.tsx             # Anti-addiction engine
    PatternsPage.tsx          # Habit detection
    LumiInterview.tsx         # Onboarding interview
    AccountGate.tsx           # Login/signup
    SettingsPage.tsx          # App settings
  components/
    LumiAvatar.tsx            # Lumi character component
    DailyGoalCard.tsx         # Goal progress widget
    DailyReportCard.tsx       # Summary report
    DoomscrollNudges.tsx      # Nudge notifications
    ...
  hooks/
    usePersonalization.ts    # Fetch personalization plan
    useCredits.ts            # Credit balance & transactions
    useScreenTime.ts         # Real screen time data
    useStreak.ts             # Streak tracking
    ...
```

### Backend Security Improvements

1. **Add rate limiting to auth routes** (prevent brute force)
2. **Validate JWT on every request** (not just account ID)
3. **Add CORS restrictions** (currently wide open)
4. **Sanitize all user inputs** (XSS prevention)
5. **Add database connection pooling** (for PostgreSQL migration)

### Mobile-Specific Improvements

1. **Offline-first architecture** -- Cache personalization plan locally; sync when online
2. **Background refresh** -- Update screen time data every 15 minutes
3. **Widget support** -- iOS home screen widget showing daily progress
4. **Shortcuts integration** -- Siri "Start Focus Mode" command
5. **WatchOS app** -- Quick check-in from Apple Watch

---

*Latch -- 8-Figure Roadmap v1.0*
