# Latch -- Code Improvements & Bug Fixes

> **Version:** 1.0.0  
> **Last Updated:** July 2026  
> **Scope:** All codebases (web, mobile, iOS, server)

---

## Table of Contents

1. [Critical Architecture Issues](#1-critical-architecture-issues)
2. [Web Client Improvements](#2-web-client-improvements)
3. [Mobile App Improvements](#3-mobile-app-improvements)
4. [iOS Native Improvements](#4-ios-native-improvements)
5. [Server/Backend Improvements](#5-serverbackend-improvements)
6. [Security Fixes](#6-security-fixes)
7. [Performance Optimizations](#7-performance-optimizations)
8. [Implementation Priority](#8-implementation-priority)

---

## 1. Critical Architecture Issues

### Issue 1: Three Separate Codebases **(CRITICAL)**

**Problem:** The app exists as three disconnected projects:
- `client/` -- React web app (108KB App.tsx, full features)
- `mobile/` -- Expo React Native (thin prototype, ~5 screens)
- `ios/` -- SwiftUI native (scaffold, not integrated)

**Impact:** Every feature must be implemented 3 times. The web has all the logic; mobile and iOS are shells.

**Solution:** Consolidate to a single Expo app with native module bridges:

```
latch/
  mobile/                          # Single source of truth
    app/                           # Expo Router screens
      (tabs)/
        dashboard.tsx              # Port from web Home
        earn.tsx                   # Port from web Earn
        focus.tsx                  # Port from web Focus
        shield.tsx                 # Port from web Shield
        settings.tsx               # Port from web Settings
      interview.tsx                # Port LumiInterview
      reset.tsx                    # Port AntiAddictionPage
      patterns.tsx                 # Port PatternsPage
      login.tsx                    # Port AccountGate
    components/                    # All web components ported to RN
      ui/                          # shadcn components -> RN equivalents
    hooks/                         # Shared logic
    native-modules/
      ios/
        ScreenTimeModule.swift     # FamilyControls bridge
    lib/                           # API client, utils
    store/                         # State management
  server/                          # Keep existing Node.js backend
  shared/                          # Keep shared types
```

### Issue 2: No Persistent Authentication **(CRITICAL)**

**Problem:** `AccountGate.tsx` uses React state for sessions. Refreshing the page signs the user out. This is explicitly documented as "intentional for the demo" but is a dealbreaker for production.

**Current code:**
```typescript
// AccountGate.tsx -- session is React state only
const [session, setSession] = useState<Session | null>(null);
// Refresh page --> session lost
```

**Fix for Web:**
```typescript
// Use httpOnly cookies for web
const login = async (username: string, password: string) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include', // Sends/receives cookies
  });
  // Server sets httpOnly cookie with JWT
};
```

**Fix for Mobile:**
```typescript
import * as SecureStore from 'expo-secure-store';

const login = async (username: string, password: string) => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const { token } = await res.json();
  await SecureStore.setItemAsync('jwt_token', token);
};

// API client auto-attaches token
const apiFetch = async (path: string, options = {}) => {
  const token = await SecureStore.getItemAsync('jwt_token');
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
};
```

### Issue 3: Screen Time APIs Not Integrated **(CRITICAL)**

**Problem:** The mobile app can't read or enforce real screen time. The iOS native code exists but isn't bridged to Expo.

**Solution:** Create an Expo native module:

```swift
// mobile/native-modules/ios/ScreenTimeModule.swift
import ExpoModulesCore
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
    
    AsyncFunction("getDailyUsage") { () async -> [[String: Any]] in
      // Query DeviceActivity for today's per-app usage
      let monitor = DeviceActivityMonitor()
      // ... implementation
      return [["bundleId": "com.instagram.app", "minutes": 45.2]]
    }
    
    AsyncFunction("blockApps") { (bundleIds: [String], minutes: Int) in
      let store = ManagedSettingsStore()
      // Convert bundle IDs to Application tokens
      let applications = bundleIds.compactMap { BundleIdentifier($0) }
      store.shield.applications = .specific(applications)
      
      // Schedule unblock after duration
      DispatchQueue.main.asyncAfter(deadline: .now() + .minutes(minutes)) {
        store.shield.applications = nil
      }
    }
    
    AsyncFunction("unblockAll") {
      let store = ManagedSettingsStore()
      store.shield.applications = nil
      store.shield.webDomains = nil
    }
  }
}
```

```typescript
// mobile/src/lib/screenTime.ts
import { requireNativeModule } from 'expo-modules-core';

const ScreenTime = requireNativeModule('ScreenTime');

export async function requestScreenTimeAuth(): Promise<boolean> {
  return await ScreenTime.requestAuthorization();
}

export async function getDailyUsage(): Promise<Array<{bundleId: string, minutes: number}>> {
  return await ScreenTime.getDailyUsage();
}

export async function blockApps(bundleIds: string[], minutes: number): Promise<void> {
  return await ScreenTime.blockApps(bundleIds, minutes);
}
```

---

## 2. Web Client Improvements

### CI-1: Extract App.tsx (108KB) into Screen Components

**Problem:** `client/src/App.tsx` is 108,828 bytes. This is unmaintainable.

**Target structure:**
```
client/src/
  App.tsx                    # ~200 lines: router + auth provider
  screens/
    DashboardScreen.tsx      # Home grid, weekly forecast, persona
    ShieldScreen.tsx         # Shield configuration + per-app settings
    FocusScreen.tsx          # Active focus session + timer
    EarnScreen.tsx           # Credits economy + offline actions
    ResetScreen.tsx          # Anti-addiction engine (tactics, detox, etc.)
    PatternsScreen.tsx       # Habit detection + block rules
    InterviewScreen.tsx      # Lumi onboarding interview
    AccountGateScreen.tsx    # Login/signup
    SettingsScreen.tsx       # App settings
  components/
    LumiAvatar.tsx           # Extracted (already exists, ~3KB)
    DailyGoalCard.tsx        # Extracted (already exists, ~3KB)
    DailyReportCard.tsx      # Extracted (already exists, ~3KB)
    DoomscrollNudges.tsx     # Extracted (already exists, ~2KB)
    StreakBadge.tsx          # NEW
    CreditBalance.tsx        # NEW
    BrainEnergyMeter.tsx     # NEW
    PersonaCard.tsx          # NEW
    RiskIndicator.tsx        # NEW
    ShareableWinCard.tsx     # NEW
    ...
  hooks/
    useAuth.ts               # Auth state + login/logout/signup
    usePersonalization.ts    # Fetch/mutate personalization plan
    useScreenTime.ts         # Read screen time data
    useCredits.ts            # Credit balance + transactions
    useStreak.ts             # Streak tracking
    useDailyGoal.ts          # Goal check-in
    useFocusPlans.ts         # CRUD focus plans
    usePatterns.ts           # Habit pattern detection
    useAntiAddiction.ts      # Tactics, detox, reflections
    useNotifications.ts      # Push notification permission + scheduling
```

### CI-2: Add Loading States & Error Boundaries

**Problem:** Many API calls have no loading or error states.

**Fix pattern:**
```typescript
function usePersonalization(accountId: number) {
  const [plan, setPlan] = useState<PersonalizationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(`/api/personalization/plan/${accountId}`)
      .then(r => r.json())
      .then(data => setPlan(data))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [accountId]);

  return { plan, loading, error, retry: () => { /* ... */ } };
}
```

### CI-3: Add Responsive Design

**Problem:** The web app may not work well on mobile browsers.

**Fix:** Add Tailwind responsive breakpoints:
```css
/* Dashboard grid */
.grid-cols-1 sm:grid-cols-2 lg:grid-cols-3

/* Font sizes */
.text-sm sm:text-base lg:text-lg

/* Padding */
p-4 sm:p-6 lg:p-8
```

---

## 3. Mobile App Improvements

### MI-1: Port All Web Features to React Native

**Current mobile screens:**
- `dashboard.tsx` (4.7KB) -- basic grid
- `earn.tsx` (3.4KB) -- simple list
- `focus.tsx` (1.7KB) -- placeholder
- `shield.tsx` (2.1KB) -- basic config
- `settings.tsx` (3.2KB) -- settings list
- `interview.tsx` (3.8KB) -- Lumi interview
- `login.tsx` (3.4KB) -- auth gate
- `permissions.tsx` (3.4KB) -- permission request

**Missing from mobile (exists in web only):**
- Anti-addiction Reset page (20KB web component)
- Habit Patterns page (14KB web component)
- Focus Plans page (23KB web component)
- Earn & Unlock page (17KB web component)
- Daily report card
- Accountability leaderboard
- Doomscroll nudges
- Brain energy meter
- Shareable win cards

**Priority port order:**
1. Anti-addiction Reset page (core differentiator)
2. Focus Plans page (Opal competitive feature)
3. Earn & Unlock page (gamification retention)
4. Habit Patterns page (unique feature)
5. Daily report + shareable cards (viral growth)
6. Accountability leaderboard (social retention)

### MI-2: Add Native Screen Time Permission Flow

**Current:** `permissions.tsx` exists but is basic.

**Improved flow:**
```typescript
// permissions.tsx
export default function PermissionsScreen() {
  const [screenTimeAuth, setScreenTimeAuth] = useState(false);
  const [notificationsAuth, setNotificationsAuth] = useState(false);
  const router = useRouter();

  async function requestScreenTime() {
    try {
      const granted = await ScreenTime.requestAuthorization();
      setScreenTimeAuth(granted);
    } catch (err) {
      // Show educational bottom sheet explaining why it's needed
      showEducationalSheet('screenTime');
    }
  }

  async function requestNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotificationsAuth(status === 'granted');
  }

  // Auto-advance when both granted
  useEffect(() => {
    if (screenTimeAuth && notificationsAuth) {
      router.replace('/interview');
    }
  }, [screenTimeAuth, notificationsAuth]);

  return (
    <View>
      <Text>Latch needs access to help you reclaim your time.</Text>
      
      <PermissionCard
        icon="shield"
        title="Screen Time Access"
        description="Latch reads your app usage to show patterns and enforce limits. Your data never leaves your device."
        granted={screenTimeAuth}
        onRequest={requestScreenTime}
      />
      
      <PermissionCard
        icon="bell"
        title="Notifications"
        description="Lumi sends gentle nudges when you're about to slip."
        granted={notificationsAuth}
        onRequest={requestNotifications}
      />
    </View>
  );
}
```

### MI-3: Add iOS Widget Support

**Home Screen Widget** showing:
- Daily screen time vs goal
- Current streak
- Brain energy meter

```swift
// iOS Widget target
import WidgetKit
import SwiftUI

struct LatchWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "com.latch.daily", provider: Provider()) { entry in
      LatchWidgetView(entry: entry)
    }
    .configurationDisplayName("Daily Progress")
    .description("See your screen time goal at a glance.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
```

### MI-4: Add Apple Watch App

**Complications showing:**
- Daily progress ring
- Quick "Start Focus" button
- Streak status

---

## 4. iOS Native Improvements

### NI-1: Integrate SwiftUI Native App with Expo

**Current:** `ios/` is a separate Xcode project.
**Target:** Fold into Expo via `expo prebuild` + custom native modules.

**Steps:**
1. Run `npx expo prebuild` to generate iOS project
2. Add FamilyControls entitlement to generated project
3. Move `LatchDeviceActivityMonitor` and `LatchShieldConfiguration` extension targets into prebuild
4. Create `ScreenTimeModule.swift` using Expo Modules API
5. Configure `app.json` plugins for extensions

### NI-2: Request Apple Family Controls Distribution Entitlement

**Document exists:** `docs/apple-family-controls-entitlement-request.md`

**Status:** This must be submitted to Apple BEFORE app review. It typically takes 2-4 weeks.

**Action item:** Submit the entitlement request immediately. The app CANNOT use Screen Time APIs without it.

### NI-3: Add Device Activity Monitor Extension

The `LatchDeviceActivityMonitor` extension target needs to:
1. Receive device activity reports every 15 minutes
2. Check if user exceeded daily goal
3. Send push notification via notification center if over goal
4. Enforce block rules from server

### NI-4: Add Shield Configuration Extension

The `LatchShieldConfiguration` extension target needs to:
1. Display custom blocking UI when apps are shielded
2. Show Lumi message + "Earn credits to unlock" CTA
3. Support emergency override (with cost)

---

## 5. Server/Backend Improvements

### BI-1: Add JWT Authentication Middleware

**Current:** Routes accept `accountId` in body but don't validate the caller owns that account.

**Fix:**
```typescript
// server/middleware/auth.ts
import jwt from 'jsonwebtoken';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { accountId: number };
    req.accountId = decoded.accountId;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Protect all routes:
app.get('/api/accounts/:id/profile', authMiddleware, async (req, res) => {
  // Verify :id matches req.accountId
  if (Number(req.params.id) !== req.accountId) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  // ...
});
```

### BI-2: Add Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { message: 'Too many attempts. Try again later.' },
});

app.post('/api/auth/login', authLimiter, loginHandler);
app.post('/api/auth/signup', authLimiter, signupHandler);
```

### BI-3: Add Input Sanitization

**Current:** Some string inputs aren't sanitized before storage.

**Fix:** Add sanitization middleware:
```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeStrings(obj: any): any {
  if (typeof obj === 'string') return DOMPurify.sanitize(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeStrings);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, sanitizeStrings(v)])
    );
  }
  return obj;
}
```

### BI-4: Add Health Check Endpoint

```typescript
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
  });
});
```

### BI-5: Dockerize for Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.cjs"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

---

## 6. Security Fixes

### SF-1: SQL Injection Risk in Raw Queries

**Audit:** Check `server/storage.ts` for any raw SQL queries. Drizzle ORM protects against injection, but raw queries (if any) need parameterization.

**Action:** Audit all `db.execute()` calls. Replace any string concatenation with parameterized queries.

### SF-2: Missing CORS Configuration

**Fix:**
```typescript
import cors from 'cors';

