import { z } from "zod";

export const userProfileSchema = z.object({
  name: z.string().default(""),
  age: z.number().int().min(8).max(99).optional(),
  currentHours: z.number().min(0).max(18),
  goalHours: z.number().min(0).max(12),
  feelings: z.array(z.string()).default([]),
  hardestTime: z
    .enum(["Morning", "School break", "After homework", "Night", "When bored"])
    .default("Night"),
  topApps: z.array(z.string()).default([]),
});

export const behaviorSchema = z.object({
  completedOfflineActions: z.number().int().min(0).default(0),
  shieldSkips: z.number().int().min(0).default(0),
  shieldUnlocks: z.number().int().min(0).default(0),
  focusCompletions: z.number().int().min(0).default(0),
  coins: z.number().int().min(0).default(0),
  streak: z.number().int().min(0).default(0),
  minutesSavedToday: z.number().min(0).default(0),
});

export const planRequestSchema = z.object({
  profile: userProfileSchema,
  behavior: behaviorSchema.default({
    completedOfflineActions: 0,
    shieldSkips: 0,
    shieldUnlocks: 0,
    focusCompletions: 0,
    coins: 0,
    streak: 0,
    minutesSavedToday: 0,
  }),
});

export const eventSchema = z.object({
  type: z.enum([
    "shield_skip",
    "shield_unlock",
    "focus_complete",
    "offline_action",
    "quest_claim",
    "bridge_boost",
  ]),
  appName: z.string().optional(),
  minutes: z.number().min(0).optional(),
  profile: userProfileSchema,
  behavior: behaviorSchema,
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type Behavior = z.infer<typeof behaviorSchema>;
export type PlanRequest = z.infer<typeof planRequestSchema>;
export type BehaviorEvent = z.infer<typeof eventSchema>;

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

export type NudgeSchedule = {
  hardestTime: string;
  windows: Array<{
    label: string;
    when: string;
    message: string;
  }>;
};

export type WeeklyForecast = {
  currentWeeklyHours: number;
  goalWeeklyHours: number;
  reclaimedHoursPerWeek: number;
  reclaimedHoursPerYear: number;
  paceLabel: "behind" | "on_track" | "ahead";
};

export type RewardTuning = {
  baseCoinMultiplier: number;
  offlineActionRange: [number, number];
  focusReward: number;
  skipBonusRange: [number, number];
  shopDiscountPercent: number;
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
  nudge: NudgeSchedule;
  weeklyForecast: WeeklyForecast;
  coachLine: string;
  generatedAt: string;
};

const DEFAULT_APPS = ["Instagram", "TikTok", "YouTube", "Snapchat", "Games", "Messages"];

const APP_CATEGORY_DIFFICULTY: Record<string, number> = {
  Instagram: 1.1,
  TikTok: 1.35,
  YouTube: 1.05,
  Snapchat: 0.95,
  Games: 1.0,
  Messages: 0.7,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(n: number, places = 0): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

export function computeRiskScore(profile: UserProfile, behavior: Behavior): number {
  const overGoal = Math.max(0, profile.currentHours - profile.goalHours);
  // Each hour over goal contributes ~10 points up to 6h.
  let score = clamp(overGoal * 10, 0, 60);

  if (profile.currentHours >= 8) score += 12;
  else if (profile.currentHours >= 6) score += 8;
  else if (profile.currentHours >= 4) score += 4;

  if (profile.feelings.includes("Regretful")) score += 8;
  if (profile.feelings.includes("Tired")) score += 6;
  if (profile.feelings.includes("Stressed")) score += 5;
  if (profile.feelings.includes("Bored")) score += 3;
  if (profile.feelings.includes("Focused")) score -= 4;
  if (profile.feelings.includes("Happy")) score -= 3;

  if (profile.hardestTime === "Night") score += 6;
  if (profile.hardestTime === "When bored") score += 4;
  if (profile.hardestTime === "Morning") score += 3;

  // Top apps weighted by category difficulty
  const appWeight = profile.topApps.reduce((sum, name) => {
    return sum + (APP_CATEGORY_DIFFICULTY[name] ?? 1);
  }, 0);
  score += appWeight * 2;

  // Behavior signals
  score += behavior.shieldSkips * 1.5;
  score -= behavior.focusCompletions * 3;
  score -= behavior.completedOfflineActions * 2;
  score -= clamp(behavior.streak, 0, 30) * 0.5;

  // Age effects: younger users (<14) and older heavy users (>40) get a small bump
  if (profile.age !== undefined) {
    if (profile.age < 14) score += 5;
    else if (profile.age >= 14 && profile.age <= 22) score += 3;
  }

  return clamp(round(score), 0, 100);
}

export function riskTierFor(score: number): RiskTier {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export function inferPersona(profile: UserProfile, behavior: Behavior): Persona {
  const feelings = new Set(profile.feelings);
  const hard = profile.hardestTime;
  const apps = new Set(profile.topApps);

  // Night scroller: hardest at night and tired
  if (hard === "Night" && (feelings.has("Tired") || profile.currentHours >= 5)) {
    return "night_scroller";
  }
  // Stress scroller: stressed feelings dominant
  if (feelings.has("Stressed") || feelings.has("Regretful")) {
    return "stress_scroller";
  }
  // Boredom scroller: hardest when bored, or has bored feeling
  if (hard === "When bored" || feelings.has("Bored")) {
    return "boredom_scroller";
  }
  // Social validation seeker: heavy on Instagram + Snapchat, often happy/regretful mix
  if (apps.has("Instagram") && (apps.has("Snapchat") || apps.has("Messages"))) {
    return "social_validation_seeker";
  }
  return "balanced_user";
}

const PERSONA_COPY: Record<Persona, { label: string; copy: string }> = {
  boredom_scroller: {
    label: "Boredom Scroller",
    copy: "Your phone fills empty time. Latch will offer a quick swap before the feed starts.",
  },
  night_scroller: {
    label: "Night Scroller",
    copy: "Late nights pull you in. Latch will make night opens slower and bedtime rewards bigger.",
  },
  social_validation_seeker: {
    label: "Social Check-in",
    copy: "You check in for likes and replies. Latch will batch checks and reward calmer streaks.",
  },
  stress_scroller: {
    label: "Stress Scroller",
    copy: "You scroll to escape. Latch will give you a 10-second reset before the feed.",
  },
  balanced_user: {
    label: "Balanced User",
    copy: "You're already doing well. Latch will keep shields light and reward focus wins.",
  },
};

export function buildShields(
  profile: UserProfile,
  behavior: Behavior,
  riskScore: number,
  persona: Persona,
): AdaptiveAppShield[] {
  const apps = profile.topApps.length > 0 ? profile.topApps : ["Instagram"];
  const tier = riskTierFor(riskScore);

  // Base values by tier
  const baseDelay = tier === "critical" ? 12 : tier === "high" ? 9 : tier === "medium" ? 6 : 4;
  const baseLimit = tier === "critical" ? 3 : tier === "high" ? 5 : tier === "medium" ? 7 : 10;
  const baseCost = tier === "critical" ? 18 : tier === "high" ? 12 : tier === "medium" ? 8 : 5;

  return apps.map((appName): AdaptiveAppShield => {
    const difficulty = APP_CATEGORY_DIFFICULTY[appName] ?? 1;
    let delay = Math.round(baseDelay * difficulty);
    let limit = Math.max(2, Math.round(baseLimit / difficulty));
    let cost = Math.round(baseCost * difficulty);
    let mode: ShieldMode = "soft";
    let reason = "Light pause to break autopilot.";

    if (persona === "night_scroller") {
      delay += 3;
      reason = "Slower opens around your hardest time at night.";
    }
    if (persona === "stress_scroller") {
      delay += 2;
      reason = "Tiny breath gate before you escape into the feed.";
    }
    if (persona === "boredom_scroller") {
      cost += 2;
      reason = "Costs a coin so a real-life swap feels easier.";
    }
    if (persona === "social_validation_seeker") {
      limit = Math.max(2, limit - 2);
      reason = "Shorter sessions so checks stay quick.";
    }

    if (tier === "high" || tier === "critical") {
      mode = "focus";
    }
    if (tier === "critical" && difficulty >= 1.2) {
      mode = "hard";
    }

    // Behavior adjustments: many skips => trust earned, ease delay slightly
    if (behavior.shieldSkips >= 5 && behavior.focusCompletions >= 3) {
      delay = Math.max(3, delay - 2);
    }

    return {
      appName,
      delaySeconds: clamp(delay, 3, 25),
      sessionLimitMinutes: clamp(limit, 2, 20),
      coinCost: clamp(cost, 3, 30),
      mode,
      reason,
    };
  });
}

export function buildRecommendations(
  profile: UserProfile,
  behavior: Behavior,
  persona: Persona,
  riskScore: number,
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (persona === "night_scroller") {
    recs.push({
      id: "night_park",
      title: "Park your phone an hour before bed",
      body: "Set a charging spot outside your room. Latch can lock feeds at lights-out.",
      priority: 1,
    });
  }
  if (persona === "boredom_scroller") {
    recs.push({
      id: "boredom_swap",
      title: "Pick a 10-minute walk first",
      body: "Try a quick walk or stretch before opening the feed for a mystery reward.",
      priority: 1,
    });
  }
  if (persona === "stress_scroller") {
    recs.push({
      id: "stress_reset",
      title: "Try a 60-second reset",
      body: "Three slow breaths, drink water, then choose. Latch banks coins for the pause.",
      priority: 1,
    });
  }
  if (persona === "social_validation_seeker") {
    recs.push({
      id: "batch_checks",
      title: "Batch your social checks",
      body: "Check messages in 2 windows. Latch will reward the gap between them.",
      priority: 1,
    });
  }
  if (persona === "balanced_user") {
    recs.push({
      id: "balanced_focus",
      title: "Keep your streak",
      body: "Run one focus sprint today to lock in your good rhythm.",
      priority: 1,
    });
  }

  if (riskScore >= 60) {
    recs.push({
      id: "shield_top_app",
      title: `Tighten shield on ${profile.topApps[0] ?? "your top app"}`,
      body: "Increase the pause and shorten the session for one week.",
      priority: 2,
    });
  }
  if (behavior.focusCompletions === 0) {
    recs.push({
      id: "first_focus",
      title: "Try one focus sprint",
      body: "A single phone-free block earns coins and proves the system to your brain.",
      priority: 3,
    });
  }
  if (behavior.completedOfflineActions === 0) {
    recs.push({
      id: "first_swap",
      title: "Pick a real-life swap",
      body: "Tiny actions like a walk or a glass of water unlock surprise rewards.",
      priority: 3,
    });
  }
  if (profile.feelings.includes("Tired")) {
    recs.push({
      id: "tired_help",
      title: "Sleep first, scroll later",
      body: "Latch will dim notifications and make night opens slower.",
      priority: 2,
    });
  }

  return recs.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

export function buildRewardTuning(riskScore: number, persona: Persona, behavior: Behavior): RewardTuning {
  const tier = riskTierFor(riskScore);
  let multiplier = tier === "critical" ? 1.4 : tier === "high" ? 1.25 : tier === "medium" ? 1.1 : 1.0;
  if (persona === "night_scroller") multiplier += 0.1;
  if (persona === "boredom_scroller") multiplier += 0.05;

  const offlineLow = Math.round(8 * multiplier);
  const offlineHigh = Math.round(24 * multiplier);
  const skipLow = Math.round(6 * multiplier);
  const skipHigh = Math.round(22 * multiplier);

  // Streak holders unlock a small shop discount
  const shopDiscountPercent = behavior.streak >= 7 ? 10 : behavior.streak >= 14 ? 15 : 0;

  return {
    baseCoinMultiplier: round(multiplier, 2),
    offlineActionRange: [offlineLow, offlineHigh],
    focusReward: Math.round(22 * multiplier),
    skipBonusRange: [skipLow, skipHigh],
    shopDiscountPercent,
  };
}

export function buildNudges(profile: UserProfile, persona: Persona, riskScore: number): NudgeSchedule {
  const tier = riskTierFor(riskScore);
  const base: NudgeSchedule["windows"] = [];
  switch (profile.hardestTime) {
    case "Night":
      base.push({
        label: "Pre-bed park",
        when: "21:30",
        message: "Phone bedtime is in 30 min. Lumi has a 1-tap park ready.",
      });
      break;
    case "Morning":
      base.push({
        label: "First-hour shield",
        when: "07:00",
        message: "Keep feeds locked for the first hour. Win the morning.",
      });
      break;
    case "School break":
      base.push({
        label: "Break swap",
        when: "12:30",
        message: "Quick break swap: 5 min walk earns mystery coins.",
      });
      break;
    case "After homework":
      base.push({
        label: "Reset before reward",
        when: "19:00",
        message: "Homework done. Try a focus sprint before the feed.",
      });
      break;
    case "When bored":
      base.push({
        label: "Boredom swap",
        when: "any",
        message: "Bored? Tap a swap before the feed. Lumi has 4 tiny missions.",
      });
      break;
  }

  if (tier === "high" || tier === "critical") {
    base.push({
      label: "Mid-day check",
      when: "15:00",
      message: "Halfway through the day. Latch can run a quick reset with you.",
    });
  }

  if (persona === "night_scroller") {
    base.push({
      label: "Lights-out lock",
      when: "23:00",
      message: "Lock feeds for the night. Tomorrow-you will thank you.",
    });
  }

  return { hardestTime: profile.hardestTime, windows: base };
}

export function buildForecast(profile: UserProfile, behavior: Behavior): WeeklyForecast {
  const currentWeeklyHours = round(profile.currentHours * 7, 1);
  const goalWeeklyHours = round(profile.goalHours * 7, 1);
  const projectedDailySaved = clamp(
    (profile.currentHours - profile.goalHours) *
      (0.3 + Math.min(0.6, behavior.focusCompletions * 0.05 + behavior.completedOfflineActions * 0.04)),
    0,
    profile.currentHours,
  );
  const reclaimedHoursPerWeek = round(projectedDailySaved * 7, 1);
  const reclaimedHoursPerYear = round(projectedDailySaved * 365, 0);

  let pace: WeeklyForecast["paceLabel"] = "on_track";
  if (behavior.minutesSavedToday >= (profile.currentHours - profile.goalHours) * 60 * 0.7) {
    pace = "ahead";
  } else if (behavior.minutesSavedToday < (profile.currentHours - profile.goalHours) * 60 * 0.2) {
    pace = "behind";
  }

  return {
    currentWeeklyHours,
    goalWeeklyHours,
    reclaimedHoursPerWeek,
    reclaimedHoursPerYear,
    paceLabel: pace,
  };
}

function buildCoachLine(profile: UserProfile, persona: Persona, riskScore: number): string {
  const name = profile.name?.trim() || "friend";
  const tier = riskTierFor(riskScore);
  if (tier === "low") {
    return `Nice rhythm, ${name}. Latch will stay light and reward your wins.`;
  }
  if (persona === "night_scroller") {
    return `${name}, nights are your tough spot. We'll slow them down and pay you for parking the phone.`;
  }
  if (persona === "stress_scroller") {
    return `${name}, scrolling can feel like rest, but it isn't. Try one breath before the feed.`;
  }
  if (persona === "boredom_scroller") {
    return `${name}, boredom is the real cue. We'll have a swap ready before the feed.`;
  }
  if (persona === "social_validation_seeker") {
    return `${name}, you don't need to refresh to be liked. Let's batch checks and protect your day.`;
  }
  return `${name}, small wins compound. One focus sprint moves the whole week.`;
}

export function buildPlan(req: PlanRequest): PersonalizationPlan {
  const { profile, behavior } = req;
  const riskScore = computeRiskScore(profile, behavior);
  const persona = inferPersona(profile, behavior);
  const shields = buildShields(profile, behavior, riskScore, persona);
  const recommendations = buildRecommendations(profile, behavior, persona, riskScore);
  const rewardTuning = buildRewardTuning(riskScore, persona, behavior);
  const nudge = buildNudges(profile, persona, riskScore);
  const weeklyForecast = buildForecast(profile, behavior);
  const personaInfo = PERSONA_COPY[persona];

  return {
    riskScore,
    riskTier: riskTierFor(riskScore),
    persona,
    personaLabel: personaInfo.label,
    personaCopy: personaInfo.copy,
    primaryShieldApp: shields[0]?.appName ?? "Instagram",
    shields,
    recommendations,
    rewardTuning,
    nudge,
    weeklyForecast,
    coachLine: buildCoachLine(profile, persona, riskScore),
    generatedAt: new Date().toISOString(),
  };
}

export function applyEvent(event: BehaviorEvent): { plan: PersonalizationPlan; feedback: string } {
  const updated: Behavior = { ...event.behavior };
  let feedback = "";

  switch (event.type) {
    case "shield_skip":
      updated.shieldSkips += 1;
      updated.minutesSavedToday += 4;
      feedback = "Skip banked. Lumi is making future opens a touch easier.";
      break;
    case "shield_unlock":
      updated.shieldUnlocks += 1;
      feedback = "Unlock used. Tomorrow's pause might run a little longer.";
      break;
    case "focus_complete":
      updated.focusCompletions += 1;
      updated.minutesSavedToday += event.minutes ?? 25;
      feedback = "Focus locked in. Coin multiplier just got friendlier.";
      break;
    case "offline_action":
      updated.completedOfflineActions += 1;
      updated.minutesSavedToday += event.minutes ?? 10;
      feedback = "Real-life swap counted. Mystery rewards are leveling up.";
      break;
    case "quest_claim":
      feedback = "Quest claimed. Streak armor +1.";
      break;
    case "bridge_boost":
      updated.minutesSavedToday += 2;
      feedback = "Bridge boost added. Nice transition out of scroll mode.";
      break;
  }

  const plan = buildPlan({ profile: event.profile, behavior: updated });
  return { plan, feedback };
}

export function demoPlan(): PersonalizationPlan {
  return buildPlan({
    profile: {
      name: "Demo",
      age: 16,
      currentHours: 5.5,
      goalHours: 2,
      feelings: ["Tired", "Bored", "Regretful"],
      hardestTime: "Night",
      topApps: ["Instagram", "TikTok"],
    },
    behavior: {
      completedOfflineActions: 1,
      shieldSkips: 2,
      shieldUnlocks: 1,
      focusCompletions: 1,
      coins: 84,
      streak: 9,
      minutesSavedToday: 32,
    },
  });
}
