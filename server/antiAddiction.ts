/**
 * Anti-addiction tactics engine.
 *
 * Each function in this module counters a specific psychology tactic that
 * social media platforms use to maximize "time on app". Tactics referenced:
 *
 *   1.  Variable reward schedules (B.F. Skinner slot-machine effect)
 *   2.  Infinite scroll / no stopping cues
 *   3.  Dopamine-hijacked social connection (Anna Lembke, Stanford)
 *   4.  Autoplay / algorithmic rabbit holes
 *   5.  Engineered FOMO and disappearing content
 *   6.  Notifications as Zeigarnik triggers
 *   7.  Hidden time awareness
 *   8.  Personalization algorithms / curated feeds
 *   9.  Emotional steering / confirmshaming
 *   10. Re-engagement emails and push campaigns
 *
 * The module is intentionally framework-free and deterministic so it can be
 * unit-tested without spinning up Express, SQLite, or React.
 */

import { z } from "zod";

// --------------------------------------------------------------------------
// Schemas
// --------------------------------------------------------------------------

export const batchWindowSchema = z.object({
  accountId: z.number().int().positive(),
  // 24h clock minutes-of-day (0-1439). Two or three windows is the sweet spot
  // recommended by the Scripps "8 tips to reduce screen time" research: check
  // apps only at set times to remove the unpredictability loop.
  windows: z
    .array(
      z.object({
        startMinute: z.number().int().min(0).max(1439),
        endMinute: z.number().int().min(1).max(1440),
        label: z.string().max(40).default("Check-in"),
      }),
    )
    .min(1)
    .max(4),
  apps: z.array(z.string().min(1).max(40)).min(1).max(20),
});

export const reflectionPromptSchema = z.object({
  accountId: z.number().int().positive(),
  appName: z.string().min(1).max(40),
  intention: z.string().min(1).max(200),
  // ScreenZen-style mandatory pause. 5-15 seconds breaks the automatic reflex
  // before the prefrontal cortex hands control to habit.
  breathSeconds: z.number().int().min(3).max(60).default(8),
});

export const detoxPlanSchema = z.object({
  accountId: z.number().int().positive(),
  // Lembke's "Dopamine Nation" recommends a 30-day fast to reset baseline.
  // We also expose Cal Newport (Digital Minimalism) and Catherine Price
  // ("How to Break Up With Your Phone") 30-day plans, plus shorter primers.
  framework: z
    .enum(["lembke_30", "newport_30", "price_30", "primer_7", "primer_3"])
    .default("primer_7"),
  startedAt: z.string().min(1),
  bannedApps: z.array(z.string().min(1).max(40)).default([]),
});

export const feedAuditSchema = z.object({
  accountId: z.number().int().positive(),
  // The AAP "problematic media use" guidance recommends a per-account audit:
  // unfollow / mute accounts that don't serve you. Each report earns Latch
  // Credits to make the offline work tangible.
  action: z.enum(["unfollow", "mute", "block", "remove_app"]),
  platform: z.string().min(1).max(40),
  count: z.number().int().min(1).max(500),
  note: z.string().max(200).optional(),
});

export const bedroomChargerSchema = z.object({
  accountId: z.number().int().positive(),
  // Multiple sources (Georgetown digital detox guide, NAMI) call this the
  // single highest-ROI action a user can take.
  chargedOutsideBedroom: z.boolean(),
  bedtimeIso: z.string().min(1),
});

export const autoplayChecklistSchema = z.object({
  accountId: z.number().int().positive(),
  // Each item maps to a real toggle the user must flip inside the social app.
  // The Scripps research and AAP guidance both call out autoplay-off as the
  // dominant counter-move to algorithmic rabbit holes.
  toggles: z.array(
    z.object({
      key: z.enum([
        "youtube_autoplay_off",
        "youtube_shorts_hidden",
        "instagram_reels_muted",
        "tiktok_restricted_mode",
        "snapchat_stories_muted",
        "notifications_off_non_essential",
        "grayscale_enabled",
        "remove_home_screen_icons",
      ]),
      done: z.boolean(),
    }),
  ),
});

