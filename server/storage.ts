import {
  accountProfiles,
  accountabilityBuddies,
  accounts,
  appEvents,
  blockRules,
  creditLedger,
  focusPlans,
  focusSessions,
  habitPatterns,
  profiles,
  protectedApps,
  quests,
} from '@shared/schema';
import type {
  AccountabilityBuddyRow,
  AccountabilityChallengeInput,
  Account,
  AccountProfile,
  AppEvent,
  AppEventInput,
  BlockRule,
  CreditEarnInput,
  CreditLedgerRow,
  CreditSpendInput,
  FocusPlanInput,
  FocusPlanRow,
  FocusSession,
  HabitPatternRow,
  InsertFocusSession,
  InsertProfile,
  InsertProtectedApp,
  InsertQuest,
  Profile,
  ProfilePatch,
  ProtectedApp,
  Quest,
  SafeAccount,
  SafeProfile,
} from '@shared/schema';
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { and, desc, eq, gte } from "drizzle-orm";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const dbPath = process.env.LATCH_DB_PATH ?? "data.db";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// Create auth tables on boot so the app works without a separate migration step.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS account_profiles (
    account_id INTEGER PRIMARY KEY REFERENCES accounts(id),
    onboarding_complete INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    age TEXT NOT NULL DEFAULT '',
    current_hours INTEGER NOT NULL DEFAULT 5,
    goal_hours INTEGER NOT NULL DEFAULT 2,
    feelings TEXT NOT NULL DEFAULT '[]',
    hardest_time TEXT NOT NULL DEFAULT 'Night',
    top_apps TEXT NOT NULL DEFAULT '["Instagram"]',
    apple_connected INTEGER NOT NULL DEFAULT 0,
    notifications_allowed INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 84,
    streak INTEGER NOT NULL DEFAULT 9,
    completed_actions TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS app_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    app_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'unknown',
    opened_at TEXT NOT NULL,
    duration_minutes INTEGER,
    content_title TEXT,
    content_category TEXT,
    productive_hint TEXT,
    source TEXT NOT NULL DEFAULT 'demo',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_app_events_account_opened
    ON app_events(account_id, opened_at);
  CREATE TABLE IF NOT EXISTS habit_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_key TEXT NOT NULL,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    app_name TEXT NOT NULL,
    period_type TEXT NOT NULL,
    hour_start INTEGER NOT NULL,
    hour_end INTEGER NOT NULL,
    days_opened INTEGER NOT NULL,
    total_days INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    user_answer TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_patterns_key
    ON habit_patterns(pattern_key);
  CREATE TABLE IF NOT EXISTS block_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    app_name TEXT NOT NULL,
    hour_start INTEGER NOT NULL,
    hour_end INTEGER NOT NULL,
    active_from TEXT NOT NULL,
    active_until TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    source_pattern_key TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_block_rules_account
    ON block_rules(account_id);
  CREATE TABLE IF NOT EXISTS credit_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    kind TEXT NOT NULL,
    source TEXT NOT NULL,
    amount INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    proof TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_credit_ledger_account
    ON credit_ledger(account_id, created_at);
  CREATE TABLE IF NOT EXISTS focus_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'gentle',
    start_minute INTEGER NOT NULL DEFAULT 540,
    end_minute INTEGER NOT NULL DEFAULT 660,
    days_mask INTEGER NOT NULL DEFAULT 31,
    blocked_apps TEXT NOT NULL DEFAULT '[]',
    break_policy TEXT NOT NULL DEFAULT 'none',
    emergency_pass_count INTEGER NOT NULL DEFAULT 1,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_focus_plans_account
    ON focus_plans(account_id);
  CREATE TABLE IF NOT EXISTS accountability_buddies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    buddy_name TEXT NOT NULL,
    challenge_title TEXT NOT NULL DEFAULT 'Stay under daily limit',
    minutes_saved INTEGER NOT NULL DEFAULT 0,
    points_this_week INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_buddies_account
    ON accountability_buddies(account_id);
