import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "latch-patterns-"));
process.env.LATCH_DB_PATH = join(dir, "patterns-test.db");

const { detectPatterns, buildBlockRule, buildDemoEvents } = await import(
  "../server/habitPatterns.ts"
);
const { storage } = await import("../server/storage.ts");

let failed = 0;
let passed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL - ${name}`);
    console.error(err);
  }
}

const FROZEN_NOW = new Date("2026-05-10T20:00:00.000Z");

function youTubeEvents(daysOpened: number, totalDays: number, now: Date) {
  // Open YouTube at 16:30 local on the most recent N-of-totalDays days.
  const events: Parameters<typeof detectPatterns>[1] = [];
  for (let dayOffset = 0; dayOffset < totalDays && events.length < daysOpened; dayOffset += 1) {
    const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    date.setHours(16, 30, 0, 0);
    events.push({
      appName: "YouTube",
      category: "video",
      openedAt: date.toISOString(),
      contentTitle: "Top 10 viral shorts",
      contentCategory: "shorts",
      productiveHint: "unproductive",
    });
  }
  return events;
}

await test("YouTube 22/30 days at 4-7 PM is detected as a monthly unproductive pattern", () => {
  const events = youTubeEvents(22, 30, FROZEN_NOW);
  const patterns = detectPatterns(1, events, "month", { now: FROZEN_NOW });
  const yt = patterns.find((p) => p.appName === "YouTube");
  assert.ok(yt, "YouTube pattern detected");
  assert.equal(yt!.daysOpened, 22);
  assert.equal(yt!.totalDays, 30);
  assert.equal(yt!.hourStart, 15);
  assert.equal(yt!.hourEnd, 18);
  assert.equal(yt!.productivity, "unproductive");
  assert.equal(yt!.recommendedAction, "block_next_month");
});

await test("productive content (Duolingo educational) does not recommend a block", () => {
  const events: Parameters<typeof detectPatterns>[1] = [];
  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    if (dayOffset % 7 === 0) continue;
    const date = new Date(FROZEN_NOW.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    date.setHours(8, 0, 0, 0);
    events.push({
      appName: "Duolingo",
      category: "education",
      openedAt: date.toISOString(),
      contentCategory: "education",
      productiveHint: "productive",
    });
  }
  const patterns = detectPatterns(1, events, "month", { now: FROZEN_NOW });
  const duo = patterns.find((p) => p.appName === "Duolingo");
  assert.ok(duo, "Duolingo pattern detected");
  assert.equal(duo!.productivity, "productive");
  assert.equal(duo!.recommendedAction, "no_block");
});

await test("unknown content asks the user (productivity unknown)", () => {
  const events: Parameters<typeof detectPatterns>[1] = [];
  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    if (dayOffset % 5 === 0) continue;
    const date = new Date(FROZEN_NOW.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    date.setHours(11, 15, 0, 0);
    events.push({
      appName: "Instagram",
      category: "social",
      openedAt: date.toISOString(),
    });
  }
  const patterns = detectPatterns(1, events, "month", { now: FROZEN_NOW });
  const ig = patterns.find((p) => p.appName === "Instagram");
  assert.ok(ig, "Instagram pattern detected");
  // Category 'social' is in UNPRODUCTIVE_KEYWORDS, so this gets flagged unproductive.
  // To test the truly unknown path, use a neutral app.
  const neutralEvents: Parameters<typeof detectPatterns>[1] = [];
  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    if (dayOffset % 5 === 0) continue;
    const date = new Date(FROZEN_NOW.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    date.setHours(13, 15, 0, 0);
    neutralEvents.push({
      appName: "MysteryApp",
      category: "other",
      openedAt: date.toISOString(),
    });
  }
  const neutral = detectPatterns(1, neutralEvents, "month", { now: FROZEN_NOW });
  const mystery = neutral.find((p) => p.appName === "MysteryApp");
  assert.ok(mystery, "MysteryApp pattern detected");
  assert.equal(mystery!.productivity, "unknown");
  assert.equal(mystery!.recommendedAction, "ask_user");
  assert.equal(mystery!.productivityUnknown, true);
});

await test("week threshold fires at 4 of 7 days", () => {
  const now = FROZEN_NOW;
  const events: Parameters<typeof detectPatterns>[1] = [];
  for (let dayOffset = 0; dayOffset < 4; dayOffset += 1) {
    const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    date.setHours(17, 0, 0, 0);
    events.push({ appName: "TikTok", openedAt: date.toISOString(), contentCategory: "shorts" });
  }
  const patterns = detectPatterns(1, events, "week", { now });
  assert.ok(patterns.find((p) => p.appName === "TikTok"), "TikTok weekly pattern fires");

  // 3 days should NOT trip the threshold.
  const events3 = events.slice(0, 3);
  const noPatterns = detectPatterns(1, events3, "week", { now });
  assert.equal(noPatterns.length, 0, "3-of-7 days should not fire");
});

await test("month threshold fires at 15 days even at low percent", () => {
  const events: Parameters<typeof detectPatterns>[1] = [];
  for (let dayOffset = 0; dayOffset < 15; dayOffset += 1) {
    const date = new Date(FROZEN_NOW.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    date.setHours(20, 0, 0, 0);
    events.push({ appName: "Snapchat", openedAt: date.toISOString() });
  }
  const patterns = detectPatterns(1, events, "month", { now: FROZEN_NOW });
  assert.ok(patterns.find((p) => p.appName === "Snapchat"), "Snapchat monthly pattern fires at 15 days");

  const events14: Parameters<typeof detectPatterns>[1] = events.slice(0, 14);
  const none = detectPatterns(1, events14, "month", { now: FROZEN_NOW });
  assert.equal(none.length, 0, "14 days should not fire monthly");
});

await test("year threshold needs 120 days", () => {
  // Use hour 10 (well before FROZEN_NOW's 20:00 UTC) so today's event is not
  // dropped by the "future event" filter.
  const events: Parameters<typeof detectPatterns>[1] = [];
  for (let dayOffset = 0; dayOffset < 120; dayOffset += 1) {
    const date = new Date(FROZEN_NOW.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    date.setUTCHours(10, 0, 0, 0);
    events.push({ appName: "Reddit", openedAt: date.toISOString() });
  }
  const patterns = detectPatterns(1, events, "year", { now: FROZEN_NOW });
  assert.ok(patterns.find((p) => p.appName === "Reddit"), "Reddit yearly pattern fires at 120 days");

  const events119 = events.slice(0, 119);
  const none = detectPatterns(1, events119, "year", { now: FROZEN_NOW });
  assert.equal(none.length, 0, "119 days should not fire yearly");
});

await test("buildDemoEvents seeds the YouTube 22/30 example", () => {
  const seed = buildDemoEvents(1, FROZEN_NOW);
  const yt = seed.filter((e) => e.appName === "YouTube");
  // 30 days - 8 skipped = 22 days
  assert.equal(yt.length, 22, "YouTube demo seed has 22 days of opens");
  const patterns = detectPatterns(1, seed, "month", { now: FROZEN_NOW });
  const ytPattern = patterns.find((p) => p.appName === "YouTube");
  assert.ok(ytPattern, "Pattern detector picks up the seeded YouTube events");
  assert.equal(ytPattern!.daysOpened, 22);
  assert.equal(ytPattern!.recommendedAction, "block_next_month");
});

await test("review unproductive pattern via storage creates a 30-day block rule", async () => {
  const account = await storage.createAccount({
    username: "patterns-tester",
    password: "test-pass-12",
    name: "Tester",
    age: 21,
  });
  const accountId = account.id;
  const events = youTubeEvents(22, 30, FROZEN_NOW).map((event) => ({
    accountId,
    appName: event.appName,
    category: event.category ?? "video",
    openedAt: event.openedAt,
    contentTitle: event.contentTitle ?? undefined,
    contentCategory: event.contentCategory ?? undefined,
    productiveHint: (event.productiveHint as "productive" | "unproductive" | "unknown") ?? undefined,
    source: "demo" as const,
  }));
  const inserted = await storage.recordAppEventsBulk(events);
  assert.equal(inserted, 22);

  const detected = detectPatterns(accountId, events, "month", { now: FROZEN_NOW });
  const yt = detected.find((p) => p.appName === "YouTube")!;
  await storage.upsertHabitPattern({
    patternKey: yt.patternKey,
    accountId,
    appName: yt.appName,
    periodType: yt.periodType,
    hourStart: yt.hourStart,
    hourEnd: yt.hourEnd,
    daysOpened: yt.daysOpened,
    totalDays: yt.totalDays,
  });

  const rule = buildBlockRule(accountId, yt, FROZEN_NOW);
  const stored = await storage.insertBlockRule(rule);
  await storage.setPatternStatus(yt.patternKey, "blocked", "unproductive");

  const active = await storage.listActiveBlockRules(accountId, FROZEN_NOW.toISOString());
  assert.ok(
    active.find((r) => r.id === stored.id),
    "block rule is active",
  );
  assert.equal(stored.appName, "YouTube");
  assert.equal(stored.hourStart, 15);
  assert.equal(stored.hourEnd, 18);
  // Active window is 30 days.
  const from = new Date(stored.activeFrom).getTime();
  const until = new Date(stored.activeUntil).getTime();
  const days = Math.round((until - from) / (24 * 60 * 60 * 1000));
  assert.equal(days, 30, "block rule lasts 30 days");

  const updated = await storage.getHabitPattern(yt.patternKey);
  assert.equal(updated?.status, "blocked");
});

await test("productive review does not create a block rule", async () => {
  const account = await storage.createAccount({
    username: "patterns-tester-productive",
    password: "test-pass-12",
    name: "Tester",
    age: 21,
  });
  const accountId = account.id;
  const events: Parameters<typeof detectPatterns>[1] = [];
  for (let dayOffset = 0; dayOffset < 25; dayOffset += 1) {
    const date = new Date(FROZEN_NOW.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    date.setHours(8, 0, 0, 0);
    events.push({
      appName: "Khan",
      category: "education",
      openedAt: date.toISOString(),
      contentCategory: "education",
      productiveHint: "productive",
    });
  }
  const detected = detectPatterns(accountId, events, "month", { now: FROZEN_NOW });
  const khan = detected.find((p) => p.appName === "Khan")!;
  await storage.upsertHabitPattern({
    patternKey: khan.patternKey,
    accountId,
    appName: khan.appName,
    periodType: khan.periodType,
    hourStart: khan.hourStart,
    hourEnd: khan.hourEnd,
    daysOpened: khan.daysOpened,
    totalDays: khan.totalDays,
  });
  await storage.setPatternStatus(khan.patternKey, "productive", "productive");
  const active = await storage.listActiveBlockRules(accountId, FROZEN_NOW.toISOString());
  assert.equal(
    active.filter((rule) => rule.appName === "Khan").length,
    0,
    "no block created for productive pattern",
  );
});

try {
  rmSync(dir, { recursive: true, force: true });
} catch {
  // ignore
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
