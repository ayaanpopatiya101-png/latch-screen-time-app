import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "latch-credits-"));
process.env.LATCH_DB_PATH = join(dir, "credits-test.db");

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

const acct = await storage.createAccount({
  username: "credits@latch.app",
  password: "earn-and-unlock",
  name: "Ayaan",
  age: 17,
});

await test("new account starts with default Latch Credits and brain energy", async () => {
  assert.equal(acct.profile.latchCredits, 20);
  assert.equal(acct.profile.brainEnergy, 72);
  assert.equal(acct.profile.unlockMinutes, 0);
  assert.equal(acct.profile.doomscrollNudges, true);
});

await test("earning credits adds to balance, energy, and weekly points", async () => {
  const before = await storage.getAccountProfile(acct.id);
  assert.ok(before);
  const result = await storage.earnCredits({
    accountId: acct.id,
    source: "walk",
    amount: 10,
    note: "morning walk",
  });
  assert.equal(result.account.profile.latchCredits, before!.profile.latchCredits + 10);
  assert.ok(result.account.profile.brainEnergy >= before!.profile.brainEnergy);
  assert.ok(result.account.profile.weeklyPoints > before!.profile.weeklyPoints);
  assert.equal(result.entry.kind, "earn");
  assert.equal(result.entry.amount, 10);
});

await test("spending credits deducts at 2 credits per minute and banks unlock time", async () => {
  const before = await storage.getAccountProfile(acct.id);
  assert.ok(before);
  const result = await storage.spendCredits({ accountId: acct.id, minutes: 5 });
  assert.ok(!("error" in result));
  if ("error" in result) return;
  assert.equal(result.account.profile.latchCredits, before!.profile.latchCredits - 10);
  assert.equal(result.account.profile.unlockMinutes, before!.profile.unlockMinutes + 5);
  assert.equal(result.entry.kind, "spend");
  assert.equal(result.entry.amount, -10);
});

await test("over-spending is rejected", async () => {
  const result = await storage.spendCredits({ accountId: acct.id, minutes: 60 });
  assert.ok("error" in result);
});

await test("focus plan create / toggle / delete round trip", async () => {
  const plan = await storage.createFocusPlan({
    accountId: acct.id,
    title: "Bedtime",
    difficulty: "deep_lock",
    startMinute: 22 * 60,
    endMinute: 24 * 60,
    daysMask: 0b1111111,
    blockedApps: ["Instagram", "TikTok"],
    breakPolicy: "none",
    emergencyPassCount: 0,
    enabled: true,
  });
  assert.equal(plan.title, "Bedtime");
  assert.equal(plan.enabled, true);
  const toggled = await storage.toggleFocusPlan(plan.id, false);
  assert.ok(toggled);
  assert.equal(toggled!.enabled, false);
  const list = await storage.listFocusPlans(acct.id);
  assert.equal(list.length, 1);
  const removed = await storage.deleteFocusPlan(plan.id);
  assert.equal(removed, true);
  const after = await storage.listFocusPlans(acct.id);
  assert.equal(after.length, 0);
});

await test("seedAccountabilityBuddiesIfEmpty creates buddies once", async () => {
  const seeded = await storage.seedAccountabilityBuddiesIfEmpty(acct.id);
  assert.equal(seeded.length, 3);
  const again = await storage.seedAccountabilityBuddiesIfEmpty(acct.id);
  assert.equal(again.length, 3);
});

await test("ledger lists most recent first", async () => {
  const list = await storage.listCreditLedger(acct.id, 10);
  assert.ok(list.length >= 2);
  // Most recent first by id desc.
  for (let i = 1; i < list.length; i++) {
    assert.ok(list[i - 1].id > list[i].id);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
