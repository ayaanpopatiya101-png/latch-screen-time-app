/**
 * Deterministic tests for the anti-addiction engine. No database, no HTTP.
 *
 * Each block exercises a tactic-by-tactic algorithm in server/antiAddiction.ts
 * and asserts the contract the routes layer depends on.
 *
 * Run with: npx tsx script/anti-addiction-test.ts
 */
import {
  autoplayChecklistScore,
  autoplayNextStep,
  buildAntiAddictionPlan,
  detoxDurationDays,
  detoxFrameworkLabel,
  detoxProgress,
  feedAuditReward,
  fomoReframeMessage,
  isOutsideBatchWindows,
  minutesUntilNextWindow,
  offlineReplacement,
  reflectionQuestion,
  sessionClockState,
  TACTIC_CARDS,
  BOOKS,
  tacticOfTheDay,
} from "../server/antiAddiction";

let failed = 0;

function assertEq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    failed += 1;
    console.error(`FAIL: ${label}\n   expected: ${expected}\n   actual:   ${actual}`);
  } else {
    console.log(`pass: ${label}`);
  }
}

function assertTrue(cond: boolean, label: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${label}`);
  } else {
    console.log(`pass: ${label}`);
  }
}

console.log("--- TACTIC_CARDS + BOOKS ---");
assertEq(TACTIC_CARDS.length, 10, "all 10 tactic cards present");
assertEq(BOOKS.length, 5, "all 5 recommended books present");
assertTrue(
  TACTIC_CARDS.every((c) => c.id && c.tactic && c.counter),
  "every tactic card has id, tactic, counter",
);

console.log("\n--- Batch windows (variable reward counter) ---");
const windows = [
  { startMinute: 12 * 60, endMinute: 12 * 60 + 30, label: "lunch" },
  { startMinute: 18 * 60, endMinute: 18 * 60 + 30, label: "evening" },
];
assertEq(isOutsideBatchWindows(9 * 60, windows), true, "9am is outside both windows");
assertEq(isOutsideBatchWindows(12 * 60 + 10, windows), false, "12:10 falls in the lunch window");
assertEq(minutesUntilNextWindow(9 * 60, windows), 3 * 60, "9am to noon = 180 minutes");
assertEq(
  minutesUntilNextWindow(20 * 60, windows),
  16 * 60,
  "8pm to next-day noon = 16h",
);

console.log("\n--- Detox plans (dopamine-baseline counter) ---");
assertEq(detoxDurationDays("lembke_30"), 30, "Lembke is 30 days");
assertEq(detoxDurationDays("primer_3"), 3, "primer_3 is 3 days");
assertEq(detoxFrameworkLabel("newport_30").includes("Newport"), true, "Newport label");
const fakeStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const progress = detoxProgress(fakeStart, "lembke_30");
assertEq(progress.totalDays, 30, "progress shows 30-day total");
assertTrue(progress.dayNumber >= 7 && progress.dayNumber <= 8, "day number is ~8");
assertTrue(progress.ratio > 0.2 && progress.ratio < 0.3, "ratio ~23%");

console.log("\n--- Feed audit reward (personalization counter) ---");
assertEq(feedAuditReward(0), 0, "0 unfollows = 0 credits");
// round(2*sqrt(1) + 0.4) = round(2.4) = 2
assertEq(feedAuditReward(1), 2, "1 unfollow = 2 credits");
const r5 = feedAuditReward(5);
assertTrue(r5 >= 6 && r5 <= 8, `5 unfollows -> ${r5} credits (6-8 expected)`);
assertEq(feedAuditReward(500), 30, "500 unfollows capped at 30 credits");

console.log("\n--- FOMO reframe (confirmshaming counter) ---");
const wantTo = fomoReframeMessage("want_to", "Instagram");
assertEq(wantTo.allowBypass, true, "honest 'I want to' allows bypass");
const fomo = fomoReframeMessage("afraid_not_to", "Instagram");
assertEq(fomo.allowBypass, false, "afraid_not_to blocks bypass");
assertTrue(fomo.cooldownSeconds >= 60, "afraid_not_to has at least 1m cooldown");

console.log("\n--- Reflection question (notifications/autopilot counter) ---");
assertTrue(reflectionQuestion(3 * 60).includes("middle of the night"), "night branch");
assertTrue(reflectionQuestion(8 * 60).includes("Morning"), "morning branch");
assertTrue(reflectionQuestion(22 * 60).includes("regret"), "late-night branch");

console.log("\n--- Autoplay checklist (autoplay/rabbit-hole counter) ---");
const toggles = [
  { key: "notifications_off_non_essential" as const, done: true },
  { key: "youtube_autoplay_off" as const, done: false },
  { key: "instagram_reels_muted" as const, done: false },
  { key: "grayscale_enabled" as const, done: false },
];
assertEq(autoplayChecklistScore(toggles), 25, "1/4 done = 25%");
assertEq(
  autoplayNextStep(toggles)?.includes("YouTube autoplay"),
  true,
  "next step is YouTube autoplay",
);
assertEq(autoplayNextStep([]), null, "empty checklist returns null");

console.log("\n--- Session clock (hidden-time-awareness counter) ---");
const opened = new Date(Date.now() - 20 * 60 * 1000).toISOString();
const clock = sessionClockState(opened);
assertEq(clock.severity, "alert", "20-minute session is alert severity");
assertTrue(clock.elapsedSeconds >= 19 * 60, "elapsed at least 19m");

console.log("\n--- Offline replacement (replace-don't-restrict) ---");
const lateNight = offlineReplacement("Instagram", 23);
assertEq(lateNight.activity.includes("Read"), true, "late night -> read");
const tikTok = offlineReplacement("TikTok", 14);
assertEq(tikTok.activity.includes("walk"), true, "TikTok mid-day -> walk");

console.log("\n--- Tactic of the day ---");
assertEq(
  tacticOfTheDay("Night").id,
  "hidden_time",
  "night -> hidden_time tactic",
);
assertEq(
  tacticOfTheDay("Morning").id,
  "notifications",
  "morning -> notifications tactic",
);

console.log("\n--- Full plan composition ---");
const highUse = buildAntiAddictionPlan({ currentHours: 7, hardestTime: "Night" });
assertEq(highUse.recommendedDetox.framework, "lembke_30", "7h/day -> lembke 30");
const midUse = buildAntiAddictionPlan({ currentHours: 4.5, hardestTime: "Morning" });
assertEq(midUse.recommendedDetox.framework, "primer_7", "4.5h -> 7-day primer");
const lowUse = buildAntiAddictionPlan({ currentHours: 2, hardestTime: "When bored" });
assertEq(lowUse.recommendedDetox.framework, "primer_3", "2h -> weekend primer");
assertEq(highUse.books.length, 5, "plan ships all 5 book recs");
assertTrue(highUse.quickWins.length >= 5, "plan ships >=5 quick wins");

console.log(`\n${failed === 0 ? "ALL TESTS PASSED" : `${failed} TEST(S) FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