export const fomoReframeSchema = z.object({
  accountId: z.number().int().positive(),
  appName: z.string().min(1).max(40),
  // When the user tries to bypass a shield or focus plan, ask them to answer
  // honestly. This is the "intentional viewing" counter-move recommended by
  // the Crisis Text Line research on stopping doomscrolling.
  answer: z.enum(["want_to", "afraid_not_to", "habit", "boredom"]),
});

export type BatchWindowInput = z.infer<typeof batchWindowSchema>;
export type ReflectionPromptInput = z.infer<typeof reflectionPromptSchema>;
export type DetoxPlanInput = z.infer<typeof detoxPlanSchema>;
export type FeedAuditInput = z.infer<typeof feedAuditSchema>;
export type BedroomChargerInput = z.infer<typeof bedroomChargerSchema>;
export type AutoplayChecklistInput = z.infer<typeof autoplayChecklistSchema>;
export type FomoReframeInput = z.infer<typeof fomoReframeSchema>;

// --------------------------------------------------------------------------
// Static research-backed copy
// --------------------------------------------------------------------------

export type TacticCard = {
  id: string;
  tactic: string;
  description: string;
  counter: string;
  sourceHint: string;
};

/**
 * 10 research-backed tactic cards shown inline in the app. The copy is short
 * enough to be read in 10 seconds and ends with the counter-move so users
 * leave the card with something to do, not just something to feel bad about.
 */
export const TACTIC_CARDS: TacticCard[] = [
  {
    id: "variable_rewards",
    tactic: "Variable rewards",
    description:
      "Likes, comments, and views arrive on an unpredictable schedule. Your brain releases dopamine in anticipation, the same loop that drives slot machines.",
    counter:
      "Use Batch Windows: check apps only at fixed times so the reward stops being unpredictable.",
    sourceHint: "B.F. Skinner; Anna Lembke (Stanford)",
  },
  {
    id: "infinite_scroll",
    tactic: "Infinite scroll",
    description:
      "There is no bottom of the feed, so your prefrontal cortex has to actively choose to stop every single time.",
    counter:
      "Set a hard daily cap with Latch's daily-goal check-in. Stop is now a default, not a decision.",
    sourceHint: "Aza Raskin (inventor of infinite scroll, later regretted it)",
  },
  {
    id: "dopamine_social",
    tactic: "Hijacked social connection",
    description:
      "Every like and follow gives a small dopamine hit. Repeating those hits all day raises your baseline so real life feels duller.",
    counter:
      "Run a Latch detox: 3, 7, or 30 days lets your baseline reset so a single offline conversation feels rewarding again.",
    sourceHint: "Dr. Anna Lembke, Dopamine Nation",
  },
  {
    id: "autoplay",
    tactic: "Autoplay + rabbit holes",
    description:
      "Autoplay and algorithmic feeds choose the next clip for you. The algorithm never decides to stop; only you can.",
    counter:
      "Use Latch's autoplay checklist to flip off autoplay and recommendations inside each social app.",
    sourceHint: "Scripps Health screen-time research",
  },
  {
    id: "fomo",
    tactic: "Engineered FOMO",
    description:
      "Stories disappear in 24 hours. Live indicators say someone is online now. You feel anxious about missing something even when nothing is happening.",
    counter:
      "Ask yourself: 'Am I watching this because I want to, or because I'm afraid not to?' Honest answer changes the choice.",
    sourceHint: "Crisis Text Line, stopping-doomscrolling guide",
  },
  {
    id: "notifications",
    tactic: "Notifications as triggers",
    description:
      "Each notification opens an 'unfinished task' loop your brain wants to close. Platforms send notifications even for irrelevant activity to re-engage you.",
    counter:
      "Turn off all non-essential notifications today — this single step is the highest-ROI move.",
    sourceHint: "Zeigarnik Effect; multiple intervention studies",
  },
  {
    id: "hidden_time",
    tactic: "Hidden time awareness",
    description:
      "Theater mode, fullscreen, and ambient layouts hide the clock so you lose track of how long you've been scrolling.",
    counter:
      "Latch shows a live session clock. Enable grayscale mode to make the screen less stimulating.",
    sourceHint: "Themycenaean dark-patterns review",
  },
  {
    id: "personalization",
    tactic: "Personalization algorithm",
    description:
      "Every click and pause trains the algorithm. The feed becomes uncannily relevant, which is exactly why it's so hard to leave.",
    counter:
      "Run a Feed Audit: unfollow, mute, and remove accounts that don't serve you. Latch rewards you for each.",
    sourceHint: "Psychology Today; AAP problematic-media-use guidance",
  },
  {
    id: "confirmshaming",
    tactic: "Confirmshaming on exit",
    description:
      "'Your friends will miss you' / 'Are you sure you want to delete your memories?' This is engineered guilt, not genuine social obligation.",
    counter:
      "Recognize the language for what it is. Latch never uses confirmshaming on its own exit flows.",
    sourceHint: "Themycenaean dark-patterns review",
  },
  {
    id: "reengagement",
    tactic: "Re-engagement email blasts",
    description:
      "Even after you delete the app, platforms email you 'we miss you' and push notifications about celebrity posts to pull you back.",
    counter:
      "Unsubscribe from platform emails and use a separate inbox for any social accounts you keep.",
    sourceHint: "Psychology Today, Why social media is enticing",
  },
];

