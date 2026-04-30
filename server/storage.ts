import { focusSessions, profiles, protectedApps, quests } from '@shared/schema';
import type { FocusSession, InsertFocusSession, InsertProfile, InsertProtectedApp, InsertQuest, Profile, ProtectedApp, Quest } from '@shared/schema';
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  getProfile(id: number): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  listProtectedApps(): Promise<ProtectedApp[]>;
  createProtectedApp(app: InsertProtectedApp): Promise<ProtectedApp>;
  listFocusSessions(): Promise<FocusSession[]>;
  createFocusSession(session: InsertFocusSession): Promise<FocusSession>;
  listQuests(): Promise<Quest[]>;
  createQuest(quest: InsertQuest): Promise<Quest>;
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
}

export const storage = new DatabaseStorage();