`);

// Lightweight migration: older databases predate the new account_profiles
// columns. Add any missing ones without touching existing rows.
function ensureAccountProfileColumns() {
  const rows = sqlite.prepare("PRAGMA table_info(account_profiles)").all() as Array<{ name: string }>;
  const have = new Set(rows.map((r) => r.name));
  const additions: Array<[string, string]> = [
    ["latch_credits", "INTEGER NOT NULL DEFAULT 20"],
    ["unlock_minutes", "INTEGER NOT NULL DEFAULT 0"],
    ["brain_energy", "INTEGER NOT NULL DEFAULT 72"],
    ["daily_goal_minutes", "INTEGER NOT NULL DEFAULT 120"],
    ["last_goal_day", "TEXT NOT NULL DEFAULT ''"],
    ["weekly_points", "INTEGER NOT NULL DEFAULT 0"],
    ["emergency_passes", "INTEGER NOT NULL DEFAULT 2"],
    ["doomscroll_nudges", "INTEGER NOT NULL DEFAULT 1"],
  ];
  for (const [col, def] of additions) {
    if (!have.has(col)) {
      sqlite.exec(`ALTER TABLE account_profiles ADD COLUMN ${col} ${def}`);
    }
  }
}
ensureAccountProfileColumns();

export const db = drizzle(sqlite);

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string, saltHex?: string): { hash: string; salt: string } {
  const salt = saltHex ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hashHex: string, saltHex: string): boolean {
  const candidate = scryptSync(password, saltHex, SCRYPT_KEYLEN);
  const expected = Buffer.from(hashHex, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function parseList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function toSafeProfile(row: AccountProfile): SafeProfile {
  return {
    onboardingComplete: Boolean(row.onboardingComplete),
    name: row.name,
    age: row.age,
    currentHours: row.currentHours,
    goalHours: row.goalHours,
    feelings: parseList(row.feelings),
    hardestTime: row.hardestTime,
    topApps: parseList(row.topApps),
    appleConnected: Boolean(row.appleConnected),
    notificationsAllowed: Boolean(row.notificationsAllowed),
    coins: row.coins,
    streak: row.streak,
    completedActions: parseList(row.completedActions),
    latchCredits: row.latchCredits ?? 20,
    unlockMinutes: row.unlockMinutes ?? 0,
    brainEnergy: row.brainEnergy ?? 72,
    dailyGoalMinutes: row.dailyGoalMinutes ?? 120,
    lastGoalDay: row.lastGoalDay ?? "",
    weeklyPoints: row.weeklyPoints ?? 0,
    emergencyPasses: row.emergencyPasses ?? 2,
    doomscrollNudges: row.doomscrollNudges === undefined ? true : Boolean(row.doomscrollNudges),
  };
}

export function toSafeAccount(account: Account, profile: AccountProfile): SafeAccount {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    age: account.age,
    profile: toSafeProfile(profile),
  };
}

export interface IStorage {
  getProfile(id: number): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  listProtectedApps(): Promise<ProtectedApp[]>;
  createProtectedApp(app: InsertProtectedApp): Promise<ProtectedApp>;
  listFocusSessions(): Promise<FocusSession[]>;
  createFocusSession(session: InsertFocusSession): Promise<FocusSession>;
  listQuests(): Promise<Quest[]>;
  createQuest(quest: InsertQuest): Promise<Quest>;

  findAccountByUsername(username: string): Promise<Account | undefined>;
  createAccount(input: {
    username: string;
    password: string;
    name: string;
    age: number;
  }): Promise<SafeAccount>;
  loginAccount(username: string, password: string): Promise<SafeAccount | null>;
  getAccountProfile(accountId: number): Promise<SafeAccount | undefined>;
  updateAccountProfile(accountId: number, patch: ProfilePatch): Promise<SafeAccount | undefined>;

  recordAppEvent(input: AppEventInput): Promise<AppEvent>;
  recordAppEventsBulk(inputs: AppEventInput[]): Promise<number>;
  listRecentAppEvents(accountId: number, sinceIso: string): Promise<AppEvent[]>;
  upsertHabitPattern(input: {
    patternKey: string;
    accountId: number;
    appName: string;
    periodType: string;
    hourStart: number;
    hourEnd: number;
    daysOpened: number;
    totalDays: number;
  }): Promise<HabitPatternRow>;
  getHabitPattern(patternKey: string): Promise<HabitPatternRow | undefined>;
  setPatternStatus(
    patternKey: string,
    status: "pending" | "productive" | "unproductive" | "blocked",
    userAnswer?: string | null,
  ): Promise<HabitPatternRow | undefined>;
  listHabitPatterns(accountId: number, periodType?: string): Promise<HabitPatternRow[]>;
  insertBlockRule(input: {
    accountId: number;
    appName: string;
    hourStart: number;
    hourEnd: number;
    activeFrom: string;
    activeUntil: string;
    reason: string;
    sourcePatternKey: string;
    enabled: boolean;
  }): Promise<BlockRule>;
  listActiveBlockRules(accountId: number, nowIso: string): Promise<BlockRule[]>;
  findBlockRuleByPattern(patternKey: string): Promise<BlockRule | undefined>;

  earnCredits(input: CreditEarnInput): Promise<{ entry: CreditLedgerRow; account: SafeAccount }>;
  spendCredits(input: CreditSpendInput): Promise<{ entry: CreditLedgerRow; account: SafeAccount } | { error: string }>;
  listCreditLedger(accountId: number, limit?: number): Promise<CreditLedgerRow[]>;

  listFocusPlans(accountId: number): Promise<FocusPlanRow[]>;
  createFocusPlan(input: FocusPlanInput): Promise<FocusPlanRow>;
  toggleFocusPlan(planId: number, enabled: boolean): Promise<FocusPlanRow | undefined>;
  deleteFocusPlan(planId: number): Promise<boolean>;

  listAccountabilityBuddies(accountId: number): Promise<AccountabilityBuddyRow[]>;
  createAccountabilityBuddy(input: AccountabilityChallengeInput): Promise<AccountabilityBuddyRow>;
  seedAccountabilityBuddiesIfEmpty(accountId: number): Promise<AccountabilityBuddyRow[]>;
}

export class DatabaseStorage implements IStorage {
  async getProfile(id: number): Promise<Profile | undefined> {
    return db.select().from(profiles).where(eq(profiles.id, id)).get();
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    return db.insert(profiles).values(profile).returning().get();
  }

  async listProtectedApps(): Promise<ProtectedApp[]> {
    return db.select().from(protectedApps).all();
  }

  async createProtectedApp(app: InsertProtectedApp): Promise<ProtectedApp> {
    return db.insert(protectedApps).values(app).returning().get();
  }

  async listFocusSessions(): Promise<FocusSession[]> {
    return db.select().from(focusSessions).all();
  }

  async createFocusSession(session: InsertFocusSession): Promise<FocusSession> {
    return db.insert(focusSessions).values(session).returning().get();
  }

  async listQuests(): Promise<Quest[]> {
    return db.select().from(quests).all();
  }

  async createQuest(quest: InsertQuest): Promise<Quest> {
    return db.insert(quests).values(quest).returning().get();
  }

  async findAccountByUsername(username: string): Promise<Account | undefined> {
    return db.select().from(accounts).where(eq(accounts.username, username.toLowerCase())).get();
  }

  async createAccount(input: {
    username: string;
    password: string;
    name: string;
    age: number;
  }): Promise<SafeAccount> {
    const username = input.username.toLowerCase();
    const existing = await this.findAccountByUsername(username);
    if (existing) {
      const err = new Error("An account with that username or email already exists.");
      (err as any).code = "ACCOUNT_EXISTS";
      throw err;
    }
    const { hash, salt } = hashPassword(input.password);
    const now = new Date().toISOString();
    const account = db
      .insert(accounts)
      .values({
        username,
        passwordHash: hash,
        passwordSalt: salt,
        name: input.name,
        age: input.age,
        createdAt: now,
      })
      .returning()
      .get();
    const profile = db
      .insert(accountProfiles)
      .values({
        accountId: account.id,
        onboardingComplete: false,
        name: input.name,
        age: String(input.age),
        currentHours: 5,
        goalHours: 2,
        feelings: "[]",
        hardestTime: "Night",
        topApps: '["Instagram"]',
        appleConnected: false,
        notificationsAllowed: false,
        coins: 84,
        streak: 9,
        completedActions: "[]",
        latchCredits: 20,
        unlockMinutes: 0,
        brainEnergy: 72,
        dailyGoalMinutes: 120,
        lastGoalDay: "",
        weeklyPoints: 0,
        emergencyPasses: 2,
        doomscrollNudges: true,
        updatedAt: now,
      })
      .returning()
      .get();
    return toSafeAccount(account, profile);
  }

  async loginAccount(username: string, password: string): Promise<SafeAccount | null> {
    const account = await this.findAccountByUsername(username);
    if (!account) return null;
    if (!verifyPassword(password, account.passwordHash, account.passwordSalt)) return null;
    const profile = db
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.accountId, account.id))
      .get();
    if (!profile) return null;
    return toSafeAccount(account, profile);
  }

  async getAccountProfile(accountId: number): Promise<SafeAccount | undefined> {
    const account = db.select().from(accounts).where(eq(accounts.id, accountId)).get();
    if (!account) return undefined;
    const profile = db
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.accountId, accountId))
      .get();
    if (!profile) return undefined;
    return toSafeAccount(account, profile);
  }

  async updateAccountProfile(
    accountId: number,
    patch: ProfilePatch,
  ): Promise<SafeAccount | undefined> {
    const existing = db
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.accountId, accountId))
      .get();
    if (!existing) return undefined;

    const update: Partial<AccountProfile> = { updatedAt: new Date().toISOString() };
    if (patch.onboardingComplete !== undefined) update.onboardingComplete = patch.onboardingComplete;
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.age !== undefined) update.age = patch.age;
    if (patch.currentHours !== undefined) update.currentHours = patch.currentHours;
    if (patch.goalHours !== undefined) update.goalHours = patch.goalHours;
    if (patch.feelings !== undefined) update.feelings = JSON.stringify(patch.feelings);
    if (patch.hardestTime !== undefined) update.hardestTime = patch.hardestTime;
    if (patch.topApps !== undefined) update.topApps = JSON.stringify(patch.topApps);
    if (patch.appleConnected !== undefined) update.appleConnected = patch.appleConnected;
    if (patch.notificationsAllowed !== undefined) update.notificationsAllowed = patch.notificationsAllowed;
    if (patch.coins !== undefined) update.coins = patch.coins;
    if (patch.streak !== undefined) update.streak = patch.streak;
    if (patch.completedActions !== undefined) {
      update.completedActions = JSON.stringify(patch.completedActions);
    }
    if (patch.latchCredits !== undefined) update.latchCredits = patch.latchCredits;
    if (patch.unlockMinutes !== undefined) update.unlockMinutes = patch.unlockMinutes;
    if (patch.brainEnergy !== undefined) update.brainEnergy = patch.brainEnergy;
    if (patch.dailyGoalMinutes !== undefined) update.dailyGoalMinutes = patch.dailyGoalMinutes;
    if (patch.lastGoalDay !== undefined) update.lastGoalDay = patch.lastGoalDay;
    if (patch.weeklyPoints !== undefined) update.weeklyPoints = patch.weeklyPoints;
    if (patch.emergencyPasses !== undefined) update.emergencyPasses = patch.emergencyPasses;
    if (patch.doomscrollNudges !== undefined) update.doomscrollNudges = patch.doomscrollNudges;

    db.update(accountProfiles).set(update).where(eq(accountProfiles.accountId, accountId)).run();
    return this.getAccountProfile(accountId);
  }

  async recordAppEvent(input: AppEventInput): Promise<AppEvent> {
    const now = new Date().toISOString();
    return db
      .insert(appEvents)
      .values({
        accountId: input.accountId,
        appName: input.appName,
        category: input.category ?? "unknown",
        openedAt: input.openedAt,
        durationMinutes: input.durationMinutes ?? null,
        contentTitle: input.contentTitle ?? null,
        contentCategory: input.contentCategory ?? null,
        productiveHint: input.productiveHint ?? null,
        source: input.source ?? "demo",
        createdAt: now,
      })
      .returning()
      .get();
  }

  async recordAppEventsBulk(inputs: AppEventInput[]): Promise<number> {
    if (inputs.length === 0) return 0;
    const now = new Date().toISOString();
    const rows = inputs.map((input) => ({
      accountId: input.accountId,
      appName: input.appName,
      category: input.category ?? "unknown",
      openedAt: input.openedAt,
      durationMinutes: input.durationMinutes ?? null,
      contentTitle: input.contentTitle ?? null,
      contentCategory: input.contentCategory ?? null,
      productiveHint: input.productiveHint ?? null,
      source: input.source ?? "demo",
      createdAt: now,
    }));
    // better-sqlite3 + drizzle supports values() with an array.
    db.insert(appEvents).values(rows).run();
    return rows.length;
  }

  async listRecentAppEvents(accountId: number, sinceIso: string): Promise<AppEvent[]> {
    return db
      .select()
      .from(appEvents)
      .where(
        and(
          eq(appEvents.accountId, accountId),
          gte(appEvents.openedAt, sinceIso),
        ),
      )
      .all();
  }

  async upsertHabitPattern(input: {
    patternKey: string;
    accountId: number;
    appName: string;
    periodType: string;
    hourStart: number;
    hourEnd: number;
    daysOpened: number;
    totalDays: number;
  }): Promise<HabitPatternRow> {
    const now = new Date().toISOString();
    const existing = db
      .select()
      .from(habitPatterns)
      .where(eq(habitPatterns.patternKey, input.patternKey))
      .get();
    if (existing) {
      db.update(habitPatterns)
        .set({
          daysOpened: input.daysOpened,
          totalDays: input.totalDays,
          updatedAt: now,
        })
        .where(eq(habitPatterns.patternKey, input.patternKey))
        .run();
      return db
        .select()
        .from(habitPatterns)
        .where(eq(habitPatterns.patternKey, input.patternKey))
        .get() as HabitPatternRow;
    }
    return db
      .insert(habitPatterns)
      .values({
        patternKey: input.patternKey,
        accountId: input.accountId,
        appName: input.appName,
        periodType: input.periodType,
        hourStart: input.hourStart,
        hourEnd: input.hourEnd,
        daysOpened: input.daysOpened,
        totalDays: input.totalDays,
        status: "pending",
        userAnswer: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
  }

  async getHabitPattern(patternKey: string): Promise<HabitPatternRow | undefined> {
    return db
      .select()
      .from(habitPatterns)
      .where(eq(habitPatterns.patternKey, patternKey))
      .get();
  }

  async setPatternStatus(
    patternKey: string,
    status: "pending" | "productive" | "unproductive" | "blocked",
    userAnswer?: string | null,
  ): Promise<HabitPatternRow | undefined> {
    const now = new Date().toISOString();
    db.update(habitPatterns)
      .set({ status, userAnswer: userAnswer ?? null, updatedAt: now })
      .where(eq(habitPatterns.patternKey, patternKey))
      .run();
    return this.getHabitPattern(patternKey);
  }

  async listHabitPatterns(accountId: number, periodType?: string): Promise<HabitPatternRow[]> {
    if (periodType) {
      return db
        .select()
        .from(habitPatterns)
        .where(
          and(
            eq(habitPatterns.accountId, accountId),
            eq(habitPatterns.periodType, periodType),
          ),
        )
        .all();
    }
    return db
      .select()
      .from(habitPatterns)
      .where(eq(habitPatterns.accountId, accountId))
      .all();
  }

  async insertBlockRule(input: {
    accountId: number;
    appName: string;
    hourStart: number;
    hourEnd: number;
    activeFrom: string;
    activeUntil: string;
    reason: string;
    sourcePatternKey: string;
    enabled: boolean;
  }): Promise<BlockRule> {
    const now = new Date().toISOString();
    return db
      .insert(blockRules)
      .values({
        accountId: input.accountId,
        appName: input.appName,
        hourStart: input.hourStart,
        hourEnd: input.hourEnd,
        activeFrom: input.activeFrom,
        activeUntil: input.activeUntil,
        reason: input.reason,
        sourcePatternKey: input.sourcePatternKey,
        enabled: input.enabled,
        createdAt: now,
      })
      .returning()
      .get();
  }

  async listActiveBlockRules(accountId: number, nowIso: string): Promise<BlockRule[]> {
    return db
      .select()
      .from(blockRules)
      .where(
        and(
          eq(blockRules.accountId, accountId),
          gte(blockRules.activeUntil, nowIso),
        ),
      )
      .all();
  }

  async findBlockRuleByPattern(patternKey: string): Promise<BlockRule | undefined> {
    return db
      .select()
      .from(blockRules)
      .where(eq(blockRules.sourcePatternKey, patternKey))
      .get();
  }

  async earnCredits(input: CreditEarnInput): Promise<{ entry: CreditLedgerRow; account: SafeAccount }> {
    const existing = db
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.accountId, input.accountId))
      .get();
    if (!existing) {
      const err = new Error("Account not found.");
      (err as any).code = "ACCOUNT_NOT_FOUND";
      throw err;
    }
    const now = new Date().toISOString();
    const entry = db
      .insert(creditLedger)
      .values({
        accountId: input.accountId,
        kind: "earn",
        source: input.source,
        amount: input.amount,
        note: input.note ?? "",
        proof: input.proof ?? "",
        createdAt: now,
      })
      .returning()
      .get();
    const newCredits = (existing.latchCredits ?? 20) + input.amount;
    // Boost brain energy a little when offline action is logged.
    const energyDelta = input.source === "focus_complete" ? 4 : input.source === "shield_skip" ? 3 : 6;
    const newEnergy = Math.min(100, (existing.brainEnergy ?? 72) + energyDelta);
    const newWeekly = (existing.weeklyPoints ?? 0) + Math.round(input.amount / 2);
    db.update(accountProfiles)
      .set({
        latchCredits: newCredits,
        brainEnergy: newEnergy,
        weeklyPoints: newWeekly,
        updatedAt: now,
      })
      .where(eq(accountProfiles.accountId, input.accountId))
      .run();
    const account = await this.getAccountProfile(input.accountId);
    if (!account) throw new Error("Account not found after update.");
    return { entry, account };
  }

  async spendCredits(input: CreditSpendInput): Promise<{ entry: CreditLedgerRow; account: SafeAccount } | { error: string }> {
    const existing = db
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.accountId, input.accountId))
      .get();
    if (!existing) return { error: "Account not found." };
    const cost = input.minutes * 2; // 2 credits per minute
    if ((existing.latchCredits ?? 0) < cost) {
      return { error: `Not enough Latch Credits. ${cost} needed.` };
    }
    const now = new Date().toISOString();
    const entry = db
      .insert(creditLedger)
      .values({
        accountId: input.accountId,
        kind: "spend",
        source: input.appName ?? "unlock",
        amount: -cost,
        note: input.note ?? `Unlock ${input.minutes} minutes`,
        proof: "",
        createdAt: now,
      })
      .returning()
      .get();
    const newCredits = (existing.latchCredits ?? 0) - cost;
    const newUnlock = (existing.unlockMinutes ?? 0) + input.minutes;
    // Brain energy dips when user spends on screen time (small, friendly).
    const newEnergy = Math.max(0, (existing.brainEnergy ?? 72) - Math.min(6, Math.ceil(input.minutes / 4)));
    db.update(accountProfiles)
      .set({
        latchCredits: newCredits,
        unlockMinutes: newUnlock,
        brainEnergy: newEnergy,
        updatedAt: now,
      })
      .where(eq(accountProfiles.accountId, input.accountId))
      .run();
    const account = await this.getAccountProfile(input.accountId);
    if (!account) return { error: "Account not found after update." };
    return { entry, account };
  }

  async listCreditLedger(accountId: number, limit = 30): Promise<CreditLedgerRow[]> {
    return db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.accountId, accountId))
      .orderBy(desc(creditLedger.id))
      .limit(limit)
      .all();
  }

  async listFocusPlans(accountId: number): Promise<FocusPlanRow[]> {
    return db
      .select()
      .from(focusPlans)
      .where(eq(focusPlans.accountId, accountId))
      .all();
  }

  async createFocusPlan(input: FocusPlanInput): Promise<FocusPlanRow> {
    const now = new Date().toISOString();
    return db
      .insert(focusPlans)
      .values({
        accountId: input.accountId,
        title: input.title,
        difficulty: input.difficulty,
        startMinute: input.startMinute,
        endMinute: input.endMinute,
        daysMask: input.daysMask,
        blockedApps: JSON.stringify(input.blockedApps),
        breakPolicy: input.breakPolicy,
        emergencyPassCount: input.emergencyPassCount,
        enabled: input.enabled,
        createdAt: now,
      })
      .returning()
      .get();
  }

  async toggleFocusPlan(planId: number, enabled: boolean): Promise<FocusPlanRow | undefined> {
    db.update(focusPlans).set({ enabled }).where(eq(focusPlans.id, planId)).run();
    return db.select().from(focusPlans).where(eq(focusPlans.id, planId)).get();
  }

  async deleteFocusPlan(planId: number): Promise<boolean> {
    const existing = db.select().from(focusPlans).where(eq(focusPlans.id, planId)).get();
    if (!existing) return false;
    db.delete(focusPlans).where(eq(focusPlans.id, planId)).run();
    return true;
  }

  async listAccountabilityBuddies(accountId: number): Promise<AccountabilityBuddyRow[]> {
    return db
      .select()
      .from(accountabilityBuddies)
      .where(eq(accountabilityBuddies.accountId, accountId))
      .all();
  }

  async createAccountabilityBuddy(input: AccountabilityChallengeInput): Promise<AccountabilityBuddyRow> {
    const now = new Date().toISOString();
    return db
      .insert(accountabilityBuddies)
      .values({
        accountId: input.accountId,
        buddyName: input.buddyName,
        challengeTitle: input.challengeTitle,
        minutesSaved: 0,
        pointsThisWeek: 0,
        active: true,
        createdAt: now,
      })
      .returning()
      .get();
  }

  async seedAccountabilityBuddiesIfEmpty(accountId: number): Promise<AccountabilityBuddyRow[]> {
    const existing = await this.listAccountabilityBuddies(accountId);
    if (existing.length > 0) return existing;
    const now = new Date().toISOString();
    const seeds = [
      { name: "Maya", title: "Two focus rounds a day", minutes: 151, points: 27 },
      { name: "Jay", title: "Phone away by 10 pm", minutes: 133, points: 19 },
      { name: "Noah", title: "Walk before scroll", minutes: 98, points: 12 },
    ];
    for (const seed of seeds) {
      db.insert(accountabilityBuddies)
        .values({
          accountId,
          buddyName: seed.name,
          challengeTitle: seed.title,
          minutesSaved: seed.minutes,
          pointsThisWeek: seed.points,
          active: true,
          createdAt: now,
        })
        .run();
    }
    return this.listAccountabilityBuddies(accountId);
  }
}

export const storage = new DatabaseStorage();