// --------------------------------------------------------------------------
// Recommended books (Lembke, Newport, Price, Alter, Turkle)
// --------------------------------------------------------------------------

export type BookRecommendation = {
  id: string;
  title: string;
  author: string;
  why: string;
};

export const BOOKS: BookRecommendation[] = [
  {
    id: "dopamine_nation",
    title: "Dopamine Nation",
    author: "Dr. Anna Lembke",
    why: "Explains how apps hijack the brain's reward pathways. Prescribes a 30-day fast to reset baselines.",
  },
  {
    id: "digital_minimalism",
    title: "Digital Minimalism",
    author: "Cal Newport",
    why: "30-day plan to eliminate optional tech and reintroduce only what genuinely adds value. Not abstinence, not cold turkey.",
  },
  {
    id: "break_up_phone",
    title: "How to Break Up With Your Phone",
    author: "Catherine Price",
    why: "Practical 30-day action guide with concrete tracking and habit techniques.",
  },
  {
    id: "irresistible",
    title: "Irresistible",
    author: "Adam Alter",
    why: "Deep dive on how behavioral addiction is engineered. Reframes scrolling as addiction, not weakness.",
  },
  {
    id: "reclaiming_conversation",
    title: "Reclaiming Conversation",
    author: "Sherry Turkle (MIT)",
    why: "What we lose socially from screen overuse, and how to rebuild face-to-face connection.",
  },
];

// --------------------------------------------------------------------------
// Helper functions
// --------------------------------------------------------------------------

/**
 * Returns true when the given minute-of-day falls outside ALL batch windows.
 * The native iOS / Android layer should treat this as "shields fully on".
 */
export function isOutsideBatchWindows(
  nowMinuteOfDay: number,
  windows: BatchWindowInput["windows"],
): boolean {
  if (windows.length === 0) return false;
  for (const w of windows) {
    if (nowMinuteOfDay >= w.startMinute && nowMinuteOfDay < w.endMinute) {
      return false;
    }
  }
  return true;
}

/**
 * Returns minutes until the next allowed batch window. Useful for surfacing a
 * "next check-in at 12:00" message instead of a generic block screen.
 */
