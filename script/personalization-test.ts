import { strict as assert } from "node:assert";
import {
  buildPlan,
  applyEvent,
  computeRiskScore,
  inferPersona,
  demoPlan,
} from "../server/personalization.ts";

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

const baseBehavior = {
  completedOfflineActions: 0,
  shieldSkips: 0,
  shieldUnlocks: 0,
  focusCompletions: 0,
  coins: 0,
  streak: 0,
  minutesSavedToday: 0,
};

test("boredom scroller is detected", () => {
  const persona = inferPersona(
    {
      name: "B",
      currentHours: 4,
      goalHours: 2,
      feelings: ["Bored"],
      hardestTime: "When bored",
      topApps: ["TikTok"],
    },
    baseBehavior,
  );
  assert.equal(persona, "boredom_scroller");
});

test("night scroller is detected", () => {
  const persona = inferPersona(
    {
      name: "N",
      currentHours: 6,
      goalHours: 2,
      feelings: ["Tired"],
      hardestTime: "Night",
      topApps: ["Instagram"],
    },
    baseBehavior,
  );
  assert.equal(persona, "night_scroller");
});

test("stress scroller is detected", () => {
  const persona = inferPersona(
    {
      name: "S",
      currentHours: 4,
      goalHours: 2,
      feelings: ["Stressed", "Regretful"],
      hardestTime: "After homework",
      topApps: ["Instagram"],
    },
    baseBehavior,
  );
  assert.equal(persona, "stress_scroller");
});

test("balanced user when feelings are positive and time is low", () => {
  const persona = inferPersona(
    {
      name: "Z",
      currentHours: 1.5,
      goalHours: 2,
      feelings: ["Happy", "Focused"],
      hardestTime: "School break",
      topApps: ["Messages"],
    },
    baseBehavior,
  );
  assert.equal(persona, "balanced_user");
});

test("risk score climbs with hours over goal", () => {
  const low = computeRiskScore(
    { name: "", currentHours: 2, goalHours: 2, feelings: [], hardestTime: "Morning", topApps: [] },
    baseBehavior,
  );
  const high = computeRiskScore(
    {
      name: "",
      currentHours: 9,
      goalHours: 2,
      feelings: ["Regretful", "Tired"],
      hardestTime: "Night",
      topApps: ["TikTok", "Instagram"],
    },
    baseBehavior,
  );
  assert.ok(high > low + 30, `expected high(${high}) >> low(${low})`);
  assert.ok(low <= 35, `expected low score, got ${low}`);
  assert.ok(high >= 60, `expected high tier, got ${high}`);
});

test("focus completions reduce risk", () => {
  const profile = {
    name: "",
    currentHours: 6,
    goalHours: 2,
    feelings: ["Tired"],
    hardestTime: "Night",
    topApps: ["Instagram"],
  };
  const before = computeRiskScore(profile, baseBehavior);
  const after = computeRiskScore(profile, {
    ...baseBehavior,
    focusCompletions: 5,
    completedOfflineActions: 4,
    streak: 14,
  });
  assert.ok(after < before, `expected after(${after}) < before(${before})`);
});

test("plan returns adaptive shield with delay >= 3", () => {
  const plan = buildPlan({
    profile: {
      name: "Test",
      currentHours: 7,
      goalHours: 2,
      feelings: ["Regretful"],
      hardestTime: "Night",
      topApps: ["Instagram", "TikTok"],
    },
    behavior: baseBehavior,
  });
  assert.ok(plan.shields.length >= 1);
  for (const s of plan.shields) {
    assert.ok(s.delaySeconds >= 3 && s.delaySeconds <= 25);
    assert.ok(s.sessionLimitMinutes >= 2);
    assert.ok(s.coinCost >= 3);
  }
});

test("plan recommendations include night-park for night scroller", () => {
  const plan = buildPlan({
    profile: {
      name: "Test",
      currentHours: 6,
      goalHours: 2,
      feelings: ["Tired"],
      hardestTime: "Night",
      topApps: ["Instagram"],
    },
    behavior: baseBehavior,
  });
  const ids = plan.recommendations.map((r) => r.id);
  assert.ok(ids.includes("night_park"));
});

test("event of focus_complete returns updated plan and feedback", () => {
  const result = applyEvent({
    type: "focus_complete",
    minutes: 25,
    profile: {
      name: "Test",
      currentHours: 5,
      goalHours: 2,
      feelings: ["Tired"],
      hardestTime: "Night",
      topApps: ["Instagram"],
    },
    behavior: baseBehavior,
  });
  assert.ok(result.feedback.length > 0);
  assert.ok(result.plan.weeklyForecast.reclaimedHoursPerWeek >= 0);
});

test("forecast computes reclaimed hours per year", () => {
  const plan = buildPlan({
    profile: {
      name: "T",
      currentHours: 5,
      goalHours: 2,
      feelings: [],
      hardestTime: "Night",
      topApps: ["Instagram"],
    },
    behavior: { ...baseBehavior, focusCompletions: 2 },
  });
  assert.ok(plan.weeklyForecast.reclaimedHoursPerYear > 0);
  assert.equal(plan.weeklyForecast.currentWeeklyHours, 35);
  assert.equal(plan.weeklyForecast.goalWeeklyHours, 14);
});

test("demoPlan returns coherent values", () => {
  const plan = demoPlan();
  assert.ok(plan.riskScore >= 0 && plan.riskScore <= 100);
  assert.ok(["low", "medium", "high", "critical"].includes(plan.riskTier));
  assert.ok(plan.recommendations.length > 0);
});

test("reward multiplier scales with risk tier", () => {
  const lowPlan = buildPlan({
    profile: {
      name: "",
      currentHours: 1.5,
      goalHours: 2,
      feelings: ["Happy"],
      hardestTime: "Morning",
      topApps: ["Messages"],
    },
    behavior: baseBehavior,
  });
  const highPlan = buildPlan({
    profile: {
      name: "",
      currentHours: 9,
      goalHours: 2,
      feelings: ["Regretful", "Tired"],
      hardestTime: "Night",
      topApps: ["TikTok", "Instagram"],
    },
    behavior: baseBehavior,
  });
  assert.ok(highPlan.rewardTuning.baseCoinMultiplier >= lowPlan.rewardTuning.baseCoinMultiplier);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
