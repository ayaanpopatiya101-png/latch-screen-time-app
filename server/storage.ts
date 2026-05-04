import {
  accountProfiles,
  accounts,
  focusSessions,
  profiles,
  protectedApps,
  quests,
} from '@shared/schema';
import type {
  Account,
  AccountProfile,
  FocusSession,
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
import { eq } from "drizzle-orm";
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
`);

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

    db.update(accountProfiles).set(update).where(eq(accountProfiles.accountId, accountId)).run();
    return this.getAccountProfile(accountId);
  }
}

export const storage = new DatabaseStorage();
