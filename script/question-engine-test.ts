import { strict as assert } from "node:assert";
import {
  QUESTION_BANK,
  applyAnswer,
  initialState,
  pickNextQuestion,
  planPower,
  riskSignal,
  summarize,
  scoreQuestion,
  STOP_THRESHOLD,
  MIN_QUESTIONS,
  MAX_QUESTIONS,
} from "../client/src/lib/questionEngine.ts";

let failed = 0;
let passed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL - ${name}`);
    console.error(err);
  }
}

test("starts by asking required identity questions first", () => {
  const state = initialState();
  const next = pickNextQuestion(state);
  assert.ok(next, "should have a next question");
  assert.ok(next!.required, "first question should be required");
  assert.equal(next!.id, "name");
});

test("required questions chain: name → age → currentHours → goalHours → hardestTime", () => {
  let s = initialState();
  const order: string[] = [];
  for (let i = 0; i < 5; i++) {
    const q = pickNextQuestion(s);
    if (!q) break;
    order.push(q.id);
    // simulate an answer of the right shape
    let answer: unknown;
    if (q.type === "short_text") answer = "test";
    else if (q.type === "hours_slider") answer = 4;
    else if (q.type === "single_choice") answer = q.options?.[0]?.value ?? "x";
    else if (q.type === "multi_choice") answer = q.options?.slice(0, 2).map((o) => o.value) ?? [];
    else if (q.type === "scale") answer = q.max ?? 3;
    s = applyAnswer(s, q.id, answer);
  }
  assert.deepEqual(
    order.slice(0, 4),
    ["name", "age", "currentHours", "goalHours"],
    `unexpected order: ${order.join(",")}`,
  );
});

test("plan power grows as questions are answered", () => {
  let s = initialState();
  const start = planPower(s);
  assert.equal(start, 0);
  s = applyAnswer(s, "currentHours", 7);
  s = applyAnswer(s, "goalHours", 3);
  s = applyAnswer(s, "hardestTime", "Night");
  const mid = planPower(s);
  assert.ok(mid > start, "power should grow");
  s = applyAnswer(s, "topApps", ["Instagram", "TikTok"]);
  s = applyAnswer(s, "feelings", ["Tired", "Bored"]);
  s = applyAnswer(s, "whyScroll", ["boredom"]);
  s = applyAnswer(s, "bedtimeScroll", "every_night");
  s = applyAnswer(s, "replacementHabits", ["walk", "read"]);
  s = applyAnswer(s, "motivationStyle", "reward");
  s = applyAnswer(s, "difficultyTolerance", "friction");
  const high = planPower(s);
  assert.ok(high > mid && high >= 60, `expected plan power ≥60, got ${high}`);
});

test("risk signal increases for night + heavy hours + every-night bedtime", () => {
  let s = initialState({ currentHours: 8, goalHours: 2, hardestTime: "Night" });
  const low = riskSignal(s.profile);
  s = applyAnswer(s, "bedtimeScroll", "every_night");
  s = applyAnswer(s, "videoAppDepth", 5);
  s = applyAnswer(s, "schoolFocus", "daily");
  const high = riskSignal(s.profile);
  assert.ok(high > low, "risk should grow");
  assert.ok(high >= 0.6, `risk should be high, got ${high}`);
});

test("video-app question scores higher when TikTok is in topApps", () => {
  let s = initialState({ topApps: ["TikTok", "YouTube"] });
  // satisfy required first
  s = applyAnswer(s, "name", "Ayaan");
  s = applyAnswer(s, "age", "17");
  s = applyAnswer(s, "currentHours", 6);
  s = applyAnswer(s, "goalHours", 2);
  s = applyAnswer(s, "hardestTime", "Night");
  const video = QUESTION_BANK.find((q) => q.id === "videoAppDepth")!;
  const gaming = QUESTION_BANK.find((q) => q.id === "gamingDepth")!;
  const vScore = scoreQuestion(video, s);
  const gScore = scoreQuestion(gaming, s);
  assert.ok(vScore > gScore, `videoAppDepth (${vScore}) should outrank gamingDepth (${gScore})`);
});

test("school focus weight boosts for teens", () => {
  let teen = initialState();
  let adult = initialState();
  // mark required answered so school focus is a candidate; keep age different.
  for (const id of ["name", "currentHours", "goalHours", "hardestTime"]) {
    const q = QUESTION_BANK.find((qq) => qq.id === id)!;
    const ans = q.type === "hours_slider" ? 4 : q.type === "short_text" ? "x" : q.options?.[0]?.value;
    teen = applyAnswer(teen, id, ans);
    adult = applyAnswer(adult, id, ans);
  }
  teen = applyAnswer(teen, "age", "15");
  adult = applyAnswer(adult, "age", "42");
  const school = QUESTION_BANK.find((q) => q.id === "schoolFocus")!;
  assert.ok(
    scoreQuestion(school, teen) > scoreQuestion(school, adult),
    `school focus should outweigh for teens (teen=${scoreQuestion(school, teen)}, adult=${scoreQuestion(school, adult)})`,
  );
});

test("never re-asks an answered question", () => {
  let s = initialState();
  s = applyAnswer(s, "name", "Ayaan");
  s = applyAnswer(s, "age", "17");
  s = applyAnswer(s, "currentHours", 5);
  s = applyAnswer(s, "goalHours", 2);
  for (let i = 0; i < 20; i++) {
    const q = pickNextQuestion(s);
    if (!q) break;
    assert.ok(!s.askedIds.includes(q.id), `re-asked ${q.id}`);
    const ans =
      q.type === "hours_slider" || q.type === "scale"
        ? q.min ?? 1
        : q.type === "short_text"
          ? "x"
          : q.type === "multi_choice"
            ? q.options?.slice(0, 2).map((o) => o.value) ?? []
            : q.options?.[0]?.value ?? "x";
    s = applyAnswer(s, q.id, ans);
  }
});

test("engine stops at most after MAX_QUESTIONS", () => {
  let s = initialState();
  let count = 0;
  while (count < MAX_QUESTIONS + 5) {
    const q = pickNextQuestion(s);
    if (!q) break;
    const ans =
      q.type === "hours_slider" || q.type === "scale"
        ? q.min ?? 1
        : q.type === "short_text"
          ? "x"
          : q.type === "multi_choice"
            ? q.options?.slice(0, 1).map((o) => o.value) ?? []
            : q.options?.[0]?.value ?? "x";
    s = applyAnswer(s, q.id, ans);
    count++;
  }
  assert.ok(count <= MAX_QUESTIONS, `asked ${count} which exceeds MAX ${MAX_QUESTIONS}`);
});

test("engine reaches the stop threshold within a reasonable number of asks", () => {
  let s = initialState();
  let count = 0;
  while (true) {
    const q = pickNextQuestion(s);
    if (!q) break;
    // Choose answers that maximize info gain (multi picks 2-3, slider mid).
    const ans =
      q.type === "hours_slider"
        ? q.id === "currentHours"
          ? 7
          : 3
        : q.type === "scale"
          ? 4
          : q.type === "short_text"
            ? "x"
            : q.type === "multi_choice"
              ? q.options?.slice(0, 3).map((o) => o.value) ?? []
              : q.options?.[0]?.value ?? "x";
    s = applyAnswer(s, q.id, ans);
    count++;
    if (count > MAX_QUESTIONS) break;
  }
  const power = planPower(s);
  assert.ok(count >= MIN_QUESTIONS, `expected at least ${MIN_QUESTIONS} asks`);
  assert.ok(power >= STOP_THRESHOLD, `expected plan power ≥${STOP_THRESHOLD}, got ${power}`);
});

test("summarize derives night_scroller persona", () => {
  let s = initialState({ name: "A", age: "17", currentHours: 7, goalHours: 3, hardestTime: "Night" });
  s = applyAnswer(s, "bedtimeScroll", "every_night");
  s = applyAnswer(s, "topApps", ["Instagram", "TikTok"]);
  const summary = summarize(s);
  assert.equal(summary.persona, "night_scroller");
  assert.ok(summary.topShields.includes("Instagram"));
});

test("summarize derives boredom_scroller persona from whyScroll", () => {
  let s = initialState({ name: "B", age: "16", currentHours: 5, goalHours: 2 });
  s = applyAnswer(s, "whyScroll", ["boredom"]);
  s = applyAnswer(s, "hardestTime", "When bored");
  const summary = summarize(s);
  assert.equal(summary.persona, "boredom_scroller");
});

test("emergency-pass question gets a boost after deep_lock difficulty", () => {
  let s = initialState({ name: "A", age: "17", currentHours: 5, goalHours: 2, hardestTime: "Night" });
  s = applyAnswer(s, "name", "A");
  s = applyAnswer(s, "age", "17");
  s = applyAnswer(s, "currentHours", 5);
  s = applyAnswer(s, "goalHours", 2);
  s = applyAnswer(s, "hardestTime", "Night");
  const before = scoreQuestion(QUESTION_BANK.find((q) => q.id === "emergencyPassPref")!, s);
  s = applyAnswer(s, "difficultyTolerance", "deep_lock");
  const after = scoreQuestion(QUESTION_BANK.find((q) => q.id === "emergencyPassPref")!, s);
  assert.ok(after > before, `emergencyPass should boost after deep_lock (before=${before}, after=${after})`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
