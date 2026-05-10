import { z } from "zod";

export type PeriodType = "week" | "month" | "year";

export type RawEvent = {
  appName: string;
  category?: string | null;
  openedAt: string;
  contentTitle?: string | null;
  contentCategory?: string | null;
  productiveHint?: string | null;
};

export type DetectedPattern = {
  patternKey: string;
  appName: string;
  periodType: PeriodType;
  daysOpened: number;
  totalDays: number;
  hourStart: number;
  hourEnd: number;
  confidence: number;
  suggestedQuestion: string;
  productivityUnknown: boolean;
  productivity: "productive" | "unproductive" | "unknown";
  recommendedAction: "ask_user" | "no_block" | "block_next_month";
  sampleContent: string[];
  explanation: string;
};

export type ExistingPatternStatus = "pending" | "productive" | "unproductive" | "blocked";

export type ExistingPatternRecord = {
  patternKey: string;
  status: ExistingPatternStatus;
  userAnswer?: string | null;
};

const DEFAULT_BUCKET_HOURS = 3;

const PERIOD_DAYS: Record<PeriodType, number> = {
  week: 7,
  month: 30,
  year: 365,
};

// Documented thresholds. A pattern fires when daysOpened in the bucket meets
// EITHER the percent or absolute floor for the period. Keep deterministic.
const PERIOD_THRESHOLDS: Record<
  PeriodType,
  { minPercent: number; minDays: number }
> = {
  week: { minPercent: 0.55, minDays: 4 },
  month: { minPercent: 0.6, minDays: 15 },
  // Year window uses a hard minimum-day floor rather than a percent so a
  // single very common time-of-day doesn't fire from a few weeks of data.
  year: { minPercent: 1.01, minDays: 120 },
};

const PRODUCTIVE_KEYWORDS = [
  "education",
  "educational",
  "tutorial",
  "workout",
  "exercise",
  "productivity",
  "study",
  "homework",
  "learning",
  "lecture",
  "documentary",
  "news",
  "language",
  "coding",
  "programming",
  "reading",
  "meditation",
  "mindfulness",
];

const UNPRODUCTIVE_KEYWORDS = [
  "shorts",
  "reels",
  "tiktok",
  "entertainment",
  "social",
  "gaming",
  "game",
  "meme",
  "gossip",
  "drama",
  "celebrity",
  "prank",
  "viral",
  "fyp",
];

function isProductiveText(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return PRODUCTIVE_KEYWORDS.some((word) => lower.includes(word));
}

function isUnproductiveText(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return UNPRODUCTIVE_KEYWORDS.some((word) => lower.includes(word));
}

function classifyEvent(event: RawEvent): "productive" | "unproductive" | "unknown" {
  if (event.productiveHint === "productive") return "productive";
  if (event.productiveHint === "unproductive") return "unproductive";
  const combined = `${event.contentTitle ?? ""} ${event.contentCategory ?? ""} ${
    event.category ?? ""
  }`;
  const productive = isProductiveText(combined);
  const unproductive = isUnproductiveText(combined);
  if (productive && !unproductive) return "productive";
  if (unproductive && !productive) return "unproductive";
  return "unknown";
}

function bucketStart(hour: number, bucketHours: number): number {
  const safe = Math.max(1, Math.min(12, Math.floor(bucketHours)));
  return Math.floor(hour / safe) * safe;
}

function dateKey(date: Date): string {
  // YYYY-MM-DD in UTC for deterministic bucketing
  return date.toISOString().slice(0, 10);
}

function buildPatternKey(
  accountId: number,
  appName: string,
  periodType: PeriodType,
  hourStart: number,
  hourEnd: number,
): string {
  return [
    accountId,
    appName.toLowerCase().replace(/\s+/g, "-"),
    periodType,
    hourStart,
    hourEnd,
  ].join(":");
}

export type PatternDetectionOptions = {
  now?: Date;
  bucketHours?: number;
  thresholdsByPeriod?: typeof PERIOD_THRESHOLDS;
};