const allowedOrigins = [
  'https://latch.app',
  'https://app.latch.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

### SF-3: No HTTPS Enforcement

**Fix:**
```typescript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

### SF-4: Password Strength Validation

**Current:** `signupSchema` doesn't enforce password strength.

**Fix:**
```typescript
const signupSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
});
```

---

## 7. Performance Optimizations

### PO-1: Add Database Indexing

```sql
-- habit_pattern lookups
CREATE INDEX idx_habit_patterns_account_period ON habit_patterns(account_id, period_type);

-- app event queries
CREATE INDEX idx_app_events_account_opened ON app_events(account_id, opened_at);

-- credit ledger
CREATE INDEX idx_credit_ledger_account_created ON credit_ledger(account_id, created_at);

-- block rules
CREATE INDEX idx_block_rules_account_expires ON block_rules(account_id, expires_at);
```

### PO-2: Add API Response Caching

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

// Cache personalization plans (they don't change often)
app.post('/api/personalization/plan', (req, res) => {
  const cacheKey = JSON.stringify(req.body);
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  const plan = buildPlan(req.body);
  cache.set(cacheKey, plan);
  res.json(plan);
});
```

### PO-3: Implement Request Pagination

**Current:** `listCreditLedger` returns up to 100 entries with no pagination.

