import type { Express } from "express";
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { z } from "zod";
import { storage } from "./storage";
import {
  accountabilityChallengeSchema,
  appEventBulkSchema,
  appEventInputSchema,
  creditEarnSchema,
  creditSpendSchema,
  dailyGoalCheckInSchema,
  focusPlanInputSchema,
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
import {
  autoplayChecklistScore,
  autoplayChecklistSchema,
  autoplayNextStep,
  batchWindowSchema,
  bedroomChargerSchema,
  BOOKS,
  buildAntiAddictionPlan,
  detoxDurationDays,
  detoxFrameworkLabel,
  detoxPlanSchema,
  detoxProgress,
  feedAuditReward,
  feedAuditSchema,
  fomoReframeMessage,
  fomoReframeSchema,
  isOutsideBatchWindows,
  minutesUntilNextWindow,
  offlineReplacement,
  reflectionPromptSchema,
  reflectionQuestion,
  sessionClockState,
  TACTIC_CARDS,
  tacticOfTheDay,
} from "./antiAddiction";

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

  // --- Latch Credits (earn & unlock) ---
  app.post("/api/credits/earn", async (req, res) => {
    const parsed = creditEarnSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid credit earn", errors: parsed.error.flatten() });
      return;
    }
    try {
      const result = await storage.earnCredits(parsed.data);
      res.status(201).json(result);
    } catch (err) {
      if ((err as any)?.code === "ACCOUNT_NOT_FOUND") {
        res.status(404).json({ message: (err as Error).message });
        return;
      }
      throw err;
    }
  });

  app.post("/api/credits/spend", async (req, res) => {
    const parsed = creditSpendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid credit spend", errors: parsed.error.flatten() });
      return;
    }
    const result = await storage.spendCredits(parsed.data);
    if ("error" in result) {
      res.status(400).json({ message: result.error });
      return;
    }
    res.status(201).json(result);
  });

  app.get("/api/credits/ledger/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const ledger = await storage.listCreditLedger(id, limit);
    res.json({ ledger });
  });

  // --- Focus plans (Opal-style scheduled blocks) ---
  app.get("/api/focus-plans/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const plans = await storage.listFocusPlans(id);
    res.json({ plans });
  });

  app.post("/api/focus-plans", async (req, res) => {
    const parsed = focusPlanInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid focus plan", errors: parsed.error.flatten() });
      return;
    }
    if (parsed.data.endMinute <= parsed.data.startMinute) {
      res.status(400).json({ message: "End time must be after start time." });
      return;
    }
    const plan = await storage.createFocusPlan(parsed.data);
    res.status(201).json({ plan });
  });

  app.patch("/api/focus-plans/:id/toggle", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid plan id." });
      return;
    }
    const parsed = z.object({ enabled: z.boolean() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid toggle." });
      return;
    }
    const plan = await storage.toggleFocusPlan(id, parsed.data.enabled);
    if (!plan) {
      res.status(404).json({ message: "Plan not found." });
      return;
    }
    res.json({ plan });
  });

  app.delete("/api/focus-plans/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid plan id." });
      return;
    }
    const ok = await storage.deleteFocusPlan(id);
    if (!ok) {
      res.status(404).json({ message: "Plan not found." });
      return;
    }
    res.json({ ok: true });
  });

  // --- Daily goal check-in (BePresent-style) ---
  app.post("/api/daily-goal/check-in", async (req, res) => {
    const parsed = dailyGoalCheckInSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid check-in", errors: parsed.error.flatten() });
      return;
    }
    const existing = await storage.getAccountProfile(parsed.data.accountId);
    if (!existing) {
      res.status(404).json({ message: "Account not found." });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (existing.profile.lastGoalDay === today) {
      res.json({ account: existing, alreadyCheckedIn: true });
      return;
    }
    const goalMinutes = existing.profile.dailyGoalMinutes;
    const under = parsed.data.minutesUsed <= goalMinutes;
    const patch = {
      lastGoalDay: today,
      streak: under ? existing.profile.streak + 1 : Math.max(0, existing.profile.streak - 1),
      weeklyPoints: existing.profile.weeklyPoints + (under ? 20 : 0),
      brainEnergy: Math.min(100, Math.max(0, existing.profile.brainEnergy + (under ? 8 : -10))),
    };
    const account = await storage.updateAccountProfile(parsed.data.accountId, patch);
    if (under) {
      await storage.earnCredits({
        accountId: parsed.data.accountId,
        source: "daily_goal",
        amount: 10,
        note: `Stayed under ${goalMinutes} minutes today`,
      });
    }
    res.json({ account, met: under, goalMinutes, minutesUsed: parsed.data.minutesUsed });
  });

  // --- Daily / weekly summary report ---
  app.get("/api/daily-report/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const account = await storage.getAccountProfile(id);
    if (!account) {
      res.status(404).json({ message: "Account not found." });
      return;
    }
    const ledger = await storage.listCreditLedger(id, 100);
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const earnedToday = ledger
      .filter((e) => e.kind === "earn" && new Date(e.createdAt) >= dayStart)
      .reduce((sum, e) => sum + e.amount, 0);
    const spentToday = ledger
      .filter((e) => e.kind === "spend" && new Date(e.createdAt) >= dayStart)
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const earnedThisWeek = ledger
      .filter((e) => e.kind === "earn" && new Date(e.createdAt) >= weekStart)
      .reduce((sum, e) => sum + e.amount, 0);
    const offlineActionsToday = ledger.filter(
      (e) =>
        e.kind === "earn" &&
        new Date(e.createdAt) >= dayStart &&
        ["walk", "workout", "breathing", "journal", "gratitude", "homework", "read", "friend"].includes(e.source),
    ).length;
    const minutesSavedToday = Math.max(
      0,
      Math.round((account.profile.dailyGoalMinutes - account.profile.unlockMinutes) * 0.5) + offlineActionsToday * 8,
    );
    res.json({
      account,
      report: {
        earnedToday,
        spentToday,
        earnedThisWeek,
        offlineActionsToday,
        minutesSavedToday,
        weeklyPoints: account.profile.weeklyPoints,
        streak: account.profile.streak,
        brainEnergy: account.profile.brainEnergy,
        unlockMinutes: account.profile.unlockMinutes,
        latchCredits: account.profile.latchCredits,
      },
    });
  });

  // --- Accountability buddies / weekly leaderboard ---
  app.get("/api/accountability/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const buddies = await storage.seedAccountabilityBuddiesIfEmpty(id);
    res.json({ buddies });
  });

  app.post("/api/accountability/challenge", async (req, res) => {
    const parsed = accountabilityChallengeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid challenge", errors: parsed.error.flatten() });
      return;
    }
    const buddy = await storage.createAccountabilityBuddy(parsed.data);
    res.status(201).json({ buddy });
  });

  // ------------------------------------------------------------------
  // Anti-Addiction routes — counters specific psychology tactics social
  // platforms use. Each route maps to one or more tactics. See
  // server/antiAddiction.ts for the full tactic-by-tactic reference.
  // ------------------------------------------------------------------

  // Static reference: tactic cards + recommended books. No DB call so this is
  // safe to call frequently from the client.
  app.get("/api/anti-addiction/reference", (_req, res) => {
    res.json({ tactics: TACTIC_CARDS, books: BOOKS });
  });

  // Personalized plan: tactic-of-the-day, reflection question, recommended
  // detox framework, quick wins. Driven by the user's stated screen-time
  // hours and hardest time of day.
  app.get("/api/anti-addiction/plan/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const account = await storage.getAccountProfile(id);
    if (!account) {
      res.status(404).json({ message: "Account not found." });
      return;
    }
    const plan = buildAntiAddictionPlan({
      currentHours: account.profile.currentHours,
      hardestTime: account.profile.hardestTime,
    });
    res.json({ plan });
  });

  // ---------- Batch windows: counters variable rewards ----------
  app.get("/api/batch-windows/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const windows = await storage.listBatchWindows(id);
    const now = new Date();
    const minuteOfDay = now.getHours() * 60 + now.getMinutes();
    const simple = windows.map((w) => ({
      startMinute: w.startMinute,
      endMinute: w.endMinute,
      label: w.label,
    }));
    res.json({
      windows,
      outsideAllWindows: isOutsideBatchWindows(minuteOfDay, simple),
      minutesUntilNext: minutesUntilNextWindow(minuteOfDay, simple),
    });
  });

  app.post("/api/batch-windows", async (req, res) => {
    const parsed = batchWindowSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid batch windows", errors: parsed.error.flatten() });
      return;
    }
    const windows = await storage.replaceBatchWindows(
      parsed.data.accountId,
      parsed.data.windows.map((w) => ({
        startMinute: w.startMinute,
        endMinute: w.endMinute,
        label: w.label,
      })),
      parsed.data.apps,
    );
    res.status(201).json({ windows });
  });

  // ---------- Pre-open reflection: counters notifications + autopilot ----------
  app.post("/api/reflection", async (req, res) => {
    const parsed = reflectionPromptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid reflection", errors: parsed.error.flatten() });
      return;
    }
    const entry = await storage.recordReflection(parsed.data);
    const now = new Date();
    res.status(201).json({
      entry,
      // Give the user back something useful: a question tailored to the hour
      // and an offline alternative for the app they were about to open.
      question: reflectionQuestion(now.getHours() * 60 + now.getMinutes()),
      offlineSwap: offlineReplacement(parsed.data.appName, now.getHours()),
    });
  });

  app.get("/api/reflection/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const log = await storage.listReflections(id);
    res.json({ log });
  });

  // ---------- Detox plans: counters dopamine-hijacked baseline ----------
  app.get("/api/detox-plans/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const plans = await storage.listDetoxPlans(id);
    const enriched = plans.map((p) => ({
      ...p,
      label: detoxFrameworkLabel(p.framework as any),
      durationDays: detoxDurationDays(p.framework as any),
      progress: detoxProgress(p.startedAt, p.framework as any),
    }));
    res.json({ plans: enriched });
  });

  app.post("/api/detox-plans", async (req, res) => {
    const parsed = detoxPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid detox plan", errors: parsed.error.flatten() });
      return;
    }
    const plan = await storage.createDetoxPlan(parsed.data);
    res.status(201).json({
      plan: {
        ...plan,
        label: detoxFrameworkLabel(plan.framework as any),
        durationDays: detoxDurationDays(plan.framework as any),
        progress: detoxProgress(plan.startedAt, plan.framework as any),
      },
    });
  });

  app.delete("/api/detox-plans/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid plan id." });
      return;
    }
    const ok = await storage.endDetoxPlan(id);
    if (!ok) {
      res.status(404).json({ message: "Plan not found." });
      return;
    }
    res.json({ ok: true });
  });

  // ---------- Feed audit: counters personalization algorithms ----------
  app.post("/api/feed-audit", async (req, res) => {
    const parsed = feedAuditSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid feed audit", errors: parsed.error.flatten() });
      return;
    }
    const award = feedAuditReward(parsed.data.count);
    const entry = await storage.recordFeedAudit({
      accountId: parsed.data.accountId,
      action: parsed.data.action,
      platform: parsed.data.platform,
      count: parsed.data.count,
      note: parsed.data.note ?? "",
      creditsAwarded: award,
    });
    // Reward the work — feed audits are tangible and effortful.
    let creditEntry = null as null | Awaited<ReturnType<typeof storage.earnCredits>>;
    if (award > 0) {
      try {
        creditEntry = await storage.earnCredits({
          accountId: parsed.data.accountId,
          source: "friend",
          amount: award,
          note: `Feed audit: ${parsed.data.action} ${parsed.data.count} on ${parsed.data.platform}`,
        });
      } catch {
        // Ignore credit award errors (e.g. account missing); audit still saved.
      }
    }
    res.status(201).json({ entry, creditsAwarded: award, account: creditEntry?.account });
  });

  app.get("/api/feed-audit/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const events = await storage.listFeedAuditEvents(id);
    res.json({ events });
  });

  // ---------- Bedroom charger: counters late-night scroll ----------
  app.post("/api/bedroom-charger", async (req, res) => {
    const parsed = bedroomChargerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid charger check-in", errors: parsed.error.flatten() });
      return;
    }
    const entry = await storage.recordBedroomCharger(parsed.data);
    // Reward the keep-it-out-of-the-bedroom pledge. Small but consistent.
    let creditEntry = null as null | Awaited<ReturnType<typeof storage.earnCredits>>;
    if (parsed.data.chargedOutsideBedroom) {
      try {
        creditEntry = await storage.earnCredits({
          accountId: parsed.data.accountId,
          source: "daily_goal",
          amount: 4,
          note: "Charged phone outside the bedroom",
        });
      } catch {
        // Ignore; entry still saved.
      }
    }
    res.status(201).json({ entry, account: creditEntry?.account });
  });

  app.get("/api/bedroom-charger/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const log = await storage.listBedroomChargerLog(id);
    // Compute current streak: count consecutive 'yes' entries from newest.
    let streak = 0;
    for (const row of log) {
      if (row.chargedOutsideBedroom) streak += 1;
      else break;
    }
    res.json({ log, currentStreak: streak });
  });

  // ---------- Autoplay-off checklist: counters autoplay rabbit holes ----------
  app.get("/api/autoplay-checklist/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const row = await storage.getAutoplayChecklist(id);
    if (!row) {
      res.json({ checklist: null, nextStep: null });
      return;
    }
    let toggles: Array<{ key: any; done: boolean }> = [];
    try {
      toggles = JSON.parse(row.toggles) ?? [];
    } catch {
      toggles = [];
    }
    res.json({
      checklist: { ...row, toggles },
      nextStep: autoplayNextStep(toggles),
    });
  });

  app.post("/api/autoplay-checklist", async (req, res) => {
    const parsed = autoplayChecklistSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid checklist", errors: parsed.error.flatten() });
      return;
    }
    const score = autoplayChecklistScore(parsed.data.toggles);
    const row = await storage.upsertAutoplayChecklist({
      accountId: parsed.data.accountId,
      toggles: parsed.data.toggles,
      scorePercent: score,
    });
    res.status(201).json({
      checklist: { ...row, toggles: parsed.data.toggles },
      nextStep: autoplayNextStep(parsed.data.toggles),
      scorePercent: score,
    });
  });

  // ---------- FOMO reframe: counters confirmshaming and engineered FOMO ----------
  app.post("/api/fomo-reframe", async (req, res) => {
    const parsed = fomoReframeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid reframe", errors: parsed.error.flatten() });
      return;
    }
    const reframe = fomoReframeMessage(parsed.data.answer, parsed.data.appName);
    const entry = await storage.recordFomoReframe({
      accountId: parsed.data.accountId,
      appName: parsed.data.appName,
      answer: parsed.data.answer,
      bypassed: reframe.allowBypass,
    });
    res.status(201).json({ entry, ...reframe });
  });

  // ---------- Session clock: counters hidden time awareness ----------
  app.get("/api/session-clock", (req, res) => {
    const opened = String(req.query.openedAt ?? "");
    if (!opened) {
      res.status(400).json({ message: "openedAt query param required." });
      return;
    }
    res.json(sessionClockState(opened));
  });

  // ---------- Tactic of the day (deterministic) ----------
  app.get("/api/anti-addiction/tactic/:accountId", async (req, res) => {
    const id = Number(req.params.accountId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid account id." });
      return;
    }
    const account = await storage.getAccountProfile(id);
    if (!account) {
      res.status(404).json({ message: "Account not found." });
      return;
    }
    res.json({ tactic: tacticOfTheDay(account.profile.hardestTime) });
  });

  return httpServer;
}