export function minutesUntilNextWindow(
  nowMinuteOfDay: number,
  windows: BatchWindowInput["windows"],
): number {
  if (windows.length === 0) return 0;
  const sorted = [...windows].sort((a, b) => a.startMinute - b.startMinute);
  for (const w of sorted) {
    if (w.startMinute > nowMinuteOfDay) return w.startMinute - nowMinuteOfDay;
  }
  // No more windows today; return time until first window tomorrow.
  return 1440 - nowMinuteOfDay + sorted[0].startMinute;
}

/**
 * Computes the duration in days for a detox framework. Used for progress bars
 * and milestone messaging.
 */
export function detoxDurationDays(framework: DetoxPlanInput["framework"]): number {
  switch (framework) {
    case "lembke_30":
    case "newport_30":
    case "price_30":
      return 30;
    case "primer_7":
      return 7;
    case "primer_3":
      return 3;
  }
}

/**
 * Returns the human-readable name of the detox framework.
 */
export function detoxFrameworkLabel(framework: DetoxPlanInput["framework"]): string {
  switch (framework) {
    case "lembke_30":
      return "Lembke 30-day dopamine reset";
    case "newport_30":
      return "Newport Digital Minimalism";
    case "price_30":
      return "Price 30-day phone breakup";
    case "primer_7":
      return "7-day starter primer";
    case "primer_3":
      return "3-day weekend primer";
  }
}

/**
 * Returns the progress (0-1) of a detox plan given the start time.
 */
export function detoxProgress(
  startedAtIso: string,
  framework: DetoxPlanInput["framework"],
  now: Date = new Date(),
): { dayNumber: number; totalDays: number; ratio: number; complete: boolean } {
  const totalDays = detoxDurationDays(framework);
  const start = new Date(startedAtIso);
  const elapsedMs = now.getTime() - start.getTime();
  const elapsedDays = Math.max(0, elapsedMs / (1000 * 60 * 60 * 24));
  const dayNumber = Math.min(totalDays, Math.floor(elapsedDays) + 1);
  const ratio = Math.min(1, elapsedDays / totalDays);
  return { dayNumber, totalDays, ratio, complete: ratio >= 1 };
}

/**
 * Credit reward for completing a feed-audit action. Larger batches earn more
 * but with diminishing returns so users can't game the system.
 */
export function feedAuditReward(count: number): number {
  if (count <= 0) return 0;
  // 2 credits per unfollow, capped at 30, with sqrt-ish diminishing returns.
  return Math.min(30, Math.round(2 * Math.sqrt(count) + count * 0.4));
}

/**
 * Returns a research-backed reframe message for a FOMO bypass attempt.
 */
export function fomoReframeMessage(
  answer: FomoReframeInput["answer"],
  appName: string,
): { message: string; allowBypass: boolean; cooldownSeconds: number } {
  switch (answer) {
    case "want_to":
      return {
        message: `Honest answer noted. Opening ${appName} for ${30}s with a session clock visible.`,
        allowBypass: true,
        cooldownSeconds: 0,
      };
    case "afraid_not_to":
      return {
        message:
          "That's FOMO. Stories will still be there tomorrow — but the time you spent today won't come back. Try one offline action instead.",
        allowBypass: false,
        cooldownSeconds: 120,
      };
    case "habit":
      return {
        message:
          "Habit, not intent. Latch will hold the door for 60 seconds so you can decide on purpose this time.",
        allowBypass: false,
        cooldownSeconds: 60,
      };
    case "boredom":
      return {
        message:
          "Boredom is fine — it's how good ideas start. Try a 10-minute walk first; the urge often passes.",
        allowBypass: false,
        cooldownSeconds: 90,
      };
  }
}

/**
 * Generates a short reflection question tied to the time of day.
 */