**Fix:**
```typescript
app.get('/api/credits/ledger/:accountId', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const offset = (page - 1) * limit;
  
  const [entries, total] = await Promise.all([
    storage.listCreditLedgerPaginated(accountId, limit, offset),
    storage.countCreditLedger(accountId),
  ]);
  
  res.json({
    entries,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
```

---

## 8. Implementation Priority

### Week 1-2: Foundation
- [ ] Add JWT auth + SecureStore sessions
- [ ] Add rate limiting + CORS
- [ ] Dockerize backend

### Week 3-4: Mobile Core
- [ ] Create ScreenTime native module
- [ ] Port Anti-addiction Reset page to React Native
- [ ] Port Focus Plans to React Native

### Week 5-6: Mobile Features
- [ ] Port Earn & Unlock to React Native
- [ ] Port Habit Patterns to React Native
- [ ] Add push notifications

### Week 7-8: Polish
- [ ] Add iOS widgets
- [ ] Add shareable win cards
- [ ] Performance optimization

### Week 9-10: Monetization
- [ ] Integrate RevenueCat
- [ ] Build paywall screens
- [ ] Test purchase flow

### Week 11-12: Launch Prep
- [ ] App Store assets
- [ ] TestFlight testing
- [ ] Submit for review

---

*Latch -- Code Improvements v1.0*
