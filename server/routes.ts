import type { Express } from "express";
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { storage } from "./storage";
import {
  insertFocusSessionSchema,
  insertProfileSchema,
  insertProtectedAppSchema,
  insertQuestSchema,
  loginSchema,
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

  return httpServer;
}
