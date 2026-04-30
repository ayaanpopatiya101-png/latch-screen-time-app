import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