export function detectPatterns(
  accountId: number,
  events: RawEvent[],
  periodType: PeriodType,
  options: PatternDetectionOptions = {},
): DetectedPattern[] {
  const now = options.now ?? new Date();
  const bucketHours = options.bucketHours ?? DEFAULT_BUCKET_HOURS;
  const totalDays = PERIOD_DAYS[periodType];
  const thresholds =
    options.thresholdsByPeriod?.[periodType] ?? PERIOD_THRESHOLDS[periodType];

  // Window is the most recent N days ending at `now` (inclusive).
  const startMs = now.getTime() - (totalDays - 1) * 24 * 60 * 60 * 1000;
  const startOfWindow = new Date(startMs);

  // Group: app -> bucketStart -> Set<dateKey>
  const groups = new Map<string, Map<number, Set<string>>>();
  // Also: app -> bucketStart -> count of productivity verdicts and sample content
  const productivity = new Map<
    string,
    Map<number, { productive: number; unproductive: number; samples: Set<string> }>
  >();

  for (const event of events) {
    const opened = new Date(event.openedAt);
    if (isNaN(opened.getTime())) continue;
    if (opened.getTime() < startOfWindow.getTime()) continue;
    if (opened.getTime() > now.getTime()) continue;

    const app = event.appName.trim();
    if (!app) continue;
    const hour = opened.getHours();
    const bucket = bucketStart(hour, bucketHours);
    const day = dateKey(opened);

    let appMap = groups.get(app);
    if (!appMap) {
      appMap = new Map();
      groups.set(app, appMap);
    }
    let dayset = appMap.get(bucket);
    if (!dayset) {
      dayset = new Set();
      appMap.set(bucket, dayset);
    }
    dayset.add(day);

    let prodApp = productivity.get(app);
    if (!prodApp) {
      prodApp = new Map();
      productivity.set(app, prodApp);
    }
    let prodBucket = prodApp.get(bucket);
    if (!prodBucket) {
      prodBucket = { productive: 0, unproductive: 0, samples: new Set() };
      prodApp.set(bucket, prodBucket);
    }
    const verdict = classifyEvent(event);
    if (verdict === "productive") prodBucket.productive += 1;
    else if (verdict === "unproductive") prodBucket.unproductive += 1;
    if (event.contentTitle) prodBucket.samples.add(event.contentTitle);
    else if (event.contentCategory) prodBucket.samples.add(event.contentCategory);
  }

  const patterns: DetectedPattern[] = [];

  for (const [app, bucketMap] of Array.from(groups.entries())) {
    for (const [bucket, dayset] of Array.from(bucketMap.entries())) {
      const daysOpened = dayset.size;
      const percent = daysOpened / totalDays;
      if (daysOpened < thresholds.minDays && percent < thresholds.minPercent) {
        continue;
      }
      const hourStart = bucket;
      const hourEnd = Math.min(24, bucket + bucketHours);
      const prodBucket = productivity.get(app)?.get(bucket);
      const productiveCount = prodBucket?.productive ?? 0;
      const unproductiveCount = prodBucket?.unproductive ?? 0;
      let verdict: "productive" | "unproductive" | "unknown" = "unknown";
      if (productiveCount > unproductiveCount && productiveCount > 0) {
        verdict = "productive";
      } else if (unproductiveCount > productiveCount && unproductiveCount > 0) {
        verdict = "unproductive";
      }

      const recommended: DetectedPattern["recommendedAction"] =
        verdict === "unproductive"
          ? "block_next_month"
          : verdict === "productive"
            ? "no_block"
            : "ask_user";

      const confidence = Math.min(
        1,
        Math.max(
          percent,
          daysOpened / Math.max(thresholds.minDays, 1),
        ),
      );

      const window = `${formatHour(hourStart)}–${formatHour(hourEnd)}`;
      const explanation =
        `${app} opened on ${daysOpened}/${totalDays} ${periodLabel(periodType)} days, ` +
        `usually between ${window}.`;
      const suggestedQuestion = `Was this ${app} time productive?`;

      patterns.push({
        patternKey: buildPatternKey(accountId, app, periodType, hourStart, hourEnd),
        appName: app,
        periodType,
        daysOpened,
        totalDays,
        hourStart,
        hourEnd,
        confidence: Math.round(confidence * 100) / 100,
        suggestedQuestion,
        productivityUnknown: verdict === "unknown",
        productivity: verdict,
        recommendedAction: recommended,
        sampleContent: Array.from(prodBucket?.samples ?? []).slice(0, 4),
        explanation,
      });
    }
  }

  // Deterministic ordering: more days, then earlier hour, then app name.
  patterns.sort((a, b) => {
    if (b.daysOpened !== a.daysOpened) return b.daysOpened - a.daysOpened;
    if (a.hourStart !== b.hourStart) return a.hourStart - b.hourStart;
    return a.appName.localeCompare(b.appName);
  });

  return patterns;
}

