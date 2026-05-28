/**
 * Client-side fetch helpers for the anti-addiction routes.
 *
 * Each function maps 1:1 to an endpoint in server/routes.ts under the
 * `/api/anti-addiction/*`, `/api/batch-windows`, `/api/reflection`,
 * `/api/detox-plans`, `/api/feed-audit`, `/api/bedroom-charger`,
 * `/api/autoplay-checklist`, and `/api/fomo-reframe` paths.
 */
import { apiRequest } from "./queryClient";

export type TacticCard = {
  id: string;
  tactic: string;
  description: string;
  counter: string;
  sourceHint: string;
};

export type BookRecommendation = {
  id: string;
  title: string;
  author: string;
  why: string;
};

export type DetoxFramework =
  | "lembke_30"
  | "newport_30"
  | "price_30"
  | "primer_7"
  | "primer_3";

export type AntiAddictionPlan = {
  tacticOfTheDay: TacticCard;
  reflectionQuestion: string;
  recommendedDetox: {
    framework: DetoxFramework;
    label: string;
    days: number;
    rationale: string;
  };
  books: BookRecommendation[];
  quickWins: string[];
};

export async function fetchReference(): Promise<{
  tactics: TacticCard[];
  books: BookRecommendation[];
}> {
  const res = await apiRequest("GET", "/api/anti-addiction/reference");
  return res.json();
}

export async function fetchPlan(accountId: number): Promise<AntiAddictionPlan> {
  const res = await apiRequest("GET", `/api/anti-addiction/plan/${accountId}`);
  const json = await res.json();
  return json.plan;
}

export type BatchWindow = {
  startMinute: number;
  endMinute: number;
  label: string;
};

export async function saveBatchWindows(
  accountId: number,
  windows: BatchWindow[],
  apps: string[],
): Promise<void> {
  await apiRequest("POST", "/api/batch-windows", { accountId, windows, apps });
}

export async function fetchBatchWindows(accountId: number): Promise<{
  windows: Array<BatchWindow & { id: number }>;
  outsideAllWindows: boolean;
  minutesUntilNext: number;
}> {
  const res = await apiRequest("GET", `/api/batch-windows/${accountId}`);
  return res.json();
}

export async function postReflection(input: {
  accountId: number;
  appName: string;
  intention: string;
  breathSeconds: number;
}): Promise<{
  question: string;
  offlineSwap: { activity: string; minutes: number; reason: string };
}> {
  const res = await apiRequest("POST", "/api/reflection", input);
  return res.json();
}

export async function startDetox(input: {
  accountId: number;
  framework: DetoxFramework;
  startedAt: string;
  bannedApps: string[];
}): Promise<void> {
  await apiRequest("POST", "/api/detox-plans", input);
}

export async function fetchDetoxPlans(accountId: number): Promise<{
  plans: Array<{
    id: number;
    framework: DetoxFramework;
    label: string;
    startedAt: string;
    durationDays: number;
    active: boolean;
    progress: { dayNumber: number; totalDays: number; ratio: number; complete: boolean };
  }>;
}> {
  const res = await apiRequest("GET", `/api/detox-plans/${accountId}`);
  return res.json();
}

export async function postFeedAudit(input: {
  accountId: number;
  action: "unfollow" | "mute" | "block" | "remove_app";
  platform: string;
  count: number;
  note?: string;
}): Promise<{ creditsAwarded: number }> {
  const res = await apiRequest("POST", "/api/feed-audit", input);
  return res.json();
}

export async function postBedroomCharger(input: {
  accountId: number;
  chargedOutsideBedroom: boolean;
  bedtimeIso: string;
}): Promise<void> {
  await apiRequest("POST", "/api/bedroom-charger", input);
}

export async function fetchBedroomChargerStreak(accountId: number): Promise<{
  currentStreak: number;
}> {
  const res = await apiRequest("GET", `/api/bedroom-charger/${accountId}`);
  return res.json();
}

export type AutoplayKey =
  | "youtube_autoplay_off"
  | "youtube_shorts_hidden"
  | "instagram_reels_muted"
  | "tiktok_restricted_mode"
  | "snapchat_stories_muted"
  | "notifications_off_non_essential"
  | "grayscale_enabled"
  | "remove_home_screen_icons";

export async function saveAutoplayChecklist(input: {
  accountId: number;
  toggles: Array<{ key: AutoplayKey; done: boolean }>;
}): Promise<{ scorePercent: number; nextStep: string | null }> {
  const res = await apiRequest("POST", "/api/autoplay-checklist", input);
  return res.json();
}

export async function fetchAutoplayChecklist(accountId: number): Promise<{
  checklist: { toggles: Array<{ key: AutoplayKey; done: boolean }>; scorePercent: number } | null;
  nextStep: string | null;
}> {
  const res = await apiRequest("GET", `/api/autoplay-checklist/${accountId}`);
  return res.json();
}

export async function postFomoReframe(input: {
  accountId: number;
  appName: string;
  answer: "want_to" | "afraid_not_to" | "habit" | "boredom";
}): Promise<{ message: string; allowBypass: boolean; cooldownSeconds: number }> {
  const res = await apiRequest("POST", "/api/fomo-reframe", input);
  return res.json();
}
