import type { Express } from "express";
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { storage } from "./storage";
import { insertFocusSessionSchema, insertProfileSchema, insertProtectedAppSchema, insertQuestSchema } from "@shared/schema";
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

  return httpServer;
}