function formatHour(hour: number): string {
  const h = ((hour + 24) % 24);
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

function periodLabel(period: PeriodType): string {
  if (period === "week") return "of the last 7";
  if (period === "month") return "of the last 30";
  return "of the last 365";
}

export function buildBlockRule(
  accountId: number,
  pattern: DetectedPattern,
  now: Date = new Date(),
): {
  accountId: number;
  appName: string;
  hourStart: number;
  hourEnd: number;
  activeFrom: string;
  activeUntil: string;
  reason: string;
  sourcePatternKey: string;
  enabled: boolean;
} {
  const activeFrom = new Date(now);
  const activeUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    accountId,
    appName: pattern.appName,
    hourStart: pattern.hourStart,
    hourEnd: pattern.hourEnd,
    activeFrom: activeFrom.toISOString(),
    activeUntil: activeUntil.toISOString(),
    reason: `${pattern.appName} ${formatHour(pattern.hourStart)}–${formatHour(
      pattern.hourEnd,
    )} flagged as unproductive in your ${pattern.periodType} review.`,
    sourcePatternKey: pattern.patternKey,
    enabled: true,
  };
}

export const periodQuerySchema = z
  .object({
    period: z.enum(["week", "month", "year"]).default("month"),
  })
  .partial();

export const buildDemoEvents = (
  accountId: number,
  now: Date = new Date(),
): Array<{
  accountId: number;
  appName: string;
  category: string;
  openedAt: string;
  durationMinutes?: number;
  contentTitle?: string;
  contentCategory?: string;
  productiveHint?: "productive" | "unproductive" | "unknown";
  source: "demo";
}> => {
  const events: ReturnType<typeof buildDemoEvents> = [];
  // YouTube unproductive 4-7 PM, 22/30 days (so 22 of the last 30 days).
  const ytTitles = [
    "Top 10 viral shorts",
    "Funniest TikTok compilation",
    "Celebrity gossip recap",
    "Meme of the week",
    "Pranks gone wrong",
  ];
  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    if (dayOffset % 30 === 6 || dayOffset === 11 || dayOffset === 17 || dayOffset === 22 || dayOffset === 25 || dayOffset === 28 || dayOffset === 29 || dayOffset === 4) {
      // Skip 8 days to leave 22 days with YouTube usage.
      continue;
    }
    const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    // open at 16:30 local
    date.setHours(16, 30, 0, 0);
    const title = ytTitles[dayOffset % ytTitles.length];
    events.push({
      accountId,
      appName: "YouTube",
      category: "video",
      openedAt: date.toISOString(),
      durationMinutes: 20 + (dayOffset % 15),
      contentTitle: title,
      contentCategory: "shorts",
      productiveHint: "unproductive",
      source: "demo",
    });
  }

  // Duolingo productive mornings 7-10 AM, 20/30 days.
  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    if (dayOffset % 7 === 0 || dayOffset === 13 || dayOffset === 19) continue;
    const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    date.setHours(8, 0, 0, 0);
    events.push({
      accountId,
      appName: "Duolingo",
      category: "education",
      openedAt: date.toISOString(),
      durationMinutes: 10,
      contentTitle: "Spanish lesson",
      contentCategory: "education",
      productiveHint: "productive",
      source: "demo",
    });
  }

  // Instagram unknown 10-1 PM, 18/30 days (asks user).
  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    if (dayOffset % 5 === 0 || dayOffset === 9 || dayOffset === 14) continue;
    const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    date.setHours(11, 15, 0, 0);
    events.push({
      accountId,
      appName: "Instagram",
      category: "social",
      openedAt: date.toISOString(),
      durationMinutes: 12,
      source: "demo",
    });
  }

  return events;
};
