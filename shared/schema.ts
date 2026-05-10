import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  createdAt: text("created_at").notNull(),
});

export const accountProfiles = sqliteTable("account_profiles", {
  accountId: integer("account_id").primaryKey().references(() => accounts.id),
  onboardingComplete: integer("onboarding_complete", { mode: "boolean" }).notNull().default(false),
  name: text("name").notNull(),
  age: text("age").notNull().default(""),
  currentHours: integer("current_hours").notNull().default(5),
  goalHours: integer("goal_hours").notNull().default(2),
  feelings: text("feelings").notNull().default("[]"),
  hardestTime: text("hardest_time").notNull().default("Night"),
  topApps: text("top_apps").notNull().default("[\"Instagram\"]"),
  appleConnected: integer("apple_connected", { mode: "boolean" }).notNull().default(false),
  notificationsAllowed: integer("notifications_allowed", { mode: "boolean" }).notNull().default(false),
  coins: integer("coins").notNull().default(84),
  streak: integer("streak").notNull().default(9),
  completedActions: text("completed_actions").notNull().default("[]"),
  updatedAt: text("updated_at").notNull(),
});

export const profiles = sqliteTable("profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  dailyLimitMinutes: integer("daily_limit_minutes").notNull(),
  focusGoalMinutes: integer("focus_goal_minutes").notNull(),
  coins: integer("coins").notNull().default(84),
  streak: integer("streak").notNull().default(9),
});

export const protectedApps = sqliteTable("protected_apps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  delaySeconds: integer("delay_seconds").notNull(),
  sessionLimitMinutes: integer("session_limit_minutes").notNull(),
  opensToday: integer("opens_today").notNull().default(0),
  minutesToday: integer("minutes_today").notNull().default(0),
  rule: text("rule").notNull(),
});

export const focusSessions = sqliteTable("focus_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  minutes: integer("minutes").notNull(),
  rewardCoins: integer("reward_coins").notNull(),
  state: text("state").notNull(),
});

export const quests = sqliteTable("quests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  progress: integer("progress").notNull(),
  target: integer("target").notNull(),
  rewardCoins: integer("reward_coins").notNull(),
  type: text("type").notNull(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true });
export const insertProtectedAppSchema = createInsertSchema(protectedApps).omit({ id: true });
export const insertFocusSessionSchema = createInsertSchema(focusSessions).omit({ id: true });
export const insertQuestSchema = createInsertSchema(quests).omit({ id: true });

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertProtectedApp = z.infer<typeof insertProtectedAppSchema>;
export type ProtectedApp = typeof protectedApps.$inferSelect;
export type InsertFocusSession = z.infer<typeof insertFocusSessionSchema>;
export type FocusSession = typeof focusSessions.$inferSelect;
export type InsertQuest = z.infer<typeof insertQuestSchema>;
export type Quest = typeof quests.$inferSelect;

export const appEvents = sqliteTable("app_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  appName: text("app_name").notNull(),
  category: text("category").notNull().default("unknown"),
  openedAt: text("opened_at").notNull(),
  durationMinutes: integer("duration_minutes"),
  contentTitle: text("content_title"),
  contentCategory: text("content_category"),
  productiveHint: text("productive_hint"),
  source: text("source").notNull().default("demo"),
  createdAt: text("created_at").notNull(),
});

export const habitPatterns = sqliteTable("habit_patterns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patternKey: text("pattern_key").notNull(),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  appName: text("app_name").notNull(),
  periodType: text("period_type").notNull(),
  hourStart: integer("hour_start").notNull(),
  hourEnd: integer("hour_end").notNull(),
  daysOpened: integer("days_opened").notNull(),
  totalDays: integer("total_days").notNull(),
  status: text("status").notNull().default("pending"),
  userAnswer: text("user_answer"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const blockRules = sqliteTable("block_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  appName: text("app_name").notNull(),
  hourStart: integer("hour_start").notNull(),
  hourEnd: integer("hour_end").notNull(),
  activeFrom: text("active_from").notNull(),
  activeUntil: text("active_until").notNull(),
  reason: text("reason").notNull().default(""),
  sourcePatternKey: text("source_pattern_key").notNull().default(""),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export type AppEvent = typeof appEvents.$inferSelect;
export type HabitPatternRow = typeof habitPatterns.$inferSelect;
export type BlockRule = typeof blockRules.$inferSelect;

export const appEventInputSchema = z.object({
  accountId: z.number().int().positive(),
  appName: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(40).default("unknown"),
  openedAt: z.string().min(1),
  durationMinutes: z.number().min(0).max(24 * 60).optional(),
  contentTitle: z.string().max(200).optional(),
  contentCategory: z.string().max(60).optional(),
  productiveHint: z.enum(["productive", "unproductive", "unknown"]).optional(),
  source: z.enum(["demo", "manual", "native"]).default("demo"),
});

export const appEventBulkSchema = z.object({
  events: z.array(appEventInputSchema).min(1).max(2000),
});

export const patternReviewSchema = z.object({
  accountId: z.number().int().positive(),
  patternKey: z.string().min(1),
  answer: z.enum(["productive", "unproductive"]),
});

export type AppEventInput = z.infer<typeof appEventInputSchema>;
export type AppEventBulkInput = z.infer<typeof appEventBulkSchema>;
export type PatternReviewInput = z.infer<typeof patternReviewSchema>;

export type Account = typeof accounts.$inferSelect;
export type AccountProfile = typeof accountProfiles.$inferSelect;

export const signupSchema = z.object({
  username: z.string().trim().min(3).max(64),
  password: z.string().min(6).max(200),
  name: z.string().trim().min(1).max(80),
  age: z.coerce.number().int().min(8).max(120),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const stringArray = z.array(z.string());

export const profilePatchSchema = z.object({
  onboardingComplete: z.boolean().optional(),
  name: z.string().optional(),
  age: z.string().optional(),
  currentHours: z.number().optional(),
  goalHours: z.number().optional(),
  feelings: stringArray.optional(),
  hardestTime: z.string().optional(),
  topApps: stringArray.optional(),
  appleConnected: z.boolean().optional(),
  notificationsAllowed: z.boolean().optional(),
  coins: z.number().int().optional(),
  streak: z.number().int().optional(),
  completedActions: stringArray.optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfilePatch = z.infer<typeof profilePatchSchema>;

export type SafeProfile = {
  onboardingComplete: boolean;
  name: string;
  age: string;
  currentHours: number;
  goalHours: number;
  feelings: string[];
  hardestTime: string;
  topApps: string[];
  appleConnected: boolean;
  notificationsAllowed: boolean;
  coins: number;
  streak: number;
  completedActions: string[];
};

export type SafeAccount = {
  id: number;
  username: string;
  name: string;
  age: number;
  profile: SafeProfile;
};
