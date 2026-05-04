import { apiRequest } from "./queryClient";

export type RiskTier = "low" | "medium" | "high" | "critical";
export type Persona =
  | "boredom_scroller"
  | "night_scroller"
  | "social_validation_seeker"
  | "stress_scroller"
  | "balanced_user";
export type ShieldMode = "soft" | "focus" | "hard";

export type AdaptiveAppShield = {
  appName: string;
  delaySeconds: number;
  sessionLimitMinutes: number;
  coinCost: number;
  mode: ShieldMode;
  reason: string;
};

export type Recommendation = {
  id: string;
  title: string;
  body: string;
  priority: number;
};

export type NudgeWindow = {
  label: string;
  when: string;
  message: string;
};

export type RewardTuning = {
  baseCoinMultiplier: number;
  offlineActionRange: [number, number];
  focusReward: number;
  skipBonusRange: [number, number];
  shopDiscountPercent: number;
};

export type WeeklyForecast = {
  currentWeeklyHours: number;
  goalWeeklyHours: number;
  reclaimedHoursPerWeek: number;
  reclaimedHoursPerYear: number;
  paceLabel: "behind" | "on_track" | "ahead";
};

export type PersonalizationPlan = {
  riskScore: number;
  riskTier: RiskTier;
  persona: Persona;
  personaLabel: string;
  personaCopy: string;
  primaryShieldApp: string;
  shields: AdaptiveAppShield[];
  recommendations: Recommendation[];
  rewardTuning: RewardTuning;
  nudge: { hardestTime: string; windows: NudgeWindow[] };
  weeklyForecast: WeeklyForecast;
  coachLine: string;
  generatedAt: string;
};

export type PlanProfilePayload = {
  name: string;
  age?: number;
  currentHours: number;
  goalHours: number;
  feelings: string[];
  hardestTime: "Morning" | "School break" | "After homework" | "Night" | "When bored";
  topApps: string[];
};

export type BehaviorPayload = {
  completedOfflineActions: number;
  shieldSkips: number;
  shieldUnlocks: number;
  focusCompletions: number;
  coins: number;
  streak: number;
  minutesSavedToday: number;
};

export type EventType =
  | "shield_skip"
  | "shield_unlock"
  | "focus_complete"
  | "offline_action"
  | "quest_claim"
  | "bridge_boost";

export async function fetchPlan(
  profile: PlanProfilePayload,
  behavior: BehaviorPayload,
): Promise<PersonalizationPlan> {
  const res = await apiRequest("POST", "/api/personalization/plan", { profile, behavior });
  return (await res.json()) as PersonalizationPlan;
}

export async function postEvent(
  type: EventType,
  profile: PlanProfilePayload,
  behavior: BehaviorPayload,
  extra: { appName?: string; minutes?: number } = {},
): Promise<{ plan: PersonalizationPlan; feedback: string }> {
  const res = await apiRequest("POST", "/api/personalization/event", {
    type,
    profile,
    behavior,
    ...extra,
  });
  return (await res.json()) as { plan: PersonalizationPlan; feedback: string };
}

export function fallbackPlan(profile: PlanProfilePayload): PersonalizationPlan {
  const overGoal = Math.max(0, profile.currentHours - profile.goalHours);
  const riskScore = Math.min(100, Math.round(overGoal * 10) + 20);
  return {
    riskScore,
    riskTier: riskScore >= 60 ? "high" : riskScore >= 35 ? "medium" : "low",
    persona: "balanced_user",
    personaLabel: "Balanced User",
    personaCopy: "Latch is using offline defaults. Once the API is reachable, your plan will personalize.",
    primaryShieldApp: profile.topApps[0] ?? "Instagram",
    shields: (profile.topApps.length > 0 ? profile.topApps : ["Instagram"]).map((appName) => ({
      appName,
      delaySeconds: 6,
      sessionLimitMinutes: 7,
      coinCost: 10,
      mode: "soft" as const,
      reason: "Default friction.",
    })),
    recommendations: [
      {
        id: "first_focus",
        title: "Try one focus sprint",
        body: "A single phone-free block earns coins and proves the system to your brain.",
        priority: 1,
      },
    ],
    rewardTuning: {
      baseCoinMultiplier: 1,
      offlineActionRange: [8, 24],
      focusReward: 22,
      skipBonusRange: [6, 22],
      shopDiscountPercent: 0,
    },
    nudge: {
      hardestTime: profile.hardestTime,
      windows: [
        {
          label: "Default reminder",
          when: "any",
          message: "Lumi will keep your shields running while we reconnect.",
        },
      ],
    },
    weeklyForecast: {
      currentWeeklyHours: Math.round(profile.currentHours * 7 * 10) / 10,
      goalWeeklyHours: Math.round(profile.goalHours * 7 * 10) / 10,
      reclaimedHoursPerWeek: Math.round(overGoal * 7 * 0.4 * 10) / 10,
      reclaimedHoursPerYear: Math.round(overGoal * 365 * 0.4),
      paceLabel: "on_track",
    },
    coachLine: `Hey ${profile.name || "friend"}, Latch is in offline mode. Your plan will personalize when the API reconnects.`,
    generatedAt: new Date().toISOString(),
  };
}

export function profileToPayload(p: {
  name: string;
  age: string;
  currentHours: number;
  goalHours: number;
  feelings: string[];
  hardestTime: string;
  topApps: string[];
}): PlanProfilePayload {
  const allowedTimes: PlanProfilePayload["hardestTime"][] = [
    "Morning",
    "School break",
    "After homework",
    "Night",
    "When bored",
  ];
  const hardestTime = allowedTimes.includes(p.hardestTime as PlanProfilePayload["hardestTime"])
    ? (p.hardestTime as PlanProfilePayload["hardestTime"])
    : "Night";
  const ageNum = Number.parseInt(p.age, 10);
  return {
    name: p.name,
    age: Number.isFinite(ageNum) ? ageNum : undefined,
    currentHours: p.currentHours,
    goalHours: p.goalHours,
    feelings: p.feelings,
    hardestTime,
    topApps: p.topApps,
  };
}
