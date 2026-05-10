import type { Express } from "express";
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { z } from "zod";
import { storage } from "./storage";
import {
  appEventBulkSchema,
  appEventInputSchema,
  insertFocusSessionSchema,
  insertProfileSchema,
  insertProtectedAppSchema,
  insertQuestSchema,
  loginSchema,
  patternReviewSchema,
  profilePatchSchema,
  signupSchema,
} from "@shared/schema";
import {
  applyEvent,
  buildPlan,
  demoPlan,
  eventSchema,
  planRequestSchema,
} from "./personalization";
import {
  buildBlockRule,
  buildDemoEvents,
  detectPatterns,
  type PeriodType,
} from "./habitPatterns";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/profile/:id", async (req, res) => {
    const profile = await storage.getProfile(Number(req.params.id));
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }
    res.json(profile);
  });

  app.post("/api/profile", async (req, res) => {
    const parsed = insertProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid profile", errors: parsed.error.flatten() });
      return;
    }
    res.status(201).json(await storage.createProfile(parsed.data));
  });

  app.get("/api/apps", async (_req, res) => {
    res.json(await storage.listProtectedApps());
  });

  app.post("/api/apps", async (req, res) => {
    const parsed = insertProtectedAppSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid app rule", errors: parsed.error.flatten() });
      return;
    }
    res.status(201).json(await storage.createProtectedApp(parsed.data));
  });

  app.get("/api/focus-sessions", async (_req, res) => {
    res.json(await storage.listFocusSessions());
  });

  app.post("/api/focus-sessions", async (req, res) => {
    const parsed = insertFocusSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid focus session", errors: parsed.error.flatten() });
      return;
    }
    res.status(201).json(await storage.createFocusSession(parsed.data));
  });

  app.get("/api/quests", async (_req, res) => {
    res.json(await storage.listQuests());
  });

  app.post("/api/quests", async (req, res) => {
    const parsed = insertQuestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid quest", errors: parsed.error.flatten() });
      return;
    }
    res.status(201).json(await storage.createQuest(parsed.data));
  });

  app.post("/api/personalization/plan", (req, res) => {
    const parsed = planRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid plan input", errors: parsed.error.flatten() });
      return;
    }
    res.json(buildPlan(parsed.data));
  });

  app.post("/api/personalization/event", (req, res) => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid event", errors: parsed.error.flatten() });
      return;
    }
    res.json(applyEvent(parsed.data));
  });

  app.get("/api/personalization/demo", (_req, res) => {
    res.json(demoPlan());
  });

  app.post("/api/auth/signup", async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Please check the fields and try again.",
        errors: parsed.error.flatten(),
      });
      return;
    }
    try {
      const account = await storage.createAccount(parsed.data);
      res.status(201).json({ account });
    } catch (err) {
      if ((err as any)?.code === "ACCOUNT_EXISTS") {
        res.status(409).json({ message: (err as Error).message });
        return;
      }
      throw err;
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Enter your username and password." });
      return;
    }
    const account = await storage.loginAccount(parsed.data.username, parsed.data.password);
    if (!account) {
      res.status(401).json({ message: "Wrong username or password." });
      return;
    }
    res.json({ account });
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/accounts/:id/profile", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const account = await storage.getAccountProfile(id);
    if (!account) {
      res.status(404).json({ message: "Account not found." });
      return;
    }
    res.json({ account });
  });

  app.patch("/api/accounts/:id/profile", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const parsed = profilePatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid profile update.",
        errors: parsed.error.flatten(),
      });
      return;
    }
    const account = await storage.updateAccountProfile(id, parsed.data);
    if (!account) {
      res.status(404).json({ message: "Account not found." });
      return;
    }
    res.json({ account });
  });

  app.post("/api/app-events", async (req, res) => {
    const parsed = appEventInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid app event", errors: parsed.error.flatten() });
      return;
    }
    const event = await storage.recordAppEvent(parsed.data);
    res.status(201).json({ event });
  });

  app.post("/api/app-events/bulk", async (req, res) => {
    const parsed = appEventBulkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid bulk events", errors: parsed.error.flatten() });
      return;
    }
    const inserted = await storage.recordAppEventsBulk(parsed.data.events);
    res.status(201).json({ inserted });
  });

  app.get("/api/app-patterns/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const periodQuery = z
      .enum(["week", "month", "year"])
      .default("month")
      .safeParse(req.query.period);
    if (!periodQuery.success) {
      res.status(400).json({ message: "Invalid period. Use week, month, or year." });
      return;
    }
    const periodType = periodQuery.data as PeriodType;
    const totalDays = periodType === "week" ? 7 : periodType === "month" ? 30 : 365;
    const now = new Date();
    const since = new Date(now.getTime() - totalDays * 24 * 60 * 60 * 1000).toISOString();
    const events = await storage.listRecentAppEvents(id, since);
    const detected = detectPatterns(
      id,
      events.map((event) => ({
        appName: event.appName,
        category: event.category,
        openedAt: event.openedAt,
        contentTitle: event.contentTitle,
        contentCategory: event.contentCategory,
        productiveHint: event.productiveHint,
      })),
      periodType,
      { now },
    );

    // Persist pattern rows so review answers can be recorded against them.
    const existingPatterns = await storage.listHabitPatterns(id, periodType);
    const existingByKey = new Map(existingPatterns.map((row) => [row.patternKey, row]));
    const enriched = await Promise.all(
      detected.map(async (pattern) => {
        const row = await storage.upsertHabitPattern({
          patternKey: pattern.patternKey,
          accountId: id,
          appName: pattern.appName,
          periodType: pattern.periodType,
          hourStart: pattern.hourStart,
          hourEnd: pattern.hourEnd,
          daysOpened: pattern.daysOpened,
          totalDays: pattern.totalDays,
        });
        const previous = existingByKey.get(pattern.patternKey);
        return {
          ...pattern,
          status: row.status,
          userAnswer: row.userAnswer ?? previous?.userAnswer ?? null,
        };
      }),
    );

    const blocks = await storage.listActiveBlockRules(id, now.toISOString());
    res.json({ patterns: enriched, blockRules: blocks, periodType, totalDays });
  });

  app.post("/api/app-patterns/review", async (req, res) => {
    const parsed = patternReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid review", errors: parsed.error.flatten() });
      return;
    }
    const pattern = await storage.getHabitPattern(parsed.data.patternKey);
    if (!pattern || pattern.accountId !== parsed.data.accountId) {
      res.status(404).json({ message: "Pattern not found for this account." });
      return;
    }
    if (parsed.data.answer === "productive") {
      const updated = await storage.setPatternStatus(
        parsed.data.patternKey,
        "productive",
        "productive",
      );
      res.json({ pattern: updated, blockRule: null });
      return;
    }

    // Unproductive: create a block rule for next month at the detected window.
    const existing = await storage.findBlockRuleByPattern(parsed.data.patternKey);
    if (existing) {
      const updated = await storage.setPatternStatus(
        parsed.data.patternKey,
        "blocked",
        "unproductive",
      );
      res.json({ pattern: updated, blockRule: existing });
      return;
    }

    const rule = buildBlockRule(parsed.data.accountId, {
      patternKey: pattern.patternKey,
      appName: pattern.appName,
      periodType: pattern.periodType as PeriodType,
      hourStart: pattern.hourStart,
      hourEnd: pattern.hourEnd,
      daysOpened: pattern.daysOpened,
      totalDays: pattern.totalDays,
      confidence: 1,
      suggestedQuestion: "",
      productivityUnknown: false,
      productivity: "unproductive",
      recommendedAction: "block_next_month",
      sampleContent: [],
      explanation: "",
    });
    const inserted = await storage.insertBlockRule(rule);
    const updated = await storage.setPatternStatus(
      parsed.data.patternKey,
      "blocked",
      "unproductive",
    );
    res.status(201).json({ pattern: updated, blockRule: inserted });
  });

  app.get("/api/block-rules/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const rules = await storage.listActiveBlockRules(id, new Date().toISOString());
    res.json({ blockRules: rules });
  });

  app.post("/api/app-patterns/demo-seed", async (req, res) => {
    const parsed = z
      .object({ accountId: z.number().int().positive() })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid demo seed", errors: parsed.error.flatten() });
      return;
    }
    const events = buildDemoEvents(parsed.data.accountId, new Date());
    const inserted = await storage.recordAppEventsBulk(events);
    res.status(201).json({ inserted });
  });

  return httpServer;
}