export function reflectionQuestion(nowMinuteOfDay: number): string {
  if (nowMinuteOfDay < 6 * 60) {
    return "It's the middle of the night. What do you actually need right now — sleep, water, or this app?";
  }
  if (nowMinuteOfDay < 10 * 60) {
    return "Morning is when intent is freshest. What do you want from this app before you open it?";
  }
  if (nowMinuteOfDay < 15 * 60) {
    return "Mid-day open. Are you actually looking for something, or filling a gap?";
  }
  if (nowMinuteOfDay < 21 * 60) {
    return "Evening scrolling tends to bleed into bedtime. How long do you want this to last?";
  }
  return "Late-night opens are usually the ones we regret most. What would future-you prefer?";
}

/**
 * Scores how much of an autoplay-off checklist is complete (0-100).
 */
export function autoplayChecklistScore(
  toggles: AutoplayChecklistInput["toggles"],
): number {
  if (toggles.length === 0) return 0;
  const done = toggles.filter((t) => t.done).length;
  return Math.round((done / toggles.length) * 100);
}

/**
 * Returns the next-best-step copy for the autoplay checklist so the user
 * always has one concrete toggle to flip next.
 */
export function autoplayNextStep(
  toggles: AutoplayChecklistInput["toggles"],
): string | null {
  if (toggles.length === 0) return null;
  const order: AutoplayChecklistInput["toggles"][number]["key"][] = [
    "notifications_off_non_essential",
    "youtube_autoplay_off",
    "youtube_shorts_hidden",
    "instagram_reels_muted",
    "tiktok_restricted_mode",
    "snapchat_stories_muted",
    "remove_home_screen_icons",
    "grayscale_enabled",
  ];
  const labels: Record<AutoplayChecklistInput["toggles"][number]["key"], string> = {
    notifications_off_non_essential: "Turn off all non-essential notifications.",
    youtube_autoplay_off: "Switch off YouTube autoplay (Settings → Autoplay).",
    youtube_shorts_hidden: "Hide YouTube Shorts shelf from your home tab.",
    instagram_reels_muted: "Mute Reels suggestions or use the chronological feed.",
    tiktok_restricted_mode: "Turn on TikTok's restricted / digital wellbeing mode.",
    snapchat_stories_muted: "Mute Snapchat 'For You' and Discover stories.",
    remove_home_screen_icons: "Remove social app icons from your home screen.",
    grayscale_enabled: "Enable grayscale (iOS: Accessibility shortcut).",
  };
  // Only suggest a step that exists in the user's checklist; if the user has
  // a partial list and all of theirs are done, return null.
  for (const key of order) {
    const t = toggles.find((x) => x.key === key);
    if (t && !t.done) return labels[key];
  }
  return null;
}

/**
 * Generates a session-clock state used by the UI to render a visible timer
 * even when the underlying social app hides its own clock.
 */
export function sessionClockState(
  openedAtIso: string,
  now: Date = new Date(),
): {
  elapsedSeconds: number;
  message: string;
  severity: "calm" | "warn" | "alert";
} {
  const opened = new Date(openedAtIso).getTime();
  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - opened) / 1000));
  if (elapsedSeconds < 5 * 60) {
    return {
      elapsedSeconds,
      message: "You've been here for less than 5 minutes.",
      severity: "calm",
    };
  }
  if (elapsedSeconds < 15 * 60) {
    return {
      elapsedSeconds,
      message: `${Math.round(elapsedSeconds / 60)} minutes in. Still intentional?`,
      severity: "warn",
    };
  }
  return {
    elapsedSeconds,
    message: `${Math.round(elapsedSeconds / 60)} minutes — apps hide this on purpose. Time to step out.`,
    severity: "alert",
  };
}

/**
 * Picks one tactic card to surface today based on the user's hardest time of
 * day. Deterministic so server + client stay in sync.
 */
