import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Use a disposable database so this test never collides with dev data.
const dir = mkdtempSync(join(tmpdir(), "latch-auth-"));
process.env.LATCH_DB_PATH = join(dir, "auth-test.db");

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

await test("signup creates an account with safe profile (no hash/salt leaked)", async () => {
  const account = await storage.createAccount({
    username: "ayaan@latch.app",
    password: "hunter2-pass",
    name: "Ayaan",
    age: 17,
  });
  assert.equal(account.username, "ayaan@latch.app");
  assert.equal(account.name, "Ayaan");
  assert.equal(account.age, 17);
  assert.equal(account.profile.onboardingComplete, false);
  assert.equal(account.profile.coins, 84);
  assert.deepEqual(account.profile.completedActions, []);
  // Safe object must not include credentials.
  assert.equal((account as any).passwordHash, undefined);
  assert.equal((account as any).passwordSalt, undefined);
});

await test("duplicate signup throws ACCOUNT_EXISTS", async () => {
  let threw = false;
  try {
    await storage.createAccount({
      username: "ayaan@latch.app",
      password: "another-pass",
      name: "Ayaan",
      age: 17,
    });
  } catch (err: any) {
    threw = true;
    assert.equal(err.code, "ACCOUNT_EXISTS");
  }
  assert.ok(threw, "expected duplicate signup to throw");
});

await test("usernames are normalized to lowercase", async () => {
  const found = await storage.findAccountByUsername("AYAAN@latch.APP");
  assert.ok(found, "expected case-insensitive lookup");
  assert.equal(found!.username, "ayaan@latch.app");
});

await test("login returns the account when credentials match", async () => {
  const account = await storage.loginAccount("ayaan@latch.app", "hunter2-pass");
  assert.ok(account);
  assert.equal(account!.username, "ayaan@latch.app");
});

await test("login rejects wrong passwords", async () => {
  const account = await storage.loginAccount("ayaan@latch.app", "wrong-password");
  assert.equal(account, null);
});

await test("login rejects unknown usernames", async () => {
  const account = await storage.loginAccount("nobody@latch.app", "anything");
  assert.equal(account, null);
});

await test("profile patch persists onboarding + arrays + coins", async () => {
  const before = await storage.loginAccount("ayaan@latch.app", "hunter2-pass");
  assert.ok(before);
  const id = before!.id;
  await storage.updateAccountProfile(id, {
    onboardingComplete: true,
    feelings: ["Tired", "Bored"],
    topApps: ["TikTok", "Instagram"],
    completedActions: ["walk", "read"],
    coins: 142,
    streak: 11,
    currentHours: 6,
    goalHours: 2,
    hardestTime: "Night",
  });
  const after = await storage.getAccountProfile(id);
  assert.ok(after);
  assert.equal(after!.profile.onboardingComplete, true);
  assert.deepEqual(after!.profile.feelings, ["Tired", "Bored"]);
  assert.deepEqual(after!.profile.topApps, ["TikTok", "Instagram"]);
  assert.deepEqual(after!.profile.completedActions, ["walk", "read"]);
  assert.equal(after!.profile.coins, 142);
  assert.equal(after!.profile.streak, 11);
  assert.equal(after!.profile.currentHours, 6);
  assert.equal(after!.profile.hardestTime, "Night");
});

await test("login restores the previously saved profile", async () => {
  const account = await storage.loginAccount("ayaan@latch.app", "hunter2-pass");
  assert.ok(account);
  assert.equal(account!.profile.onboardingComplete, true);
  assert.deepEqual(account!.profile.feelings, ["Tired", "Bored"]);
  assert.equal(account!.profile.coins, 142);
});

await test("getAccountProfile returns undefined for unknown ids", async () => {
  const account = await storage.getAccountProfile(99999);
  assert.equal(account, undefined);
});

console.log(`\n${passed} passed, ${failed} failed`);

// Clean up the temp DB regardless of outcome.
try {
  rmSync(dir, { recursive: true, force: true });
} catch {
  // ignore
}

if (failed > 0) process.exit(1);
