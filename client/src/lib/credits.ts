import type { SafeAccount } from "./auth";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export type CreditSource =
  | "walk"
  | "workout"
  | "breathing"
  | "journal"
  | "gratitude"
  | "homework"
  | "read"
  | "friend"
  | "focus_complete"
  | "shield_skip"
  | "daily_goal";

export type LedgerEntry = {
  id: number;
  accountId: number;
  kind: "earn" | "spend";
  source: string;
  amount: number;
  note: string;
  proof: string;
  createdAt: string;
};

export type FocusPlan = {
  id: number;
  accountId: number;
  title: string;
  difficulty: "gentle" | "friction" | "deep_lock";
  startMinute: number;
  endMinute: number;
  daysMask: number;
  blockedApps: string;
  breakPolicy: "none" | "five_min" | "pomodoro";
  emergencyPassCount: number;
  enabled: boolean;
  createdAt: string;
};

export type AccountabilityBuddy = {
  id: number;
  accountId: number;
  buddyName: string;
  challengeTitle: string;
  minutesSaved: number;
  pointsThisWeek: number;
  active: boolean;
  createdAt: string;
};

export type DailyReport = {
  earnedToday: number;
  spentToday: number;
  earnedThisWeek: number;
  offlineActionsToday: number;
  minutesSavedToday: number;
  weeklyPoints: number;
  streak: number;
  brainEnergy: number;
  unlockMinutes: number;
  latchCredits: number;
};

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data && (data as any).message) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function earnCredits(input: {
  accountId: number;
  source: CreditSource;
  amount: number;
  note?: string;
}): Promise<{ entry: LedgerEntry; account: SafeAccount }> {
  return json("/api/credits/earn", { method: "POST", body: JSON.stringify(input) });
}

export async function spendCredits(input: {
  accountId: number;
  minutes: number;
  appName?: string;
  note?: string;
}): Promise<{ entry: LedgerEntry; account: SafeAccount }> {
  return json("/api/credits/spend", { method: "POST", body: JSON.stringify(input) });
}

export async function listLedger(accountId: number, limit = 30): Promise<{ ledger: LedgerEntry[] }> {
  return json(`/api/credits/ledger/${accountId}?limit=${limit}`);
}

export async function listFocusPlans(accountId: number): Promise<{ plans: FocusPlan[] }> {
  return json(`/api/focus-plans/${accountId}`);
}

export async function createFocusPlan(input: {
  accountId: number;
  title: string;
  difficulty: "gentle" | "friction" | "deep_lock";
  startMinute: number;
  endMinute: number;
  daysMask: number;
  blockedApps: string[];
  breakPolicy: "none" | "five_min" | "pomodoro";
  emergencyPassCount: number;
  enabled: boolean;
}): Promise<{ plan: FocusPlan }> {
  return json("/api/focus-plans", { method: "POST", body: JSON.stringify(input) });
}

export async function toggleFocusPlan(planId: number, enabled: boolean): Promise<{ plan: FocusPlan }> {
  return json(`/api/focus-plans/${planId}/toggle`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export async function deleteFocusPlan(planId: number): Promise<{ ok: boolean }> {
  return json(`/api/focus-plans/${planId}`, { method: "DELETE" });
}

export async function dailyGoalCheckIn(
  accountId: number,
  minutesUsed: number,
): Promise<{ account: SafeAccount; met: boolean; goalMinutes: number; minutesUsed: number; alreadyCheckedIn?: boolean }> {
  return json("/api/daily-goal/check-in", {
    method: "POST",
    body: JSON.stringify({ accountId, minutesUsed }),
  });
}

export async function fetchDailyReport(accountId: number): Promise<{ account: SafeAccount; report: DailyReport }> {
  return json(`/api/daily-report/${accountId}`);
}

export async function listBuddies(accountId: number): Promise<{ buddies: AccountabilityBuddy[] }> {
  return json(`/api/accountability/${accountId}`);
}

export async function createBuddyChallenge(input: {
  accountId: number;
  buddyName: string;
  challengeTitle: string;
}): Promise<{ buddy: AccountabilityBuddy }> {
  return json("/api/accountability/challenge", { method: "POST", body: JSON.stringify(input) });
}

export function formatMinutes(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  const ampm = h < 12 ? "am" : "pm";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function dayMaskToList(mask: number): string[] {
  const names = ["S", "M", "T", "W", "T", "F", "S"];
  return names.filter((_, i) => (mask & (1 << i)) !== 0);
}

export function difficultyLabel(d: FocusPlan["difficulty"]): string {
  return d === "gentle" ? "Gentle" : d === "friction" ? "Friction" : "Deep Lock";
}

export function difficultyCopy(d: FocusPlan["difficulty"]): string {
  return d === "gentle"
    ? "Soft block with a quick pause. Easy to bypass."
    : d === "friction"
      ? "Adds delays + a mini quiz. Skip costs credits."
      : "Hardcore deep focus. No bypass until the window ends.";
}