export function tacticOfTheDay(hardestTime: string, now: Date = new Date()): TacticCard {
  const dayIndex = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
  const map: Record<string, string> = {
    Morning: "notifications",
    "School break": "infinite_scroll",
    "After homework": "variable_rewards",
    Night: "hidden_time",
    "When bored": "fomo",
  };
  const preferred = map[hardestTime];
  if (preferred) {
    const card = TACTIC_CARDS.find((c) => c.id === preferred);
    if (card) return card;
  }
  return TACTIC_CARDS[dayIndex % TACTIC_CARDS.length];
}

/**
 * Returns the recommended offline replacement for a given app + hour. Driven
 * by the "Replace, don't just restrict" research finding (NAMI guidance).
 */
export function offlineReplacement(
  appName: string,
  hourOfDay: number,
): { activity: string; minutes: number; reason: string } {
  const lower = appName.toLowerCase();
  if (hourOfDay >= 21 || hourOfDay < 6) {
    return {
      activity: "Read 5 pages of a book",
      minutes: 12,
      reason: "Late-night feeds wreck sleep. A short read is the standard NAMI swap.",
    };
  }
  if (lower.includes("tiktok") || lower.includes("shorts") || lower.includes("reels")) {
    return {
      activity: "10-minute walk outside",
      minutes: 10,
      reason: "Short-video feeds spike dopamine fastest. Movement resets the baseline.",
    };
  }
  if (lower.includes("instagram") || lower.includes("snapchat")) {
    return {
      activity: "Text a real friend",
      minutes: 5,
      reason: "Social platforms simulate connection. A real DM gives the actual hit.",
    };
  }
  if (lower.includes("game")) {
    return {
      activity: "5 minutes of breathing",
      minutes: 5,
      reason: "Games loop on micro-rewards. A breath cycle slows the loop down.",
    };
  }
  return {
    activity: "Stand up and stretch",
    minutes: 3,
    reason: "Any movement breaks the autopilot scroll loop.",
  };
}

// --------------------------------------------------------------------------
// Compose: returns a single 'Anti-Addiction Plan' object for the dashboard
// --------------------------------------------------------------------------

export type AntiAddictionPlan = {
  tacticOfTheDay: TacticCard;
  reflectionQuestion: string;
  recommendedDetox: {
    framework: DetoxPlanInput["framework"];
    label: string;
    days: number;
    rationale: string;
  };
  books: BookRecommendation[];
  quickWins: string[];
};

/**
 * Returns the full anti-addiction plan personalized by current screen-time
 * hours and hardest time of day. This is what the dashboard renders.
 */
export function buildAntiAddictionPlan(input: {
  currentHours: number;
  hardestTime: string;
  now?: Date;
}): AntiAddictionPlan {
  const now = input.now ?? new Date();
  const recommended: AntiAddictionPlan["recommendedDetox"] =
    input.currentHours >= 6
      ? {
          framework: "lembke_30",
          label: detoxFrameworkLabel("lembke_30"),
          days: 30,
          rationale:
            "6+ hours/day is in the range Lembke's clinic uses a full 30-day reset on. Worth the discomfort.",
        }
      : input.currentHours >= 4
        ? {
            framework: "primer_7",
            label: detoxFrameworkLabel("primer_7"),
            days: 7,
            rationale:
              "A week is long enough to feel the baseline shift without disrupting work or school.",
          }
        : {
            framework: "primer_3",
            label: detoxFrameworkLabel("primer_3"),
            days: 3,
            rationale:
              "You're already under the danger threshold. A weekend primer locks in the habit.",
          };

  return {
    tacticOfTheDay: tacticOfTheDay(input.hardestTime, now),
    reflectionQuestion: reflectionQuestion(now.getHours() * 60 + now.getMinutes()),
    recommendedDetox: recommended,
    books: BOOKS,
    quickWins: [
      "Turn off all non-essential notifications (highest-ROI single action).",
      "Charge your phone outside your bedroom tonight.",
      "Set a hard daily cap — aim for half of your current usage.",
      "Pick one offline replacement before you open the app, not after.",
      "Audit your follow list this week — every unfollow earns credits.",
    ],
  };
}
